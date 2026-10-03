/**
 * create.js — 赠送者设置页（两步）
 * 步骤1：选树 → 步骤2：配圆片 + 设次数 → 生成链接
 * 逻辑：点了圆片并填了内容 = 有奖；没碰过 = 无奖
 */
const CreatePage = (() => {
  let container;
  let selectedTree = 1;
  let discConfig = [];
  let scratchCount = 5;
  let activeDiscPos = null;
  const TOTAL_DISCS = 10;

  function show() {
    container = document.getElementById('page-create');
    if (!container) return;
    container.classList.add('active');

    // 重置状态
    discConfig = [];
    for (let i = 1; i <= TOTAL_DISCS; i++) {
      discConfig.push({ pos: i, type: 'lose', content: '' });
    }
    selectedTree = 1;
    scratchCount = 5;
    activeDiscPos = null;
    document.getElementById('linkResult').classList.remove('show');

    // 显示步骤 1
    document.getElementById('createStep1').style.display = 'block';
    document.getElementById('createStep2').style.display = 'none';

    bindTreeSelection();
    bindCountButtons();
    bindGenerate();
    renderTreeSelection();
    renderDiscs();
  }

  function bindTreeSelection() {
    container.querySelectorAll('.tree-option').forEach(el => {
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
      newEl.addEventListener('click', () => {
        selectedTree = parseInt(newEl.dataset.tree);
        renderTreeSelection();
      });
    });
  }

  function renderTreeSelection() {
    container.querySelectorAll('.tree-option').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.tree) === selectedTree);
    });
  }

  // ===== 圆片选中 =====
  function highlightDisc(pos) {
    container.querySelectorAll('.disc-dot').forEach(el => {
      const isActive = parseInt(el.dataset.pos) === pos;
      el.style.boxShadow = isActive ? '0 0 12px rgba(255,215,0,0.6)' : '';
    });
  }

  function showDiscEditor(pos) {
    const panel = document.getElementById('discEditor');
    panel.style.display = 'block';
    panel.querySelector('.disc-editor-pos').textContent = `第 ${pos} 个圆片`;
    const input = document.getElementById('prizeCustomInput');
    input.value = discConfig[pos - 1].content || '';
  }

  // 全局回调：点击圆片（选中+显示编辑器，不弹键盘）
  window._onDiscClick = (pos) => {
    activeDiscPos = pos;
    highlightDisc(pos);
    // 显示快捷选项和自定义输入区域
    document.getElementById('discEditor').classList.add('show');
    document.querySelector('.disc-editor-pos').textContent = `第 ${pos} 个圆片`;
    document.getElementById('prizeCustomInput').value = discConfig[pos - 1].content || '';
  };
  // 全局回调：快捷选项（直接填，不动输入框）
  window._onQuickPrize = (content) => {
    if (!activeDiscPos) { showToast('请先点击一个圆片'); return; }
    discConfig[activeDiscPos - 1] = { pos: activeDiscPos, type: 'win', content };
    renderDiscs();
  };
  // 全局回调：自定义回车确认
  window._onCustomEnter = () => {
    if (!activeDiscPos) { showToast('请先点击一个圆片'); return; }
    const val = document.getElementById('prizeCustomInput').value.trim();
    if (!val) return;
    discConfig[activeDiscPos - 1] = { pos: activeDiscPos, type: 'win', content: val };
    renderDiscs();
    document.getElementById('prizeCustomInput').value = '';
  };

  function bindCountButtons() {
    document.getElementById('countDown').addEventListener('click', () => {
      if (scratchCount > 1) scratchCount--;
      document.getElementById('countValue').textContent = scratchCount;
    });
    document.getElementById('countUp').addEventListener('click', () => {
      if (scratchCount < 10) scratchCount++;
      document.getElementById('countValue').textContent = scratchCount;
    });
  }

  // 读取裂变来源：从游戏页带过来的父链接 id，用完清掉
  function getParentLinkId() {
    const pid = sessionStorage.getItem('merry_parent_link');
    sessionStorage.removeItem('merry_parent_link');
    return pid || null;
  }

  function bindGenerate() {
    const btn = document.getElementById('generateBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', async () => {
      newBtn.textContent = '生成中…';
      newBtn.disabled = true;
      try {
        const linkId = await CloudBase.createLink({
          treeId: selectedTree,
          prizes: discConfig,
          maxScratches: scratchCount,
        }, getParentLinkId());

        // 埋点：创建链接
        CloudBase.trackEvent('link_created', { linkId });
        const url = `${window.location.origin}${window.location.pathname}#/video?redirect=game&id=${linkId}&treeId=${selectedTree}`;
        document.getElementById('linkUrl').textContent = url;
        document.getElementById('linkResult').classList.add('show');
        document.getElementById('copyBtn').onclick = () => {
          navigator.clipboard.writeText(url).then(() => showToast('链接已复制！'));
        };
        const myLinks = JSON.parse(localStorage.getItem('merry_my_links') || '[]');
        myLinks.push({ linkId, treeId: selectedTree, createdAt: Date.now() });
        localStorage.setItem('merry_my_links', JSON.stringify(myLinks));
        newBtn.textContent = '✨ 生成专属链接';
        newBtn.disabled = false;
      } catch (err) {
        console.error('生成失败:', err);
        newBtn.textContent = '✨ 生成专属链接';
        newBtn.disabled = false;
        showToast('生成失败：' + (err.message || '请重试'));
      }
    });
  }

  function renderDiscs() {
    container.querySelectorAll('.disc-dot').forEach(el => {
      const pos = parseInt(el.dataset.pos);
      const cfg = discConfig[pos - 1];
      if (cfg.type === 'win' && cfg.content) {
        el.classList.add('prize-set');
        el.textContent = cfg.content.slice(0, 2);
      } else {
        el.classList.remove('prize-set');
        el.textContent = pos;
      }
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function hide() {
    if (container) container.classList.remove('active');
  }

  return { show, hide };
})();

Router.register('create', CreatePage);
