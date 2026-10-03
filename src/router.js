/**
 * router.js — 轻量级 Hash SPA 路由
 * 路由：/#/home  /#/video  /#/game  /#/create  /#/result
 */
const Router = (() => {
  const pages = {};
  let currentPage = null;

  function register(name, pageModule) {
    pages[name] = pageModule;
  }

  function navigate(name, params) {
    const hash = params ? `#/${name}?${params}` : `#/${name}`;
    window.location.hash = hash;
  }

  function getParams() {
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return {};
    const qs = hash.substring(qIndex + 1);
    const params = {};
    qs.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return params;
  }

  function getRoute() {
    const hash = window.location.hash.replace('#/', '');
    const qIndex = hash.indexOf('?');
    return qIndex === -1 ? hash : hash.substring(0, qIndex);
  }

  async function resolve() {
    const route = getRoute() || 'home';

    // 隐藏所有页面
    if (currentPage && currentPage.hide) {
      currentPage.hide();
    }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // 显示目标页面
    const page = pages[route];
    if (!page) {
      navigate('home');
      return;
    }

    if (page.show) {
      await page.show(getParams());
    }
    currentPage = page;
  }

  window.addEventListener('hashchange', resolve);
  window.addEventListener('load', resolve);

  return { register, navigate, getParams, getRoute, resolve };
})();
