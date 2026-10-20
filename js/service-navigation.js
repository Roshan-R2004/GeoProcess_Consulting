/* Services dropdown: usable with mouse, keyboard and touch/mobile navigation. */
(() => {
  'use strict';
  const closeAll = (except = null) => {
    document.querySelectorAll('.nav-service-menu.is-open').forEach((item) => {
      if (item === except) return;
      item.classList.remove('is-open');
      item.querySelector('.nav-service-toggle')?.setAttribute('aria-expanded', 'false');
    });
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-service-menu').forEach((item) => {
      const button = item.querySelector('.nav-service-toggle');
      if (!button) return;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = !item.classList.contains('is-open');
        closeAll(item);
        item.classList.toggle('is-open', willOpen);
        button.setAttribute('aria-expanded', String(willOpen));
      });
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.nav-service-menu')) closeAll();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAll();
        document.querySelector('.nav-service-toggle[aria-expanded="true"]')?.focus();
      }
    });
  });
})();
