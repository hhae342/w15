(function () {
  var DESIGN_WIDTH = 1920;

  function setResponsiveScale() {
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth || DESIGN_WIDTH;
    var scale = viewportWidth < DESIGN_WIDTH ? viewportWidth / DESIGN_WIDTH : 1;

    document.documentElement.style.setProperty('--page-scale', scale.toFixed(5));
  }

  setResponsiveScale();
  window.addEventListener('resize', setResponsiveScale, { passive: true });
  window.addEventListener('orientationchange', setResponsiveScale, { passive: true });
})();
