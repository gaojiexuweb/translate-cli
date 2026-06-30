function safeJsonParse(str) {
  if (!str) return null;

  str = str
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const match = str.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("JSON 解析失败:", match[0]);
    return null;
  }
}

module.exports = safeJsonParse;
