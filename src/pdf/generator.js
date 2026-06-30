const fs = require("fs");
const path = require("path");
const { PDF_CONFIG } = require("../config");

function getDefaultFileName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `translated_${timestamp}.pdf`;
}

async function generatePDF(page, fileName = getDefaultFileName()) {
  const pdfDir = path.join(__dirname, "../../pdf");
  fs.mkdirSync(pdfDir, { recursive: true });
  const fullPath = path.join(pdfDir, fileName);

  const defaultOpt = {
    path: fullPath,
    ...PDF_CONFIG,
    headerTemplate: "我是页面 header",
    footerTemplate: "我是页面 footer",
  };

  await page.pdf(defaultOpt);

  return fullPath;
}

module.exports = generatePDF;
