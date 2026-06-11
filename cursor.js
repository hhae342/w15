(function () {
  var cursor = 1;
  var classes = ['cursor-1', 'cursor-2', 'cursor-3'];

  function applyCursor() {
    document.body.classList.remove.apply(document.body.classList, classes);
    document.body.classList.add('cursor-' + cursor);
  }

  applyCursor();

  window.addEventListener('click', function () {
    cursor += 1;
    if (cursor > 3) cursor = 1;
    applyCursor();
  }, true);
})();
