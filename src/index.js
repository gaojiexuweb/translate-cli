const puppeteer = require("puppeteer");
const extractNodes = require("./dom/extractor");
const { translateAll, dedupe } = require("./core/translator");
const applyTranslation = require("./dom/injector");
const generatePDF = require("./pdf/generator");
const { PUPPETEER_CONFIG, BATCH_SIZE, CONCURRENCY } = require("./config");

async function main() {
  const browser = await puppeteer.launch(PUPPETEER_CONFIG);
  const page = await browser.newPage();

  const url = "https://kd-test.damddos.com:10075/pdf/?userId=1699386391221035010&t=1782359705954&ticket=ce3326092a09498d9f4e6fa5a750895a&data=%7B%22reportType%22%3A%22R03%22%2C%22monthlyRequest%22%3A%7B%22reportId%22%3A%2225080%22%2C%22customerId%22%3A%221726775503980777473%22%7D%7D&templateId=139&contenteditable";

  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 180000,
  });

    console.log("🚀 开始提取 DOM 节点...");
    // 1. 提取节点
    const nodes = await extractNodes(page);
    console.log(`📄 原始节点数：${nodes.length}`);
    nodes.forEach((n, i) => {
      console.log(`  [${i}] uid=${n.uid} | tag=${n.parentTag} | text=${n.text.substring(0, 80)}${n.text.length > 80 ? "..." : ""}`);
    });

  // 2. 去重
  const { uniqueNodes, uidAlias } = dedupe(nodes);
  console.log(`✅ 去重后节点数：${uniqueNodes.length}，别名映射数：${Object.keys(uidAlias).length}`);

  console.log("📦 开始翻译...");
  // 3. 翻译（内部处理分组和并发）
  const translateMap = await translateAll(uniqueNodes, BATCH_SIZE, CONCURRENCY, uidAlias);

  console.log("✅ 翻译完成");

  console.log("🔄 开始回填 DOM...");
  // 4. 回填
  await applyTranslation(page, translateMap);
  console.log("✅ 回填完成");

  console.log("📄 开始生成 PDF...");
  // 5. 生成 PDF
  const pdfPath = await generatePDF(page);
  console.log(`✅ PDF 生成：${pdfPath}`);

  await browser.close();
  console.log("✅ 全部完成");
}

main().catch((err) => {
  console.error("❌ 错误:", err);
  process.exit(1);
});
