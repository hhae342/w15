(function () {
  var buttons = document.querySelectorAll('.site-upicon');
  if (!buttons.length) return;

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      button.classList.add('is-pressing');

      window.setTimeout(function () {
        button.classList.remove('is-pressing');
        scrollToTop();
      }, 140);
    });
  });
})();
