/* Study Hub connection: scroll-spy tabs, reading progress, arrival highlight. */
(function () {
  var tabs = [].slice.call(document.querySelectorAll('.hub-tab'));
  if (!tabs.length) return;
  var map = {
    learn: document.getElementById('top'),
    library: document.getElementById('source-library'),
    advanced: document.getElementById('advanced-technical-reference')
  };
  var bar = document.querySelector('.hub-progress i');

  function setActive(key) {
    document.body.classList.toggle('hub-not-learn', key !== 'learn');
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-hub') === key;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && t.scrollIntoView && window.innerWidth < 900) {
        t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    });
  }
  function current() {
    var y = window.scrollY + 260, key = 'learn';
    if (map.library && map.library.offsetTop <= y) key = 'library';
    if (map.advanced && map.advanced.getBoundingClientRect().top + window.scrollY <= y) key = 'advanced';
    return key;
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      setActive(current());
      if (bar) {
        var h = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = (h > 0 ? Math.min(100, scrollY / h * 100) : 0).toFixed(1) + '%';
      }
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  function arrive(hash) {
    if (!hash || hash.length < 2) return;
    var el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return;
    el.classList.remove('hub-arrived'); void el.offsetWidth; el.classList.add('hub-arrived');
    var d = el.closest && el.closest('details'); if (d) d.open = true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) setTimeout(function () { arrive(a.getAttribute('href')); }, 350);
  });
  addEventListener('hashchange', function () { arrive(location.hash); });
  // Large page: layout keeps shifting while it loads, so re-aim at the deep link until the user scrolls themselves.
  if (location.hash.length > 1) {
    var touched = false;
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
      addEventListener(ev, function () { touched = true; }, { passive: true, once: true });
    });
    var aim = function () {
      if (touched) return;
      var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) el.scrollIntoView({ block: 'start' });
    };
    [600, 1500, 3000, 5000].forEach(function (ms) { setTimeout(aim, ms); });
    setTimeout(function () { arrive(location.hash); setActive(current()); }, 3200);
  }
  onScroll();
})();
