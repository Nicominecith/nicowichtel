/* Pack-Opening + Socials + Countdown (nutzt Funktionen aus script.js) */
const SOCIALS = [ // Plattform/Link hier anpassen
  { n: "nicominecith_ttv", u: "https://www.twitch.tv/nicominecith_ttv", i: "M4 3 2 7v13h5v3h3l3-3h4l5-5V3H4zm15 11-3 3h-5l-3 3v-3H6V5h13v9zm-3-6h-2v5h2V8zm-5 0H9v5h2V8z" },
  { n: "nicominecithedits", u: "https://www.tiktok.com/@nicominecithedits", i: "M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.6V9a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5z" },
  { n: "nicominecith", u: "", i: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2.25c-3 0-9 1.5-9 4.5V21h18v-2.25c0-3-6-4.5-9-4.5z" }
];
document.querySelectorAll(".my-socials").forEach(box => {
  box.innerHTML = SOCIALS.map(s => { const ic = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${s.i}"/></svg>@${s.n}`; return s.u ? `<a href="${s.u}" target="_blank" rel="noopener noreferrer">${ic}</a>` : `<span class="soc-static">${ic}</span>`; }).join("");
});

const PACK_CARDS = { // Karten pro Spiel: [Bild, Name]
  clashroyale: [["assets/cr/chest-wooden.png", "Holztruhe"], ["assets/cr/chest-magical.png", "Magische Truhe"], ["assets/cr/chest-legendary.png"]],
  clashofclans: [["assets/coc/Barbarian.png", "Barbar"], ["assets/coc/Balloon.png", "Ballon"], ["assets/coc/Dragon.png"]],
  brawlstars: [["assets/Trophy.png", "Trophäe"], ["assets/StarPoints.png", "Sternpunkte"], ["assets/gift-art.png"]]
};
const noticeEl = document.getElementById("notice"), countEl = document.getElementById("notice-time");
function tickNotice() {
  const d = EXPIRES_AT.getTime() - Date.now();
  if (d <= 0) { noticeEl.hidden = true; return; }
  countEl.textContent = `noch ${Math.floor(d / 864e5)} Tg ${Math.floor(d % 864e5 / 36e5)} Std ${Math.floor(d % 36e5 / 6e4)} Min`;
}
tickNotice(); setInterval(tickNotice, 30000);

const SFX = {};
function synthSfx(n) { // Ersatz-Töne für alle Spiele außer Clash Royale
  const m = {
    open_chest_diamonds_02: () => { noise(0.6, 0.3, 500, 7000); playTone(196, 0, 0.5, "sawtooth", 0.05); },
    chest_fly_01: () => noise(0.25, 0.12, 1500, 4000),
    get_xp_01: () => { noise(0.18, 0.12, 2500, 800); playTone(523.25, 0, 0.3, "triangle", 0.16); },
    get_elixir_02: () => { noise(0.18, 0.12, 2500, 800); [523.25, 659.25].forEach((f, k) => playTone(f, k * 0.09, 0.3, "triangle", 0.16)); },
    legendary_arena_jingle_01: () => { noise(0.18, 0.12, 2500, 800); [523.25, 659.25, 783.99].forEach((f, k) => playTone(f, k * 0.09, 0.3, "triangle", 0.16)); playTone(1046.5, 0.3, 0.6, "triangle", 0.14); }
  };
  if (m[n]) m[n]();
}
function sfx(n, vol = 0.8) {
  if (!soundEnabled) return;
  if (currentGame !== "clashroyale") { synthSfx(n); return; } // Clash-Royale-Sounds nur bei Clash Royale
  try { const a = (SFX[n] || (SFX[n] = new Audio(`assets/sfx/${n}.mp3`))).cloneNode(); a.volume = vol; a.play().catch(() => {}); } catch (_) {}
}
["supercell_jingle", "open_chest_diamonds_02", "chest_fly_01", "get_xp_01", "get_elixir_02", "legendary_arena_jingle_01", "get_crown_03", "scroll_open_01v3333"].forEach(n => { SFX[n] = new Audio(`assets/sfx/${n}.mp3`); SFX[n].preload = "none"; });
const $ = id => document.getElementById(id);
const stage = $("pack"), pk = $("pk"), topEl = $("pk-top"), cardsEl = $("cards"), doneBtn = $("pack-done");
const reduceMotion = matchMedia("(prefers-reduced-motion:reduce)").matches;
let onDone = null, prog = 0, drag = false, sx = 0, opened = false, idx = 0, lastCrackle = 0;

function zig(n, h, flipY) {
  const a = [], b = [];
  for (let i = 0; i <= n; i++) a.push(`${(i / n * 100).toFixed(1)}% ${i % 2 ? 0 : h}px`);
  for (let i = n; i >= 0; i--) b.push(`${(i / n * 100).toFixed(1)}% calc(100% - ${i % 2 ? 0 : h}px)`);
  return `polygon(${(flipY ? b.concat(a) : a.concat(b)).join(",")})`;
}
pk.style.setProperty("--clip-top", zig(22, 7).replace(/calc\(100% - (\d+)px\)/g, "calc(100% - $1px)"));
pk.style.setProperty("--clip-main", zig(22, 7, true));

function noise(dur, vol, f0, f1) {
  const c = getCtx(); if (!c || !soundEnabled) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
  s.buffer = buf; f.type = "bandpass"; f.Q.value = 1.2;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(c.destination); s.start();
}
function confetti(n) {
  for (let i = 0; i < n; i++) {
    const e = document.createElement("i"), a = Math.random() * 6.283, r = 120 + Math.random() * 220;
    e.className = "cf";
    e.style.cssText = `--h:${Math.floor(Math.random() * 360)};--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r - 80}px;--r:${Math.random() * 900 - 450}deg`;
    stage.appendChild(e); setTimeout(() => e.remove(), 1500);
  }
}
function setProg(p) { prog = Math.max(0, Math.min(1, p)); pk.style.setProperty("--p", prog); }

function openPack(cb) {
  onDone = cb; opened = false; idx = 0; setProg(0);
  const g = GAMES[currentGame];
  $("pk-ico").src = g.icon; $("pk-game").textContent = g.name;
  stage.className = "pack-stage"; cardsEl.hidden = true; cardsEl.textContent = ""; doneBtn.hidden = true;
  sfx("supercell_jingle", 0.7); stage.hidden = false; $("pack-open").focus({ preventScroll: true });
  if (reduceMotion) finish();
}
function openNow() {
  if (opened) return; opened = true; drag = false;
  stage.classList.remove("dragging"); stage.classList.add("opened");
  noise(0.5, 0.2, 500, 7000); sfx("open_chest_diamonds_02", 0.9); confetti(26);
  setTimeout(deal, 950);
}
function deal() {
  const g = GAMES[currentGame];
  const pc = PACK_CARDS[currentGame] || [[g.icon, g.name], ["assets/gold_coin.png", "Wichtel-Münze"], ["assets/gift-art.png"]];
  const defs = [[pc[0][0], pc[0][1], "GEWÖHNLICH", "★"], [pc[1][0], pc[1][1], "SELTEN", "★★"], [pc[2][0], "Dein Geschenk", "ULTRA-RARE", "★★★"]];
  cardsEl.textContent = "";
  defs.forEach(([img, name, rar, st], i) => {
    const c = document.createElement("button");
    c.type = "button"; c.className = "pcard r" + i; c.style.setProperty("--d", i);
    c.setAttribute("aria-label", `Karte ${i + 1} von 3 umdrehen`);
    c.innerHTML = `<div class="inner"><div class="face back"><img src="${g.icon}" alt=""></div><div class="face front"><span class="rar">${rar}</span><img src="${img}" alt=""><div><div class="cname">${name}</div><div class="cstars">${st}</div></div></div></div>`;
    c.addEventListener("click", () => tapCard(c, i));
    c.addEventListener("pointermove", e => { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(0)); c.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(0)); });
    cardsEl.appendChild(c);
  });
  cardsEl.hidden = false; $("pack-hint").hidden = false; stage.classList.add("dealt");
  sfx("chest_fly_01", 0.7);
}
function tapCard(c, i) {
  if (i !== idx) return;
  if (!c.classList.contains("flipped")) {
    c.classList.add("flipped");
    sfx(["get_xp_01", "get_elixir_02", "legendary_arena_jingle_01"][i], 0.9);
    if (i === 2) { confetti(60); rewardGifs(); setTimeout(() => sfx("get_crown_03", 0.9), 350); doneBtn.hidden = false; doneBtn.focus({ preventScroll: true }); }
    return;
  }
  if (i === 2) return;
  c.classList.add("out"); idx++;
  cardsEl.querySelectorAll(".pcard:not(.out)").forEach(el => el.style.setProperty("--d", [...cardsEl.children].indexOf(el) - idx));
  noise(0.15, 0.08, 1200, 300);
}
function rewardGifs() {
  ["assets/cr/gold-anim.gif", "assets/cr/gem-anim.gif"].forEach((src, k) => {
    const im = document.createElement("img"); im.src = src; im.alt = ""; im.className = "pop " + (k ? "r" : "l");
    stage.appendChild(im); setTimeout(() => im.remove(), 4200);
  });
}
function finish() {
  stage.classList.add("closing");
  setTimeout(() => { stage.hidden = true; stage.className = "pack-stage"; const cb = onDone; onDone = null; if (cb) cb(); }, reduceMotion ? 10 : 450);
}

const zone = $("tear-zone");
zone.addEventListener("pointerdown", e => { if (opened) return; drag = true; sx = e.clientX; zone.setPointerCapture(e.pointerId); stage.classList.add("dragging"); });
zone.addEventListener("pointermove", e => {
  if (!drag) return;
  setProg(Math.abs(e.clientX - sx) / (pk.getBoundingClientRect().width * 0.8));
  const t = performance.now(); if (t - lastCrackle > 70) { lastCrackle = t; noise(0.06, 0.07, 2000 + prog * 4000, 5000); }
  if (prog >= 1) openNow();
});
const release = () => { if (!drag) return; drag = false; stage.classList.remove("dragging"); if (prog > 0.85) openNow(); else setProg(0); };
zone.addEventListener("pointerup", release); zone.addEventListener("pointercancel", release);
$("pack-open").addEventListener("click", () => { setProg(1); setTimeout(openNow, 180); });
$("pack-skip").addEventListener("click", finish);
doneBtn.addEventListener("click", finish);
document.addEventListener("keydown", e => { if (!stage.hidden && e.key === "Escape") finish(); });
