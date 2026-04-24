const Product = require("../models/Product");

class TrieNode {
  constructor() {
    this.children = {};
    this.entries = [];
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, meta) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.entries.push(meta);
  }

  suggest(prefix, limit = 8) {
    const lp = prefix.toLowerCase();
    let node = this.root;
    for (const ch of lp) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }

    const all = [];
    const stack = [node];
    while (stack.length) {
      const curr = stack.pop();
      for (const entry of curr.entries) all.push(entry);
      for (const child of Object.values(curr.children)) stack.push(child);
    }

    const seen = new Set();
    const deduped = [];
    for (const entry of all) {
      const key = entry.label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(entry);
      }
    }

    deduped.sort((a, b) => {
      const aExact = a.label.toLowerCase().startsWith(lp) ? 1 : 0;
      const bExact = b.label.toLowerCase().startsWith(lp) ? 1 : 0;
      if (bExact !== aExact) return bExact - aExact;
      return b.trendingScore - a.trendingScore;
    });

    return deduped.slice(0, limit).map(({ label, type, productId, category }) => ({
      label,
      type,
      productId: productId || null,
      category: category || null,
    }));
  }
}

let trie = new Trie();

async function buildSearchIndex() {
  const products = await Product.find({ status: { $ne: "deleted" } })
    .select("name category trendingScore _id")
    .lean();

  const newTrie = new Trie();
  const categorySet = new Set();

  for (const product of products) {
    const meta = {
      label: product.name,
      type: "product",
      productId: product._id.toString(),
      category: product.category,
      trendingScore: product.trendingScore || 0,
    };

    newTrie.insert(product.name, meta);

    const words = product.name.split(/\s+/).filter((w) => w.length >= 2);
    for (const word of words) {
      if (word.toLowerCase() !== product.name.toLowerCase()) {
        newTrie.insert(word, meta);
      }
    }

    if (product.category) categorySet.add(product.category);
  }

  for (const cat of categorySet) {
    newTrie.insert(cat, {
      label: cat,
      type: "category",
      productId: null,
      category: cat,
      trendingScore: 0,
    });
  }

  trie = newTrie;
}

function getSuggestions(prefix, limit = 8) {
  return trie.suggest(prefix, limit);
}

module.exports = { buildSearchIndex, getSuggestions };
