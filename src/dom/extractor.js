function extractNodes(page) {
  return page.evaluate(() => {
    let id = 0;
    const nodes = [];

    function clean(text) {
      return text?.replace(/\s+/g, " ").trim();
    }

    // 语义 Key 生成（在页面上下文中）
    function makeSemanticKey(text) {
      return text
        .replace(/\d+/g, "{num}")
        .replace(/[a-zA-Z]+/g, "{token}")
        .replace(/\s+/g, " ")
        .trim();
    }

    // =========================
    // 递归提取非表格区域的文本节点
    // 策略：
    //   - 标题(H1-H6)、行内元素(SPAN/A/B/I/EM/STRONG) → 整体提取，不拆分
    //   - 容器元素(DIV/SECTION 等) → 递归子元素，拆成更小粒度
    //   - 不含中文 → 继续往下找
    // =========================

    // 不拆分的标签：标题和行内元素，作为整体翻译
    const ATOMIC_TAGS = new Set(["H1","H2","H3","H4","H5","H6","SPAN","A","B","I","EM","STRONG","LABEL","BUTTON"]);

    function walk(node) {
      if (!node || node.nodeType !== 1) return;

      // 跳过表格、script、style
      if (node.tagName === "TABLE" || node.tagName === "SCRIPT" || node.tagName === "STYLE") return;
      if (node.closest("table")) return;

      // 如果已经有 data-uid，跳过
      if (node.getAttribute("data-uid")) return;

      const text = clean(node.innerText);
      if (!text) return;

      // 不含中文 → 继续往下找
      if (!/[一-龥]/.test(text)) {
        for (const child of node.children) {
          walk(child);
        }
        return;
      }

      // 包含中文 + 不可拆分标签 → 整体提取
      if (ATOMIC_TAGS.has(node.tagName)) {
        const uid = "n_" + id;
        node.setAttribute("data-uid", uid);
        nodes.push({
          uid,
          type: "text",
          text,
          parentTag: node.tagName,
          cacheKey: "text:" + makeSemanticKey(text),
        });
        id++;
        return;
      }

      // 包含中文 + 容器标签 → 递归子元素
      let childHandled = false;
      for (const child of node.children) {
        const childText = clean(child.innerText);
        if (childText && /[一-龥]/.test(childText)) {
          walk(child);
          childHandled = true;
        }
      }

      // 子元素处理完后，检查是否还有裸文本残留
      if (childHandled) {
        const remaining = getRemainingText(node);
        if (remaining && /[一-龥]/.test(remaining)) {
          const uid = "n_" + id;
          node.setAttribute("data-uid", uid);
          nodes.push({
            uid,
            type: "text",
            text: remaining,
            parentTag: node.tagName,
            cacheKey: "text:" + makeSemanticKey(remaining),
          });
          id++;
        }
        return;
      }

      // 没有子元素能处理 → 当前节点就是最小粒度，直接提取
      const uid = "n_" + id;
      node.setAttribute("data-uid", uid);
      nodes.push({
        uid,
        type: "text",
        text,
        parentTag: node.tagName,
        cacheKey: "text:" + makeSemanticKey(text),
      });
      id++;
    }

    // 获取节点中未被子节点覆盖的残留文本（裸文本节点）
    function getRemainingText(node) {
      const parts = [];
      for (const child of node.childNodes) {
        if (child.nodeType === 3) { // 文本节点
          const t = clean(child.textContent);
          if (t) parts.push(t);
        }
      }
      return parts.length > 0 ? parts.join(" ") : null;
    }
            
    // 从 body 的子元素开始遍历，避免把整个 body 当作一个节点提取
    for (const child of document.body.children) {
      walk(child);
    }

    return nodes;
  });
}

module.exports = extractNodes;
