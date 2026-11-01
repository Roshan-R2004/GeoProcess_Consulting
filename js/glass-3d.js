/* 3D glass tilt for cards — pointer devices only, respects reduced motion. */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL = '.cap,.pipe,.diff,.service-detail-card,.service-knowledge-card,.service-gallery-card,.service-card-new,' +
    '.project-card-fancy,.video-card-fancy,.booking-info-card,.contact-method,.case-item,.scope-item,.outcome,' +
    '.workflow-step,.project-stat,.story,.source-book,.closing,.fancy-cta,.projects-cta,.contact-final,.flagship';
  var MAX = 7, active = null, raf = 0;

  function reset(el) {
    el.classList.remove('gp-glass-tilt');
    el.classList.add('gp-glass-rest');
    el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
  }
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest(SEL);
    if (active && active !== el) { reset(active); active = null; }
    if (!el) return;
    active = el;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      if (!active) return;
      var r = active.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      active.classList.remove('gp-glass-rest');
      active.classList.add('gp-glass-tilt');
      active.style.setProperty('--ry', ((px - .5) * 2 * MAX).toFixed(2) + 'deg');
      active.style.setProperty('--rx', ((.5 - py) * 2 * MAX).toFixed(2) + 'deg');
      active.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      active.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
  }, { passive: true });
  document.addEventListener('pointerleave', function () { if (active) { reset(active); active = null; } }, true);
})();
