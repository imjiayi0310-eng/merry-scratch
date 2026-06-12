/**
 * app.js — 主控制器
 * 状态机：GUIDE → SCRATCHING → REVEALED
 * 串联所有模块，管理动画循环
 */
(function () {
  'use strict';

  // ========== DOM 元素 ==========
  const treeCanvas = document.getElementById('treeCanvas');
  const scratchCanvas = document.getElementById('scratchCanvas');
  const particleCanvas = document.getElementById('particleCanvas');
  const cursorEl = document.getElementById('cursor');
  const guideTextEl = document.getElementById('guideText');

  const treeCtx = treeCanvas.getContext('2d');
  const particleCtx = particleCanvas.getContext('2d');

  // ========== 状态 ==========
  const STATE = { GUIDE: 'guide', SCRATCHING: 'scratching', REVEALED: 'revealed' };
  let currentState = STATE.GUIDE;
  let treeId = 1;
  let startTime = 0;
  let lastFrameTime = 0;
  let animFrameId = null;
  let hasRevealed = false;

  // 引导相关
  let guideExploding = false;
  let guideExplosionTime = 0;
  let guideAlpha = 1;
  const GLOW_CX = () => window.innerWidth / 2;
  const GLOW_CY = () => window.innerHeight * 0.42;

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

  // ========== 打字机动画 ==========
  function typewriter(text, element, speed, callback) {
    let i = 0;
    element.textContent = '';
    element.classList.remove('done');
    const timer = setInterval(() => {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
      } else {
        clearInterval(timer);
        element.classList.add('done');
        if (callback) callback();
      }
    }, speed);
  }

  function startGuideText() {
    typewriter('用指尖轻轻涂抹', guideTextEl, 80, () => {
      setTimeout(() => {
        typewriter('你会发现…🎄', guideTextEl, 80, () => {
          // 文字停留，光晕继续呼吸
        });
      }, 600);
    });
  }

  // ========== 引导光晕绘制 ==========
  function drawGuideGlow(elapsed) {
    if (guideExploding) return;

    const cx = GLOW_CX();
    const cy = GLOW_CY();
    const breath = Math.sin(elapsed * 1.6) * 0.5 + 0.5; // 0-1 呼吸
    const baseR = Math.min(window.innerWidth * 0.08, 50);
    const r = baseR + breath * 18;

    // 外层涟漪
    const rippleR = r + 28 + breath * 15;
    const rippleAlpha = 0.12 * (1 - breath * 0.5);
    const rippleGrad = particleCtx.createRadialGradient(cx, cy, r * 0.6, cx, cy, rippleR);
    rippleGrad.addColorStop(0, 'rgba(255,184,198,0.3)');
    rippleGrad.addColorStop(0.5, 'rgba(255,184,198,0.1)');
    rippleGrad.addColorStop(1, 'transparent');
    particleCtx.fillStyle = rippleGrad;
    particleCtx.beginPath();
    particleCtx.arc(cx, cy, rippleR, 0, Math.PI * 2);
    particleCtx.fill();

    // 主光晕
    const glowGrad = particleCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    glowGrad.addColorStop(0, 'rgba(255,215,0,0.7)');
    glowGrad.addColorStop(0.25, 'rgba(255,184,198,0.5)');
    glowGrad.addColorStop(0.6, 'rgba(255,150,170,0.15)');
    glowGrad.addColorStop(1, 'transparent');
    particleCtx.fillStyle = glowGrad;
    particleCtx.beginPath();
    particleCtx.arc(cx, cy, r, 0, Math.PI * 2);
    particleCtx.fill();

    // 中心亮点
    const coreR = r * 0.2;
    const coreGrad = particleCtx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    coreGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
    coreGrad.addColorStop(1, 'transparent');
    particleCtx.fillStyle = coreGrad;
    particleCtx.beginPath();
    particleCtx.arc(cx, cy, coreR, 0, Math.PI * 2);
    particleCtx.fill();
  }

  // ========== 全局回调（供 ScratchLayer 调用） ==========
  window.onScratchStart = function () {
    SoundManager.ensureContext();

    if (currentState === STATE.GUIDE) {
      triggerGuideExplosion();
    }

    if (currentState === STATE.GUIDE || currentState === STATE.SCRATCHING) {
      currentState = STATE.SCRATCHING;
      guideTextEl.style.opacity = '0';
      ParticleSystem.fadeOutIdleStars();
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

  // ========== 引导爆炸 ==========
  function triggerGuideExplosion() {
    guideExploding = true;
    guideExplosionTime = 0;
    guideAlpha = 1;

    const cx = GLOW_CX();
    const cy = GLOW_CY();
    // 在光晕位置生成大量粒子
    for (let i = 0; i < 25; i++) {
      ParticleSystem.emitSparkles(cx, cy, 3);
    }
  }

  // ========== 进度回调 ==========
  function onProgress(percent) {
    if (percent >= 0.40 && !hasRevealed) {
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
    guideTextEl.style.display = 'none';
    const installTip = document.getElementById('installTip');
    if (installTip) installTip.style.display = 'none';
    const replayBtn = document.getElementById('replayBtn');
    if (replayBtn) {
      replayBtn.style.display = 'block';
      setTimeout(() => { replayBtn.style.opacity = '1'; }, 50);
    }
  }

  // ========== 动画循环 ==========
  function animate(timestamp) {
    animFrameId = requestAnimationFrame(animate);

    const timeSec = timestamp / 1000;
    if (lastFrameTime === 0) {
      lastFrameTime = timeSec;
      return;
    }
    const dt = Math.min(timeSec - lastFrameTime, 0.1);
    lastFrameTime = timeSec;
    const elapsed = timeSec - startTime;

    const scratchProgress = ScratchLayer.getProgress();

    // 1. 绘制圣诞树
    TreeDrawer.draw(treeCtx, window.innerWidth, window.innerHeight, treeId, elapsed, scratchProgress);

    // 2. 更新刮开层
    ScratchLayer.update(dt, elapsed);

    // 3. 更新粒子
    ParticleSystem.update(dt, elapsed);

    // 4. 清除并绘制粒子层
    particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 绘制引导光晕（GUIDE 或爆炸过渡中）
    if (currentState === STATE.GUIDE) {
      drawGuideGlow(elapsed);
    }

    // 爆炸过渡：光晕快速膨胀消失
    if (guideExploding) {
      guideExplosionTime += dt;
      const explosionProgress = guideExplosionTime / 0.5; // 0.5s 完成
      if (explosionProgress >= 1) {
        guideExploding = false;
      } else {
        // 膨胀光晕
        const cx = GLOW_CX();
        const cy = GLOW_CY();
        const r = 30 + explosionProgress * 120;
        const alpha = 1 - explosionProgress;
        const grad = particleCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(255,215,0,${alpha * 0.5})`);
        grad.addColorStop(1, 'transparent');
        particleCtx.fillStyle = grad;
        particleCtx.beginPath();
        particleCtx.arc(cx, cy, r, 0, Math.PI * 2);
        particleCtx.fill();
      }
    }

    ParticleSystem.draw(particleCtx, elapsed);
  }

  // ========== 鼠标移动（桌面端光标） ==========
  function onGlobalMouseMove(e) {
    if (currentState === STATE.GUIDE && cursorEl) {
      cursorEl.style.left = e.clientX + 'px';
      cursorEl.style.top = e.clientY + 'px';
      cursorEl.style.display = 'block';
    }
  }

  function onGlobalMouseLeave() {
    if (currentState === STATE.GUIDE && cursorEl) {
      cursorEl.style.display = 'none';
    }
  }

  // ========== 启动 ==========
  function init() {
    treeId = Storage.getTreeId();
    TreeDrawer.init(treeId);
    console.log(`🎄 你的专属圣诞树：#${treeId}「${TreeDrawer.getTreeName(treeId)}」`);

    resizeCanvases();
    ScratchLayer.init(scratchCanvas, onProgress, onReveal);

    // 预加载所有音频
    SoundManager.preloadAll();

    // 启动打字机引导文字
    startGuideText();

    // iOS Safari 安装提示
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    const installTip = document.getElementById('installTip');
    if (isIOS && !isStandalone && installTip) {
      installTip.style.display = 'block';
      setTimeout(() => { installTip.style.opacity = '0'; }, 6000);
    }

    document.addEventListener('mousemove', onGlobalMouseMove);
    document.addEventListener('mouseleave', onGlobalMouseLeave);
    document.addEventListener('touchmove', (e) => {
      if (currentState === STATE.GUIDE && cursorEl) {
        cursorEl.style.left = e.touches[0].clientX + 'px';
        cursorEl.style.top = e.touches[0].clientY + 'px';
        cursorEl.style.display = 'block';
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      resizeCanvases();
      ScratchLayer.resize();
      ScratchLayer.reset();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // 等所有圣诞树图片加载完毕后再启动动画
    TreeDrawer.ready().then(() => {
      console.log('🎄 所有圣诞树图片已就绪');
      startTime = performance.now() / 1000;
      lastFrameTime = 0;
      animFrameId = requestAnimationFrame(animate);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

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
