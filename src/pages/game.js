/**
 * game.js — 被赠送者游戏页
 * 复用原有模块：ScratchLayer + ParticleSystem + SoundManager
 * 树刮刮乐 → 圆片刮刮乐 → 弹窗 → 推广
 */
const GamePage = (() => {
  let container;
  let treeCanvas, scratchCanvas, particleCanvas;
  let treeCtx, scratchCtx, particleCtx;
  let linkId, prizes, maxScratches, treeId;
  let scratchCount = 0;
  let state = 'guide'; // guide → tree → disc → done
  let hasRevealed = false;
  let startTime = 0;
  let guideEl = null;
  let guideExploding = false;
  let guideExplosionTime = 0;

  // ===== 显示 =====
  async function show(params) {
    container = document.getElementById('page-game');
    if (!container) return;
    container.classList.add('active');
    document.getElementById('page-game').querySelectorAll('canvas').forEach(c => c.style.display = 'block');

    linkId = params.id || 'demo';
    treeId = parseInt(params.treeId || '1');
    state = 'guide';
    hasRevealed = false;
    scratchCount = 0;
    scratchedPositions = [];
    window._scratchedWins = [];

    // 加载链接数据
    if (linkId === 'demo') {
      prizes = [
        { pos: 1, type: 'win', content: '圣诞大餐' },{ pos: 2, type: 'lose' },
        { pos: 3, type: 'win', content: '仙女棒' },{ pos: 4, type: 'lose' },
        { pos: 5, type: 'win', content: '一条围巾' },{ pos: 6, type: 'lose' },
        { pos: 7, type: 'lose' },{ pos: 8, type: 'win', content: '立刻见面吧' },
        { pos: 9, type: 'lose' },{ pos: 10, type: 'win', content: '香草冰淇淋' },
      ];
      maxScratches = 5;
    } else {
      try {
        const data = await CloudBase.getLink(linkId);
        if (!data) { alert('链接无效'); Router.navigate('home'); return; }
        prizes = data.prizes || [];
        maxScratches = data.maxScratches || 5;
        treeId = data.treeId || 1;
        const saved = await CloudBase.getReceiverState(linkId);
        if (saved) { scratchCount = saved.scratchCount || 0; scratchedPositions = saved.scratchedPositions || []; window._scratchedWins = saved.wins || []; }
      } catch (err) { alert('加载失败，请重试'); Router.navigate('home'); return; }
    }

    // Canvas 元素
    treeCanvas = container.querySelector('#treeCanvas');
    scratchCanvas = container.querySelector('#scratchCanvas');
    particleCanvas = container.querySelector('#particleCanvas');

    resizeCanvases();
    // 等音频加载完再初始化刮擦
    await SoundManager.preloadAll();
    ParticleSystem.init(window.innerWidth, window.innerHeight);
    ScratchLayer.init(scratchCanvas, onTreeProgress, () => {});

    // 引导文字
    guideEl = document.createElement('div');
    guideEl.id = 'guideText';
    guideEl.style.cssText = 'position:fixed;bottom:25%;width:100%;text-align:center;z-index:5;color:rgba(255,255,255,0.6);font-size:clamp(16px,4vw,22px);letter-spacing:3px;pointer-events:none;line-height:2;';
    container.appendChild(guideEl);
    typewriter('用指尖轻轻涂抹', guideEl, 80, () => {
      setTimeout(() => typewriter('你会发现…🎄', guideEl, 80), 600);
    });

    // 全局回调
    window.onScratchStart = () => {
      SoundManager.ensureContext();
      if (state === 'guide') {
        state = 'tree';
        ParticleSystem.fadeOutIdleStars();
        guideEl.style.opacity = '0';
        // 埋点：第一次开始刮
        CloudBase.trackEvent('scratch_started', { linkId }).catch(() => {});
      }
      SoundManager.startScratch();
    };
    window.onScratchMove = (x, y) => { ParticleSystem.emitSparkles(x, y, 4); };
    window.onScratchEnd = () => { SoundManager.stopScratch(); };

    startTime = performance.now() / 1000;
    lastFrameTime = 0;
    animFrameId = requestAnimationFrame(animate);
  }

  let lastFrameTime = 0, animFrameId;

  function resizeCanvases() {
    const w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio;
    [treeCanvas, scratchCanvas, particleCanvas].forEach(c => {
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = w + 'px'; c.style.height = h + 'px';
    });
    treeCtx = treeCanvas.getContext('2d');
    treeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scratchCtx = scratchCanvas.getContext('2d', { willReadFrequently: true });
    particleCtx = particleCanvas.getContext('2d');
    particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ===== 引导光晕 =====
  function drawGuideGlow(elapsed) {
    const cx = window.innerWidth / 2, cy = window.innerHeight * 0.42;
    const breath = Math.sin(elapsed * 1.6) * 0.5 + 0.5;
    const r = Math.min(window.innerWidth * 0.08, 50) + breath * 18;

    // 涟漪
    const rippleR = r + 28 + breath * 15;
    const rg = particleCtx.createRadialGradient(cx, cy, r * 0.6, cx, cy, rippleR);
    rg.addColorStop(0, 'rgba(255,184,198,0.3)'); rg.addColorStop(0.5, 'rgba(255,184,198,0.1)'); rg.addColorStop(1, 'transparent');
    particleCtx.fillStyle = rg; particleCtx.beginPath(); particleCtx.arc(cx, cy, rippleR, 0, Math.PI * 2); particleCtx.fill();

    // 主光晕
    const gg = particleCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gg.addColorStop(0, 'rgba(255,215,0,0.7)'); gg.addColorStop(0.25, 'rgba(255,184,198,0.5)'); gg.addColorStop(0.6, 'rgba(255,150,170,0.15)'); gg.addColorStop(1, 'transparent');
    particleCtx.fillStyle = gg; particleCtx.beginPath(); particleCtx.arc(cx, cy, r, 0, Math.PI * 2); particleCtx.fill();

    // 核心
    const cg = particleCtx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.2);
    cg.addColorStop(0, 'rgba(255,255,255,0.9)'); cg.addColorStop(1, 'transparent');
    particleCtx.fillStyle = cg; particleCtx.beginPath(); particleCtx.arc(cx, cy, r * 0.2, 0, Math.PI * 2); particleCtx.fill();
  }

  function typewriter(text, el, speed, cb) {
    let i = 0; el.textContent = '';
    const t = setInterval(() => {
      if (i < text.length) { el.textContent += text[i]; i++; }
      else { clearInterval(t); if (cb) cb(); }
    }, speed);
  }

  // ===== 动画循环 =====
  function animate(ts) {
    animFrameId = requestAnimationFrame(animate);
    const sec = ts / 1000;
    if (lastFrameTime === 0) { lastFrameTime = sec; return; }
    const dt = Math.min(sec - lastFrameTime, 0.1);
    lastFrameTime = sec;
    const elapsed = sec - startTime;
    const w = window.innerWidth, h = window.innerHeight;

    // 清除粒子层
    particleCtx.clearRect(0, 0, w, h);

    // 1. 画树图背景
    treeCtx.clearRect(0, 0, w, h);
    const bg = treeCtx.createRadialGradient(w/2, h*0.35, h*0.05, w/2, h/2, h*0.9);
    bg.addColorStop(0, '#0d1020'); bg.addColorStop(1, '#020208');
    treeCtx.fillStyle = bg; treeCtx.fillRect(0, 0, w, h);

    // 星空
    for (let i = 0; i < 40; i++) {
      const sx = ((treeId*137 + i*271) % w), sy = ((treeId*137 + i*173) % (h*0.7));
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(elapsed * 1.5 + i * 0.7));
      treeCtx.globalAlpha = tw * 0.6; treeCtx.fillStyle = '#fff';
      treeCtx.beginPath(); treeCtx.arc(sx, sy, 0.7 + (i%3)*0.5, 0, Math.PI*2); treeCtx.fill();
    }
    treeCtx.globalAlpha = 1;

    // 树图（全屏）
    const img = new Image();
    img.src = `assets/tree-${treeId}.jpg`;
    if (img.complete) {
      const scale = h / img.naturalHeight;
      treeCtx.drawImage(img, (w - img.naturalWidth*scale)/2, 0, img.naturalWidth*scale, h);
      // 暗角
      const vg = treeCtx.createRadialGradient(w/2, h*0.44, h*0.25, w/2, h*0.44, h*0.72);
      vg.addColorStop(0, 'transparent'); vg.addColorStop(0.5, 'transparent'); vg.addColorStop(1, 'rgba(2,2,8,0.75)');
      treeCtx.fillStyle = vg; treeCtx.fillRect(0, 0, w, h);
    }

    // 2. 刮开层（disc 阶段不再更新，避免它把 pointerEvents 设回 none）
    if (state !== 'disc' && state !== 'done') {
      ScratchLayer.update(dt, elapsed);
    }

    // 3. 粒子
    ParticleSystem.update(dt, elapsed);

    // 引导光晕
    if (state === 'guide') drawGuideGlow(elapsed);

    // 爆炸过渡
    if (guideExploding) {
      guideExplosionTime += dt;
      const ep = guideExplosionTime / 0.5;
      if (ep >= 1) guideExploding = false;
      else {
        const cx = w/2, cy = h*0.42, r = 30 + ep*120, a = 1 - ep;
        const g = particleCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(255,215,0,${a*0.5})`); g.addColorStop(1, 'transparent');
        particleCtx.fillStyle = g; particleCtx.beginPath(); particleCtx.arc(cx, cy, r, 0, Math.PI*2); particleCtx.fill();
      }
    }

    ParticleSystem.draw(particleCtx, elapsed);

    // 圆片（disc 阶段）
    if (state === 'disc' || state === 'done') drawDiscs(treeCtx, w, h);
  }

  // ===== 进度回调 =====
  function onTreeProgress(pct) {
    if (pct >= 0.40 && !hasRevealed) {
      hasRevealed = true;
      ScratchLayer.triggerReveal(performance.now()/1000 - startTime);
      // 等揭示动画完成（1s淡出 + 0.5s缓冲）再进圆片阶段
      setTimeout(() => {
        state = 'disc';
        SoundManager.playBells();
        ParticleSystem.startSnow();
        document.getElementById('discHint').style.display = 'block';
        document.getElementById('discCounter').style.display = 'block';
        scratchCanvas.style.pointerEvents = 'auto';
        scratchCanvas.style.opacity = '1';
        // 清掉树刮擦残留，准备画圆片
        scratchCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        updateCounter();
        setupDiscTouch();
      }, 1500);
    }
  }

  // ===== 圆片 =====
  let discPositions = [];
  let scratchedPositions = []; // 已刮圆片（模块级）
  let selectedDiscPos = null;   // 当前选中的圆片

  function calcDiscs(w, h) {
    discPositions = [];
    const rows = [1, 2, 3, 4], cx = w / 2;
    const startY = h * 0.18, rowSpacing = h * 0.14, discR = w * 0.075;
    let pos = 1;
    rows.forEach((count, ri) => {
      const cy = startY + ri * rowSpacing;
      const tw = count * discR * 3;
      const sx = cx - tw/2 + discR*1.5;
      for (let i = 0; i < count; i++) {
        discPositions.push({ pos, x: sx + i*discR*3, y: cy, r: discR });
        pos++;
      }
    });
  }

  // 预加载圆片图片
  let discImg = new Image();
  discImg.src = 'assets/disc.jpg';

  function drawDiscs(ctx, w, h) {
    calcDiscs(w, h);
    discPositions.forEach(d => {
      if (scratchedPositions.includes(d.pos)) {
        // 已刮：显示底片（有奖 emoji 或无奖圆圈）
        ctx.save();
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.clip();
        const bg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        bg.addColorStop(0, '#2a2040'); bg.addColorStop(1, '#0d0d1a');
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r-1, 0, Math.PI*2); ctx.stroke();
        const prize = prizes.find(p => p.pos === d.pos);
        if (prize && prize.type === 'win') {
          const em = {'香草冰淇淋':'🍦','圣诞大餐':'🍽️','仙女棒':'✨','一条围巾':'🧣','立刻见面吧':'💝'};
          ctx.fillStyle = '#ffd700'; ctx.font = `${d.r*0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(em[prize.content]||'🎁', d.x, d.y, d.r*0.35);
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(d.x, d.y, d.r*0.35, 0, Math.PI*2); ctx.stroke();
        }
        ctx.restore();
      } else {
        // 未刮：银色圆片图
        ctx.save();
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.clip();
        if (discImg && discImg.complete) {
          ctx.drawImage(discImg, d.x - d.r, d.y - d.r, d.r*2, d.r*2);
        } else {
          const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
          g.addColorStop(0, '#e0e0e0'); g.addColorStop(0.5, '#b0b0b0'); g.addColorStop(1, '#606060');
          ctx.fillStyle = g; ctx.fill();
        }
        ctx.restore();
      }
      // 选中金色光环
      if (selectedDiscPos === d.pos && !scratchedPositions.includes(d.pos)) {
        ctx.strokeStyle = 'rgba(255,215,0,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 3, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }

  let discScratching = false;
  let activeDisc = null;

  function setupDiscTouch() {
    scratchCanvas.addEventListener('pointerdown', (e) => {
      if (state !== 'disc') return;
      calcDiscs(window.innerWidth, window.innerHeight);
      const rect = scratchCanvas.getBoundingClientRect();
      const tx = e.clientX - rect.left, ty = e.clientY - rect.top;
      for (const d of discPositions) {
        if (Math.sqrt((tx - d.x)**2 + (ty - d.y)**2) < d.r + 20) {
          if (scratchedPositions.includes(d.pos)) continue;
          const prize = prizes.find(p => p.pos === d.pos);
          if (!prize) return;
          // 选中圆片，在大画布上画银色涂层
          activeDisc = d;
          selectedDiscPos = d.pos;
          discScratching = true;

          // 在 scratchCanvas 上画银色圆片涂层
          const dpr = window.devicePixelRatio;
          scratchCtx.save();
          scratchCtx.globalCompositeOperation = 'source-over';
          scratchCtx.beginPath();
          scratchCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          scratchCtx.clip();
          if (discImg && discImg.complete) {
            scratchCtx.drawImage(discImg, d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
          } else {
            const g = scratchCtx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
            g.addColorStop(0, '#e0e0e0'); g.addColorStop(0.5, '#b0b0b0'); g.addColorStop(1, '#606060');
            scratchCtx.fillStyle = g; scratchCtx.fill();
          }
          scratchCtx.restore();

          // 开始刮
          scratchAtDisc(tx, ty);
          return;
        }
      }
    });

    scratchCanvas.addEventListener('pointermove', (e) => {
      if (!discScratching || !activeDisc) return;
      const rect = scratchCanvas.getBoundingClientRect();
      scratchAtDisc(e.clientX - rect.left, e.clientY - rect.top);
    });

    scratchCanvas.addEventListener('pointerup', () => {
      if (!discScratching || !activeDisc) return;
      discScratching = false;
      checkDiscProgress();
    });
  }

  function scratchAtDisc(x, y) {
    const d = activeDisc;
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.fillStyle = '#000';
    scratchCtx.beginPath();
    scratchCtx.arc(x, y, d.r * 0.35, 0, Math.PI * 2);
    scratchCtx.fill();
  }

  function checkDiscProgress() {
    const d = activeDisc;
    // 只在圆片区域内采样
    const size = Math.ceil(d.r * 2);
    const tmp = document.createElement('canvas'); tmp.width = size; tmp.height = size;
    const tx = tmp.getContext('2d');
    tx.drawImage(scratchCanvas, d.x - d.r, d.y - d.r, size, size, 0, 0, size, size);
    const img = tx.getImageData(0, 0, size, size);
    let transparent = 0, total = size * size;
    for (let i = 3; i < img.data.length; i += 4) {
      if (img.data[i] < 128) transparent++;
    }
    if (transparent / total >= 0.5) {
      // 清除 scratchCanvas 上该圆片区域
      scratchCtx.globalCompositeOperation = 'destination-out';
      scratchCtx.fillStyle = '#000';
      scratchCtx.beginPath();
      scratchCtx.arc(d.x, d.y, d.r + 4, 0, Math.PI * 2);
      scratchCtx.fill();
      activeDisc = null;
      // 触发结果
      onDiscDone(d.pos);
    }
  }

  function onDiscDone(pos) {
    selectedDiscPos = null;
    const prize = prizes.find(p => p.pos === pos);
    if (!prize) return;
    scratchCount++;
    scratchedPositions = scratchedPositions || [];
    scratchedPositions.push(pos);

    if (prize.type === 'win') {
      showPrizePopup(prize.content);
      window._scratchedWins = window._scratchedWins || [];
      if (!window._scratchedWins.find(w => w.position === pos)) {
        window._scratchedWins.push({ position: pos, content: prize.content });
      }
    }

    if (linkId !== 'demo') {
      CloudBase.saveReceiverState(linkId, {
        scratchCount, linkId,
        scratchedPositions: scratchedPositions,
        wins: window._scratchedWins || [],
      }).catch(() => {});
      // 埋点：刮完一次
      CloudBase.trackEvent('scratch_completed', { linkId, pos, type: prize.type }).catch(() => {});
    }

    updateCounter();
    if (scratchCount >= maxScratches) {
      state = 'done';
      // 延迟显示总结弹窗 + CTA
      setTimeout(() => {
        showSummary();
        document.getElementById('bottomCta').classList.add('show');
      }, 500);
    }
  }

  function updateCounter() {
    document.getElementById('discCounter').textContent = `还可以刮 ${maxScratches - scratchCount} 次`;
  }

  function showPrizePopup(content) {
    const emojiMap = { '香草冰淇淋':'🍦','圣诞大餐':'🍽️','仙女棒':'✨','一条围巾':'🧣','立刻见面吧':'💝' };
    document.getElementById('prizeEmoji').textContent = emojiMap[content] || '🎁';
    document.getElementById('prizeContent').textContent = content;
    document.getElementById('prizeOverlay').classList.add('show');
  }

  function showSummary() {
    const wins = window._scratchedWins || [];
    const list = document.getElementById('summaryList');
    if (wins.length > 0) {
      const em = {'香草冰淇淋':'🍦','圣诞大餐':'🍽️','仙女棒':'✨','一条围巾':'🧣','立刻见面吧':'💝'};
      list.innerHTML = wins.map(w => `${em[w.content]||'🎁'} ${w.content}`).join('<br>');
    } else {
      list.innerHTML = '虽然没有中奖…<br>但圣诞快乐 🎄';
    }
    document.getElementById('summaryOverlay').classList.add('show');
  }

  window.closePrizePopup = () => document.getElementById('prizeOverlay').classList.remove('show');
  window.goToCreate = () => {
    // 裂变来源：把当前链接记为父链接，接收者变新赠送者时继承
    sessionStorage.setItem('merry_parent_link', linkId);
    CloudBase.trackEvent('cta_clicked', { linkId }).catch(() => {});
    hide();
    Router.navigate('create');
  };

  function hide() {
    if (!container) return;
    container.classList.remove('active');
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (guideEl) guideEl.remove();
    ScratchLayer.destroy();
  }

  return { show, hide };
})();

Router.register('game', GamePage);
