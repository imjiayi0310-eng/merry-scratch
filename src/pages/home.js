/**
 * home.js — 首页：两个入口按钮
 */
const HomePage = (() => {
  let container;

  function show() {
    container = document.getElementById('page-home');
    if (!container) return;

    container.classList.add('active');

    // 生成背景星星
    const starsEl = container.querySelector('.home-stars');
    if (starsEl && !starsEl.children.length) {
      for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.style.cssText = `
          position:absolute; border-radius:50%; background:#fff;
          left:${Math.random()*100}%; top:${Math.random()*100}%;
          width:${0.5+Math.random()*2}px; height:${0.5+Math.random()*2}px;
          animation: twinkle ${1.5+Math.random()*3}s ease-in-out infinite;
          animation-delay: ${Math.random()*5}s;
          opacity: 0.3;
        `;
        starsEl.appendChild(star);
      }
    }
  }

  function hide() {
    if (container) container.classList.remove('active');
  }

  return { show, hide };
})();

// Register
Router.register('home', HomePage);
