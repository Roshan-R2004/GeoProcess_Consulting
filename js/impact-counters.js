/* Count-up metrics animate once per page load, only when first scrolled into view. */
(() => {
  'use strict';
  const animateCounter = (el) => {
    if (el.dataset.counted === 'true') return;
    el.dataset.counted = 'true';
    const target = Math.max(0, Number(el.dataset.countTo || 0));
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = Math.max(500, Number(el.dataset.countDuration || 1350));
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = `${prefix}${Math.round(target * easeOut(t)).toLocaleString()}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
    };
    el.setAttribute('aria-label', `${prefix}${target}${suffix}`);
    requestAnimationFrame(step);
  };
  const init = () => {
    const counters = [...document.querySelectorAll('.impact-count[data-count-to]')];
    if (!counters.length) return;
    if (!('IntersectionObserver' in window)) { counters.forEach(animateCounter); return; }
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    counters.forEach((counter) => observer.observe(counter));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
