function semanticKey(text) {
  return text
    .replace(/\d+/g, "{num}")
    .replace(/[a-zA-Z]+/g, "{token}")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = semanticKey;
