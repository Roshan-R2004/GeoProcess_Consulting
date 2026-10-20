/* Character-by-character hover animation for site-level H1/H2 headings.
   Splits text nodes rather than replacing innerHTML, so nested accent spans and
   the homepage's existing split-word markup remain intact. */
(() => {
  'use strict';

  const HEADING_SELECTOR = 'h1, h2';
  // Keep the loading curtain inert. Study Hub source-book pages are handled
  // lazily when their <details> section opens, so closed reference text doesn't
  // incur thousands of extra character spans at initial page load.
  const EXCLUDED_ANCESTORS = '.page-transition-curtain';

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
