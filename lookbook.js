/* ==========================================================================
   CTRL KEY — LOOKBOOK page interactions
   ========================================================================== */

(function () {
var targets = document.querySelectorAll('.lb-reveal, .lb-reveal-right, .lb-line-reveal, .lb-scroll-title');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) {
      el.classList.add('is-visible');
    });
    return;
  }

  var STAGGER = 0.12;

  var observer = new IntersectionObserver(function (entries) {
    var visible = entries.filter(function (e) {
      return e.isIntersecting;
    });

    if (!visible.length) return;

    visible.sort(function (a, b) {
      var pos = a.target.compareDocumentPosition(b.target);
      return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });

    visible.forEach(function (entry, i) {
      var el = entry.target;
      el.style.transitionDelay = (i * STAGGER) + 's';
      el.classList.add('is-visible');
      observer.unobserve(el);

      el.addEventListener('transitionend', function handler() {
        el.style.transitionDelay = '';
        el.removeEventListener('transitionend', handler);
      });
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -5% 0px'
  });

  targets.forEach(function (el) {
    observer.observe(el);
  });
})();

/* 02 IMAGE GRID — mouse-xy parallax
   Cursor position over the section drives --mx/--my on each [data-depth]
   card (depth = max offset in px; negative values move opposite for a
   layered feel). Values are eased toward the target each frame, and glide
   back to 0 when the mouse leaves, so the Figma layout stays the resting
   state. */
(function () {
  var grid = document.querySelector('.lb-grid');
  if (!grid) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.lb-card[data-depth]'));
  if (!cards.length) return;

  var targetX = 0, targetY = 0;   // -1..1, where the cursor is
  var curX = 0, curY = 0;         // eased values actually applied
  var rafId = null;

  function tick() {
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;

    cards.forEach(function (card) {
      var depth = parseFloat(card.getAttribute('data-depth')) || 0;
      card.style.setProperty('--mx', (curX * depth).toFixed(2) + 'px');
      card.style.setProperty('--my', (curY * depth).toFixed(2) + 'px');
    });

    if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function start() {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  grid.addEventListener('mousemove', function (e) {
    var rect = grid.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    start();
  });

  grid.addEventListener('mouseleave', function () {
    targetX = 0;
    targetY = 0;
    start();
  });
})();
