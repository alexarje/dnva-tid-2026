/* Atlaset over året: tolv runde bilder; pek på ett, så spilles dagens lyd og tallene vises.
   Dataene er window.ATLAS fra images/atlas.js (skrevet av tools/make_atlas.py); lyden ligger i
   audio/atlas/NNN.mp3 og lastes først når lysbildet vises. Klikk eller trykk gjør det samme som å
   peke, for berøringsskjermer. Alt stilner når lysbildet forlates. */
(function () {
  'use strict';
  var grid = document.getElementById('atlas');
  if (!grid || !window.ATLAS) return;
  var facts = document.getElementById('atlas-facts');
  var audios = {}, current = null;

  function fmt(n) { return String(n).replace('.', ','); }

  function show(d) {
    facts.innerHTML =
      '<b>' + d.room + '</b>' + (d.place ? ', ' + d.place : '') + ' · ' + fmt(d.level).replace('-', '−') + ' dB · ' +
      fmt(d.qom) + ' mm/s²' + (d.hr ? ' · puls ' + d.hr : '') +
      '<br><i>' + d.note + '</i>';
    facts.classList.add('on');
  }

  function stop() {
    if (current) { current.pause(); current.currentTime = 0; current = null; }
    grid.querySelectorAll('figure.on').forEach(function (f) { f.classList.remove('on'); });
  }

  function start(fig, d) {
    if (current && current.dataset.day === String(d.day)) return;
    stop();
    var a = audios[d.day];
    if (!a) {
      a = new Audio('audio/atlas/' + String(d.day).padStart(3, '0') + '.mp3');
      a.loop = true; a.preload = 'auto'; a.dataset.day = String(d.day);
      audios[d.day] = a;
    }
    current = a;
    a.play().catch(function () {});
    fig.classList.add('on');
    show(d);
  }

  window.ATLAS.forEach(function (d) {
    var fig = document.createElement('figure');
    fig.innerHTML = '<img src="images/atlas/' + String(d.day).padStart(3, '0') + '.png" alt="Dag ' + d.day + ', ' + d.room + '">' +
                    '<figcaption>' + d.room + '</figcaption>';
    fig.addEventListener('mouseenter', function () { start(fig, d); });
    fig.addEventListener('click', function (e) { e.preventDefault(); if (current && current.dataset.day === String(d.day)) { stop(); facts.classList.remove('on'); } else start(fig, d); });
    grid.appendChild(fig);
  });
  grid.addEventListener('mouseleave', function () { stop(); });

  if (window.Reveal) {
    Reveal.on('slidechanged', function () { stop(); facts.classList.remove('on'); });
    Reveal.on('slidechanged', function (e) {      // last lydene når atlaset vises, så første pek ikke venter
      if (e.currentSlide && e.currentSlide.contains(grid)) {
        window.ATLAS.forEach(function (d) {
          if (!audios[d.day]) {
            var a = new Audio('audio/atlas/' + String(d.day).padStart(3, '0') + '.mp3');
            a.loop = true; a.preload = 'auto'; a.dataset.day = String(d.day); audios[d.day] = a;
          }
        });
      }
    });
  }
  window.Atlas = { stop: stop, count: window.ATLAS.length };
})();
