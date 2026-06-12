/**
 * storage.js — 持久化模块
 * 负责圣诞树编号的首次随机分配与永久存储
 */
const Storage = (() => {
  const STORAGE_KEY = 'merry-scratch-tree-id';
  const TOTAL_TREES = 6;

  /**
   * 获取当前用户的圣诞树编号 (1-5)
   * 首次调用时随机分配并永久存储，之后返回固定值
   */
  function getTreeId() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const id = parseInt(stored, 10);
      if (id >= 1 && id <= TOTAL_TREES) {
        return id;
      }
    }
    // 首次分配：随机 1-5
    const newId = Math.floor(Math.random() * TOTAL_TREES) + 1;
    localStorage.setItem(STORAGE_KEY, String(newId));
    return newId;
  }

  /**
   * 重置圣诞树编号（下次打开时重新随机）
   */
  function resetTreeId() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { getTreeId, resetTreeId, TOTAL_TREES };
})();
