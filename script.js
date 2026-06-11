(function () {
  'use strict';

  /* ========================================================================
     CTRL KEY — Interactions
     ======================================================================== */

  /* --------------------------------------------------------------------
     1. Smooth scroll
     -------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;

      e.preventDefault();
      smoothScrollTo(
        target.getBoundingClientRect().top + window.pageYOffset,
        1200
      );
    });
  });

  function smoothScrollTo(targetY, duration) {
    var startY = window.pageYOffset;
    var diff = targetY - startY;
    var start = null;

    function easeInOutQuart(t) {
      return t < 0.5
        ? 8 * t * t * t * t
        : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    function step(timestamp) {
      if (start === null) start = timestamp;

      var progress = Math.min((timestamp - start) / duration, 1);
      window.scrollTo(0, startY + diff * easeInOutQuart(progress));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }

  /* --------------------------------------------------------------------
     2. Fade-up + text reveal
     -------------------------------------------------------------------- */
  var revealables = document.querySelectorAll('.fade-up, .reveal-text');

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  revealables.forEach(function (el) {
    observer.observe(el);
  });

  /* --------------------------------------------------------------------
     3. Problem → Insight scroll cover
     -------------------------------------------------------------------- */
  var stage = document.querySelector('.problem-sticky-wrap');
  var insight = document.querySelector('.sec-insight');
  var insightTicking = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function updateInsight() {
    if (!stage || !insight) return;

    var rect = stage.getBoundingClientRect();
    var maxScroll = stage.offsetHeight - window.innerHeight;
    var scrolled = clamp(-rect.top, 0, maxScroll);
    var progress = maxScroll > 0 ? scrolled / maxScroll : 1;

    var move = (1 - progress) * 100;
    insight.style.transform = 'translateY(' + move + 'vh)';

    insightTicking = false;
  }

  function requestInsightUpdate() {
    if (!insightTicking) {
      window.requestAnimationFrame(updateInsight);
      insightTicking = true;
    }
  }

  window.addEventListener('scroll', requestInsightUpdate, { passive: true });
  window.addEventListener('resize', requestInsightUpdate);

  updateInsight();

  /* --------------------------------------------------------------------
     4. Grounding System accordion
     -------------------------------------------------------------------- */
  document.querySelectorAll('[data-accordion]').forEach(function (item) {
    var head = item.querySelector('.accordion-head');
    var body = item.querySelector('.accordion-body');

    if (!head || !body) return;

    head.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');

      document.querySelectorAll('[data-accordion].is-open').forEach(function (other) {
        if (other !== item) closeItem(other);
      });

      if (isOpen) {
        closeItem(item);
      } else {
        openItem(item);
      }
    });

    function openItem(el) {
      var b = el.querySelector('.accordion-body');
      var h = el.querySelector('.accordion-head');

      el.classList.add('is-open');
      h.setAttribute('aria-expanded', 'true');
      b.style.height = b.scrollHeight + 'px';
      h.style.background = '#D4FFAC';
    }

    function closeItem(el) {
      var b = el.querySelector('.accordion-body');
      var h = el.querySelector('.accordion-head');

      el.classList.remove('is-open');
      h.setAttribute('aria-expanded', 'false');
      b.style.height = '0px';
      h.style.background = '';
    }

    body.addEventListener('transitionend', function () {
      if (item.classList.contains('is-open')) {
        body.style.height = body.scrollHeight + 'px';
      }
    });
  });

  /* --------------------------------------------------------------------
     5. Header hide/show
     -------------------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  var lastY = window.pageYOffset;
  var headerTicking = false;
  var THRESHOLD = 8;

  function onHeaderScroll() {
    if (!header) return;

    var y = window.pageYOffset;

    header.classList.toggle('is-solid', y > 40);

    if (Math.abs(y - lastY) > THRESHOLD) {
      if (y > lastY && y > 120) {
        header.classList.add('is-hidden');
      } else {
        header.classList.remove('is-hidden');
      }

      lastY = y;
    }

    headerTicking = false;
  }

  window.addEventListener(
    'scroll',
    function () {
      if (!headerTicking) {
        window.requestAnimationFrame(onHeaderScroll);
        headerTicking = true;
      }
    },
    { passive: true }
  );

  onHeaderScroll();

  /* --------------------------------------------------------------------
     6. Cursor image change on click
     -------------------------------------------------------------------- */
  var cursorIndex = 1;

  document.body.classList.remove('cursor-1', 'cursor-2', 'cursor-3');
  document.body.classList.add('cursor-1');

  window.addEventListener('click', function () {
    document.body.classList.remove('cursor-1', 'cursor-2', 'cursor-3');

    cursorIndex += 1;
    if (cursorIndex > 3) cursorIndex = 1;

    document.body.classList.add('cursor-' + cursorIndex);
  });
})();