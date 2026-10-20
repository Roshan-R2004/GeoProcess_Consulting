/* The original glass/LiDAR progress-and-shutter loading sequence, shared by every page. */
(() => {
  const curtain = document.getElementById('page-curtain');
  const video = document.querySelector('.site-background-video');

  if (video) {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    // Slow only the full-page background video to half speed; featured footage clips stay unchanged.
    video.defaultPlaybackRate = 0.5;
    video.playbackRate = 0.5;
    video.addEventListener('loadedmetadata', () => {
      video.defaultPlaybackRate = 0.5;
      video.playbackRate = 0.5;
    }, { once: true });
    const playback = video.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        // Keep the poster visible if autoplay is blocked by the browser.
      });
    }
  }

  if (!curtain) return;
  const bar = document.getElementById('loader-bar');
  const percent = document.getElementById('loader-percent');
  const status = document.getElementById('loader-status');
  const core = document.getElementById('glass-loader-core');
  const laser = document.getElementById('glass-horizon-laser');
  const panes = Array.from(curtain.querySelectorAll('.glass-shutter-pane'));
  document.body.setAttribute('aria-busy', 'true');

  const setProgress = (value) => {
    const p = Math.max(0, Math.min(100, Math.round(value)));
    if (bar) bar.style.width = p + '%';
    if (percent) percent.textContent = String(p).padStart(3, '0') + '%';
    if (status) status.textContent = p > 65 ? 'LOCKING WGS84 SPATIAL DATUM...' : 'SYNCHRONIZING POINT-CLOUD TELEMETRY';
  };

  const finish = () => {
    if (!curtain.isConnected) return;
    curtain.setAttribute('aria-hidden', 'true');
    curtain.style.pointerEvents = 'none';
    curtain.style.display = 'none';
    document.body.removeAttribute('aria-busy');
  };

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setProgress(100);
    window.setTimeout(finish, 180);
    return;
  }

  if (window.gsap && typeof window.gsap.timeline === 'function') {
    const gsap = window.gsap;
    const progress = { value: 0 };
    gsap.set(core, { scale: 1, opacity: 1, filter: 'blur(0px)' });
    gsap.set(laser, { scaleX: 0, opacity: 1, height: '2px', filter: 'blur(0px)' });
    gsap.set(panes, { rotateY: 0, scaleX: 1, opacity: 1, yPercent: 0 });

    const timeline = gsap.timeline({ onComplete: finish });
    timeline.to(progress, {
      value: 100,
      duration: 1.35,
      ease: 'power2.inOut',
      onUpdate: () => setProgress(progress.value)
    })
      .to(laser, { scaleX: 1, duration: .35, ease: 'expo.out' }, '-=.15')
      .to(core, { scale: 1.18, opacity: 0, filter: 'blur(24px)', duration: .5, ease: 'power3.in' }, '-=.1')
      .to(laser, { opacity: 0, height: '140px', filter: 'blur(30px)', duration: .45, ease: 'power2.out' }, '<')
      .to(panes, {
        rotateY: 78,
        scaleX: 0,
        yPercent: (index) => index % 2 === 0 ? -18 : 18,
        opacity: 0,
        duration: .95,
        stagger: { each: .065, from: 'center' },
        ease: 'expo.inOut'
      }, '-=.32');
  } else {
    // Dependency-safe fallback: the same progress display and an opening shutter, then reveal content.
    const start = performance.now();
    const update = () => {
      const p = Math.min(100, ((performance.now() - start) / 1450) * 100);
      setProgress(p);
      if (p < 100) requestAnimationFrame(update);
      else {
        curtain.classList.add('is-fallback-opening');
        window.setTimeout(() => {
          curtain.classList.add('is-fallback-fading');
          window.setTimeout(finish, 380);
        }, 780);
      }
    };
    requestAnimationFrame(update);
  }
})();
