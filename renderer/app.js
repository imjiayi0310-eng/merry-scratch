/**
 * app.js — 主控制器
 * 状态机：IDLE → SCRATCHING → REVEALED
 * 串联所有模块，管理动画循环
 */
(function () {
  'use strict';

  // ========== DOM 元素 ==========
  const treeCanvas = document.getElementById('treeCanvas');
  const scratchCanvas = document.getElementById('scratchCanvas');
  const particleCanvas = document.getElementById('particleCanvas');
  const cursorEl = document.getElementById('cursor');
  const hintEl = document.getElementById('hint');

  const treeCtx = treeCanvas.getContext('2d');
  const particleCtx = particleCanvas.getContext('2d');

  // ========== 状态 ==========
  const STATE = { IDLE: 'idle', SCRATCHING: 'scratching', REVEALED: 'revealed' };
  let currentState = STATE.IDLE;
  let treeId = 1;
  let startTime = 0;
  let lastFrameTime = 0;
  let animFrameId = null;
  let hasRevealed = false;

  // ========== 初始化画布尺寸 ==========
  function resizeCanvases() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio;

    [treeCanvas, scratchCanvas, particleCanvas].forEach(c => {
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    });

    treeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ParticleSystem.init(w, h);
  }

  // ========== 全局回调（供 ScratchLayer 调用） ==========
  window.onScratchStart = function () {
    // iOS Safari 要求用户手势后才能播放音频
    SoundManager.ensureContext();

    if (currentState === STATE.IDLE) {
      currentState = STATE.SCRATCHING;
      hintEl.style.opacity = '0';
      // 隐藏安装提示
      const installTip = document.getElementById('installTip');
      if (installTip) installTip.style.display = 'none';
    }
    SoundManager.startScratch();
    if (cursorEl) cursorEl.style.display = 'block';
  };

  window.onScratchMove = function (x, y) {
    ParticleSystem.emitSparkles(x, y, 4);

    if (cursorEl) {
      cursorEl.style.left = (x + scratchCanvas.getBoundingClientRect().left) + 'px';
      cursorEl.style.top = (y + scratchCanvas.getBoundingClientRect().top) + 'px';
    }
  };

  window.onScratchEnd = function () {
    SoundManager.stopScratch();
    if (cursorEl) cursorEl.style.display = 'none';
  };

  // ========== 进度回调 ==========
  function onProgress(percent) {
    // 进度达到 65% 时触发揭示
    if (percent >= 0.65 && !hasRevealed) {
      hasRevealed = true;
      const elapsed = (performance.now() / 1000) - startTime;
      ScratchLayer.triggerReveal(elapsed);
    }
  }

  function onReveal() {
    currentState = STATE.REVEALED;
    SoundManager.playBells();
    ParticleSystem.startSnow();
    if (cursorEl) cursorEl.style.display = 'none';
    hintEl.style.display = 'none';
    const installTip = document.getElementById('installTip');
    if (installTip) installTip.style.display = 'none';
  }

  // ========== 动画循环 ==========
  function animate(timestamp) {
    animFrameId = requestAnimationFrame(animate);

    const timeSec = timestamp / 1000;
    if (lastFrameTime === 0) {
      lastFrameTime = timeSec;
      return;
    }
    const dt = Math.min(timeSec - lastFrameTime, 0.1); // cap delta
    lastFrameTime = timeSec;
    const elapsed = timeSec - startTime;

    // 1. 绘制圣诞树（底层 — 持续动画灯光）
    TreeDrawer.draw(treeCtx, window.innerWidth, window.innerHeight, treeId, elapsed);

    // 2. 更新刮开层
    ScratchLayer.update(dt, elapsed);

    // 3. 更新并绘制粒子
    ParticleSystem.update(dt);
    particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ParticleSystem.draw(particleCtx);
  }

  // ========== 鼠标移动（未按下时更新光标位置） ==========
  function onGlobalMouseMove(e) {
    if (currentState === STATE.IDLE) {
      cursorEl.style.left = e.clientX + 'px';
      cursorEl.style.top = e.clientY + 'px';
      cursorEl.style.display = 'block';
    }
  }

  function onGlobalMouseLeave() {
    if (currentState === STATE.IDLE) {
      cursorEl.style.display = 'none';
    }
  }

  // ========== 启动 ==========
  function init() {
    // 获取专属圣诞树编号
    treeId = Storage.getTreeId();
    TreeDrawer.init(treeId);

    console.log(`🎄 你的专属圣诞树：#${treeId}「${TreeDrawer.getTreeName(treeId)}」`);

    // 初始化画布
    resizeCanvases();

    // 初始化刮开层
    ScratchLayer.init(scratchCanvas, onProgress, onReveal);

    // iOS Safari: 显示"添加到主屏幕"提示
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    const installTip = document.getElementById('installTip');
    if (isIOS && !isStandalone && installTip) {
      installTip.style.display = 'block';
      // 几秒后自动隐藏
      setTimeout(() => { installTip.style.opacity = '0'; }, 6000);
    }

    // 全局鼠标跟踪（桌面端光标提示）
    document.addEventListener('mousemove', onGlobalMouseMove);
    document.addEventListener('mouseleave', onGlobalMouseLeave);
    document.addEventListener('touchmove', (e) => {
      if (currentState === STATE.IDLE && cursorEl) {
        cursorEl.style.left = e.touches[0].clientX + 'px';
        cursorEl.style.top = e.touches[0].clientY + 'px';
        cursorEl.style.display = 'block';
      }
    }, { passive: true });

    // 窗口大小变化时重绘
    window.addEventListener('resize', () => {
      resizeCanvases();
      ScratchLayer.resize();
      ScratchLayer.reset();
    });

    // 注册 Service Worker（离线缓存）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // 启动动画循环
    startTime = performance.now() / 1000;
    lastFrameTime = 0;
    animFrameId = requestAnimationFrame(animate);
  }

  // ========== 页面加载完成后启动 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ========== 导出调试接口 ==========
  window.__merryScratch = {
    getState: () => currentState,
    getTreeId: () => treeId,
    getTreeName: () => TreeDrawer.getTreeName(treeId),
    resetTree: () => {
      Storage.resetTreeId();
      location.reload();
    },
  };
})();
