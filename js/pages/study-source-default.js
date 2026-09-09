/* Default source-library state: keep every PDF page closed when study.html opens.
       Users can open individual pages or use the Expand All control. */
    (function () {
      'use strict';
      function closeAllSourcePages() {
        document.querySelectorAll('#sourceBooks .source-page').forEach(function (page) {
          page.removeAttribute('open');
        });
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', closeAllSourcePages, {once: true});
      } else {
        closeAllSourcePages();
      }
    })();
