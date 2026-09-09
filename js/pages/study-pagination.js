/* ===== SOURCE BOOK PAGE PAGINATION =====
       Each source book gets its own independent navigator:
       1–N -> 1–10, 11–20... -> individual page numbers.
       The existing PDF page text remains untouched; only visibility is managed.
    */
    (function () {
      'use strict';
      const root = document.getElementById('sourceBooks');
      if (!root) return;

      const RANGE_SIZE = 10;

      function makeButton(label, className, handler) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'source-page-nav-button ' + (className || '');
        b.textContent = label;
        b.addEventListener('click', handler);
        return b;
      }

      function buildBookNavigation(book) {
        const pagesContainer = book.querySelector('.source-pages');
        if (!pagesContainer || book.querySelector('.source-page-navigation')) return;

        const pages = [...pagesContainer.querySelectorAll(':scope > .source-page')]
          .sort((a, b) => Number(a.dataset.page) - Number(b.dataset.page));
        if (!pages.length) return;

        const total = pages.length;
        const nav = document.createElement('div');
        nav.className = 'source-page-navigation is-compact';
        nav.setAttribute('aria-label', 'Source book page navigation');

        const head = document.createElement('div');
        head.className = 'source-page-navigation-head';
        const title = document.createElement('span');
        title.className = 'source-page-navigation-title';
        title.textContent = 'Book pages';
        const count = document.createElement('span');
        count.className = 'source-page-navigation-count';
        count.textContent = total + ' pages';
        head.append(title, count);

        const rootRow = document.createElement('div');
        rootRow.className = 'source-page-nav-row root-row';
        const rootButton = makeButton('1–' + total, 'range-root', () => {
          nav.classList.remove('is-compact');
          rootButton.classList.toggle('active');
          rangeSub.classList.toggle('open', true);
          pageSub.classList.remove('open');
        });
        rootRow.appendChild(rootButton);

        const rangeSub = document.createElement('div');
        rangeSub.className = 'source-page-nav-sub';

        const pageSub = document.createElement('div');
        pageSub.className = 'source-page-nav-sub';

        const ranges = [];
        for (let start = 1; start <= total; start += RANGE_SIZE) {
          const end = Math.min(start + RANGE_SIZE - 1, total);
          ranges.push({start, end});
        }

        let activeRangeButton = null;
        let activePageButton = null;

        function showPage(pageNumber, pageButton) {
          pages.forEach(page => page.classList.toggle('page-active', Number(page.dataset.page) === pageNumber));
          if (activePageButton) activePageButton.classList.remove('active');
          activePageButton = pageButton;
          if (activePageButton) activePageButton.classList.add('active');
          const target = pages.find(page => Number(page.dataset.page) === pageNumber);
          if (target) {
            target.open = true;
            requestAnimationFrame(() => target.scrollIntoView({behavior: 'smooth', block: 'start'}));
          }
        }

        function showRange(start, end, rangeButton) {
          if (activeRangeButton) activeRangeButton.classList.remove('active');
          activeRangeButton = rangeButton;
          rangeButton.classList.add('active');
          pageSub.innerHTML = '';
          pageSub.classList.add('open');
          pages.forEach(page => page.classList.remove('page-active'));
          for (let n = start; n <= end; n++) {
            const b = makeButton(String(n), '', () => showPage(n, b));
            pageSub.appendChild(b);
          }
          pageSub.querySelector('button')?.focus();
        }

        ranges.forEach(({start, end}) => {
          const b = makeButton(start + '–' + end, '', () => showRange(start, end, b));
          rangeSub.appendChild(b);
        });

        nav.append(head, rootRow, rangeSub, pageSub);
        pagesContainer.parentNode.insertBefore(nav, pagesContainer);
        pagesContainer.classList.add('page-nav-managed');

        /* Start clean: only the top-level 1–N control is visible. */
        pages.forEach(page => {
          page.classList.remove('page-active');
          page.removeAttribute('open');
        });
      }

      root.querySelectorAll('.source-book').forEach(buildBookNavigation);
    })();
