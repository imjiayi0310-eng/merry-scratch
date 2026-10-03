/**
 * cloudbase.js — 腾讯云 CloudBase 封装
 * 匿名登录 + Firestore 风格文档操作
 */
const CloudBase = (() => {
  let app = null;
  let db = null;
  let ready = false;

  const ENV_ID = 'hmyjh12-d8g8lf2oz5b5a1de8';

  async function init() {
    if (ready) return;

    // 检查 SDK 是否加载
    if (!window.cloudbase) {
      throw new Error('CloudBase SDK 未加载，请刷新页面重试');
    }

    try {
      app = window.cloudbase.init({ env: ENV_ID });
      const auth = app.auth({ persistence: 'local' });
      console.log('正在匿名登录…');
      const loginState = await auth.anonymousAuthProvider().signIn();
      console.log('登录成功:', loginState);
      db = app.database();
      ready = true;
      console.log('CloudBase 已连接');
    } catch (err) {
      console.error('CloudBase 初始化失败:', err);
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw new Error('登录失败：' + (err.message || '未知错误'));
    }
  }

  // ===== Links =====
  async function createLink(data, parentId) {
    await init();
    const res = await db.collection('links').add({
      treeId: data.treeId,
      prizes: data.prizes,
      maxScratches: data.maxScratches,
      parentId: parentId || null,
      createdAt: Date.now(),
    });
    return res.id;
  }

  // ===== 埋点：记录关键行为事件到 events 集合 =====
  async function trackEvent(eventName, data) {
    await init();
    await db.collection('events').add({
      event: eventName,
      ...data,
      createdAt: Date.now(),
    });
  }

  async function getLink(linkId) {
    await init();
    const doc = await db.collection('links').doc(linkId).get();
    return doc.data ? doc.data[0] : null;
  }

  // ===== Receivers =====
  function getReceiverId() {
    let rid = localStorage.getItem('merry_receiver_id');
    if (!rid) {
      rid = 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      localStorage.setItem('merry_receiver_id', rid);
    }
    return rid;
  }

  async function getReceiverState(linkId) {
    await init();
    const rid = getReceiverId();
    const docId = `${linkId}_${rid}`;
    const doc = await db.collection('receivers').doc(docId).get();
    return doc.data ? doc.data[0] : null;
  }

  async function saveReceiverState(linkId, state) {
    await init();
    const rid = getReceiverId();
    const docId = `${linkId}_${rid}`;
    await db.collection('receivers').doc(docId).set({
      ...state,
      updatedAt: Date.now(),
    });
  }

  // ===== Results (for sender to view) =====
  async function getLinkResults(linkId) {
    await init();
    const res = await db.collection('receivers')
      .where({ linkId })
      .get();
    return res.data || [];
  }

  return { init, createLink, getLink, getReceiverState, saveReceiverState, getLinkResults, getReceiverId, trackEvent };
})();
