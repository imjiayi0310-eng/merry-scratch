/**
 * video.js — 视频播放页
 * 标题页 → XMLHttpRequest 真实下载进度 → 视频全屏
 */
const VideoPage = (() => {
  let container, redirectTo, xhr;

  async function show(params) {
    container = document.getElementById('page-video');
    if (!container) return;
    container.classList.add('active');

    redirectTo = params.redirect || 'game';
    const video = container.querySelector('video');
    const splash = container.querySelector('.video-splash');
    const progressBar = container.querySelector('.progress-bar');
    const progressText = container.querySelector('.progress-text');
    const skipBtn = container.querySelector('.video-skip');
    const linkId = params.id || '';

    // 埋点：打开链接
    if (linkId) {
      CloudBase.trackEvent('link_opened', { linkId }).catch(() => {});
    }

    if (sessionStorage.getItem('merry_video_watched_' + linkId)) {
      goToNext(linkId); return;
    }

    // 重置
    splash.style.display = 'flex';
    video.style.display = 'none';
    if (skipBtn) skipBtn.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
    if (xhr) xhr.abort();

    // 用 XHR 下载视频，获取真实字节进度
    xhr = new XMLHttpRequest();
    xhr.open('GET', 'assets/intro.mp4', true);
    xhr.responseType = 'blob';

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressText) progressText.textContent = pct + '%';
      }
    };

    xhr.onload = () => {
      // 进度 100%
      if (progressBar) progressBar.style.width = '100%';
      if (progressText) progressText.textContent = '100%';
      // 用已下载的 blob 播放，不重新下载
      const blobUrl = URL.createObjectURL(xhr.response);
      video.src = blobUrl;
      video.muted = true;
      splash.style.display = 'none';
      video.style.display = 'block';
      video.play().then(() => {
        setTimeout(() => { video.muted = false; }, 200);
      }).catch(() => {});
    };

    xhr.onerror = () => {
      splash.style.display = 'none';
      video.style.display = 'none';
      if (skipBtn) skipBtn.style.display = 'block';
    };

    xhr.send();

    video.onended = () => {
      sessionStorage.setItem('merry_video_watched_' + linkId, '1');
      goToNext(linkId);
    };
  }

  function goToNext(linkId) {
    if (xhr) xhr.abort();
    container.classList.remove('active');
    container.querySelector('video').pause();
    const params = linkId ? `id=${linkId}` : '';
    const treeId = Router.getParams().treeId || '1';
    Router.navigate('game', `${params}${params ? '&' : ''}treeId=${treeId}`);
  }

  function hide() {
    if (xhr) xhr.abort();
    if (!container) return;
    container.classList.remove('active');
    container.querySelector('video').pause();
  }

  window.skipVideo = () => {
    if (xhr) xhr.abort();
    const linkId = Router.getParams().id || '';
    sessionStorage.setItem('merry_video_watched_' + linkId, '1');
    goToNext(linkId);
  };

  return { show, hide };
})();

Router.register('video', VideoPage);
