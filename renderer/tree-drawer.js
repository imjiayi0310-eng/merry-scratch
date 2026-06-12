/**
 * tree-drawer.js — 圣诞树绘制模块（图片版）
 * 使用 AI 生成的手绘 PNG 图片作为圣诞树主体，
 * 叠加闪烁光点、背景星空、金光渗透效果
 */
const TreeDrawer = (() => {
  let treeImage = null;      // 当前树的 Image 对象
  let floatingLights = [];   // 浮动光点
  let loadPromise = null;    // 加载 Promise
  let currentTreeId = 1;

  // ========== 图片加载 ==========
  function init(treeId) {
    currentTreeId = treeId;
    floatingLights = [];
    const lightColors = ['#ffd700', '#ffcc88', '#ffeedd', '#ffffff', '#ffb8c6', '#ffddcc'];
    for (let i = 0; i < 35; i++) {
      floatingLights.push({
        x: 0.15 + Math.random() * 0.70,
        y: 0.05 + Math.random() * 0.80,
        color: lightColors[Math.floor(Math.random() * lightColors.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 3.5,
        size: 1.5 + Math.random() * 4.5,
      });
    }

    // 只加载当前分配的那棵树
    treeImage = new Image();
    loadPromise = new Promise((resolve) => {
      treeImage.onload = () => resolve(true);
      treeImage.onerror = () => resolve(false);
    });
    treeImage.src = `assets/tree-${treeId}.png`;

    return treeId;
  }

  function ready() {
    return loadPromise || Promise.resolve();
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
    groundGrad.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, height * 0.80, width, height * 0.20);

    // 4. 绘制手绘圣诞树图片
    if (treeId < 1 || treeId > 6) treeId = 1;
    if (treeImage && treeImage.complete && treeImage.naturalWidth > 0) {
      const img = treeImage;
      // 树占屏幕 88% 高度，完整显示整棵树
      const scale = (height * 0.88) / img.naturalHeight;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const drawX = (width - drawW) / 2;
      const drawY = height * 0.02;

      // ---- 绘制树图（撑满全屏） ----
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // ---- 聚光灯效果：中心明亮 → 边缘渐变融入纯黑背景 ----
      const cx = width / 2;
      const cy = height * 0.44;
      ctx.save();
      // 从内到外：全透明 → 半透明 → 不透明背景色
      const spotlight = ctx.createRadialGradient(cx, cy, height * 0.18, cx, cy, height * 0.72);
      spotlight.addColorStop(0, 'transparent');
      spotlight.addColorStop(0.40, 'transparent');
      spotlight.addColorStop(0.65, 'rgba(2,2,8,0.5)');
      spotlight.addColorStop(0.85, 'rgba(2,2,8,0.88)');
      spotlight.addColorStop(1, '#020208');
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // 5. 浮动闪烁光点（全屏定位）
      floatingLights.forEach(light => {
        const lx = light.x * width;
        const ly = light.y * height;
        const brightness = 0.3 + 0.7 * Math.abs(Math.sin(time * light.speed + light.phase));

        ctx.save();
        ctx.shadowColor = light.color;
        ctx.shadowBlur = brightness * 10;
        ctx.globalAlpha = 0.5 + brightness * 0.5;
        ctx.fillStyle = light.color;
        ctx.beginPath();
        ctx.arc(lx, ly, light.size * (0.7 + brightness * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = brightness * 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx, ly, light.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 6. 接近揭示时微微提亮（极轻微，不糊画质）
    }
  }

  function getTreeName(treeId) {
    const names = ['', '甜心粉', '梦幻紫', '童话蓝', '暖阳橘', '奶呼呼', '第6棵'];
    return names[treeId] || '神秘的树';
  }

  return { init, ready, draw, getTreeName };
})();
