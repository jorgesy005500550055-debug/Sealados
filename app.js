import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, limit, onSnapshot, runTransaction, serverTimestamp, arrayUnion, arrayRemove, getDocs, writeBatch, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { PACKS, DUELS, TEAMQ, BANK_IDX, teamWord } from "./questions.js";
import { shuffle, makeTeams, makeMatches, schedule, weekStart, buildHistory, stats, makeCode } from "./logic.js";

const firebaseConfig = {
  apiKey: "AIzaSyByjxMhiFt4Z8kyj6I8ZTPTtW64SfSrODs",
  authDomain: "elegido-f289f.firebaseapp.com",
  projectId: "elegido-f289f",
  storageBucket: "elegido-f289f.firebasestorage.app",
  messagingSenderId: "203985263904",
  appId: "1:203985263904:web:5299531599426772ce4b45"
};
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = getFirestore(fb);

const DEFAULT_SETTINGS = { freqValue: 1, freqUnit: "días", fixedTime: true, releaseTime: "21:00", perRound: 2, packs: ["amistad", "absurdas", "habilidades"], reveal: "instant", duel: true, duelSize: 2, teams: true, teamSize: 2, weekly: 3, editors: "todos" };

/* ======== Estado ======== */
const S = { user: null, profile: null, view: "loading", authMode: "signup", groups: [], gid: null, g: null, tab: "hoy", sub: "chat",
  n: null, next: null, round: null, roundLoaded: false, votes: [], chat: [], queue: [], ranking: null, rankingLoading: false, pendingOpen: null, joinCode: null };
let unsub = { groups: null, round: null, votes: null, chat: null, queue: null };
let creating = null, installPrompt = null;
const off = k => { if (unsub[k]) { unsub[k](); unsub[k] = null; } };
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const uid = () => S.user.uid;
const params = new URLSearchParams(location.search);
if (params.get("c")) S.joinCode = params.get("c").toUpperCase();

/* ======== Helpers ======== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const info = u => (S.g && S.g.memberInfo && S.g.memberInfo[u]) || {};
const name = u => u === uid() ? "Tú" : (info(u).name || "Alguien");
const rawName = u => info(u).name || "Alguien";
function av(u, cls = "", g = S.g) {
  const i = (g && g.memberInfo && g.memberInfo[u]) || {};
  if (i.photo) return `<img class="av ${cls}" src="${i.photo}" alt="">`;
  let h = 0; for (const c of String(u)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<span class="av ${cls}" style="background:var(--a${h % 8 + 1})" aria-hidden="true">${esc((i.name || "?")[0].toUpperCase())}</span>`;
}
const pc = p => `--pc:var(--p-${p})`;
const pct = (n, t) => t ? Math.round(n / t * 100) : 0;
const votosTxt = n => `${n} voto${n === 1 ? "" : "s"}`;
const andList = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " y " + a[a.length - 1];
const packName = p => p === "grupo" ? "Del grupo" : (PACKS[p] ? PACKS[p].n : p);
const hhmm = t => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const ms = ts => ts && ts.toMillis ? ts.toMillis() : (typeof ts === "number" ? ts : Date.now());
function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2600); }
function fail(e, msg) { console.error(e); toast(msg || errText(e)); }
function errText(e) {
  const c = (e && e.code) || "";
  if (c.includes("email-already-in-use")) return "Ya hay una cuenta con ese correo. Prueba a entrar.";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "Correo o contraseña incorrectos.";
  if (c.includes("weak-password")) return "La contraseña es demasiado débil (mínimo 8 caracteres).";
  if (c.includes("invalid-email")) return "Ese correo no es válido.";
  if (c.includes("too-many-requests")) return "Demasiados intentos. Espera un momento y vuelve a probar.";
  if (c.includes("network")) return "Sin conexión. Revisa internet y vuelve a probar.";
  if (c.includes("permission-denied")) return "No tienes permiso para hacer eso en este grupo.";
  if (c.includes("unauthorized-domain")) return "Este dominio no está autorizado en Firebase (Authentication → Dominios autorizados).";
  return "Algo ha fallado. Vuelve a probar.";
}
const hasMinor = g => (g.members || []).some(u => g.memberInfo && g.memberInfo[u] && g.memberInfo[u].adult === false);
const canEdit = g => g.settings.editors === "todos" || g.creator === uid();
const gref = () => doc(db, "groups", S.gid);
const col = name => collection(db, "groups", S.gid, name);
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/* ======== Autenticación ======== */
onAuthStateChanged(auth, async user => {
  Object.keys(unsub).forEach(off);
  S.user = user; S.groups = []; S.gid = null; S.g = null;
  if (!user) { S.profile = null; S.view = "auth"; render(); return; }
  try {
    const p = await getDoc(doc(db, "users", user.uid));
    if (p.exists()) S.profile = p.data();
    else if (S.pendingProfile) { await setDoc(doc(db, "users", user.uid), { ...S.pendingProfile, createdAt: serverTimestamp() }); S.profile = S.pendingProfile; }
    else { S.view = "profile"; render(); return; }
  } catch (e) { fail(e); }
  startGroups();
});
function startGroups() {
  S.view = "groups"; render();
  unsub.groups = onSnapshot(query(collection(db, "groups"), where("members", "array-contains", uid())), snap => {
    S.groups = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
    if (S.pendingOpen && S.groups.find(g => g.id === S.pendingOpen)) { const id = S.pendingOpen; S.pendingOpen = null; openGroup(id); return; }
    if (S.gid) {
      const g = S.groups.find(x => x.id === S.gid);
      if (!g) { closeGroup(); toast("Ya no estás en ese grupo"); return; }
      S.g = g; computeRound();
    } else if (S.view === "groups" && !S.joinCode) {
      const last = ls.get("senalados-last");
      if (last && S.groups.find(x => x.id === last) && !startGroups.done) { startGroups.done = true; openGroup(last); return; }
    }
    startGroups.done = true;
    render();
    if (S.joinCode && S.view === "groups") { const c = S.joinCode; S.joinCode = null; history.replaceState(null, "", location.pathname); joinModal(c); }
  }, e => fail(e));
}

/* ======== Grupo abierto ======== */
function openGroup(id) {
  closeGroup(true);
  S.gid = id; S.g = S.groups.find(x => x.id === id); S.view = "group"; S.tab = "hoy"; S.ranking = null;
  ls.set("senalados-last", id);
  unsub.chat = onSnapshot(query(col("chat"), orderBy("at", "desc"), limit(80)), s => {
    S.chat = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).reverse();
    if (S.tab === "grupo" && S.sub === "chat") { const atBottom = innerHeight + scrollY >= document.body.scrollHeight - 80; render(); if (atBottom) toBottom(); }
  }, e => fail(e));
  unsub.queue = onSnapshot(col("queue"), s => { S.queue = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })); if (S.tab === "añadir") render(); }, e => fail(e));
  computeRound(); render(); scrollTo(0, 0);
}
function closeGroup(keepView) {
  ["round", "votes", "chat", "queue"].forEach(off);
  S.gid = null; S.g = null; S.n = null; S.round = null; S.votes = []; S.chat = []; S.queue = [];
  if (!keepView) { S.view = "groups"; ls.set("senalados-last", ""); render(); }
}
function computeRound() {
  if (!S.g) return;
  const { n, next } = schedule(S.g); S.next = next;
  if (n === S.n) return;
  S.n = n; S.round = null; S.roundLoaded = false; S.votes = []; off("round"); off("votes");
  unsub.round = onSnapshot(doc(db, "groups", S.gid, "rounds", String(n)), s => {
    if (!s.exists()) { S.round = null; S.roundLoaded = true; render(); ensureRound(n); return; }
    S.round = s.data(); S.roundLoaded = true; render();
  }, e => fail(e));
  unsub.votes = onSnapshot(query(col("votes"), where("round", "==", n)), s => { S.votes = s.docs.map(d => d.data()); render(); }, e => fail(e));
}
async function ensureRound(n) {
  if (creating === n) return;
  creating = n;
  try { const gid = S.gid, made = await createRound(n); if (made) await writeSummary(n, gid); }
  catch (e) { fail(e, "No se ha podido preparar la ronda. Vuelve a abrir el grupo."); }
  finally { creating = null; }
}
/* La primera persona que abre la app en una ronda nueva la prepara para todo el grupo */
async function createRound(n) {
  const gid = S.gid, groupRef = doc(db, "groups", gid), roundRef = doc(db, "groups", gid, "rounds", String(n));
  const qsnap = await getDocs(query(collection(db, "groups", gid, "queue"), where("consumed", "==", false)));
  const pending = qsnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
  return runTransaction(db, async tx => {
    const rs = await tx.get(roundRef); if (rs.exists()) return false;
    const gs = await tx.get(groupRef); const g = gs.data(), st = g.settings, minor = hasMinor(g);
    const cands = pending.filter(q => !(minor && q.pack === "picante")).slice(0, st.perRound);
    const fresh = [];
    for (const q of cands) { const qs = await tx.get(doc(db, "groups", gid, "queue", q.id)); if (qs.exists() && qs.data().consumed === false) fresh.push(q); }
    const questions = fresh.map(q => ({ id: "c-" + q.id, text: q.text, pack: q.pack, by: q.by }));
    const packs = st.packs.filter(p => PACKS[p] && !(minor && p === "picante"));
    let used = (g.used || []).slice();
    let pool = BANK_IDX.filter(q => packs.includes(q.pack) && !used.includes(q.id));
    const need = st.perRound - questions.length;
    if (pool.length < need) { used = used.filter(id => !packs.includes(id.split("-")[0])); pool = BANK_IDX.filter(q => packs.includes(q.pack)); }
    shuffle(pool).slice(0, need).forEach(q => { questions.push({ id: q.id, text: q.text, pack: q.pack }); used.push(q.id); });
    const members = g.members.slice();
    let duels = [], matches = [];
    if (st.duel && members.length >= st.duelSize) { const dq = shuffle(DUELS[st.duelSize]); duels = makeTeams(members, st.duelSize).map((t, i) => ({ id: "d" + i, text: dq[i % dq.length], team: t })); }
    if (st.teams) { const tq = shuffle(TEAMQ); matches = makeMatches(members, st.teamSize).map((m, i) => ({ id: "m" + i, text: tq[i % tq.length].replace("{e}", teamWord(st.teamSize)), size: st.teamSize, a: m.a, b: m.b })); }
    tx.set(roundRef, { n, members, questions, duels, matches, createdAt: serverTimestamp() });
    tx.update(groupRef, { used });
    fresh.forEach(q => tx.update(doc(db, "groups", gid, "queue", q.id), { consumed: n }));
    return true;
  });
}
/* Resumen automático en el chat de la ronda que acaba de cerrarse */
async function writeSummary(n, gid) {
  const prev = n - 1; if (prev < 1) return;
  const rs = await getDoc(doc(db, "groups", gid, "rounds", String(prev))); if (!rs.exists()) return;
  const r = rs.data(), vs = (await getDocs(query(collection(db, "groups", gid, "votes"), where("round", "==", prev)))).docs.map(d => d.data());
  const lines = (r.questions || []).map(q => {
    const c = {}; let t = 0; vs.forEach(v => { const x = v.q && v.q[q.id]; if (x) { c[x] = (c[x] || 0) + 1; t++; } });
    let top = null, b = 0; for (const k in c) if (c[k] > b) { b = c[k]; top = k; }
    return { text: q.text, u: top, pct: pct(b, t) };
  }).filter(l => l.u);
  if (!lines.length) return;
  await setDoc(doc(db, "groups", gid, "chat", "sys-" + prev), { by: null, kind: "summary", round: prev, lines, at: serverTimestamp() });
}

/* ======== Votos ======== */
function votesOf(kind, id) { const o = {}; S.votes.forEach(v => { if (v[kind] && v[kind][id] !== undefined) o[v.uid] = v[kind][id]; }); return o; }
function voteState(v) {
  const voters = S.g.members, n = voters.filter(u => v[u] !== undefined).length, mine = v[uid()] !== undefined, done = n >= voters.length;
  return { mine, n, total: voters.length, done, show: mine && (S.g.settings.reveal === "instant" || done) };
}
async function castVote(kind, id, value) {
  try { await setDoc(doc(col("votes"), `${S.n}_${uid()}`), { uid: uid(), round: S.n, [kind]: { [id]: value } }, { merge: true }); }
  catch (e) { fail(e); }
}

/* ======== Vistas ======== */
const ICON = {
  hoy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 11V5a2 2 0 0 1 4 0v6"/><path d="M13 9a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 15.5V13a2 2 0 0 1 4 0"/><path d="M9 11v1"/></svg>',
  duelos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="m5 14 4 4M7 17l-3 3M3 19l2 2"/></svg>',
  equipos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20a6 6 0 0 1 11-3.3M11 16.7A6 6 0 0 1 22 20"/></svg>',
  grupo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg>',
  añadir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>',
  ajustes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>'
};
const topbar = (extra = "") => `<div class="top"><div class="wordmark"><span>¿?</span>Señalados</div><div class="sp"></div>${extra}</div>`;

function render() {
  const app = $("#app"), tabs = $("#tabs");
  /* conservar lo que se está escribiendo cuando llegan datos nuevos */
  const keep = {}; app.querySelectorAll("input[id],textarea[id],select[id]").forEach(el => { if (el.type === "file") return; keep[el.id] = el.type === "radio" || el.type === "checkbox" ? { c: el.checked } : { v: el.value }; });
  const act = document.activeElement && document.activeElement.id, sel = act && document.activeElement.selectionStart;
  tabs.hidden = S.view !== "group";
  if (S.view === "loading") app.innerHTML = `${topbar()}<div class="empty">Cargando…</div>`;
  else if (S.view === "auth") app.innerHTML = vAuth();
  else if (S.view === "profile") app.innerHTML = vProfile();
  else if (S.view === "groups") app.innerHTML = vGroups();
  else if (S.view === "group" && S.g) {
    app.innerHTML = vGroup(S.g);
    const labels = { hoy: "Hoy", duelos: "Duelos", equipos: "Equipos", grupo: S.g.name, añadir: "Añadir", ajustes: "Ajustes" };
    tabs.innerHTML = `<div class="in">${Object.keys(labels).map(t => `<button data-tab="${t}" aria-current="${S.tab === t}">${ICON[t]}<span>${esc(labels[t])}</span></button>`).join("")}</div>`;
  }
  for (const id in keep) { const el = document.getElementById(id); if (!el || el.dataset.fresh !== undefined) continue; if ("c" in keep[id]) el.checked = keep[id].c; else el.value = keep[id].v; }
  if (act) { const el = document.getElementById(act); if (el) { el.focus(); try { if (sel != null) el.setSelectionRange(sel, sel); } catch (e) {} } }
  tick();
}
function vAuth() {
  const su = S.authMode === "signup";
  return `${topbar()}
  <div class="stack">
    <h1>Señala a tus amigos.<br>Cada día, una pregunta nueva.</h1>
    <div class="seg" role="group" aria-label="Acceso"><button data-auth="signup" aria-pressed="${su}">Crear cuenta</button><button data-auth="login" aria-pressed="${!su}">Entrar</button></div>
    <form id="f-auth" class="card stack" novalidate>
      ${su ? `<div class="field"><label for="r-user">Nombre de usuario</label><input type="text" id="r-user" autocomplete="nickname" maxlength="20" placeholder="Como te conoce el grupo"></div>` : ""}
      <div class="field"><label for="r-mail">Correo</label><input type="email" id="r-mail" autocomplete="email" placeholder="nombre@correo.com"></div>
      <div class="field"><label for="r-pass">Contraseña</label><input type="password" id="r-pass" autocomplete="${su ? "new-password" : "current-password"}" placeholder="${su ? "Mínimo 8 caracteres" : ""}"></div>
      ${su ? `<fieldset class="field"><legend>¿Eres mayor de 18 años?</legend><div class="seg"><label><input type="radio" name="age" id="r-age-si" value="si">Sí</label><label><input type="radio" name="age" id="r-age-no" value="no">No</label></div></fieldset>` : ""}
      <div class="err" id="r-err"></div>
      <button class="btn block" type="submit">${su ? "Crear cuenta" : "Entrar"}</button>
      ${su ? "" : `<button class="del" type="button" data-act="reset" style="align-self:center">He olvidado la contraseña</button>`}
    </form>
  </div>`;
}
function vProfile() {
  return `${topbar(`<button class="iconbtn" data-act="logout">Salir</button>`)}
  <form id="f-profile" class="card stack" novalidate><h2>Completa tu perfil</h2>
    <div class="field"><label for="p-user">Nombre de usuario</label><input type="text" id="p-user" maxlength="20"></div>
    <fieldset class="field"><legend>¿Eres mayor de 18 años?</legend><div class="seg"><label><input type="radio" name="page" value="si">Sí</label><label><input type="radio" name="page" value="no">No</label></div></fieldset>
    <div class="err" id="p-err"></div><button class="btn" type="submit">Guardar</button></form>`;
}
function installBanner() {
  if (isStandalone() || ls.get("senalados-noinstall")) return "";
  const txt = installPrompt ? `<button class="btn yellow sm" data-act="install">Instalar app</button>`
    : isIOS() ? `<span class="small">En Safari, toca <b>Compartir</b> y luego <b>«Añadir a pantalla de inicio»</b>.</span>`
    : `<span class="small">En el menú del navegador, elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</span>`;
  return `<div class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><b>Ponla en tu pantalla de inicio</b><button class="del" data-act="noinstall">Ocultar</button></div>${txt}</div>`;
}
function vGroups() {
  const list = S.groups.map(g => `<button class="grp" data-open="${g.id}">
    <div class="faces">${g.members.slice(0, 4).map(m => av(m, "", g)).join("")}</div>
    <div class="info"><div class="name">${esc(g.name)}</div><div class="muted small">${g.members.length} miembro${g.members.length === 1 ? "" : "s"} · ronda ${schedule(g).n}</div></div>
    <span class="muted" aria-hidden="true">›</span></button>`).join("");
  return `${topbar(`<button class="iconbtn" data-act="logout">Salir</button>`)}
  <div class="stack">
    <div><p class="muted small" style="margin:0">Hola, ${esc(S.profile ? S.profile.username : "")}</p><h1>Tus grupos</h1></div>
    ${installBanner()}
    ${list || `<div class="card empty">Aún no estás en ningún grupo.<br>Crea uno y pasa el código a tus amigos, o únete con el código de otro.</div>`}
    <div class="row" style="flex-wrap:nowrap"><button class="btn block" data-act="create">Crear grupo</button><button class="btn alt block" data-act="join">Unirme con código</button></div>
  </div>`;
}
function vGroup(g) {
  const st = g.settings, fixed = st.fixedTime && st.freqUnit !== "horas";
  const head = `<div class="ghead">
    <button class="back" data-act="home">‹ Grupos</button>
    <h1>${esc(g.name)}</h1>
    <div class="row"><div class="faces">${g.members.map(m => av(m, "sm")).join("")}</div><span class="muted small">Código <span class="code">${esc(g.code)}</span></span><button class="btn alt sm" data-act="invite">Invitar</button></div>
  </div>
  ${S.tab === "grupo" ? "" : `<div class="timer" style="margin-bottom:14px"><div><div class="small" style="opacity:.75">Nueva ronda ${fixed ? "a las " + st.releaseTime + " · en" : "en"}</div><b id="countdown">—</b></div><div class="sp"></div>${canEdit(g) ? `<button data-act="force">Pasar a la siguiente</button>` : ""}</div>`}`;
  const T = { hoy: tHoy, duelos: tDuelos, equipos: tEquipos, grupo: tGrupo, añadir: tAdd, ajustes: tSet }[S.tab] || tHoy;
  if (["hoy", "duelos", "equipos"].includes(S.tab) && !S.round) return head + `<div class="card empty">${S.roundLoaded ? "Preparando la ronda…" : "Cargando la ronda…"}</div>`;
  return head + T(g);
}
const chips = (v, match) => Object.entries(v).filter(([, x]) => x === match).map(([w]) => `<span class="chip ${w === uid() ? "me" : ""}">${esc(name(w))}</span>`).join("");
const completeNote = s => `<div class="more"><span class="muted small">${s.n} de ${s.total} han votado · votos visibles</span></div>`;
const pendingHTML = (s, myPick) => `<div class="pending"><p>Has votado a <b>${myPick}</b>. Han votado ${s.n} de ${s.total}.</p><p class="muted small">Los resultados se verán cuando vote todo el grupo.</p></div>`;
function resultsHTML(v, options) {
  const total = Object.keys(v).length;
  const counts = options.map(o => ({ o, n: Object.values(v).filter(t => t === o).length })).sort((a, b) => b.n - a.n);
  return `<div class="results">${counts.map((c, i) => `<div class="res">${av(c.o)}<div style="min-width:0"><div class="nm">${esc(name(c.o))}${i === 0 && c.n ? ` <span class="crown">Señalado</span>` : ""}</div>
    <div class="bar"><i style="width:${pct(c.n, total)}%"></i></div>${c.n ? `<div class="who">${chips(v, c.o)}</div>` : ""}</div>
    <div class="n">${pct(c.n, total)}%<small>${votosTxt(c.n)}</small></div></div>`).join("")}</div>`;
}
function tHoy(g) {
  const r = S.round, opts = r.members;
  if (!r.questions.length) return `<div class="card empty">Esta ronda no tiene preguntas. Revisa los paquetes en Ajustes.</div>`;
  return `<div class="stack"><div class="row"><h2 style="flex:1">Ronda ${r.n}</h2><span class="muted small">${r.questions.length} pregunta${r.questions.length > 1 ? "s" : ""}</span></div>
  ${r.questions.map(q => {
    const v = votesOf("q", q.id), s = voteState(v);
    if (q.pack === "picante" && hasMinor(g)) return "";
    let body;
    if (!s.mine) body = `<div class="opts">${opts.map(m => `<button class="opt" data-vote="q" data-id="${q.id}" data-to="${esc(m)}">${av(m)}<span>${esc(name(m))}</span></button>`).join("")}</div>`;
    else if (s.show) body = resultsHTML(v, opts) + completeNote(s);
    else body = pendingHTML(s, esc(name(v[uid()])));
    return `<article class="ballot" style="${pc(q.pack)}"><div class="q">
      <span class="tag">${packName(q.pack)}${q.by ? ` <span class="by">· propuesta de ${esc(q.by === uid() ? "ti" : rawName(q.by))}</span>` : ""}</span><h3>${esc(q.text)}</h3>
      ${s.mine ? "" : `<span class="muted small">Toca a quien señalas. Verás los votos después de votar.</span>`}</div>${body}</article>`;
  }).join("")}</div>`;
}
function tDuelos(g) {
  const r = S.round, st = g.settings;
  if (!r.duels || !r.duels.length) return `<div class="card empty">${st.duel ? "No hay duelos en esta ronda. Se sortearán en la siguiente." : "Los duelos están desactivados. Puedes activarlos en Ajustes."}</div>`;
  return `<div class="stack"><div><h2>Duelos de la ronda</h2><p class="muted small" style="margin:4px 0 0">Sorteados al azar en cada ronda, cada uno con su pregunta.</p></div>
  ${r.duels.map(d => {
    const v = votesOf("d", d.id), s = voteState(v), cnt = u => Object.values(v).filter(x => x === u).length, mx = Math.max(0, ...d.team.map(t => cnt(t.u))), dup = d.team.find(t => t.dup);
    const f = t => `<button class="fighter ${s.show && cnt(t.u) === mx && mx > 0 ? "won" : ""} ${s.mine && !s.show && v[uid()] === t.u ? "picked" : ""}" data-vote="d" data-id="${d.id}" data-to="${esc(t.u)}" ${s.mine ? "disabled" : ""}>${t.dup ? `<span class="dup">Repite</span>` : ""}${av(t.u, "lg")}<span>${esc(name(t.u))}</span>
      ${s.show ? `<span class="cnt">${pct(cnt(t.u), s.n)}%</span><span class="votes-n">${votosTxt(cnt(t.u))}</span><span class="who">${chips(v, t.u)}</span>` : ""}</button>`;
    return `<article class="ballot" style="${pc("duelos")}"><div class="q"><span class="tag">Duelo</span><h3>${esc(d.text)}</h3>${s.mine ? "" : `<span class="muted small">Elige al ganador</span>`}</div>
      <div class="team ${d.team.length === 2 ? "t2" : "t3"}">${d.team.length === 2 ? f(d.team[0]) + `<span class="vs">VS</span>` + f(d.team[1]) : d.team.map(f).join("")}</div>
      ${dup ? `<p class="muted small dupnote"><b>Repite:</b> sois impares, así que ${esc(dup.u === uid() ? "tú juegas" : rawName(dup.u) + " juega")} dos duelos esta ronda para completar ${d.team.length === 2 ? "la pareja" : "el trío"}.</p>` : ""}
      ${s.show ? completeNote(s) : s.mine ? pendingHTML(s, esc(name(v[uid()]))) : ""}</article>`;
  }).join("")}</div>`;
}
function tEquipos(g) {
  const r = S.round, st = g.settings;
  if (!r.matches || !r.matches.length) return `<div class="card empty">${!st.teams ? "Los equipos están desactivados. Puedes activarlos en Ajustes." : `No hay enfrentamientos en esta ronda. Para jugar ${st.teamSize} contra ${st.teamSize} hacen falta al menos ${2 * st.teamSize} personas.`}</div>`;
  return `<div class="stack"><div><h2>${r.matches[0].size} contra ${r.matches[0].size}</h2><p class="muted small" style="margin:4px 0 0">Equipos sorteados al azar en cada ronda. Elige qué ${teamWord(r.matches[0].size)} cuadra mejor con la pregunta.</p></div>
  ${r.matches.map(m => {
    const k = m.size, sides = [m.a, m.b], v = votesOf("m", m.id), s = voteState(v), c = i => Object.values(v).filter(x => x === i).length, mx = Math.max(c(0), c(1)), dups = [...m.a, ...m.b].filter(x => x.dup);
    const label = T => andList(T.map(x => esc(name(x.u))));
    const side = (T, i) => `<button class="fighter squad ${s.show && c(i) === mx && mx > 0 ? "won" : ""} ${s.mine && !s.show && v[uid()] === i ? "picked" : ""}" data-vote="m" data-id="${m.id}" data-to="${i}" ${s.mine ? "disabled" : ""}>
      <span class="faces">${T.map(x => av(x.u, "lg")).join("")}</span>
      <span class="names">${andList(T.map(x => esc(name(x.u)) + (x.dup ? " <em>REPITE</em>" : "")))}</span>
      ${s.show ? `<span class="cnt">${pct(c(i), s.n)}%</span><span class="p-bar"><i style="width:${pct(c(i), s.n)}%"></i></span><span class="votes-n">${votosTxt(c(i))}</span><span class="who">${chips(v, i)}</span>` : ""}</button>`;
    return `<article class="ballot" style="${pc("equipos")}"><div class="q"><span class="tag">Equipos · ${k} vs ${k}</span><h3>${esc(m.text)}</h3>${s.mine ? "" : `<span class="muted small">Toca el ${teamWord(k)} que elijas</span>`}</div>
      <div class="match">${side(sides[0], 0)}<span class="vs">VS</span>${side(sides[1], 1)}</div>
      ${dups.length ? `<p class="muted small dupnote"><b>Repite:</b> ${andList(dups.map(x => esc(x.u === uid() ? "tú" : rawName(x.u))))} ${dups.length > 1 ? "juegan" : "juega"} dos enfrentamientos para completar los equipos.</p>` : ""}
      ${s.show ? completeNote(s) : s.mine ? pendingHTML(s, label(sides[v[uid()]])) : ""}</article>`;
  }).join("")}</div>`;
}
function tGrupo(g) {
  const sub = S.sub;
  if (sub === "ranking" && !S.ranking && !S.rankingLoading) loadRanking();
  return `<div class="stack"><div class="seg" role="group" aria-label="Sección"><button data-sub="chat" aria-pressed="${sub === "chat"}">Chat</button><button data-sub="ranking" aria-pressed="${sub === "ranking"}">Ranking</button></div>
  ${sub === "chat" ? vChat(g) : vRanking(g)}</div>`;
}
function vChat(g) {
  const msgs = S.chat.map(m => {
    if (m.by === null && m.kind === "summary") return `<div class="sys"><strong>Ronda ${m.round} cerrada.</strong> ${(m.lines || []).map(l => `En «${esc(l.text)}» salió <strong>${esc(name(l.u))}</strong> con el ${l.pct} %.`).join(" ")}</div>`;
    if (m.by === null) return `<div class="sys">${esc(m.text)}</div>`;
    const mine = m.by === uid();
    return `<div class="msg ${mine ? "mine" : ""}">${mine ? "" : av(m.by)}<div class="bub">${mine ? "" : `<b>${esc(rawName(m.by))}</b>`}${esc(m.text)}</div><time>${hhmm(ms(m.at))}</time></div>`;
  }).join("");
  return `<div class="msgs">${msgs || `<div class="sys">Todavía no hay mensajes. Escribe el primero.</div>`}</div>
  <form class="composer" id="f-chat" novalidate><input type="text" id="c-msg" maxlength="500" placeholder="Escribe al grupo…" autocomplete="off" aria-label="Mensaje"><button class="btn" type="submit">Enviar</button></form>`;
}
async function loadRanking() {
  S.rankingLoading = true;
  try {
    const [rs, vs] = await Promise.all([getDocs(col("rounds")), getDocs(col("votes"))]);
    const rounds = rs.docs.map(d => d.data()).filter(r => r.n < S.n), votes = vs.docs.map(d => d.data());
    S.ranking = { history: buildHistory(rounds, votes), at: Date.now() };
  } catch (e) { fail(e); S.ranking = { history: [], at: Date.now() }; }
  S.rankingLoading = false; if (S.tab === "grupo" && S.sub === "ranking") render();
}
function vRanking(g) {
  if (!S.ranking) return `<div class="card empty">Calculando el ranking…</div>`;
  const H = S.ranking.history;
  if (!H.length) return `<div class="card empty">Todavía no hay rondas cerradas con votos. El ranking aparece cuando termine la primera.</div>`;
  const X = stats(H, g.members), M = g.members, me = uid(), totalRec = Object.values(X.rec).reduce((a, b) => a + b, 0) || 1;
  const byRec = [...M].sort((a, b) => X.rec[b] - X.rec[a]), maxRec = X.rec[byRec[0]] || 1;
  const kings = Object.keys(PACKS).concat("grupo").filter(p => X.pt[p] && X.wins[p] && Object.keys(X.wins[p]).length).map(p => { const w = X.wins[p], k = Object.keys(w).sort((a, b) => w[b] - w[a])[0]; return { p, k, n: w[k], t: X.pt[p] }; });
  const byWin = [...M].filter(m => X.dp[m]).sort((a, b) => X.dw[b] / X.dp[b] - X.dw[a] / X.dp[a] || X.dw[b] - X.dw[a]);
  const arg = obj => { let k = null, b = -1; for (const x in obj) if (obj[x] > b) { b = obj[x]; k = x; } return [k, b]; };
  const mine = { ...(X.mat[me] || {}) }; delete mine[me]; const [myFav, myFavN] = arg(mine);
  const fanOf = {}; M.forEach(a => { if (a !== me) fanOf[a] = X.mat[a][me]; }); const [myFan, myFanN] = arg(fanOf);
  let loyal = [null, null, 0]; M.forEach(a => M.forEach(b => { if (a !== b && X.mat[a][b] > loyal[2]) loyal = [a, b, X.mat[a][b]]; }));
  const hmMax = Math.max(1, ...M.flatMap(a => M.map(b => X.mat[a][b])));
  const row = (m, i, bar, color, val, sub) => `<div class="rk ${i === 0 ? "first" : ""}"><span class="pos">${i + 1}</span>${av(m)}<div style="min-width:0"><div class="nm">${esc(name(m))}</div><div class="p-bar" style="--pc:${color}"><i style="width:${bar}%"></i></div></div><div class="val">${val}<small>${sub}</small></div></div>`;
  return `<div class="row" style="justify-content:space-between"><p class="muted small" style="margin:0">Basado en ${X.rounds} ronda${X.rounds === 1 ? "" : "s"} cerrada${X.rounds === 1 ? "" : "s"}.</p><button class="del" data-act="reload-rank">Actualizar</button></div>
  <section class="card stack"><h2>Más señalados</h2>${byRec.map((m, i) => row(m, i, X.rec[m] / maxRec * 100, "var(--brand)", X.rec[m], `${pct(X.rec[m], totalRec)} % del total`)).join("")}</section>
  ${kings.length ? `<section class="card stack"><h2>Quién manda en cada paquete</h2><p class="muted small" style="margin:-6px 0 0">Quién sale más veces como el más votado.</p>
    <div class="kings">${kings.map(x => `<div class="king" style="${pc(x.p)}"><span class="tag">${packName(x.p)}</span>${av(x.k, "lg")}<span class="nm">${esc(name(x.k))}</span><span class="muted small">Gana ${x.n} de ${x.t} preguntas</span></div>`).join("")}</div></section>` : ""}
  ${byWin.length ? `<section class="card stack"><h2>Duelos y equipos</h2>${byWin.map((m, i) => row(m, i, pct(X.dw[m], X.dp[m]), "var(--p-duelos)", pct(X.dw[m], X.dp[m]) + " %", `${X.dw[m]} de ${X.dp[m]} ganados`)).join("")}</section>` : ""}
  <section class="card stack"><h2>Quién vota a quién</h2>
    <div class="facts">
      ${myFav && myFavN > 0 ? `<div class="fact">${av(myFav)}<span>A quien más votas tú: <b>${esc(rawName(myFav))}</b>, ${myFavN} ${myFavN === 1 ? "vez" : "veces"}.</span></div>` : ""}
      ${myFan && myFanN > 0 ? `<div class="fact">${av(myFan)}<span>Quien más te vota: <b>${esc(rawName(myFan))}</b>, ${myFanN} ${myFanN === 1 ? "vez" : "veces"}.</span></div>` : ""}
      ${loyal[0] ? `<div class="fact"><span class="faces">${av(loyal[0])}${av(loyal[1])}</span><span>Voto más fiel: <b>${esc(name(loyal[0]))}</b> → <b>${esc(name(loyal[1]))}</b>, ${loyal[2]} veces.</span></div>` : ""}
    </div>
    <div class="hm-wrap"><table class="hm"><thead><tr><th></th>${M.map(m => `<th title="${esc(rawName(m))}">${av(m, "sm")}</th>`).join("")}</tr></thead>
      <tbody>${M.map(a => `<tr><th title="${esc(rawName(a))}">${av(a, "sm")}</th>${M.map(b => { if (a === b) return `<td class="self">·</td>`; const n = X.mat[a][b], r = n / hmMax; return `<td class="${r > .55 ? "hi" : ""}" style="--k:${Math.round(r * 90)}%" title="${esc(rawName(a))} → ${esc(rawName(b))}: ${n}">${n || ""}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="muted small" style="margin:0">Cada fila es quien vota y cada columna, a quién. Cuanto más oscuro, más veces.</p>
  </section>`;
}
function tAdd(g) {
  const st = g.settings, ws = weekStart(), used = S.queue.filter(q => q.by === uid() && ms(q.createdAt) >= ws).length, left = Math.max(0, st.weekly - used);
  const pending = S.queue.filter(q => q.consumed === false).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
  const opts = Object.entries(PACKS).filter(([k]) => !(hasMinor(g) && k === "picante")).map(([k, p]) => `<option value="${k}">${p.n}</option>`).join("");
  return `<div class="stack">
  <form id="f-add" class="card stack" novalidate>
    <h2>Propón una pregunta</h2>
    <div class="row" style="justify-content:space-between"><span class="muted small">Te quedan <b>${left}</b> de ${st.weekly} esta semana</span><span class="quota" aria-hidden="true">${Array.from({ length: st.weekly }, (_, i) => `<i class="${i < used ? "" : "on"}"></i>`).join("")}</span></div>
    <div class="field"><label for="a-text">Pregunta</label><textarea id="a-text" maxlength="140" placeholder="¿Quién es más probable que…?" ${left ? "" : "disabled"}></textarea></div>
    <div class="field"><label for="a-pack">Paquete</label><select id="a-pack" ${left ? "" : "disabled"}><option value="grupo">Del grupo (sale siempre)</option>${opts}</select></div>
    <div class="err" id="a-err">${left ? "" : "Has llegado al límite de esta semana. Se renueva el lunes."}</div>
    <button class="btn" type="submit" ${left ? "" : "disabled"}>Añadir a la cola</button>
  </form>
  <div class="card"><h2 style="margin-bottom:6px">En cola (${pending.length})</h2>
    <p class="muted small" style="margin:0 0 6px">Las preguntas de los jugadores salen antes que las del banco, en orden de llegada.</p>
    ${pending.length ? pending.map((q, i) => `<div class="qitem"><div class="t"><div style="font-weight:600">${esc(q.text)}</div><div class="muted small">${esc(q.by === uid() ? "Tú" : rawName(q.by))} · ${packName(q.pack)} · sale en la ronda ${S.n + 1 + Math.floor(i / st.perRound)}</div></div>${q.by === uid() ? `<button class="del" data-delq="${q.id}">Quitar</button>` : ""}</div>`).join("") : `<p class="muted" style="margin:6px 0 0">No hay preguntas propuestas. La siguiente ronda saldrá del banco.</p>`}
  </div></div>`;
}
function tSet(g) {
  const st = g.settings, ed = canEdit(g), dis = ed ? "" : "disabled", hasPh = !!info(uid()).photo, minor = hasMinor(g), creator = g.creator === uid();
  const seg = (key, vals, label, offc = !ed) => `<div class="seg" role="group" aria-label="${label}">${vals.map(([v, t]) => `<button type="button" data-set="${key}" data-val="${v}" aria-pressed="${String(st[key]) === String(v)}" ${offc ? "disabled" : ""}>${t}</button>`).join("")}</div>`;
  const stepper = (key, txt = "") => `<div class="stepper"><button type="button" data-step="${key}" data-d="-1" aria-label="Menos" ${dis}>−</button><b>${st[key]}</b><button type="button" data-step="${key}" data-d="1" aria-label="Más" ${dis}>+</button>${txt ? `<span class="muted small">${txt}</span>` : ""}</div>`;
  return `<div class="stack">
  <section class="card set"><h3>Tu foto en ${esc(g.name)}</h3>
    <div class="row">${av(uid(), "xl")}<label class="btn alt sm" for="ph-in">${hasPh ? "Cambiar foto" : "Subir foto"}</label><input type="file" id="ph-in" accept="image/*" hidden>${hasPh ? `<button class="del" data-act="ph-del">Quitar</button>` : ""}</div>
    <span class="muted small">Solo se ve en este grupo. En cada grupo puedes tener una foto distinta.</span>
  </section>
  ${ed ? "" : `<div class="demo-note">Solo ${esc(rawName(g.creator))} puede cambiar los ajustes del juego en este grupo.</div>`}
  <section class="card set"><h3>Cada cuánto sale una ronda</h3>
    <div class="row" style="flex-wrap:nowrap">${stepper("freqValue")}<div style="flex:1">${seg("freqUnit", [["horas", "Horas"], ["días", "Días"], ["semanas", "Semanas"]], "Unidad")}</div></div>
    ${st.freqUnit === "horas" ? "" : `<div class="switch"><div><b>Hora fija de salida</b><div class="muted small">Todos reciben la ronda a la vez</div></div><input type="checkbox" id="s-fixed" data-fresh aria-label="Hora fija de salida" ${st.fixedTime ? "checked" : ""} ${dis}></div>
    ${st.fixedTime ? `<div class="field"><label for="s-time">Hora de salida</label><input type="time" id="s-time" data-fresh value="${st.releaseTime}" ${dis}></div>` : ""}`}
    <span class="muted small">En cada ronda se sortean de nuevo los duelos y los equipos, al azar.</span>
  </section>
  <p class="muted small" style="margin:0">Los cambios de preguntas, paquetes, duelos y equipos se aplican desde la siguiente ronda.</p>
  <section class="card set"><h3>Preguntas por ronda</h3>${stepper("perRound", st.perRound === 1 ? "Una cada vez" : "Salen todas a la vez")}</section>
  <section class="card set"><h3>Cuándo se ven los resultados</h3>
    ${seg("reveal", [["instant", "Al votar"], ["all", "Cuando voten todos"]], "Resultados")}
    <span class="muted small">${st.reveal === "instant" ? "Cada persona ve los votos en cuanto vota, aunque falte gente." : "Los votos se muestran cuando ha votado todo el grupo."} Nadie ve nada antes de votar.</span>
  </section>
  <section class="card set"><h3>Paquetes activos</h3>
    <div class="packs">${Object.entries(PACKS).map(([k, p]) => { const lock = p.adult && minor; return `<button type="button" class="pack" style="${pc(k)}" data-pack="${k}" aria-pressed="${st.packs.includes(k) && !lock}" ${dis || lock ? "disabled" : ""}><span class="ck"></span><b>${p.n} ${p.adult ? `<span class="adult">+18</span>` : ""}</b><small>${lock ? "Bloqueado: hay menores de 18 en el grupo" : p.d}</small></button>`; }).join("")}</div>
  </section>
  <section class="card set"><div class="switch"><div><h3>Duelos</h3><span class="muted small">Pregunta extra por parejas o tríos al azar</span></div><input type="checkbox" id="s-duel" data-fresh aria-label="Duelos" ${st.duel ? "checked" : ""} ${dis}></div>
    ${st.duel ? seg("duelSize", [["2", "Parejas"], ["3", "Tríos"]], "Tamaño del duelo") : ""}
  </section>
  <section class="card set"><div class="switch"><div><h3>Equipos</h3><span class="muted small">Enfrentamientos de equipos al azar con su propia pregunta</span></div><input type="checkbox" id="s-teams" data-fresh aria-label="Equipos" ${st.teams ? "checked" : ""} ${dis}></div>
    ${st.teams ? seg("teamSize", [["2", "2 vs 2"], ["3", "3 vs 3"], ["4", "4 vs 4"]], "Tamaño de los equipos") + (g.members.length < 2 * st.teamSize ? `<span class="small" style="color:var(--warn)">Hacen falta al menos ${2 * st.teamSize} personas para ${st.teamSize} contra ${st.teamSize}.</span>` : "") : ""}
  </section>
  <section class="card set"><h3>Preguntas que puede proponer cada persona</h3>${stepper("weekly", "por semana")}</section>
  <section class="card set"><h3>Quién puede cambiar los ajustes</h3>
    ${creator ? `${seg("editors", [["todos", "Todo el grupo"], ["creador", "Solo yo"]], "Permisos", false)}<span class="muted small">${st.editors === "todos" ? "Cualquier miembro puede cambiar los ajustes del juego." : "Solo tú puedes cambiar los ajustes del juego. El resto los verá bloqueados."}</span>`
      : `${seg("editors", [["todos", "Todo el grupo"], ["creador", "Solo " + esc(rawName(g.creator))]], "Permisos", true)}<span class="muted small">Esto solo lo puede cambiar quien creó el grupo (${esc(rawName(g.creator))}).</span>`}
  </section>
  <section class="card set"><h3>Miembros (${g.members.length})</h3>
    ${g.members.map(m => `<div class="row">${av(m)}<span style="flex:1">${esc(rawName(m))}${m === g.creator ? ` <span class="chip">creador</span>` : ""}</span></div>`).join("")}
  </section>
  ${creator ? "" : `<button class="btn alt" data-act="leave">Salir del grupo</button>`}
  <button class="del" data-act="logout" style="align-self:center">Cerrar sesión</button>
  </div>`;
}

/* ======== Acciones ======== */
async function updateSettings(patch, timing) {
  const data = {}; for (const k in patch) data["settings." + k] = patch[k];
  if (timing) { data.roundBase = S.n; data.anchor = Date.now(); }
  try { await updateDoc(gref(), data); } catch (e) { fail(e); }
}
function modal(html) { $("#modal").innerHTML = `<div class="sheet" data-close><div class="card stack">${html}</div></div>`; const i = $("#modal input"); if (i) i.focus(); }
const closeModal = () => { $("#modal").innerHTML = ""; };
function joinModal(code = "") {
  modal(`<form id="f-join" class="stack" novalidate><h2>Unirme a un grupo</h2><div class="field"><label for="j-code">Código de invitación</label><input type="text" id="j-code" maxlength="6" value="${esc(code)}" placeholder="K7Q2XA" style="text-transform:uppercase;letter-spacing:.1em" autocomplete="off"></div><div class="err" id="j-err"></div><button class="btn" type="submit">Unirme</button><button class="btn alt" type="button" data-close>Cancelar</button></form>`);
}
const toBottom = () => scrollTo(0, document.body.scrollHeight);
function setBusy(form, on) { const b = form.querySelector("button[type=submit]"); if (b) { b.disabled = on; if (on) { b.dataset.t = b.textContent; b.textContent = "Un momento…"; } else if (b.dataset.t) b.textContent = b.dataset.t; } }

document.addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, id = f.id;
  if (id === "f-auth") {
    const su = S.authMode === "signup", m = $("#r-mail").value.trim(), p = $("#r-pass").value, err = $("#r-err");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return err.textContent = "Escribe un correo válido, por ejemplo nombre@correo.com.";
    if (su) {
      const u = $("#r-user").value.trim(), age = document.querySelector("input[name=age]:checked");
      if (u.length < 2 || u.length > 20) return err.textContent = "El nombre de usuario debe tener entre 2 y 20 caracteres.";
      if (p.length < 8) return err.textContent = "La contraseña necesita al menos 8 caracteres.";
      if (!age) return err.textContent = "Indica si eres mayor de 18 años.";
      S.pendingProfile = { username: u, adult: age.value === "si" };
      setBusy(f, true);
      try { await createUserWithEmailAndPassword(auth, m, p); } catch (x) { err.textContent = errText(x); setBusy(f, false); }
    } else {
      if (!p) return err.textContent = "Escribe tu contraseña.";
      setBusy(f, true);
      try { await signInWithEmailAndPassword(auth, m, p); } catch (x) { err.textContent = errText(x); setBusy(f, false); }
    }
  }
  if (id === "f-profile") {
    const u = $("#p-user").value.trim(), age = document.querySelector("input[name=page]:checked"), err = $("#p-err");
    if (u.length < 2) return err.textContent = "Escribe un nombre de usuario.";
    if (!age) return err.textContent = "Indica si eres mayor de 18 años.";
    S.profile = { username: u, adult: age.value === "si" };
    try { await setDoc(doc(db, "users", uid()), { ...S.profile, createdAt: serverTimestamp() }); startGroups(); } catch (x) { fail(x); }
  }
  if (id === "f-create") {
    const n = $("#c-name").value.trim(); if (n.length < 2) return $("#c-err").textContent = "Ponle un nombre al grupo.";
    setBusy(f, true);
    try {
      let code; for (let i = 0; i < 5; i++) { code = makeCode(); if (!(await getDoc(doc(db, "codes", code))).exists()) break; }
      const ref = doc(collection(db, "groups")), b = writeBatch(db);
      b.set(ref, { name: n, code, creator: uid(), members: [uid()], memberInfo: { [uid()]: { name: S.profile.username, adult: S.profile.adult, photo: null } },
        settings: { ...DEFAULT_SETTINGS, packs: DEFAULT_SETTINGS.packs.slice() }, roundBase: 1, anchor: Date.now(), used: [], createdAt: serverTimestamp() });
      b.set(doc(db, "codes", code), { gid: ref.id, creator: uid() });
      await b.commit();
      closeModal(); S.pendingOpen = ref.id; toast("Grupo creado. Pulsa «Invitar» para mandar el código");
    } catch (x) { fail(x); setBusy(f, false); }
  }
  if (id === "f-join") {
    const c = $("#j-code").value.trim().toUpperCase(), err = $("#j-err");
    if (c.length !== 6) return err.textContent = "El código tiene 6 caracteres.";
    setBusy(f, true);
    try {
      const cs = await getDoc(doc(db, "codes", c));
      if (!cs.exists()) { err.textContent = "No hay ningún grupo con ese código. Revísalo."; setBusy(f, false); return; }
      const gid = cs.data().gid;
      if (S.groups.find(g => g.id === gid)) { closeModal(); openGroup(gid); return; }
      await updateDoc(doc(db, "groups", gid), { members: arrayUnion(uid()), [`memberInfo.${uid()}`]: { name: S.profile.username, adult: S.profile.adult, photo: null } });
      closeModal(); S.pendingOpen = gid; toast("¡Dentro!");
    } catch (x) { err.textContent = errText(x); setBusy(f, false); }
  }
  if (id === "f-add") {
    const t = $("#a-text").value.trim(), err = $("#a-err"), st = S.g.settings, ws = weekStart();
    if (S.queue.filter(q => q.by === uid() && ms(q.createdAt) >= ws).length >= st.weekly) return err.textContent = "Has llegado al límite de esta semana. Se renueva el lunes.";
    if (t.length < 10) return err.textContent = "Escribe la pregunta completa (mínimo 10 caracteres).";
    setBusy(f, true);
    try { await addDoc(col("queue"), { text: t.endsWith("?") ? t : t + "?", pack: $("#a-pack").value, by: uid(), consumed: false, createdAt: serverTimestamp() }); $("#a-text").value = ""; toast("Añadida a la cola"); }
    catch (x) { fail(x); } setBusy(f, false); render();
  }
  if (id === "f-chat") {
    const inp = $("#c-msg"), t = inp.value.trim(); if (!t) return;
    inp.value = "";
    try { await addDoc(col("chat"), { by: uid(), text: t, at: serverTimestamp() }); toBottom(); } catch (x) { inp.value = t; fail(x); }
  }
});
function loadPhoto(file, cb) {
  const r = new FileReader();
  r.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement("canvas"), s = 160, m = Math.min(img.width, img.height); c.width = c.height = s;
    c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s); cb(c.toDataURL("image/jpeg", .8)); };
    img.onerror = () => toast("No se ha podido leer la imagen. Prueba con un JPG o PNG."); img.src = r.result; };
  r.readAsDataURL(file);
}
document.addEventListener("change", e => {
  if (!S.g) return; const t = e.target;
  if (t.id === "s-duel") updateSettings({ duel: t.checked });
  if (t.id === "s-teams") updateSettings({ teams: t.checked });
  if (t.id === "s-fixed") updateSettings({ fixedTime: t.checked }, true);
  if (t.id === "s-time" && t.value) { updateSettings({ releaseTime: t.value }, true); toast("Las rondas saldrán a las " + t.value); }
  if (t.id === "ph-in" && t.files[0]) loadPhoto(t.files[0], async url => { try { await updateDoc(gref(), { [`memberInfo.${uid()}.photo`]: url }); toast("Foto actualizada en " + S.g.name); } catch (x) { fail(x); } });
});
document.addEventListener("click", async e => {
  const b = e.target.closest("button,[data-close]"); if (!b) return;
  if (b.matches("[data-close]") && e.target !== b) return;
  if (b.dataset.close !== undefined) { closeModal(); return; }
  const d = b.dataset, g = S.g;
  if (d.auth) { S.authMode = d.auth; render(); }
  else if (d.open) openGroup(d.open);
  else if (d.tab) { S.tab = d.tab; if (d.tab === "grupo" && S.sub === "ranking") S.ranking = null; render(); if (S.tab === "grupo" && S.sub === "chat") toBottom(); else scrollTo(0, 0); }
  else if (d.sub) { S.sub = d.sub; if (d.sub === "ranking") S.ranking = null; render(); if (d.sub === "chat") toBottom(); }
  else if (d.vote) castVote(d.vote, d.id, d.vote === "m" ? Number(d.to) : d.to);
  else if (d.step) { const st = g.settings, lim = { perRound: [1, 5], freqValue: [1, 30], weekly: [1, 20] }[d.step]; const v = Math.min(lim[1], Math.max(lim[0], st[d.step] + Number(d.d))); if (v !== st[d.step]) updateSettings({ [d.step]: v }, d.step === "freqValue"); }
  else if (d.set) { const v = (d.set === "duelSize" || d.set === "teamSize") ? Number(d.val) : d.val; updateSettings({ [d.set]: v }, d.set === "freqUnit"); if (d.set === "editors") toast(v === "todos" ? "Todo el grupo puede cambiar los ajustes" : "Solo tú puedes cambiar los ajustes"); }
  else if (d.pack) { const p = g.settings.packs.slice(), i = p.indexOf(d.pack); if (i >= 0) { if (p.length === 1) { toast("Deja al menos un paquete activo"); return; } p.splice(i, 1); } else p.push(d.pack); updateSettings({ packs: p }); }
  else if (d.delq) { try { await deleteDoc(doc(col("queue"), d.delq)); toast("Pregunta quitada. Recuperas ese hueco esta semana"); } catch (x) { fail(x); } }
  else if (d.act === "force") { if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "¿Seguro? Toca otra vez"; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = "Pasar a la siguiente"; } }, 4000); return; }
    try { await updateDoc(gref(), { roundBase: S.n + 1, anchor: Date.now() }); toast("Nueva ronda en marcha"); } catch (x) { fail(x); } }
  else if (d.act === "invite") {
    const url = location.origin + location.pathname + "?c=" + g.code, text = `Únete a «${g.name}» en Señalados. Código: ${g.code}`;
    if (navigator.share) { try { await navigator.share({ title: "Señalados", text, url }); } catch (x) {} }
    else { try { await navigator.clipboard.writeText(text + "\n" + url); toast("Invitación copiada. Pégala en WhatsApp"); } catch (x) { toast("Código del grupo: " + g.code); } }
  }
  else if (d.act === "ph-del") { try { await updateDoc(gref(), { [`memberInfo.${uid()}.photo`]: null }); } catch (x) { fail(x); } }
  else if (d.act === "reload-rank") { S.ranking = null; render(); }
  else if (d.act === "home") closeGroup();
  else if (d.act === "logout") { closeGroup(true); ls.set("senalados-last", ""); await signOut(auth); }
  else if (d.act === "reset") { const m = $("#r-mail").value.trim(); if (!m) { $("#r-err").textContent = "Escribe tu correo arriba y vuelve a pulsar."; return; } try { await sendPasswordResetEmail(auth, m); toast("Te hemos enviado un correo para cambiar la contraseña"); } catch (x) { $("#r-err").textContent = errText(x); } }
  else if (d.act === "leave") { if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "Toca otra vez para confirmar"; return; } try { const gid = S.gid; closeGroup(); await updateDoc(doc(db, "groups", gid), { members: arrayRemove(uid()) }); toast("Has salido del grupo"); } catch (x) { fail(x); } }
  else if (d.act === "install") { if (installPrompt) { installPrompt.prompt(); installPrompt = null; render(); } }
  else if (d.act === "noinstall") { ls.set("senalados-noinstall", "1"); render(); }
  else if (d.act === "create") modal(`<form id="f-create" class="stack" novalidate><h2>Nuevo grupo</h2><div class="field"><label for="c-name">Nombre</label><input type="text" id="c-name" maxlength="30" placeholder="Máster"></div><div class="err" id="c-err"></div><button class="btn" type="submit">Crear grupo</button><button class="btn alt" type="button" data-close>Cancelar</button></form>`);
  else if (d.act === "join") joinModal();
});

/* ======== Reloj ======== */
function fmt(t) { const s = Math.max(0, Math.floor(t / 1000)), dd = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sc = s % 60;
  return dd ? `${dd} d ${h} h ${String(m).padStart(2, "0")} min` : `${h} h ${String(m).padStart(2, "0")} min ${String(sc).padStart(2, "0")} s`; }
function tick() {
  if (!S.g) return;
  if (S.next && Date.now() >= S.next) { const prev = S.n; computeRound(); if (S.n !== prev) { render(); toast("¡Ronda nueva!"); return; } }
  const el = $("#countdown"); if (el && S.next) el.textContent = fmt(S.next - Date.now());
}
setInterval(tick, 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });

/* ======== Instalación ======== */
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; if (S.view === "groups") render(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
render();
