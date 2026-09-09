/* ===== SOURCE LIBRARY SEARCH ENGINE v2 =====
       Built for the complete 18-book / 1,038-page reference library.
       Search is performed against a pre-built page index, not the live DOM.
       Supports: exact phrases, AND terms, OR, exclusions (-term), aliases,
       typo-tolerant matching, title/heading boosts, proximity scoring,
       relevance-ranked snippets, keyboard navigation and exact-page opening.
    */
    (function () {
      'use strict';
      const root = document.getElementById('sourceBooks');
      const search = document.getElementById('sourceLibrarySearch');
      const count = document.getElementById('sourceLibraryCount');
      const expand = document.getElementById('sourceExpandAll');
      const collapse = document.getElementById('sourceCollapseAll');
      if (!root || !search) return;

      const books = [...root.querySelectorAll('.source-book')];
      const STOP = new Set('the and for with from into that this what when where which how are was were will can you your about page book guide complete deep dive study a an of to in on by as is be or it at from'.split(' '));
      const ALIASES = {
        lidar: ['light detection and ranging', 'point cloud', 'las', 'laz'],
        'point-cloud': ['point cloud', 'lidar'], las: ['lidar'], laz: ['lidar'],
        gis: ['geographic information system', 'geospatial information system'],
        dtm: ['digital terrain model', 'bare earth'], dsm: ['digital surface model'],
        dem: ['digital elevation model'], tin: ['triangulated irregular network'],
        rtk: ['real time kinematic', 'real-time kinematic'], ppk: ['post processed kinematic', 'post-processed kinematic'],
        gnss: ['global navigation satellite system'], gps: ['global positioning system', 'gnss'],
        gcp: ['ground control point', 'ground control points'], crs: ['coordinate reference system'],
        epsg: ['coordinate reference system', 'crs'], cad: ['computer aided design', 'computer-aided design'],
        bim: ['building information modeling', 'building information modelling'],
        ortho: ['orthophoto', 'orthomosaic'], arcpy: ['arcgis python', 'arcgis geoprocessing'],
        pyqgis: ['qgis python'], postgis: ['postgresql spatial database'],
        qa: ['quality assurance'], qc: ['quality control'], qaqc: ['quality assurance quality control'],
        ai: ['artificial intelligence'], ml: ['machine learning'],
        uav: ['drone', 'unmanned aerial vehicle'], rgb: ['red green blue'], nir: ['near infrared'],
        ftth: ['fiber to the home'], osp: ['outside plant'], olt: ['optical line terminal'],
        ont: ['optical network terminal'], pon: ['passive optical network'],
        ohe: ['overhead equipment'], bim: ['building information modeling', 'building information modelling']
      };

      function norm(v) {return String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();}
      function toks(v) {return norm(v).split(' ').filter(x => x && !STOP.has(x));}
      function esc(v) {return String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));}
      function escRe(v) {return String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}
      function levenshtein(a, b) {
        if (a === b) return 0; if (!a) return b.length; if (!b) return a.length;
        if (Math.abs(a.length - b.length) > 2) return 3;
        let prev = Array.from({length: b.length + 1}, (_, i) => i);
        for (let i = 1; i <= a.length; i++) {let cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur;}
        return prev[b.length];
      }
      function wordVariants(term) {
        const out = new Set([term]);
        (ALIASES[term] || []).forEach(a => toks(a).forEach(x => out.add(x)));
        return [...out];
      }
      function parseQuery(raw) {
        const original = String(raw || '').trim();
        const phrases = []; const used = [];
        const withoutQuotes = original.replace(/"([^"]+)"/g, (_, p) => {phrases.push(norm(p)); return ' ';});
        const pieces = withoutQuotes.match(/(?:\+|-)?[^\s]+/g) || [];
        const must = [], optional = [], exclude = [];
        pieces.forEach(p => {
          let mode = 'optional'; if (p[0] === '+') mode = 'must', p = p.slice(1); else if (p[0] === '-') mode = 'exclude', p = p.slice(1);
          p = norm(p); if (!p) return;
          if (/^or$/i.test(p)) return;
          if (mode === 'exclude') exclude.push(p); else if (mode === 'must') must.push(p); else optional.push(p);
        });
        const all = [...phrases, ...must, ...optional].filter(Boolean);
        return {original, phrases, must, optional, exclude, all, terms: [...new Set(all.flatMap(wordVariants))]};
      }

      /* ===== MOBILE-SAFE LAZY INDEX =====
         The desktop version can build all 1,038 page records immediately. On phones/tablets
         that can cause a long main-thread pause and excessive temporary memory. We therefore
         collect page references immediately, then build the searchable records in small idle
         chunks. The page text itself is never rewritten or removed. */
      const index = []; const df = new Map();
      const pendingPages = [];
      books.forEach((book, bookIndex) => {
        const title = (book.querySelector('.source-book-head h3')?.textContent || book.dataset.title || `Source Book ${bookIndex + 1}`).trim();
        const titleNorm = norm(title);
        [...book.querySelectorAll('.source-page')].forEach(page => pendingPages.push({book, bookIndex, title, titleNorm, page}));
      });
      const N = pendingPages.length;
      let buildCursor = 0, indexReady = false, queuedSearch = null;
      const BUILD_CHUNK = 18;
      const scheduleIdle = fn => (window.requestIdleCallback ? window.requestIdleCallback(fn, {timeout:180}) : setTimeout(fn, 0));

      function buildIndexChunk() {
        const end = Math.min(buildCursor + BUILD_CHUNK, pendingPages.length);
        for (; buildCursor < end; buildCursor++) {
          const x = pendingPages[buildCursor], pageNo = Number(x.page.dataset.page || 0);
          const summary = (x.page.querySelector('summary')?.textContent || `Page ${pageNo}`).trim();
          const body = (x.page.querySelector('.source-page-body')?.textContent || '').replace(/\s+/g, ' ').trim();
          const lines = (x.page.querySelector('.source-page-body')?.innerText || '').split(/\n+/).map(v => v.trim()).filter(Boolean);
          const headings = lines.filter(v => v.length <= 110 && /[A-Z][A-Za-z]/.test(v) && (/^(\d+[.)]|[A-Z][A-Za-z]+\s*[—:-])/.test(v) || v.split(' ').length <= 9)).slice(0, 10);
          const headingText = headings.join(' ');
          const full = norm(`${x.title} ${summary} ${headingText} ${body}`);
          const words = full.split(' ').filter(Boolean);
          const freq = new Map(); words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
          new Set(words).forEach(w => df.set(w, (df.get(w) || 0) + 1));
          index.push({book:x.book, bookIndex:x.bookIndex, title:x.title, page:x.page, pageNo, summary, body, headingText, full, freq, length:words.length});
        }
        count.textContent = buildCursor < pendingPages.length
          ? `Preparing search… ${buildCursor.toLocaleString()} / ${pendingPages.length.toLocaleString()} pages`
          : `${books.length} books · ${index.length.toLocaleString()} pages`;
        if (buildCursor < pendingPages.length) scheduleIdle(buildIndexChunk);
        else {
          indexReady = true;
          index.forEach(d => {d.normWords = new Set(d.freq.keys());});
          if (queuedSearch !== null) {const q = queuedSearch; queuedSearch = null; searchIndex(q);}
        }
      }
      scheduleIdle(buildIndexChunk);

      let panel = document.getElementById('advancedSearchResults');
      if (!panel) {panel = document.createElement('section'); panel.id = 'advancedSearchResults'; panel.className = 'advanced-search-results'; panel.setAttribute('aria-live', 'polite'); search.closest('.source-library-tools')?.insertAdjacentElement('afterend', panel);}

      function idf(t) {return Math.log(1 + (N + 1) / (1 + (df.get(t) || 0)));}
      function fuzzyMatch(term, doc) {
        if (term.length < 4) return 0;
        let best = 0;
        for (const w of doc.normWords) {
          if (Math.abs(w.length - term.length) > 2) continue;
          const d = levenshtein(term, w); if (d <= 2) best = Math.max(best, d === 1 ? .62 : .38);
        }
        return best;
      }
      function phraseScore(phrase, text) {
        if (!phrase) return 0;
        if (text.includes(phrase)) return 1;
        const pt = phrase.split(' '), tw = text.split(' ');
        if (pt.length < 2) return 0;
        let hits = 0;
        for (let i = 0; i < tw.length; i++) {let ok = true; for (let j = 0; j < pt.length; j++) {if (tw[i + j] !== pt[j]) {ok = false; break;} } if (ok) hits++;}
        return hits ? 0.65 : 0;
      }
      function proximity(terms, doc) {
        if (terms.length < 2) return 0;
        const pos = terms.map(t => {const i = doc.full.indexOf(t); return i < 0 ? null : i;}).filter(x => x !== null);
        if (pos.length < 2) return 0;
        const span = Math.max(...pos) - Math.min(...pos); return Math.max(0, 18 - Math.min(18, span / 35));
      }
      function makeSnippet(doc, q) {
        const raw = doc.body || doc.headingText || doc.summary; if (!raw) return '';
        const terms = q.all.flatMap(t => [t, ...wordVariants(t)]).filter(x => x.length > 1);
        let best = 0; for (const t of terms) {const p = norm(raw).indexOf(t); if (p >= 0) {best = p; break;} }
        const start = Math.max(0, best - 145), end = Math.min(raw.length, start + 420);
        let sn = (start ? '…' : '') + raw.slice(start, end) + (end < raw.length ? '…' : '');
        let safe = esc(sn);
        const hi = [...new Set(q.all.concat(q.phrases).flatMap(t => [t, ...wordVariants(t)]))].filter(Boolean).sort((a, b) => b.length - a.length);
        if (hi.length) safe = safe.replace(new RegExp('(' + hi.map(escRe).join('|') + ')', 'gi'), '<mark>$1</mark>');
        return safe;
      }

      function resetView() {books.forEach(book => {book.classList.remove('is-hidden'); book.querySelectorAll('.source-page').forEach(p => {p.classList.remove('page-active'); p.removeAttribute('open');});});}
      function openExact(item) {
        resetView(); item.book.classList.remove('is-hidden'); item.page.classList.add('page-active'); item.page.open = true;
        const small = window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
        if (small) {
          const headerH = document.querySelector('.study-nav')?.getBoundingClientRect().height || 58;
          const toolsH = document.querySelector('.source-library-tools')?.getBoundingClientRect().height || 0;
          const y = item.page.getBoundingClientRect().top + window.scrollY - headerH - toolsH - 18;
          window.scrollTo({top: Math.max(0, y), behavior: 'smooth'});
        } else {
          item.page.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
        setTimeout(() => item.page.querySelector('summary')?.focus({preventScroll: true}), 450);
      }
      function render(results, q, elapsed) {
        if (!q.original) {panel.innerHTML = ''; count.textContent = `${books.length} books · ${index.length.toLocaleString()} pages`; return;}
        const top = results.slice(0, 100);
        panel.innerHTML = `<div class="advanced-search-head"><div><strong>${results.length.toLocaleString()} matching pages</strong><span> · ${new Set(results.map(r => r.book)).size} matching books</span></div><span>${elapsed.toFixed(1)} ms · ranked by relevance</span></div>${results.length ? `<div class="advanced-search-list">${top.map((r, i) => `<button type="button" class="advanced-search-result" data-result-index="${i}"><span class="advanced-search-result-top"><b>${esc(r.title)}</b><em>Page ${r.pageNo}</em></span><span class="advanced-search-result-summary">${esc(r.headingText || r.summary)}</span><span class="advanced-search-result-snippet">${r.snippet}</span></button>`).join('')}</div>${results.length > 100 ? `<div class="advanced-search-more">Showing the 100 strongest matches of ${results.length.toLocaleString()}.</div>` : ''}` : `<div class="advanced-search-empty"><strong>No strong matches.</strong><span>Try a shorter phrase, an abbreviation such as LiDAR, DTM, RTK, GCP, BIM or FTTH, or use a broader concept.</span></div>`}`;
        panel.querySelectorAll('[data-result-index]').forEach(btn => btn.addEventListener('click', () => openExact(top[+btn.dataset.resultIndex])));
        count.textContent = `${results.length.toLocaleString()} matches`;
      }

      function searchIndex(raw) {
        const started = performance.now(), q = parseQuery(raw);
        if (!indexReady) {
          queuedSearch = raw || '';
          panel.innerHTML = '<div class=\"advanced-search-empty\"><strong>Preparing the 18-book search…</strong><span>You can type now. Results will appear automatically when the search index is ready.</span></div>';
          return;
        }
        if (!q.original) {resetView(); render([], q, performance.now() - started); return;}
        const results = [];
        index.forEach(doc => {
          const text = doc.full; let score = 0; let matched = 0;
          for (const term of q.all) {
            const variants = wordVariants(term); let best = 0;
            variants.forEach(v => {if (doc.freq.has(v)) best = Math.max(best, doc.freq.get(v) * idf(v));});
            if (!best) best = fuzzyMatch(term, doc) * 8;
            if (best) {matched++; score += best; if (doc.title.toLowerCase().includes(term)) score += 65; if (norm(doc.headingText).includes(term)) score += 42; if (norm(doc.summary).includes(term)) score += 30;}
          }
          for (const phrase of q.phrases) {const ps = phraseScore(phrase, text); if (ps) {score += 180 * ps; matched += .5;} }
          for (const term of q.must) if (!text.includes(term)) return;
          for (const term of q.exclude) if (text.includes(term)) return;
          if (q.all.length > 1 && matched >= q.all.length) score += 75;
          score += proximity(q.all, doc);
          if (score > 0) results.push({...doc, score, snippet: makeSnippet(doc, q)});
        });
        results.sort((a, b) => b.score - a.score || a.bookIndex - b.bookIndex || a.pageNo - b.pageNo);
        const matchedBooks = new Set(results.map(r => r.book));
        books.forEach(book => {book.classList.toggle('is-hidden', !matchedBooks.has(book)); const pages = new Set(results.filter(r => r.book === book).map(r => r.page)); book.querySelectorAll('.source-page').forEach(p => {const m = pages.has(p); p.classList.toggle('page-active', m); if (!m) p.removeAttribute('open');});});
        render(results, q, performance.now() - started);
      }

      let timer = 0; search.addEventListener('input', () => {clearTimeout(timer); timer = setTimeout(() => searchIndex(search.value), 90);});
      search.addEventListener('keydown', e => {if (e.key === 'Escape') {search.value = ''; searchIndex(''); search.focus();} if (e.key === 'Enter') {clearTimeout(timer); searchIndex(search.value);} });
      expand?.addEventListener('click', () => {search.value = ''; searchIndex(''); root.querySelectorAll('.source-page').forEach(p => {p.classList.add('page-active'); p.open = true;});});
      collapse?.addEventListener('click', () => root.querySelectorAll('.source-page').forEach(p => {p.classList.remove('page-active'); p.removeAttribute('open');}));
      resetView(); render([], parseQuery(''), 0);
    })();
