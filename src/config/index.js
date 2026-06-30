// OpenAI 配置
exports.OPENAI_CONFIG = {
  baseURL: "http://127.0.0.1:5001/v1",
  apiKey: "direct-test-token",
  timeout: 120000,
  model: "GLM-4.7",
};

// Puppeteer 配置
exports.PUPPETEER_CONFIG = {
  headless: false,
  // headless: "new",
  args: ["--no-sandbox"],
  devtools: true,
  defaultViewport: null,
};

// PDF 配置
exports.PDF_CONFIG = {
  width: 1240,
  height: 1754,
  printBackground: true,
  margin: { top: "0", bottom: "30", right: "0", left: "0" },
};

// 业务配置
exports.BATCH_SIZE = 20; // 每批翻译节点数
exports.CONCURRENCY = 5; // 并发数
exports.CACHE_LIMIT = 5000; // LRU 缓存上限
exports.DISK_CACHE_FILE = "./cache/translate-cache.json"; // 磁盘缓存文件路径
