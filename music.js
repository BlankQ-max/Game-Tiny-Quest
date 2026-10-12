/* Tiny Quest background music.
   TQMusic.play('adventure') fades the track in and loops it, TQMusic.pause() fades it out.
   The player's on/off choice is remembered (the 🔊 button in the corner). */
(function () {
  'use strict';
  const SRC = { adventure: 'audio/adventure.mp3' };
  const VOL = .35;
  let el = null, want = null, fade = null, muted = false;
  try { muted = localStorage.getItem('tq_music') === 'off'; } catch (e) { /* storage blocked: music stays on */ }

  function button() { return document.getElementById('musicBtn'); }
  function refresh() {
    const b = button(); if (!b) return;
    b.textContent = muted ? '🔇' : '🔊';
    b.setAttribute('aria-pressed', muted ? 'true' : 'false');
    b.title = muted ? 'Music is off. Click to turn it on' : 'Music is on. Click to turn it off';
  }
  function fadeTo(target, ms, done) {
    clearInterval(fade);
    const a = el; if (!a) return;
    const from = a.volume, steps = Math.max(1, Math.round(ms / 50)); let i = 0;
    fade = setInterval(() => {
      i++; a.volume = Math.max(0, Math.min(1, from + (target - from) * i / steps));
      if (i >= steps) { clearInterval(fade); if (done) done(); }
    }, 50);
  }
  function ensure(name) {
    if (el && el._name === name) return el;
    if (el) { clearInterval(fade); el.pause(); }
    el = new Audio(SRC[name]); el._name = name; el.loop = true; el.preload = 'auto'; el.volume = 0;
    return el;
  }
  function play(name) {
    want = name;
    if (muted || !SRC[name]) return;
    const a = ensure(name);
    const p = a.play();
    if (p && p.catch) p.catch(() => { /* blocked until the player clicks: resumed by the listener below */ });
    fadeTo(VOL, 1500);
  }
  function pause() {
    want = null;
    if (!el) return;
    const a = el;
    fadeTo(0, 600, () => { if (!want) a.pause(); });
  }
  function toggle() {
    muted = !muted;
    try { localStorage.setItem('tq_music', muted ? 'off' : 'on'); } catch (e) { /* ignore */ }
    if (muted) { clearInterval(fade); if (el) el.pause(); }
    else if (want) play(want);
    refresh();
    return muted;
  }

  // browsers block sound until the first click or key press: start as soon as the player does one
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => {
    if (want && !muted && el && el.paused) { const p = el.play(); if (p && p.catch) p.catch(() => {}); fadeTo(VOL, 1000); }
  }));
  // silence when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!el) return;
    if (document.hidden) el.pause();
    else if (want && !muted) { const p = el.play(); if (p && p.catch) p.catch(() => {}); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const b = button(); if (b) b.onclick = toggle;
    refresh();
  });

  window.TQMusic = { play, pause, toggle, isMuted: () => muted };
})();
