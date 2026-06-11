/* ==========================================================================
   CTRL KEY — EXPERIENCE page interactions
   SPA-style view switching: Experience_Home ↔ 5 grounding detail screens.
   No page reload — state change only. Transition: fade + slide,
   500ms ease-in-out (classes defined in experience.css).
   ========================================================================== */

(function () {
  var DURATION = 500; // ms, matches the CSS transition

  var views = {};
  document.querySelectorAll('.exp-view').forEach(function (v) {
    views[v.getAttribute('data-view')] = v;
  });

  var current = 'home';
  var animating = false;

  function show(name) {
    if (animating || name === current || !views[name]) return;
    animating = true;

    var from = views[current];
    var to = views[name];

    // incoming: in flow, starts faded + shifted down
    to.classList.add('is-active', 'is-entering');
    // outgoing: overlays in place while fading + sliding up
    from.classList.remove('is-active');
    from.classList.add('is-leaving');

    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    // next frame: release the entering state so both transitions run
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        to.classList.remove('is-entering');
      });
    });

    setTimeout(function () {
      from.classList.remove('is-leaving');
      current = name;
      animating = false;
    }, DURATION + 50);
  }

  // deep link: open #breathing etc. directly (no transition on first paint)
  var initial = location.hash.replace('#', '');
  if (initial && initial !== 'home' && views[initial]) {
    views.home.classList.remove('is-active');
    views[initial].classList.add('is-active');
    current = initial;
  }

  // Grounding list → detail screens
  document.querySelectorAll('.exp-method').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      show(link.getAttribute('data-target'));
    });
  });

  // back arrow → home
  document.querySelectorAll('.exp-back').forEach(function (btn) {
    btn.addEventListener('click', function () {
      show('home');
    });
  });
})();

/* ==========================================================================
   BREATHING — pixel-grid wave canvas inside .exp-gif
   #19A3FF squares; a circular wave breathes outward from the center on an
   infinite loop. The wave origin eases toward the mouse and drifts back to
   the middle when the cursor leaves the box. The view starts display:none,
   so sizing happens when the breathing screen becomes active.
   ========================================================================== */
(function () {
  var box = document.querySelector('.exp-detail[data-view="breathing"] .exp-gif');
  if (!box) return;
  var section = box.closest('.exp-view');

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  box.appendChild(canvas);

  var CELL = 26;              // grid spacing
  var SIZE = 10;              // resting square size
  var GROW = 14;              // extra size at the wave crest
  var PERIOD = 6000;          // ms per breath cycle (slow, breath-like)
  var SIGMA = 90;             // wave band thickness
  var COLOR = '25, 163, 255'; // #19A3FF

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var hasSize = false;
  var center = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
  var rafId = null;
  var start = null;

  function resize() {
    var w = box.clientWidth;
    var h = box.clientHeight;
    if (!w || !h) { hasSize = false; return; } // view hidden — retry on activate
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!hasSize) {
      center.x = w / 2; center.y = h / 2;
      target.x = w / 2; target.y = h / 2;
    }
    hasSize = true;
  }

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    if (!hasSize) { resize(); if (!hasSize) return; }
    if (start === null) start = now;

    // wave origin eases toward the mouse (or back to the middle)
    center.x += (target.x - center.x) * 0.06;
    center.y += (target.y - center.y) * 0.06;

    var progress = ((now - start) % PERIOD) / PERIOD; // 0 → 1, loops forever
    var maxDist = Math.hypot(
      Math.max(center.x, W - center.x),
      Math.max(center.y, H - center.y)
    );
    // ease-in-out radius + soft amplitude fade at both ends of the cycle
    var radius = (1 - Math.cos(Math.PI * progress)) / 2 * (maxDist + SIGMA);
    var amp = Math.sin(Math.PI * progress);

    ctx.clearRect(0, 0, W, H);
    for (var y = CELL / 2; y < H; y += CELL) {
      for (var x = CELL / 2; x < W; x += CELL) {
        var d = Math.hypot(x - center.x, y - center.y);
        var k = Math.exp(-((d - radius) * (d - radius)) / (2 * SIGMA * SIGMA)) * amp;
        var alpha = 0.08 + 0.92 * k;
        var s = SIZE + GROW * k;
        ctx.fillStyle = 'rgba(' + COLOR + ',' + alpha.toFixed(3) + ')';
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
  }

  function startLoop() {
    if (rafId !== null) return;
    resize();
    rafId = requestAnimationFrame(draw);
  }

  function stopLoop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  box.addEventListener('mousemove', function (e) {
    var r = box.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width * W;
    target.y = (e.clientY - r.top) / r.height * H;
  });

  box.addEventListener('mouseleave', function () {
    target.x = W / 2;
    target.y = H / 2;
  });

  window.addEventListener('resize', resize);

  // run only while the breathing view is shown; recalculate size on activate
  var mo = new MutationObserver(function () {
    if (section.classList.contains('is-active')) startLoop(); else stopLoop();
  });
  mo.observe(section, { attributes: true, attributeFilter: ['class'] });
  if (section.classList.contains('is-active')) startLoop();
})();

/* ==========================================================================
   TEMPERATURE — gradient-loop canvas inside .exp-gif
   Two colors only: #F2FFE6 (warm bright core, low center) and #19A3FF
   (cool field spreading from the top/edges). The core breathes — slowly
   swelling and shrinking — while the blue above drifts down and back up.
   The core eases toward the mouse and returns to bottom-center on leave.
   Same SPA-safe sizing pattern as the breathing canvas.
   ========================================================================== */
(function () {
  var box = document.querySelector('.exp-detail[data-view="temperature"] .exp-gif');
  if (!box) return;
  var section = box.closest('.exp-view');

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  box.appendChild(canvas);

  var WARM = { r: 242, g: 255, b: 230 }; // #F2FFE6
  var COOL = { r: 25, g: 163, b: 255 };  // #19A3FF
  var BREATH = 9000;   // ms — core swell cycle
  var DRIFT = 14000;   // ms — blue field drift cycle (slow, independent phase)

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var hasSize = false;
  var core = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
  var rafId = null;
  var start = null;

  function restPoint() {
    return { x: W / 2, y: H * 0.78 }; // bottom-center, like the reference
  }

  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a.toFixed(3) + ')';
  }

  function resize() {
    var w = box.clientWidth;
    var h = box.clientHeight;
    if (!w || !h) { hasSize = false; return; } // view hidden — retry on activate
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!hasSize) {
      var p = restPoint();
      core.x = p.x; core.y = p.y;
      target.x = p.x; target.y = p.y;
    }
    hasSize = true;
  }

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    if (!hasSize) { resize(); if (!hasSize) return; }
    if (start === null) start = now;
    var t = now - start;

    // core eases toward the mouse (or back to bottom-center)
    core.x += (target.x - core.x) * 0.05;
    core.y += (target.y - core.y) * 0.05;

    // slow sinusoidal cycles — continuous, no seams
    var breath = (1 - Math.cos(t * 2 * Math.PI / BREATH)) / 2; // 0..1
    var drift = (1 - Math.cos(t * 2 * Math.PI / DRIFT)) / 2;   // 0..1

    // 1) cool field: blue settles from the top, its reach drifting up/down
    var blueEnd = H * (0.62 + 0.18 * drift); // how far down the blue reaches
    var sky = ctx.createLinearGradient(0, 0, 0, blueEnd);
    sky.addColorStop(0, rgba(COOL, 1));
    sky.addColorStop(0.55, rgba(COOL, 0.55 + 0.2 * drift));
    sky.addColorStop(1, rgba(WARM, 1));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, blueEnd);
    ctx.fillStyle = rgba(WARM, 1);
    ctx.fillRect(0, blueEnd - 1, W, H - blueEnd + 1);

    // 2) warm core: bright light breathing around the (eased) center
    var radius = Math.max(W, H) * (0.5 + 0.16 * breath);
    var glow = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, radius);
    glow.addColorStop(0, rgba(WARM, 0.95));
    glow.addColorStop(0.45, rgba(WARM, 0.55 + 0.15 * breath));
    glow.addColorStop(1, rgba(WARM, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  function startLoop() {
    if (rafId !== null) return;
    resize();
    rafId = requestAnimationFrame(draw);
  }

  function stopLoop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  box.addEventListener('mousemove', function (e) {
    var r = box.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width * W;
    target.y = (e.clientY - r.top) / r.height * H;
  });

  box.addEventListener('mouseleave', function () {
    var p = restPoint();
    target.x = p.x;
    target.y = p.y;
  });

  window.addEventListener('resize', resize);

  // run only while the temperature view is shown; recalculate size on activate
  var mo = new MutationObserver(function () {
    if (section.classList.contains('is-active')) startLoop(); else stopLoop();
  });
  mo.observe(section, { attributes: true, attributeFilter: ['class'] });
  if (section.classList.contains('is-active')) startLoop();
})();

/* ==========================================================================
   VIBRATION — pixel-wave canvas inside .exp-gif
   #B7FF74 square pixels on a fixed grid. Circular waves ripple from the
   top-right toward the bottom-left on an infinite loop; every click spawns
   an extra wave (waves overlap and fade out naturally). Squares near a wave
   crest grow large and opaque, farther ones shrink and fade, and the whole
   field carries a subtle vibration tremor. The wave origin eases toward the
   mouse and returns to the top-right when the cursor leaves.
   Same SPA-safe sizing pattern as the other canvases.
   ========================================================================== */
(function () {
  var box = document.querySelector('.exp-detail[data-view="vibration"] .exp-gif');
  if (!box) return;
  var section = box.closest('.exp-view');

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  box.appendChild(canvas);

  var COLOR = '183, 255, 116'; // #B7FF74
  var CELL = 24;               // grid spacing
  var BASE = 3;                // smallest square size (far from any wave)
  var GROW = 15;               // extra size at a wave crest
  var SPEED = 0.16;            // wave expansion px/ms (slow ripple)
  var BAND = 110;              // wave band thickness
  var LIFE = 5200;             // ms a wave stays alive
  var SPAWN = 2600;            // ms between auto waves (continuous loop)

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var hasSize = false;
  var origin = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
  var waves = [];   // { x, y, born }
  var lastSpawn = -Infinity;
  var rafId = null;

  function restPoint() {
    return { x: W * 0.85, y: H * 0.15 }; // top-right
  }

  function resize() {
    var w = box.clientWidth;
    var h = box.clientHeight;
    if (!w || !h) { hasSize = false; return; } // view hidden — retry on activate
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!hasSize) {
      var p = restPoint();
      origin.x = p.x; origin.y = p.y;
      target.x = p.x; target.y = p.y;
    }
    hasSize = true;
  }

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    if (!hasSize) { resize(); if (!hasSize) return; }

    // origin eases toward the mouse (or back to top-right)
    origin.x += (target.x - origin.x) * 0.06;
    origin.y += (target.y - origin.y) * 0.06;

    // keep the loop alive: spawn a wave from the current origin
    if (now - lastSpawn >= SPAWN) {
      waves.push({ x: origin.x, y: origin.y, born: now });
      lastSpawn = now;
    }
    waves = waves.filter(function (w) { return now - w.born < LIFE; });

    ctx.clearRect(0, 0, W, H);

    for (var y = CELL / 2; y < H; y += CELL) {
      for (var x = CELL / 2; x < W; x += CELL) {
        // sum every live wave's contribution at this cell
        var k = 0;
        for (var i = 0; i < waves.length; i++) {
          var wv = waves[i];
          var age = now - wv.born;
          var radius = age * SPEED;
          var fade = 1 - age / LIFE; // older waves dissolve
          var d = Math.hypot(x - wv.x, y - wv.y);
          k += Math.exp(-((d - radius) * (d - radius)) / (2 * BAND * BAND)) * fade;
        }
        // soft glow around the eased origin so the field tracks the mouse
        var dm = Math.hypot(x - origin.x, y - origin.y);
        k += Math.exp(-(dm * dm) / (2 * 160 * 160)) * 0.22;
        if (k > 1) k = 1;

        // subtle per-cell tremor — tiny size/position shiver
        var phase = x * 0.37 + y * 0.83;
        var tremor = Math.sin(now * 0.012 + phase);
        var jx = Math.cos(now * 0.011 + phase) * 0.6 * (0.3 + k);
        var jy = Math.sin(now * 0.013 + phase * 1.7) * 0.6 * (0.3 + k);

        var s = BASE + GROW * k + tremor * 0.5;
        var alpha = 0.12 + 0.88 * k + tremor * 0.03;
        if (alpha < 0.04) alpha = 0.04;
        if (alpha > 1) alpha = 1;

        ctx.fillStyle = 'rgba(' + COLOR + ',' + alpha.toFixed(3) + ')';
        ctx.fillRect(x + jx - s / 2, y + jy - s / 2, s, s);
      }
    }
  }

  function startLoop() {
    if (rafId !== null) return;
    resize();
    rafId = requestAnimationFrame(draw);
  }

  function stopLoop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function pointFromEvent(e) {
    var r = box.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * W,
      y: (e.clientY - r.top) / r.height * H
    };
  }

  box.addEventListener('mousemove', function (e) {
    var p = pointFromEvent(e);
    target.x = p.x;
    target.y = p.y;
  });

  box.addEventListener('mouseleave', function () {
    var p = restPoint();
    target.x = p.x;
    target.y = p.y;
  });

  // every click fires a fresh wave from the pointer
  box.addEventListener('click', function (e) {
    var p = pointFromEvent(e);
    waves.push({ x: p.x, y: p.y, born: performance.now() });
  });

  window.addEventListener('resize', resize);

  // run only while the vibration view is shown; recalculate size on activate
  var mo = new MutationObserver(function () {
    if (section.classList.contains('is-active')) startLoop(); else stopLoop();
  });
  mo.observe(section, { attributes: true, attributeFilter: ['class'] });
  if (section.classList.contains('is-active')) startLoop();
})();

/* ==========================================================================
   PRESSURE — pressed-surface canvas inside .exp-gif
   #19A3FF square pixels on a uniform grid. A click is a pressure point:
   nearby squares are pulled toward it and swell — pressed hard for ~0.2s,
   then slowly relaxing back over ~1.2s, like a fingertip on skin. Clicks
   stack naturally. Hovering only stirs the surface very faintly; the field
   stays calm until pressed. Same SPA-safe sizing pattern as the others.
   ========================================================================== */
(function () {
  var box = document.querySelector('.exp-detail[data-view="pressure"] .exp-gif');
  if (!box) return;
  var section = box.closest('.exp-view');

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  box.appendChild(canvas);

  var COLOR = '25, 163, 255'; // #19A3FF
  var CELL = 26;              // grid spacing
  var BASE = 8;               // resting square size (uniform calm grid)
  var GROW = 12;              // extra size at the pressure core
  var PULL = 26;              // max px a square is dragged toward the press
  var RADIUS = 150;           // gaussian reach of one press
  var ATTACK = 200;           // ms — fast push-in
  var RELEASE = 1200;         // ms — slow recovery

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var hasSize = false;
  var presses = [];                 // { x, y, born }
  var mouse = { x: -9999, y: -9999 };
  var rafId = null;

  function resize() {
    var w = box.clientWidth;
    var h = box.clientHeight;
    if (!w || !h) { hasSize = false; return; } // view hidden — retry on activate
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hasSize = true;
  }

  // press strength over time: quick squeeze, slow smooth recovery
  function strengthAt(age) {
    if (age < 0) return 0;
    if (age < ATTACK) {
      var a = age / ATTACK;
      return 1 - Math.pow(1 - a, 3); // ease-out cubic push-in
    }
    var r = (age - ATTACK) / RELEASE;
    if (r >= 1) return 0;
    return 0.5 + 0.5 * Math.cos(Math.PI * r); // ease-in-out relax
  }

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    if (!hasSize) { resize(); if (!hasSize) return; }

    presses = presses.filter(function (p) { return now - p.born < ATTACK + RELEASE; });

    ctx.clearRect(0, 0, W, H);

    for (var y = CELL / 2; y < H; y += CELL) {
      for (var x = CELL / 2; x < W; x += CELL) {
        var ox = 0, oy = 0; // displacement toward the press point(s)
        var k = 0;          // press intensity at this cell

        for (var i = 0; i < presses.length; i++) {
          var p = presses[i];
          var s = strengthAt(now - p.born);
          if (s <= 0) continue;
          var dx = p.x - x;
          var dy = p.y - y;
          var d = Math.hypot(dx, dy) || 1;
          var g = Math.exp(-(d * d) / (2 * RADIUS * RADIUS)) * s;
          ox += (dx / d) * PULL * g;
          oy += (dy / d) * PULL * g;
          k += g;
        }

        // faint hover response — barely-there stir, the click is the event
        var dmx = mouse.x - x;
        var dmy = mouse.y - y;
        var dm2 = dmx * dmx + dmy * dmy;
        k += Math.exp(-dm2 / (2 * 110 * 110)) * 0.07;

        if (k > 1) k = 1;
        var size = BASE + GROW * k;
        var alpha = 0.22 + 0.78 * k;

        ctx.fillStyle = 'rgba(' + COLOR + ',' + alpha.toFixed(3) + ')';
        ctx.fillRect(x + ox - size / 2, y + oy - size / 2, size, size);
      }
    }
  }

  function startLoop() {
    if (rafId !== null) return;
    resize();
    rafId = requestAnimationFrame(draw);
  }

  function stopLoop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function pointFromEvent(e) {
    var r = box.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * W,
      y: (e.clientY - r.top) / r.height * H
    };
  }

  // click = a new pressure point (stacking presses blend naturally)
  box.addEventListener('click', function (e) {
    var p = pointFromEvent(e);
    presses.push({ x: p.x, y: p.y, born: performance.now() });
  });

  box.addEventListener('mousemove', function (e) {
    var p = pointFromEvent(e);
    mouse.x = p.x;
    mouse.y = p.y;
  });

  box.addEventListener('mouseleave', function () {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  window.addEventListener('resize', resize);

  // run only while the pressure view is shown; recalculate size on activate
  var mo = new MutationObserver(function () {
    if (section.classList.contains('is-active')) startLoop(); else stopLoop();
  });
  mo.observe(section, { attributes: true, attributeFilter: ['class'] });
  if (section.classList.contains('is-active')) startLoop();
})();


/* ==========================================================================
   PRESSURE — soft radial pressure blobs inside .exp-gif
   ========================================================================== */
(function () {
  var box = document.querySelector('.exp-detail[data-view="pressure"] .exp-gif');
  if (!box) return;

  var section = box.closest('.exp-view');

  Array.prototype.slice.call(box.querySelectorAll('canvas')).forEach(function (existing) {
    existing.remove();
  });

  var canvas = document.createElement('canvas');
  canvas.className = 'pressure-blob-canvas';
  var ctx = canvas.getContext('2d');
  box.appendChild(canvas);

  var BLUE = { r: 25, g: 163, b: 255 };     // #19A3FF
  var LIGHT = { r: 242, g: 255, b: 230 };   // #F2FFE6
  var ATTACK = 200;
  var RELEASE = 1800;
  var HOLD_PULSE = 0.045;
  var DPR_LIMIT = 2;

  var dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
  var W = 0;
  var H = 0;
  var hasSize = false;
  var blobs = [];
  var rafId = null;

  function rgba(color, alpha) {
    return 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha + ')';
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);

    var rect = box.getBoundingClientRect();
    var w = Math.round(rect.width || box.clientWidth || 0);
    var h = Math.round(rect.height || box.clientHeight || 0);

    if (!w || !h) {
      hasSize = false;
      return;
    }

    W = w;
    H = h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hasSize = true;
  }

  function pointFromEvent(e) {
    var rect = box.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutSine(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function eventPressure(e) {
    if (typeof e.pressure === 'number' && e.pressure > 0) {
      return clamp(e.pressure, 0, 1);
    }
    return 0.45;
  }

  function addBlob(e) {
    resize();
    if (!hasSize) return null;

    var p = pointFromEvent(e);
    var now = performance.now();
    var reach = Math.max(150, Math.min(W, H) * 0.34);
    var blob = {
      x: p.x,
      y: p.y,
      born: now,
      released: 0,
      holdStart: now,
      lastX: p.x,
      lastY: p.y,
      motion: 0,
      pressure: eventPressure(e),
      baseRadius: reach * (0.5 + Math.random() * 0.1),
      maxRadius: reach * (1.12 + Math.random() * 0.16),
      held: true
    };

    blobs.push(blob);
    startLoop();
    return blob;
  }

  function updateBlobPressure(blob, e) {
    if (!blob || !blob.held) return;

    var p = pointFromEvent(e);
    var dx = p.x - blob.lastX;
    var dy = p.y - blob.lastY;

    blob.motion = clamp(blob.motion + Math.hypot(dx, dy) * 0.12, 0, 90);
    blob.pressure = Math.max(blob.pressure, eventPressure(e));
    blob.lastX = p.x;
    blob.lastY = p.y;
    blob.x += (p.x - blob.x) * 0.08;
    blob.y += (p.y - blob.y) * 0.08;
  }

  function releaseBlob(blob) {
    if (!blob || !blob.held) return;
    blob.held = false;
    blob.released = performance.now();
  }

  function releaseAll() {
    blobs.forEach(releaseBlob);
  }

  function drawBlob(blob, now) {
    var attackAge = Math.max(0, now - blob.born);
    var attack = Math.min(1, attackAge / ATTACK);
    var push = easeOutCubic(attack);

    var release = 0;
    if (!blob.held) {
      release = Math.min(1, Math.max(0, (now - blob.released) / RELEASE));
    }

    var heldPulse = blob.held ? Math.sin((now - blob.holdStart) * HOLD_PULSE) * 0.025 : 0;
    var holdCharge = blob.held ? clamp((now - blob.holdStart) / 900, 0, 1) : 0;
    var motionCharge = clamp(blob.motion / 90, 0, 1);
    var pressStrength = clamp(0.2 + blob.pressure * 0.35 + holdCharge * 0.32 + motionCharge * 0.28, 0.35, 1.15);
    var spread = blob.held ? 0.12 : easeInOutSine(release);
    var radius = blob.baseRadius + (blob.maxRadius - blob.baseRadius) * (push * (0.16 + pressStrength * 0.08) + spread);
    var coreRadius = Math.max(14, radius * (0.15 + push * 0.03 + pressStrength * 0.03));
    var alpha = blob.held ? 0.66 + pressStrength * 0.25 + heldPulse : (1 - easeInOutSine(release)) * (0.58 + pressStrength * 0.28);
    var blueAlpha = blob.held ? 0.42 + pressStrength * 0.34 : (1 - release) * (0.38 + pressStrength * 0.28);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'blur(' + Math.max(18, radius * 0.11).toFixed(1) + 'px)';

    var outer = ctx.createRadialGradient(blob.x, blob.y, coreRadius, blob.x, blob.y, radius);
    outer.addColorStop(0, rgba(LIGHT, Math.min(0.92, alpha).toFixed(3)));
    outer.addColorStop(0.32, rgba(LIGHT, Math.min(0.52, alpha * 0.54).toFixed(3)));
    outer.addColorStop(0.58, rgba(BLUE, Math.min(0.48, blueAlpha).toFixed(3)));
    outer.addColorStop(1, rgba(BLUE, 0));

    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, radius * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.filter = 'blur(' + Math.max(8, radius * 0.045).toFixed(1) + 'px)';
    var inner = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, radius * 0.42);
    inner.addColorStop(0, rgba(LIGHT, Math.min(0.98, alpha + 0.08).toFixed(3)));
    inner.addColorStop(0.48, rgba(LIGHT, Math.min(0.58, alpha * 0.62).toFixed(3)));
    inner.addColorStop(1, rgba(BLUE, 0));

    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, radius * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw(now) {
    rafId = requestAnimationFrame(draw);

    if (!hasSize) {
      resize();
      if (!hasSize) return;
    }

    ctx.clearRect(0, 0, W, H);

    blobs = blobs.filter(function (blob) {
      return blob.held || now - blob.released < RELEASE;
    });

    for (var i = 0; i < blobs.length; i++) {
      drawBlob(blobs[i], now);
    }

    if (!section.classList.contains('is-active') && blobs.length === 0) {
      stopLoop();
    }
  }

  function startLoop() {
    if (rafId !== null) return;
    resize();
    rafId = requestAnimationFrame(draw);
  }

  function stopLoop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  box.addEventListener('pointerdown', function (e) {
    var blob = addBlob(e);
    if (!blob) return;

    if (box.setPointerCapture) {
      box.setPointerCapture(e.pointerId);
    }

    function pressMove(moveEvent) {
      updateBlobPressure(blob, moveEvent);
    }

    function endPress() {
      releaseBlob(blob);
      box.removeEventListener('pointermove', pressMove);
      box.removeEventListener('pointerup', endPress);
      box.removeEventListener('pointercancel', endPress);
      box.removeEventListener('lostpointercapture', endPress);
    }

    box.addEventListener('pointermove', pressMove);
    box.addEventListener('pointerup', endPress);
    box.addEventListener('pointercancel', endPress);
    box.addEventListener('lostpointercapture', endPress);
  });

  box.addEventListener('pointerleave', function () {
    releaseAll();
  });

  window.addEventListener('resize', resize);

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () {
      resize();
    });
    ro.observe(box);
  }

  var mo = new MutationObserver(function () {
    if (section.classList.contains('is-active')) {
      resize();
      startLoop();
    } else {
      releaseAll();
    }
  });

  mo.observe(section, { attributes: true, attributeFilter: ['class'] });

  if (section.classList.contains('is-active')) {
    startLoop();
  }
})();

/* ==========================================================================
   LOW FREQUENCY — generative waveform art inside .exp-gif
   Columns of small vertical #19A3FF rectangles stack symmetrically around
   the horizontal center line, forming a continuous waveform. The wave is a
   sum of slow drifting sines (low-frequency hum); a bell envelope keeps the
   center dense and saturated while both edges thin out and fade. Clicking
   drops a ripple at the pointer: bars around it pulse softly for a few
   seconds — oscillating, not snapping — then dissolve back into the base
   wave. No hover interaction. Same SPA-safe sizing pattern as the others.
   ========================================================================== */
(function () {
  var box = document.querySelector('.exp-detail[data-view="lowfrequency"] .exp-gif');
  if (!box) return;
  var section = box.closest('.exp-view');

  // replace any earlier graphic in this box
  Array.prototype.slice.call(box.querySelectorAll('canvas')).forEach(function (el) { el.remove(); });

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  box.appendChild(canvas);

  var COLOR = '25, 163, 255'; // #19A3FF
  var COL_GAP = 16;     // distance between bar columns
  var BAR_W = 7;        // bar width (small vertical rectangles)
  var CELL_H = 16;      // bar slot height (bar + gap)
  var BAR_H = 11;       // visible bar height
  var RIPPLE_LIFE = 4500;   // ms a click ripple keeps pulsing
  var RIPPLE_PERIOD = 1400; // ms per pulse — slow, low-frequency
  var RIPPLE_SPREAD = 360;  // px reach of a ripple

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var hasSize = false;
  var ripples = []; // { x, born }
  var rafId = null;

  function resize() {
    var w = box.clientWidth;
    var h = box.clientHeight;
    if (!w || !h) { hasSize = false; return; } // view hidden — retry on activate
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hasSize = true;
  }

  // slow layered hum — three drifting sines, seamless forever
  function baseWave(x, t) {
    return (
      Math.sin(x * 0.0050 + t * 0.00042) * 0.45 +
      Math.sin(x * 0.0023 - t * 0.00027) * 0.35 +
      Math.sin(x * 0.0094 + t * 0.00060) * 0.20
    ); // -1..1
  }

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    if (!hasSize) { resize(); if (!hasSize) return; }

    ripples = ripples.filter(function (r) { return now - r.born < RIPPLE_LIFE; });

    ctx.clearRect(0, 0, W, H);

    var midY = H / 2;
    var cx = W / 2;
    var sigma = W * 0.30;   // horizontal bell envelope width
    var maxAmp = H * 0.40;  // wave height at full strength

    for (var x = COL_GAP / 2; x < W; x += COL_GAP) {
      // center dense & strong, edges faded & low
      var env = Math.exp(-((x - cx) * (x - cx)) / (2 * sigma * sigma));

      // base low-frequency hum (kept gentle so the shape breathes)
      var wave = 0.42 + 0.58 * (0.5 + 0.5 * baseWave(x, now));

      // click ripples: a soft repeating pulse radiating from the click x,
      // fading out over RIPPLE_LIFE
      var rippleBoost = 0;
      for (var i = 0; i < ripples.length; i++) {
        var rp = ripples[i];
        var age = now - rp.born;
        var dist = Math.abs(x - rp.x);
        var reach = Math.exp(-(dist * dist) / (2 * RIPPLE_SPREAD * RIPPLE_SPREAD));
        var decay = 1 - age / RIPPLE_LIFE;
        decay *= decay; // ease-out fade
        // traveling phase → the pulse rolls outward, repeating slowly
        var pulse = Math.sin((age / RIPPLE_PERIOD - dist / (RIPPLE_SPREAD * 1.6)) * 2 * Math.PI);
        rippleBoost += reach * decay * pulse * 0.55;
      }

      var amp = maxAmp * env * Math.max(0.05, wave + rippleBoost);
      var bars = Math.max(1, Math.round(amp / CELL_H));
      var colAlpha = 0.18 + 0.82 * env; // edge columns fade out

      // per-column shimmer so neighbouring bars differ slightly, slow and soft
      var shimmer = 0.5 + 0.5 * Math.sin(x * 0.045 + now * 0.0011);

      for (var b = 0; b < bars; b++) {
        // bars fade toward the tips of each column stack
        var tipFade = 1 - (b / bars);
        var alpha = colAlpha * (0.30 + 0.70 * Math.pow(tipFade, 1.4)) * (0.82 + 0.18 * shimmer);
        if (alpha > 1) alpha = 1;
        ctx.fillStyle = 'rgba(' + COLOR + ',' + alpha.toFixed(3) + ')';

        var slotUp = midY - (b + 1) * CELL_H;
        var slotDn = midY + b * CELL_H;
        ctx.fillRect(x - BAR_W / 2, slotUp + (CELL_H - BAR_H), BAR_W, BAR_H); // above center
        ctx.fillRect(x - BAR_W / 2, slotDn + (CELL_H - BAR_H) / 2, BAR_W, BAR_H); // below center
      }
    }
  }

  function startLoop() {
    if (rafId !== null) return;
    resize();
    rafId = requestAnimationFrame(draw);
  }

  function stopLoop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // click = drop a slow vibration ripple at the pointer
  box.addEventListener('click', function (e) {
    var r = box.getBoundingClientRect();
    ripples.push({
      x: (e.clientX - r.left) / r.width * W,
      born: performance.now()
    });
  });

  window.addEventListener('resize', resize);

  // run only while the lowfrequency view is shown; recalculate on activate
  var mo = new MutationObserver(function () {
    if (section.classList.contains('is-active')) startLoop(); else stopLoop();
  });
  mo.observe(section, { attributes: true, attributeFilter: ['class'] });
  if (section.classList.contains('is-active')) startLoop();
})();
