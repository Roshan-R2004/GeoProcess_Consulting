(() => {
  const initNavigation = () => {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.site-nav nav');
    const list = document.querySelector('.nav-list');

    toggle?.addEventListener('click', () => {
      const open = nav?.classList.toggle('open') ?? false;
      list?.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    document.querySelectorAll('.nav-list a').forEach((link) => {
      link.addEventListener('click', () => {
        nav?.classList.remove('open');
        list?.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
      });
    });
  };

  const initDefaultMailFallback = () => {
    document.querySelectorAll('a[data-default-mail="true"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const email = 'contact@geoprocessconsulting.in';
        const subject = 'Project Enquiry - GeoProcess Consulting';
        const body = 'Hello GeoProcess Consulting,\n\nI would like to discuss a project with your team.\n\nProject details:\n';
        const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const fallback = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Use the browser's normal mail-handler first. If no handler exists,
        // fall back to Gmail Web rather than leaving the user with no response.
        event.preventDefault();
        const fallbackTimer = window.setTimeout(() => {
          if (!document.hidden) window.open(fallback, '_blank', 'noopener,noreferrer');
        }, 900);

        const cancelFallback = () => {
          window.clearTimeout(fallbackTimer);
          document.removeEventListener('visibilitychange', cancelFallback);
        };
        document.addEventListener('visibilitychange', cancelFallback, { once: true });

        window.location.href = mailto;
      });
    });
  };

  const initEmailMenus = () => {
    document.querySelectorAll('.nav-email, .email-dropdown-wrapper, .contact-mail-wrap').forEach((wrap) => {
      const button = wrap.querySelector('button');
      const menu = wrap.querySelector('.email-menu, .contact-mail-menu');
      if (!button || !menu) return;

      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const open = wrap.classList.toggle('open');
        button.setAttribute('aria-expanded', String(open));
      });
    });

    document.addEventListener('click', (event) => {
      document.querySelectorAll('.nav-email.open, .email-dropdown-wrapper.open, .contact-mail-wrap.open').forEach((wrap) => {
        if (!wrap.contains(event.target)) {
          wrap.classList.remove('open');
          wrap.querySelector('button')?.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.nav-email.open, .email-dropdown-wrapper.open, .contact-mail-wrap.open').forEach((wrap) => {
        wrap.classList.remove('open');
        wrap.querySelector('button')?.setAttribute('aria-expanded', 'false');
      });
    });
  };

  const initReveal = () => {
    const targets = document.querySelectorAll(
      'main > section, main > article, .card, .service-card-new, .project-card-fancy, .vintage-card, .cap, .outcome, .source-book'
    );
    targets.forEach((el) => el.setAttribute('data-gp-reveal', ''));

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('gp-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('gp-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px' });

    targets.forEach((el) => observer.observe(el));
  };

  const initBackTop = () => {
    const top = document.querySelector('.back-top, .study-back-top');
    if (!top) return;
    window.addEventListener('scroll', () => top.classList.toggle('show', window.scrollY > 500), { passive: true });
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const setYear = () => {
    document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDefaultMailFallback();
  initEmailMenus();
    initReveal();
    initBackTop();
    setYear();
  });
})();
