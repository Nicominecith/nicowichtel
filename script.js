/*
  Deine beiden Codes bearbeitest du ausschließlich in codes.json.
  accessCode = Zugangscode für die Webseite
  voucherCode = Supercell-Store-Gutscheincode
*/
const EXPIRES_AT = new Date("2026-12-29T23:00:00Z"); // 30.12.2026, 00:00 Uhr Europe/Berlin

// Menü-Musik: bei jedem Besuch wird zufällig ein Track gewählt, danach geht es zufällig weiter
const MUSIC_TRACKS = [
  "assets/music/menu-1.mp3", "assets/music/menu-2.mp3", "assets/music/menu-3.mp3",
  "assets/music/menu-4.mp3", "assets/music/menu-5.mp3", "assets/music/menu-6.mp3",
  "assets/music/menu-7.mp3", "assets/music/menu-8.mp3", "assets/music/menu-9.mp3"
];
const MUSIC_VOLUME = 0.35;
const PLAYLISTS = { // Spiel-eigene Musik (alle anderen nutzen MUSIC_TRACKS)
  brawlstars: MUSIC_TRACKS,
  boombeach: ["bb-home", "bb-prepare", "bb-attack-1", "bb-attack-2", "bb-villager", "bb-tutorial"].map(n => `assets/music/${n}.mp3`),
  clashofclans: ["coc-home-1", "coc-home-2", "coc-home-3", "coc-xmas-1", "coc-xmas-2", "coc-xmas-3"].map(n => `assets/music/${n}.mp3`),
  hayday: ["hd-farm", "hd-fishing", "hd-town", "hd-farm-winter", "hd-fishing-winter", "hd-town-winter"].map(n => `assets/music/${n}.mp3`)
};
let musicGame = "brawlstars";
try { const sg = localStorage.getItem("wichtel-game"); if (PLAYLISTS[sg]) musicGame = sg; } catch (_) {}

const screens = ["gate", "gift", "expired"].map(id => document.getElementById(id));
const form = document.getElementById("access-form");
const input = document.getElementById("access-code");
const error = document.getElementById("gate-error");
const voucher = document.getElementById("voucher-code");
const copyBtn = document.getElementById("copy-btn");
const copyStatus = document.getElementById("copy-status");
const click = document.getElementById("menu-sound");
const music = document.getElementById("bg-music");
const soundToggle = document.getElementById("sound-toggle");
const musicToggle = document.getElementById("music-toggle");

let codes = null;
let soundEnabled = loadSetting("wichtel-sound");
let musicEnabled = loadSetting("wichtel-music");
let lastTrack = -1;
let musicStarted = false;
let fadeTimer = null;

function loadSetting(key) {
  try { return localStorage.getItem(key) !== "off"; } catch (_) { return true; }
}
function saveSetting(key, on) {
  try { localStorage.setItem(key, on ? "on" : "off"); } catch (_) {}
}

function show(id) {
  screens.forEach(screen => screen.classList.toggle("active", screen.id === id));
}
function checkExpiry() {
  const expired = Date.now() >= EXPIRES_AT.getTime();
  if (expired) show("expired");
  return expired;
}
function normalize(value) {
  return String(value || "").trim().toLocaleUpperCase("de-DE");
}

/* ---------- Audio-Grundlage (Web Audio für Klicks, HTML-Audio für Musik) ---------- */
let ctx = null;          // AudioContext, wird erst nach einer Berührung erzeugt
let clickBuffer = null;  // dekodierter Menü-Klick
let audioUnlocked = false;

function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch (_) { ctx = null; }
  return ctx;
}
async function loadClickBuffer() {
  const c = getCtx();
  if (!c || clickBuffer) return;
  try {
    const res = await fetch("assets/Menu-click.mp3");
    const data = await res.arrayBuffer();
    clickBuffer = await new Promise((ok, fail) => c.decodeAudioData(data, ok, fail));
  } catch (_) { clickBuffer = null; } // z. B. file:// – dann greift der HTML-Audio-Fallback
}
function playTone(freq, start, dur, type, vol) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  gain.gain.setValueAtTime(0.0001, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}
function playClick() {
  if (!soundEnabled) return;
  const c = getCtx();
  if (c && clickBuffer) {
    if (c.state === "suspended") c.resume().catch(() => {});
    const src = c.createBufferSource();
    const gain = c.createGain();
    gain.gain.value = 0.9;
    src.buffer = clickBuffer;
    src.connect(gain).connect(c.destination);
    src.start(0);
    return;
  }
  if (!click) return; // Fallback: normales Audio-Element
  try {
    click.currentTime = 0;
    const playback = click.play();
    if (playback && typeof playback.catch === "function") playback.catch(() => {});
  } catch (_) {}
}
function playSuccess() {
  if (!soundEnabled || !getCtx()) return;
  playTone(523.25, 0, 0.16, "triangle", 0.18);    // C5
  playTone(659.25, 0.09, 0.16, "triangle", 0.18); // E5
  playTone(783.99, 0.18, 0.28, "triangle", 0.18); // G5
}
function playError() {
  if (!soundEnabled || !getCtx()) return;
  playTone(196, 0, 0.14, "square", 0.08);
  playTone(150, 0.12, 0.2, "square", 0.08);
}

/* ---------- Hintergrundmusik ---------- */
let musicStarting = false;
function pickTrack() {
  const list = PLAYLISTS[musicGame] || MUSIC_TRACKS;
  let index;
  do { index = Math.floor(Math.random() * list.length); }
  while (list.length > 1 && index === lastTrack);
  lastTrack = index;
  return list[index];
}
function switchMusicForGame(id) {
  const same = (PLAYLISTS[id] || MUSIC_TRACKS) === (PLAYLISTS[musicGame] || MUSIC_TRACKS);
  musicGame = id;
  if (same) return;
  if (!music.getAttribute("src")) return; // Musik noch nicht gestartet
  music.src = pickTrack();
  if (musicEnabled && musicStarted) { music.volume = 0; music.play().then(() => fadeTo(MUSIC_VOLUME, 1200)).catch(() => {}); }
}
function fadeTo(target, ms) {
  clearInterval(fadeTimer);
  const steps = 20;
  const start = music.volume;
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    music.volume = Math.min(1, Math.max(0, start + (target - start) * (i / steps)));
    if (i >= steps) clearInterval(fadeTimer);
  }, ms / steps);
}
function startMusic() {
  if (!musicEnabled || !music || musicStarting) return;
  if (!music.getAttribute("src")) {   // Track nur einmal wählen
    music.src = pickTrack();
    music.volume = 0;
  }
  musicStarting = true;
  const playback = music.play();
  if (playback && typeof playback.then === "function") {
    playback
      .then(() => { musicStarted = true; musicStarting = false; fadeTo(MUSIC_VOLUME, 1500); })
      .catch(() => { musicStarting = false; });
  } else {
    musicStarted = true;
    musicStarting = false;
  }
}
function stopMusic() {
  if (!music) return;
  clearInterval(fadeTimer);
  music.pause();
}
function nextTrack() {
  music.src = pickTrack();
  music.volume = MUSIC_VOLUME;
  if (musicEnabled && !document.hidden) music.play().catch(() => {});
}
music.addEventListener("ended", nextTrack);
music.addEventListener("error", () => { if (musicStarted) nextTrack(); });

/* iOS und Android erlauben Audio erst nach einer echten Geste (click/touchend/keydown) */
function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
  if (!audioUnlocked) { audioUnlocked = true; loadClickBuffer(); }
  startMusic();
  if (musicStarted || !musicEnabled) {
    ["click", "touchend", "keydown"].forEach(t => document.removeEventListener(t, unlockAudio, true));
  }
}
["click", "touchend", "keydown"].forEach(t => document.addEventListener(t, unlockAudio, true));
startMusic(); // klappt, falls der Browser Autoplay erlaubt

function pauseAudio() { music.pause(); }
function resumeAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
  if (musicEnabled && musicStarted) music.play().catch(() => {});
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseAudio(); else { checkExpiry(); resumeAudio(); }
});
window.addEventListener("pagehide", pauseAudio);
window.addEventListener("pageshow", () => { if (!document.hidden) resumeAudio(); });

/* ---------- Schalter ---------- */
function updateToggles() {
  musicToggle.setAttribute("aria-pressed", String(musicEnabled));
  musicToggle.setAttribute("aria-label", musicEnabled ? "Musik ausschalten" : "Musik einschalten");
  musicToggle.querySelector(".pill-label").textContent = musicEnabled ? "MUSIK" : "MUSIK AUS";
  musicToggle.classList.toggle("muted", !musicEnabled);

  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.setAttribute("aria-label", soundEnabled ? "Klick-Sounds ausschalten" : "Klick-Sounds einschalten");
  soundToggle.querySelector(".pill-label").textContent = soundEnabled ? "KLICK" : "KLICK AUS";
  soundToggle.classList.toggle("muted", !soundEnabled);
}
musicToggle.addEventListener("click", () => {
  musicEnabled = !musicEnabled;
  saveSetting("wichtel-music", musicEnabled);
  updateToggles();
  if (musicEnabled) startMusic(); else stopMusic();
});
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  saveSetting("wichtel-sound", soundEnabled);
  updateToggles();
});

// Ein Klick-Sound für alle Buttons und Links
document.addEventListener("click", event => {
  const target = event.target.closest("button, a");
  if (!target || target === musicToggle) return;
  playClick();
});

// Code ein-/ausblenden
const eyeBtn = document.getElementById("eye-btn");
eyeBtn.addEventListener("click", () => {
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  eyeBtn.setAttribute("aria-pressed", String(show));
  eyeBtn.setAttribute("aria-label", show ? "Code verbergen" : "Code anzeigen");
  input.focus();
});

/* ---------- Spiele (Daten von den offiziellen Supercell-Seiten) ---------- */
const GAMES = {
  brawlstars: {
    name: "Brawl Stars", icon: "assets/icon-brawlstars.png",
    tagline: "Schnelles Multiplayer-MAYHEM",
    desc: "3v3-Kämpfe und Battle Royale fürs Handy – allein oder mit Freunden, in unter drei Minuten. Über 100 Brawler und mehr als 15 Spielmodi warten auf dich.",
    appstore: "https://itunes.apple.com/app/brawl-stars/id1229016807?mt=8",
    play: "https://play.google.com/store/apps/details?id=com.supercell.brawlstars",
    social: [["YouTube", "https://www.youtube.com/brawlstars"], ["TikTok", "https://www.tiktok.com/@brawlstars"], ["Reddit", "https://www.reddit.com/r/Brawlstars/"], ["Instagram", "https://www.instagram.com/BrawlStars/"], ["X", "https://x.com/supercell"]]
  },
  clashofclans: {
    name: "Clash of Clans", icon: "assets/icon-clashofclans.png",
    tagline: "Führe deinen Clan zum Sieg!",
    desc: "Baue dein Dorf, stelle eine Armee auf und tritt mit deinem Clan in epischen Clan-Kriegen gegen andere an.",
    appstore: "https://itunes.apple.com/app/clash-of-clans/id529479190?mt=8",
    play: "https://play.google.com/store/apps/details?id=com.supercell.clashofclans",
    social: [["YouTube", "https://www.youtube.com/clashofclans"], ["Reddit", "https://www.reddit.com/r/ClashOfClans/"], ["Instagram", "https://www.instagram.com/ClashofClans/"], ["Facebook", "https://www.facebook.com/ClashofClans"], ["Discord", "https://discord.com/invite/clashofclans"]]
  },
  clashroyale: {
    name: "Clash Royale", icon: "assets/icon-clashroyale.png",
    tagline: "Epische Echtzeit-Kartenduelle",
    desc: "Stelle dein Kampfdeck zusammen und schlage deine Gegner in schnellen Echtzeit-Duellen, indem du ihre Türme und den König stürzt.",
    appstore: "https://itunes.apple.com/app/id1053012308?mt=8",
    play: "https://play.google.com/store/apps/details?id=com.supercell.clashroyale",
    social: [["YouTube", "https://www.youtube.com/clashroyale"], ["Reddit", "https://www.reddit.com/r/ClashRoyale"], ["Instagram", "https://www.instagram.com/ClashRoyale/"], ["Facebook", "https://www.facebook.com/ClashRoyale"]]
  },
  hayday: {
    name: "Hay Day", icon: "assets/icon-hayday-2025.png",
    tagline: "Farmen mit Freunden und Familie",
    desc: "Baue deine Farm auf, züchte Tiere, geh angeln und entdecke das Tal – dein ganz eigenes Stück Landidylle.",
    appstore: "https://itunes.apple.com/app/hay-day/id506627515?mt=8",
    play: "https://play.google.com/store/apps/details?id=com.supercell.hayday",
    social: [["YouTube", "https://www.youtube.com/user/haydayofficial"], ["Reddit", "https://www.reddit.com/r/HayDay"], ["Instagram", "https://www.instagram.com/HayDay/"], ["Facebook", "https://www.facebook.com/HayDayOfficial"]]
  },
  boombeach: {
    name: "Boom Beach", icon: "assets/icon-boombeach.png",
    tagline: "Bauen. Planen. BOOM!",
    desc: "Greife feindliche Basen an, befreie die Inselbewohner und bezwinge die Blackguard – allein oder mit einer Task Force.",
    appstore: "https://itunes.apple.com/app/reef/id672150402?mt=8",
    play: "https://play.google.com/store/apps/details?id=com.supercell.boombeach",
    social: [["YouTube", "https://www.youtube.com/user/OfficialBoomBeach"], ["Reddit", "https://www.reddit.com/r/BoomBeach/"], ["Instagram", "https://www.instagram.com/BoomBeach/"], ["Facebook", "https://www.facebook.com/BoomBeach"]]
  }
};
let currentGame = "brawlstars";
try { const saved = localStorage.getItem("wichtel-game"); if (GAMES[saved]) currentGame = saved; } catch (_) {}

function renderPickers() {
  document.querySelectorAll(".game-picker").forEach(picker => {
    picker.textContent = "";
    Object.entries(GAMES).forEach(([id, g]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pick";
      btn.dataset.game = id;
      btn.setAttribute("aria-label", g.name);
      const img = document.createElement("img");
      img.src = g.icon;
      img.alt = "";
      btn.appendChild(img);
      btn.addEventListener("click", () => setGame(id));
      picker.appendChild(btn);
    });
  });
}
function setGame(id) {
  const g = GAMES[id];
  if (!g) return;
  currentGame = id;
  switchMusicForGame(id);
  try { localStorage.setItem("wichtel-game", id); } catch (_) {}
  document.body.dataset.game = id;
  document.querySelectorAll(".pick").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.game === id)));
  document.querySelectorAll(".banner-icon").forEach(el => { el.src = g.icon; });
  document.querySelectorAll(".banner-name").forEach(el => { el.textContent = g.name; });
  document.getElementById("gp-icon").src = g.icon;
  document.getElementById("gp-icon").alt = g.name;
  document.getElementById("gp-name").textContent = g.name;
  document.getElementById("gp-tagline").textContent = g.tagline;
  document.getElementById("gp-desc").textContent = g.desc;
  document.getElementById("gp-appstore").href = g.appstore;
  document.getElementById("gp-play").href = g.play;
  const social = document.getElementById("gp-social");
  social.textContent = "";
  g.social.forEach(([label, url]) => {
    const a = document.createElement("a");
    a.href = url; a.textContent = label; a.target = "_blank"; a.rel = "noopener noreferrer";
    social.appendChild(a);
  });
}

/* ---------- Codes ---------- */
async function loadCodes() {
  try {
    const response = await fetch("./codes.json", { cache: "no-store" });
    if (!response.ok) throw new Error("codes.json konnte nicht geladen werden");
    const data = await response.json();
    if (!data.accessCode || !data.voucherCode ||
        data.accessCode.startsWith("DEIN-") || data.voucherCode.startsWith("DEIN-")) {
      throw new Error("Bitte beide Codes in codes.json eintragen.");
    }
    codes = data;
  } catch (err) {
    error.textContent = "Die Codes sind noch nicht eingerichtet. Bitte codes.json prüfen.";
    form.querySelector("button[type='submit']").disabled = true;
    console.error(err);
  }
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (checkExpiry()) return;
  if (!codes) await loadCodes();
  if (!codes) return;

  if (normalize(input.value) === normalize(codes.accessCode)) {
    voucher.textContent = codes.voucherCode;
    playSuccess();
    const revealGift = () => {
      show("gift");
      if (typeof sfx === "function") sfx("scroll_open_01v3333", 0.9);
      const card = document.querySelector(".gift-card");
      card.classList.remove("reveal");
      void card.offsetWidth;
      card.classList.add("reveal");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    if (typeof openPack === "function") openPack(revealGift); else revealGift();
  } else {
    playError();
    error.textContent = "Der Code stimmt leider nicht. Versuch es noch einmal.";
    input.value = "";
    input.focus();
    form.classList.remove("shake");
    void form.offsetWidth;
    form.classList.add("shake");
  }
});
function legacyCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (_) {}
  area.remove();
  return ok;
}
copyBtn.addEventListener("click", async () => {
  if (!codes) return;
  let ok = false;
  try {
    await navigator.clipboard.writeText(codes.voucherCode);
    ok = true;
  } catch (_) {
    ok = legacyCopy(codes.voucherCode);
  }
  if (ok) {
    copyStatus.textContent = "Gutscheincode wurde kopiert!";
    copyBtn.textContent = "Kopiert!";
    setTimeout(() => { copyBtn.textContent = "Kopieren"; }, 2500);
  } else {
    copyStatus.textContent = "Bitte tippe lange auf den Code und kopiere ihn manuell.";
  }
});

renderPickers();
setGame(currentGame);
updateToggles();
loadCodes();
checkExpiry();
setInterval(checkExpiry, 1000);
