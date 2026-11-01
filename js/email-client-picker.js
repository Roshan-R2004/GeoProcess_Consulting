(() => {
  'use strict';
  const CONTACT_EMAIL = 'contact@geoprocessconsulting.in';
  let lastTrigger = null;
  let currentMailto = `mailto:${CONTACT_EMAIL}`;

  const menu = document.createElement('div');
  menu.className = 'gp-email-client-menu';
  menu.id = 'gp-email-client-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Choose an email application');
  menu.innerHTML = `
    <div class="gp-email-client-menu__title">Open email with</div>
    <button type="button" role="menuitem" data-gp-client="default">
      <span class="gp-email-client-menu__icon" aria-hidden="true">✉</span>
      <span class="gp-email-client-menu__copy"><strong>Default Mail</strong><small>Use your device's mail app</small></span>
    </button>
    <button type="button" role="menuitem" data-gp-client="gmail">
      <span class="gp-email-client-menu__icon" aria-hidden="true">G</span>
      <span class="gp-email-client-menu__copy"><strong>Gmail</strong><small>Compose in Gmail</small></span>
    </button>
    <button type="button" role="menuitem" data-gp-client="outlook">
      <span class="gp-email-client-menu__icon" aria-hidden="true">O</span>
      <span class="gp-email-client-menu__copy"><strong>Outlook</strong><small>Compose in Outlook</small></span>
    </button>`;

  function ensureMenu() {
    if (!menu.isConnected) document.body.appendChild(menu);
  }

  function positionMenu(trigger) {
    const r = trigger.getBoundingClientRect();
    const w = Math.min(258, window.innerWidth - 24);
    const h = menu.offsetHeight || 180;
    let left = Math.min(Math.max(12, r.left), window.innerWidth - w - 12);
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 12 && r.top - h - 8 >= 12) top = r.top - h - 8;
    top = Math.min(Math.max(12, top), window.innerHeight - h - 12);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function closeMenu(returnFocus = false) {
    menu.dataset.open = 'false';
    if (lastTrigger) lastTrigger.setAttribute('aria-expanded', 'false');
    const trigger = lastTrigger;
    lastTrigger = null;
    if (returnFocus && trigger && typeof trigger.focus === 'function') trigger.focus();
  }

  function showMenu(trigger, href) {
    ensureMenu();
    if (lastTrigger && lastTrigger !== trigger) lastTrigger.setAttribute('aria-expanded', 'false');
    lastTrigger = trigger;
    currentMailto = href || `mailto:${CONTACT_EMAIL}`;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'true');
    menu.dataset.open = 'true';
    positionMenu(trigger);
  }

  function parsedMailto(href) {
    const raw = String(href || `mailto:${CONTACT_EMAIL}`).replace(/^mailto:/i, '');
    const queryIndex = raw.indexOf('?');
    const rawAddress = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
    const queryString = queryIndex >= 0 ? raw.slice(queryIndex + 1) : '';
    const params = new URLSearchParams(queryString);
    return {
      to: decodeURIComponent(rawAddress),
      subject: params.get('subject') || '',
      body: params.get('body') || ''
    };
  }

  function openClient(client) {
    const info = parsedMailto(currentMailto);
    const p = new URLSearchParams();
    p.set('to', info.to || CONTACT_EMAIL);
    if (info.subject) p.set('subject', info.subject);
    if (info.body) p.set('body', info.body);
    closeMenu(false);
    if (client === 'default') {
      // Preserve the exact mailto URI from the clicked link, including any subject/body.
      window.location.href = currentMailto;
      return;
    }
    const webParams = new URLSearchParams();
    if (info.to) webParams.set('to', info.to);
    if (info.subject) webParams.set(client === 'gmail' ? 'su' : 'subject', info.subject);
    if (info.body) webParams.set('body', info.body);
    const url = client === 'gmail'
      ? `https://mail.google.com/mail/?view=cm&fs=1&${webParams.toString()}`
      : `https://outlook.office.com/mail/deeplink/compose?${webParams.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  document.addEventListener('click', (event) => {
    const clientButton = event.target.closest('[data-gp-client]');
    if (clientButton && menu.contains(clientButton)) {
      event.preventDefault();
      openClient(clientButton.dataset.gpClient);
      return;
    }
    const emailLink = event.target.closest('a[href^="mailto:"]');
    if (emailLink) {
      // Existing dropdown choices should open their selected client directly.
      if (emailLink.closest('.email-menu, .contact-mail-menu')) return;
      const href = emailLink.getAttribute('href') || '';
      const address = decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).toLowerCase();
      if (address !== CONTACT_EMAIL) return;
      event.preventDefault();
      event.stopPropagation();
      if (lastTrigger === emailLink && menu.dataset.open === 'true') {
        closeMenu(false);
      } else {
        showMenu(emailLink, href);
      }
      return;
    }
    if (menu.dataset.open === 'true' && !menu.contains(event.target)) closeMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.dataset.open === 'true') {
      event.preventDefault();
      closeMenu(true);
    }
  });
  window.addEventListener('resize', () => { if (menu.dataset.open === 'true' && lastTrigger) positionMenu(lastTrigger); }, { passive: true });
  window.addEventListener('scroll', () => { if (menu.dataset.open === 'true' && lastTrigger) positionMenu(lastTrigger); }, { passive: true, capture: true });
})();
