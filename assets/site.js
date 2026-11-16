// Eigen script voor de WhatsApp-knop: chatvenster openen/sluiten en doorlinken naar WhatsApp.
(function () {
  var jc = document.querySelector('.joinchat');
  if (!jc) return;
  var settings = {};
  try { settings = JSON.parse(jc.getAttribute('data-settings')) || {}; } catch (e) { /* standaardwaarden */ }
  var url = 'https://wa.me/' + (settings.telephone || '') +
    (settings.message_send ? '?text=' + encodeURIComponent(settings.message_send) : '');

  function openBox() { jc.classList.add('joinchat--chatbox'); jc.classList.remove('joinchat--badge'); }
  function closeBox() { jc.classList.remove('joinchat--chatbox'); }
  function startChat() { window.open(url, '_blank', 'noopener'); }

  function bind(selector, handler) {
    var el = jc.querySelector(selector);
    if (!el) return;
    el.addEventListener('click', handler);
    el.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(); }
    });
  }

  bind('.joinchat__button', openBox);
  bind('.joinchat__close', closeBox);
  bind('.joinchat__open', startChat);
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeBox(); });

  // Na een paar seconden het rode bolletje met "1" tonen, zoals voorheen.
  if (settings.message_badge) {
    setTimeout(function () {
      if (!jc.classList.contains('joinchat--chatbox')) jc.classList.add('joinchat--badge');
    }, (settings.message_delay || 5) * 1000);
  }
})();
