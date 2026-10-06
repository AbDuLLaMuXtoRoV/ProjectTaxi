/* Runs before first paint: applies saved language, text size and contrast so the page never "jumps". */
(function () {
  var d = document.documentElement, lang, size, hc;
  function read(k) { try { return JSON.parse(localStorage.getItem('safar.' + k)); } catch (e) { return null; } }
  lang = read('lang');
  size = read('size');
  hc = read('contrast');
  if (lang !== 'uz' && lang !== 'ru' && lang !== 'en') {
    var n = (navigator.language || 'en').toLowerCase();
    lang = n.indexOf('uz') === 0 ? 'uz' : /^(ru|kk|ky|tg|be|uk)/.test(n) ? 'ru' : 'en';
  }
  d.lang = lang;
  d.setAttribute('data-size', size === 2 || size === 3 ? size : 1);
  if (hc) d.classList.add('hc');
  d.classList.add('js');
  if (lang !== 'en') {
    // Hide English placeholder text until translations are applied (failsafe after 2.5 s).
    d.classList.add('i18n-wait');
    setTimeout(function () { d.classList.remove('i18n-wait'); }, 2500);
  }
})();
