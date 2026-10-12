/* Tiny Quest background music (three tracks).
     adventure : the map, shops and story pages       (resumes where it left off)
     battle    : turn-based fights in the adventure   (restarts for every fight)
     pvp       : the PvP Arena                        (restarts for every match)
   Switching tracks crossfades. The player's on/off choice is remembered (the 🔊 button). */
(function () {
  'use strict';
  const TRACKS = {
    adventure: { src: 'adventure.mp3',     vol: .35, restart: false },
    battle:    { src: 'fightingmusic.mp3', vol: .20, restart: true  },
    pvp:       { src: 'pvpmusic.mp3',      vol: .30, restart: true  }
  };   // volumes are balanced so the three tracks sound equally loud
  const els = {};
  let want = null, muted = false;
  try { muted = localStorage.getItem('tq_music') === 'off'; } catch (e) { /* storage blocked: music stays on */ }

  const clamp = v => Math.max(0, Math.min(1, v));
  function audio(name) {
    if (!els[name]) {
      const a = new Audio(TRACKS[name].src);
      a._name = name; a.loop = true; a.preload = 'auto'; a.volume = 0;
      els[name] = a;
    }
    return els[name];
  }
  function fade(a, target, ms, done) {
    clearInterval(a._f);
    const from = a.volume, steps = Math.max(1, Math.round(ms / 50)); let i = 0;
    a._f = setInterval(() => {
      i++; a.volume = clamp(from + (target - from) * i / steps);
      if (i >= steps) { clearInterval(a._f); if (done) done(); }
    }, 50);
  }
  function fadeOutAll(except, ms) {
    for (const n in els) {
      const a = els[n];
      if (n !== except && !a.paused) fade(a, 0, ms, () => a.pause());   // a newer fade-in cancels this one
    }
  }
  function silenceAll() { for (const n in els) { clearInterval(els[n]._f); els[n].pause(); } }
  function startPlaying(a) { const p = a.play(); if (p && p.catch) p.catch(() => { /* blocked until the first click: see the listener below */ }); }

  function play(name) {
    const t = TRACKS[name]; if (!t) return;
    want = name;
    if (muted) return;
    const a = audio(name);
    fadeOutAll(name, 700);
    if (!a.paused) { fade(a, t.vol, 500); return; }          // already playing: nothing to restart
    if (t.restart) { try { a.currentTime = 0; } catch (e) { /* not loaded yet */ } }
    startPlaying(a);
    fade(a, t.vol, t.restart ? 600 : 1500);
  }
  function pause() { want = null; fadeOutAll(null, 600); }

  function button() { return document.getElementById('musicBtn'); }
  function refresh() {
    const b = button(); if (!b) return;
    b.textContent = muted ? '🔇' : '🔊';
    b.setAttribute('aria-pressed', muted ? 'true' : 'false');
    b.title = muted ? 'Music is off. Click to turn it on' : 'Music is on. Click to turn it off';
  }
  function toggle() {
    muted = !muted;
    try { localStorage.setItem('tq_music', muted ? 'off' : 'on'); } catch (e) { /* ignore */ }
    if (muted) silenceAll(); else if (want) { const w = want; want = null; play(w); }
    refresh();
    return muted;
  }

  // browsers block sound until the first click or key press: start as soon as the player does one
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => {
    if (!want || muted) return;
    const a = els[want];
    if (a && a.paused) { startPlaying(a); fade(a, TRACKS[want].vol, 1000); }
  }));
  // silence when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { for (const n in els) if (!els[n].paused) { els[n].pause(); els[n]._wasPlaying = true; } }
    else if (want && !muted) { const a = els[want]; if (a && a._wasPlaying) { startPlaying(a); } for (const n in els) els[n]._wasPlaying = false; }
  });
  document.addEventListener('DOMContentLoaded', () => { const b = button(); if (b) b.onclick = toggle; refresh(); });

  window.TQMusic = { play, pause, toggle, isMuted: () => muted };
})();
