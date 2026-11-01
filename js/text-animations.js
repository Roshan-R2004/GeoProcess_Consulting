/* Text animation for site-level H1/H2 headings.
   1) Character-by-character hover lift.
   2) Word-by-word entrance reveal (slide up + fade + de-blur) played when a
      heading scrolls into view; hero headings wait for the loading curtain.
   Splits text nodes rather than replacing innerHTML, so nested accent spans
   remain intact. The reveal uses the Web Animations API (no GSAP dependency)
   so it is unaffected by the sitewide CSS `animation/transition: none` reset.
   Homepage headings (.split-animate) keep their own GSAP animation. */
(() => {
  'use strict';

  const HEADING_SELECTOR = 'h1, h2';
  // Keep the loading curtain inert. Study Hub source-book pages are handled
  // lazily when their <details> section opens, so closed reference text doesn't
  // incur thousands of extra character spans at initial page load.
  const EXCLUDED_ANCESTORS = '.page-transition-curtain';

  const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const CAN_REVEAL = !REDUCED_MOTION && typeof Element.prototype.animate === 'function';
  const REVEAL_DURATION = 780;   // ms per word
  const REVEAL_STAGGER = 55;     // ms between words
  const REVEAL_MAX_SPREAD = 650; // cap total stagger so long headings don't drag

  // ---- Wait for the page-load curtain before revealing above-the-fold text ----
  const curtainWaiters = [];
  let curtainWatching = false;

  function curtainActive() {
    const curtain = document.getElementById('page-curtain');
    if (!curtain || !curtain.isConnected) return false;
    if (curtain.getAttribute('aria-hidden') === 'true') return false;
    return window.getComputedStyle(curtain).display !== 'none';
  }

  function flushCurtainWaiters() {
    while (curtainWaiters.length) {
      const callback = curtainWaiters.shift();
      callback();
    }
  }

  function afterCurtain(callback) {
    if (!curtainActive()) { callback(); return; }
    curtainWaiters.push(callback);
    if (curtainWatching) return;
    curtainWatching = true;
    const curtain = document.getElementById('page-curtain');
    const check = () => { if (!curtainActive()) { observer.disconnect(); flushCurtainWaiters(); } };
    const observer = new MutationObserver(check);
    observer.observe(curtain, { attributes: true, attributeFilter: ['aria-hidden', 'style', 'class'] });
    // Safety net: never leave text hidden if the curtain script fails.
    window.setTimeout(() => { observer.disconnect(); flushCurtainWaiters(); }, 5000);
  }

  // ---- Entrance reveal ----
  let revealObserver = null;

  function playReveal(heading) {
    const words = heading.querySelectorAll('.gp-letter-word');
    const step = words.length > 1 ? Math.min(REVEAL_STAGGER, REVEAL_MAX_SPREAD / (words.length - 1)) : 0;
    words.forEach((word, index) => {
      word.animate(
        [
          { opacity: 0, transform: 'translateY(0.55em)', filter: 'blur(8px)' },
          { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
        ],
        {
          duration: REVEAL_DURATION,
          delay: index * step,
          easing: 'cubic-bezier(.2,.7,.2,1)',
          fill: 'backwards' // holds the hidden first frame during the stagger delay
        }
      );
    });
    // The backwards-fill keeps words hidden until their delay ends, so the
    // pending class can be dropped immediately without a flash.
    heading.classList.remove('gp-reveal-pending');
    heading.classList.add('gp-reveal-done');
  }

  function prepareReveal(heading) {
    if (!CAN_REVEAL) return;
    if (heading.classList.contains('split-animate')) return;      // homepage has its own animation
    if (heading.closest('.source-page')) return;                  // Study Hub book pages: no entrance motion
    if (!heading.querySelector('.gp-letter-word')) return;

    heading.classList.add('gp-reveal-pending');

    if (!('IntersectionObserver' in window)) {
      afterCurtain(() => playReveal(heading));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealObserver.unobserve(entry.target);
          afterCurtain(() => playReveal(entry.target));
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    }
    revealObserver.observe(heading);
  }

  function splitTextNode(textNode) {
    const value = textNode.nodeValue || '';
    if (!value || !value.trim()) return;

    const fragment = document.createDocumentFragment();
    // Retain whitespace as real text so headings can wrap naturally at spaces.
    const tokens = value.match(/\s+|[^\s]+/gu) || [];

    for (const token of tokens) {
      if (/^\s+$/u.test(token)) {
        fragment.appendChild(document.createTextNode(token));
        continue;
      }

      const word = document.createElement('span');
      word.className = 'gp-letter-word';
      word.setAttribute('role', 'presentation');

      for (const character of Array.from(token)) {
        const letter = document.createElement('span');
        letter.className = 'gp-heading-char';
        letter.textContent = character;
        letter.setAttribute('aria-hidden', 'true');
        word.appendChild(letter);
      }
      fragment.appendChild(word);
    }

    textNode.parentNode.replaceChild(fragment, textNode);
  }

  function animateHeading(heading) {
    if (!(heading instanceof Element)) return;
    if (!heading.matches(HEADING_SELECTOR)) return;
    if (heading.dataset.gpLetterHoverReady === 'true') return;
    if (heading.closest(EXCLUDED_ANCESTORS)) return;
    const sourcePage = heading.closest('.source-page');
    if (sourcePage && !sourcePage.open) return;
    if (!heading.textContent || !heading.textContent.trim()) return;

    const accessibleText = heading.textContent.replace(/\s+/gu, ' ').trim();
    if (accessibleText && !heading.hasAttribute('aria-label')) {
      heading.setAttribute('aria-label', accessibleText);
    }

    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest('.gp-heading-char')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.parentElement && node.parentElement.closest('script, style, noscript')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(splitTextNode);
    heading.dataset.gpLetterHoverReady = 'true';
    heading.classList.add('gp-letter-hover-heading');
    prepareReveal(heading);
  }

  function processRoot(root) {
    if (!root) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.matches(HEADING_SELECTOR)) {
      animateHeading(root);
    }
    if (typeof root.querySelectorAll === 'function') {
      root.querySelectorAll(HEADING_SELECTOR).forEach(animateHeading);
    }
  }

  function init() {
    processRoot(document);

    // Some page headings (notably the interactive Study Hub) are created after
    // load. Observe only added content and process newly-created H1/H2 tags.
    // The Study Hub contains thousands of source-book headings inside closed
    // <details>. Animate them too, but only after a reader opens the page.
    document.addEventListener('toggle', (event) => {
      const details = event.target;
      if (details instanceof HTMLDetailsElement && details.open && details.classList.contains('source-page')) {
        processRoot(details);
      }
    }, true);

    if ('MutationObserver' in window) {
      const observer = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) processRoot(node);
          });
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
