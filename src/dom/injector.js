async function applyTranslation(page, translateMap) {
  await page.evaluate((map) => {
    // 通过 data-uid 查找元素并替换文本
    document.querySelectorAll("[data-uid]").forEach((el) => {
      const uid = el.getAttribute("data-uid");
      if (map[uid]) {
        el.innerText = map[uid];
      }
    });
  }, translateMap);
}

module.exports = applyTranslation;
