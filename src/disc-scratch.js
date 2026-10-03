/**
 * disc-scratch.js — 圆片刮擦控制器
 * 使用真实圆片图片作为涂层，刮开 50%+ 触发揭示
 */
const DiscScratch = (() => {
  let scratchCanvas, scratchCtx, revealCanvas, revealCtx;
  let activePos = null, discData = null;
  let discX = 0, discY = 0, discR = 0;
  let isDown = false, lastX = 0, lastY = 0;
  let onReveal = null;
  let discImg = null;

  function init() {
    // 涂层 canvas
    if (!scratchCanvas) {
      scratchCanvas = document.createElement('canvas');
      scratchCanvas.style.cssText = 'position:fixed;z-index:25;display:none;touch-action:none;pointer-events:auto;';
      document.body.appendChild(scratchCanvas);
      scratchCtx = scratchCanvas.getContext('2d');

      revealCanvas = document.createElement('canvas');
      revealCanvas.style.cssText = 'position:fixed;z-index:24;display:none;pointer-events:none;';
      document.body.appendChild(revealCanvas);
      revealCtx = revealCanvas.getContext('2d');

      scratchCanvas.addEventListener('pointerdown', onDown);
      scratchCanvas.addEventListener('pointermove', onMove);
      scratchCanvas.addEventListener('pointerup', onUp);
      scratchCanvas.addEventListener('pointerleave', onUp);
      scratchCanvas.addEventListener('pointercancel', onUp);
    }

    // 预加载圆片图片
    if (!discImg) {
      discImg = new Image();
      discImg.src = 'assets/disc.jpg';
    }
  }

  function activate(pos, data, x, y, r, callback) {
    init();
    // 同一个圆片不重置（保留已刮进度）
    if (activePos === pos) { onReveal = callback; return; }
    activePos = pos;
    discData = data;
    discX = x; discY = y; discR = r;
    onReveal = callback;
    isDown = false;

    const size = Math.ceil(r * 2 + 24);
    const dpr = window.devicePixelRatio;

    // 涂层 canvas — 画圆片图作为可刮涂层
    scratchCanvas.width = size * dpr;
    scratchCanvas.height = size * dpr;
    scratchCanvas.style.width = size + 'px';
    scratchCanvas.style.height = size + 'px';
    scratchCanvas.style.left = (x - size/2) + 'px';
    scratchCanvas.style.top = (y - size/2) + 'px';
    scratchCanvas.style.display = 'block';

    scratchCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scratchCtx.globalCompositeOperation = 'source-over';
    scratchCtx.clearRect(0, 0, size, size);

    // 画圆片图片（圆角裁剪）
    scratchCtx.save();
    scratchCtx.beginPath();
    scratchCtx.arc(size/2, size/2, r, 0, Math.PI * 2);
    scratchCtx.clip();
    if (discImg && discImg.complete) {
      scratchCtx.drawImage(discImg, size/2 - r, size/2 - r, r*2, r*2);
    } else {
      // 回退银色渐变
      const g = scratchCtx.createRadialGradient(size/2, size/2, 0, size/2, size/2, r);
      g.addColorStop(0, '#e0e0e0'); g.addColorStop(0.5, '#b0b0b0'); g.addColorStop(1, '#606060');
      scratchCtx.fillStyle = g;
      scratchCtx.fill();
    }
    scratchCtx.restore();

    // 内容 canvas — 奖品或圣诞快乐
    revealCanvas.width = size * dpr;
    revealCanvas.height = size * dpr;
    revealCanvas.style.width = size + 'px';
    revealCanvas.style.height = size + 'px';
    revealCanvas.style.left = (x - size/2) + 'px';
    revealCanvas.style.top = (y - size/2) + 'px';
    revealCanvas.style.display = 'block';

    revealCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    revealCtx.clearRect(0, 0, size, size);

    // 底片：圆形 + 内容
    // 底色
    const baseGrad = revealCtx.createRadialGradient(size/2, size/2, 0, size/2, size/2, r);
    baseGrad.addColorStop(0, '#2a2040'); baseGrad.addColorStop(1, '#0d0d1a');
    revealCtx.fillStyle = baseGrad;
    revealCtx.beginPath(); revealCtx.arc(size/2, size/2, r, 0, Math.PI * 2); revealCtx.fill();
    // 边框
    revealCtx.strokeStyle = 'rgba(255,255,255,0.15)';
    revealCtx.lineWidth = 2;
    revealCtx.beginPath(); revealCtx.arc(size/2, size/2, r - 1, 0, Math.PI * 2); revealCtx.stroke();

    if (data.type === 'win') {
      // 有奖：emoji + 奖品名
      revealCtx.fillStyle = '#ffd700';
      revealCtx.font = `${r*0.8}px sans-serif`;
      revealCtx.textAlign = 'center';
      revealCtx.textBaseline = 'middle';
      const emojiMap = { '香草冰淇淋': '🍦', '圣诞大餐': '🍽️', '仙女棒': '✨', '一条围巾': '🧣', '立刻见面吧': '💝' };
      revealCtx.fillText(emojiMap[data.content] || '🎁', size/2, size/2 - r*0.2);
      revealCtx.font = `${r*0.35}px sans-serif`;
      revealCtx.fillStyle = '#fff';
      revealCtx.fillText(data.content.slice(0, 4), size/2, size/2 + r*0.45);
    } else {
      // 无奖：空心圆圈
      revealCtx.strokeStyle = 'rgba(255,255,255,0.25)';
      revealCtx.lineWidth = 3;
      revealCtx.beginPath(); revealCtx.arc(size/2, size/2, r*0.35, 0, Math.PI * 2); revealCtx.stroke();
    }
  }

  function capture(e) {
    if (scratchCanvas && scratchCanvas.style.display !== 'none') {
      scratchCanvas.setPointerCapture(e.pointerId);
    }
  }

  function deactivate() {
    activePos = null;
    if (scratchCanvas) scratchCanvas.style.display = 'none';
    if (revealCanvas) revealCanvas.style.display = 'none';
  }

  function onDown(e) {
    if (!activePos) return;
    isDown = true;
    e.preventDefault();
    const p = getPos(e);
    lastX = p.x; lastY = p.y;
    scratchAt(p.x, p.y);
  }

  function onMove(e) {
    if (!isDown || !activePos) return;
    e.preventDefault();
    const p = getPos(e);
    const dx = p.x - lastX, dy = p.y - lastY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const step = Math.max(1, discR * 0.25);
    if (dist > step) {
      const n = Math.ceil(dist / step);
      for (let i = 0; i <= n; i++) {
        scratchAt(lastX + dx*i/n, lastY + dy*i/n);
      }
    } else {
      scratchAt(p.x, p.y);
    }
    lastX = p.x; lastY = p.y;
  }

  function onUp(e) {
    if (!isDown || !activePos) return;
    isDown = false;
    checkProgress();
  }

  function getPos(e) {
    const rect = scratchCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function scratchAt(x, y) {
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.fillStyle = '#000';
    scratchCtx.beginPath();
    scratchCtx.arc(x, y, discR * 0.25, 0, Math.PI * 2);
    scratchCtx.fill();
  }

  function checkProgress() {
    const w = scratchCanvas.width / window.devicePixelRatio;
    const h = scratchCanvas.height / window.devicePixelRatio;
    const sw = Math.floor(w / 3), sh = Math.floor(h / 3);
    const tmp = document.createElement('canvas'); tmp.width = sw; tmp.height = sh;
    const tx = tmp.getContext('2d');
    tx.drawImage(scratchCanvas, 0, 0, sw, sh);
    const img = tx.getImageData(0, 0, sw, sh);
    let transparent = 0, total = sw * sh;
    for (let i = 3; i < img.data.length; i += 4) {
      if (img.data[i] < 128) transparent++;
    }
    const pct = transparent / total;

    if (pct >= 0.5) {
      deactivate();
      if (onReveal) onReveal(activePos);
    }
  }

  return { init, activate, capture, deactivate };
})();
