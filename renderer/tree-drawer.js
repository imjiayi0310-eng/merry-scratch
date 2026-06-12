/**
 * tree-drawer.js — 圣诞树绘制模块（图片版）
 * 使用 AI 生成的手绘 PNG 图片作为圣诞树主体，
 * 叠加闪烁光点、背景星空、金光渗透效果
 */
const TreeDrawer = (() => {
  let treeImages = [];       // 预加载的 Image 对象（索引 1-6）
  let floatingLights = [];   // 浮动光点 {x, y, color, phase, speed, size}
  let loaded = false;

  // ========== 图片预加载 ==========
  function init(treeId) {
    if (!loaded) {
      treeImages = [];
      for (let i = 1; i <= 6; i++) {
        const img = new Image();
        img.src = `assets/tree-${i}.png`;
        treeImages[i] = img;
      }
      loaded = true;
    }

    // 为每棵树生成浮动光点
    floatingLights = [];
    const lightColors = ['#ffd700', '#ffcc88', '#ffeedd', '#ffffff', '#ffb8c6', '#ffddcc'];
    for (let i = 0; i < 35; i++) {
      floatingLights.push({
        x: 0.15 + Math.random() * 0.70,  // 相对树区域位置 (0-1)
        y: 0.05 + Math.random() * 0.80,
        color: lightColors[Math.floor(Math.random() * lightColors.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 3.5,
        size: 1.5 + Math.random() * 4.5,
      });
    }

    return treeId;
  }

  // ========== 绘制 ==========
  function draw(ctx, width, height, treeId, time, scratchProgress) {
    ctx.clearRect(0, 0, width, height);

    // 1. 深色夜空背景
    const bgGrad = ctx.createRadialGradient(width / 2, height * 0.35, height * 0.05, width / 2, height / 2, height * 0.9);
    bgGrad.addColorStop(0, '#0d1020');
    bgGrad.addColorStop(1, '#020208');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. 背景小星星
    const starSeed = treeId * 137;
    for (let i = 0; i < 50; i++) {
      const sx = ((starSeed + i * 271) % width);
      const sy = ((starSeed + i * 173) % (height * 0.75));
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.5 + i * 0.7));
      ctx.globalAlpha = twinkle * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, 0.7 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 3. 地面微光
    const groundGrad = ctx.createLinearGradient(0, height * 0.80, 0, height);
    groundGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
    groundGrad.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, height * 0.80, width, height * 0.20);

    // 4. 绘制手绘圣诞树图片
    if (treeId < 1 || treeId > 6) treeId = 1;
    const img = treeImages[treeId];
    if (img && img.complete && img.naturalWidth > 0) {
      // 计算图片适配尺寸 — 让树占据画面 65-75% 高度
      const maxTreeH = height * 0.78;
      const maxTreeW = width * 0.88;
      const scale = Math.min(maxTreeW / img.naturalWidth, maxTreeH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const drawX = (width - drawW) / 2;
      const drawY = height * 0.03;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // 树区域边界（用于后续光点定位）
      const treeLeft = drawX;
      const treeTop = drawY;
      const treeRight = drawX + drawW;
      const treeBottom = drawY + drawH;
      const treeW = drawW;
      const treeH = drawH;

      // 5. 浮动闪烁光点（覆盖在树上）
      floatingLights.forEach(light => {
        const lx = treeLeft + light.x * treeW;
        const ly = treeTop + light.y * treeH;
        const brightness = 0.3 + 0.7 * Math.abs(Math.sin(time * light.speed + light.phase));

        ctx.save();
        // 外层光晕
        ctx.shadowColor = light.color;
        ctx.shadowBlur = brightness * 10;
        ctx.globalAlpha = 0.5 + brightness * 0.5;
        ctx.fillStyle = light.color;
        ctx.beginPath();
        ctx.arc(lx, ly, light.size * (0.7 + brightness * 0.5), 0, Math.PI * 2);
        ctx.fill();
        // 亮核
        ctx.globalAlpha = brightness * 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx, ly, light.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 6. 接近揭示时 —— 树区域从下方向上渗透金色暖光
      if (scratchProgress && scratchProgress > 0.25) {
        const glowIntensity = Math.min(1, (scratchProgress - 0.25) / 0.15); // 25%→40% 逐渐增强
        const glowGrad = ctx.createLinearGradient(0, treeBottom, 0, treeTop);
        glowGrad.addColorStop(0, `rgba(255,200,100,${glowIntensity * 0.35})`);
        glowGrad.addColorStop(0.6, `rgba(255,180,80,${glowIntensity * 0.12})`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(treeLeft, treeTop, treeW, treeH);
      }
    }
  }

  function getTreeName(treeId) {
    const names = ['', '甜心粉', '梦幻紫', '童话蓝', '暖阳橘', '奶呼呼', '第6棵'];
    return names[treeId] || '神秘的树';
  }

  return { init, draw, getTreeName };
})();
