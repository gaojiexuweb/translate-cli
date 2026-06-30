const fs = require("fs");
const path = require("path");
const { CACHE_LIMIT, DISK_CACHE_FILE } = require("../config");

class LRUCache {
  constructor(limit = CACHE_LIMIT) {
    this.limit = limit;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return null;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key, val) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);

    if (this.map.size > this.limit) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }
}

class DiskCache {
  constructor(file = DISK_CACHE_FILE) {
    this.file = file;
    this.cache = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.file)) {
        this.cache = JSON.parse(fs.readFileSync(this.file, "utf-8"));
      }
    } catch (e) {
      this.cache = {};
    }
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.cache, null, 2));
    } catch (e) {}
  }

  get(key) {
    return this.cache[key] || null;
  }

  set(key, val) {
    this.cache[key] = val;
  }
}

// 缓存层实例
const memoryCache = new LRUCache();
const diskCache = new DiskCache();

// 缓存读取
function getCache(key) {
  let val = memoryCache.get(key);
  if (val) return val;

  val = diskCache.get(key);
  if (val) {
    memoryCache.set(key, val);
    return val;
  }

  return null;
}

// 缓存写入
function setCache(key, value) {
  memoryCache.set(key, value);
  diskCache.set(key, value);
  diskCache.save();
}

module.exports = { LRUCache, DiskCache, getCache, setCache };
