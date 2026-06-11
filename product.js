/* ==========================================================================
   CTRL KEY — PRODUCT page interactions
   Scroll-driven entrance animations: elements with .pd-fx reveal once when
   they enter the viewport, staggered 0.12s apart within the same batch.
   The CSS variant classes (fx-up / fx-blur / fx-img / fx-clip) decide how.
   ========================================================================== */

(function () {
  var targets = document.querySelectorAll('.pd-fx');

  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var STAGGER = 0.22; // seconds between items revealed in the same batch

  // A fully clipped element (clip-path: inset(0 0 100% 0)) reports zero
  // intersection area, so the observer would never fire for it. Watch the
  // positioned parent container instead and map back to the fx element.
  var proxies = new Map();
  targets.forEach(function (el) {
    var proxy = el.classList.contains('pd-fx-clip') && el.parentElement ? el.parentElement : el;
    if (!proxies.has(proxy)) proxies.set(proxy, []);
    proxies.get(proxy).push(el);
  });

  var observer = new IntersectionObserver(function (entries) {
    var visible = entries.filter(function (e) { return e.isIntersecting; });
    if (!visible.length) return;

    // reveal in document order so the stagger reads naturally
    visible.sort(function (a, b) {
      var pos = a.target.compareDocumentPosition(b.target);
      return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });

    visible.forEach(function (entry, i) {
      observer.unobserve(entry.target);
      (proxies.get(entry.target) || []).forEach(function (el) {
        el.style.transitionDelay = (i * STAGGER) + 's';
        el.classList.add('is-visible');

        el.addEventListener('transitionend', function handler() {
          el.style.transitionDelay = '';
          el.removeEventListener('transitionend', handler);
        });
      });
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -8% 0px'
  });

  proxies.forEach(function (_els, proxy) { observer.observe(proxy); });
})();
