const OpenAI = require("openai");
const { getCache, setCache } = require("./cache");
const safeJsonParse = require("../utils/jsonParser");
const retry = require("../utils/retry");
const chunk = require("../utils/chunk");
const promisePool = require("../utils/promisePool");
const { OPENAI_CONFIG } = require("../config");

// 判断是否需要翻译
function needTranslate(text) {
  if (!text || !text.trim()) return false;

  if (/^https?:\/\//.test(text)) return false;
  if (/^\d+(\.\d+)?%?$/.test(text)) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) return false;

  return /[\u4e00-\u9fa5]/.test(text);
}

// 构建 Prompt
function buildPrompt(inputMap) {
  return `
You are translating a Chinese cybersecurity report into English.

Rules:
- Keep technical terms consistent
- Keep numbers unchanged
- Keep IPs, URLs unchanged
- Do not merge sentences
- Return ONLY JSON object
- Keys must remain unchanged
- No explanations

Input:
${JSON.stringify(inputMap)}
`;
}

// 调用 LLM
async function callLLM(inputMap) {
  const openai = new OpenAI(OPENAI_CONFIG);
  const prompt = buildPrompt(inputMap);

  const res = await openai.chat.completions.create({
    model: OPENAI_CONFIG.model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  return safeJsonParse(res.choices[0].message.content) || {};
}

// 批量翻译（核心）
async function translateBatch(nodes) {
  const need = [];
  const resultMap = {};

  // 1. cache hit
  for (const n of nodes) {
    const cached = getCache(n.cacheKey);

    if (cached) {
      resultMap[n.uid] = cached;
    } else {
      need.push(n);
    }
  }

  // 2. no need to call LLM
  if (need.length === 0) {
    return resultMap;
  }

  // 3. build input
  const input = {};
  need.forEach((n) => {
    input[n.uid] = n.text;
  });

  // 4. LLM call with retry
  let output = {};
  try {
    output = await retry(() => callLLM(input), 3, 800);
  } catch (e) {
    console.error("LLM 失败:", e);
    output = {};
  }

    // 5. merge result
    for (const n of need) {
      const val = output[n.uid] || n.text;
      setCache(n.cacheKey, val);
      resultMap[n.uid] = val;
    }

  return resultMap;
}

// 去重（基于语义 key，避免语义相同但数字不同的文本重复翻译）
// 返回 { uniqueNodes, uidAlias }
// uidAlias: 被去重的 uid → 保留的 uid 映射，用于回填时共享翻译结果
function dedupe(nodes) {
  const map = new Map();
  const uidAlias = {}; // 被丢弃的 uid → 保留节点的 uid

  for (const n of nodes) {
    const key = n.cacheKey;

    if (!map.has(key)) {
      map.set(key, n);
    } else {
      // 相同 cacheKey，映射到已保留节点的 uid
      uidAlias[n.uid] = map.get(key).uid;
    }
  }

  return { uniqueNodes: Array.from(map.values()), uidAlias };
}

// 翻译所有节点（并行 + 顺序安全）
// uidAlias: 被去重的 uid → 保留的 uid 映射
async function translateAll(nodes, batchSize = 20, concurrency = 5, uidAlias = {}) {
  const batches = chunk(nodes, batchSize);

  const tasks = batches.map((batch) => {
    return async () => {
      return await translateBatch(batch);
    };
  });

  const results = await promisePool(tasks, concurrency);

  const finalMap = {};

  for (const r of results) {
    Object.assign(finalMap, r);
  }

  // 展开别名：被去重的 uid 共享保留 uid 的翻译结果
  for (const [aliasUid, originalUid] of Object.entries(uidAlias)) {
    if (finalMap[originalUid] && !finalMap[aliasUid]) {
      finalMap[aliasUid] = finalMap[originalUid];
    }
  }

  return finalMap;
}

module.exports = {
  translateBatch,
  translateAll,
  needTranslate,
  dedupe,
  callLLM,
};
