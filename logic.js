/* Lógica pura del juego (sin Firebase ni DOM), para poder probarla aparte */
export const UNIT_MS = { horas: 3600e3, días: 86400e3, semanas: 604800e3 };

export const shuffle = (a, rnd = Math.random) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const pick = (a, rnd = Math.random) => a[Math.floor(rnd() * a.length)];

/* Duelos: parejas o tríos al azar. Si no cuadra, se completa el último con alguien que repite */
export function makeTeams(members, size) {
  const s = shuffle(members), teams = [];
  for (let i = 0; i < s.length; i += size) teams.push(s.slice(i, i + size).map(u => ({ u, dup: false })));
  const last = teams[teams.length - 1];
  if (teams.length > 1 && last.length < size) {
    const pool = shuffle(members.filter(m => !last.some(x => x.u === m)));
    while (last.length < size) last.push({ u: pool.shift(), dup: true });
  }
  return teams.filter(t => t.length === size);
}

/* Equipos k contra k. Se completan con gente que repite, nunca con alguien del mismo enfrentamiento */
export function makeMatches(members, k) {
  if (members.length < 2 * k) return [];
  const s = shuffle(members), teams = [];
  for (let i = 0; i < s.length; i += k) teams.push(s.slice(i, i + k).map(u => ({ u, dup: false })));
  if (teams.length % 2) teams.push([]);
  const out = [];
  for (let i = 0; i < teams.length; i += 2) {
    const A = teams[i], B = teams[i + 1];
    for (const T of [A, B]) if (T.length < k) {
      const busy = new Set([...A, ...B].map(x => x.u)), pool = shuffle(members.filter(m => !busy.has(m)));
      while (T.length < k && pool.length) T.push({ u: pool.shift(), dup: true });
    }
    out.push({ a: A, b: B });
  }
  return out;
}

/* Número de ronda actual y hora de la siguiente, calculados igual en todos los móviles.
   roundBase = ronda en curso cuando se cambió el reloj por última vez; anchor = ese momento */
export function schedule(g, now = Date.now()) {
  const st = g.settings, base = g.roundBase || 1, anchor = g.anchor || now;
  if (st.fixedTime && st.freqUnit !== "horas") {
    const [h, m] = st.releaseTime.split(":").map(Number);
    const step = st.freqUnit === "días" ? st.freqValue : st.freqValue * 7;
    const B0 = new Date(anchor); B0.setHours(h, m, 0, 0);
    if (B0.getTime() <= anchor) B0.setDate(B0.getDate() + 1);
    if (now < B0.getTime()) return { n: base, next: B0.getTime() };
    const last = new Date(now); last.setHours(h, m, 0, 0);
    if (last.getTime() > now) last.setDate(last.getDate() - 1);
    const days = Math.round((Date.UTC(last.getFullYear(), last.getMonth(), last.getDate()) - Date.UTC(B0.getFullYear(), B0.getMonth(), B0.getDate())) / 864e5);
    const idx = 1 + Math.floor(days / step);
    const nx = new Date(B0); nx.setDate(nx.getDate() + idx * step);
    return { n: base + idx, next: nx.getTime() };
  }
  const P = st.freqValue * UNIT_MS[st.freqUnit], idx = Math.max(0, Math.floor((now - anchor) / P));
  return { n: base + idx, next: anchor + (idx + 1) * P };
}

export function weekStart(now = Date.now()) { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }

/* Convierte rondas guardadas + votos en un historial plano */
export function buildHistory(rounds, votes) {
  const H = [];
  for (const r of rounds) {
    const vs = votes.filter(v => v.round === r.n);
    const collect = (kind, id) => { const o = {}; vs.forEach(v => { if (v[kind] && v[kind][id] !== undefined) o[v.uid] = v[kind][id]; }); return o; };
    (r.questions || []).forEach(q => { const v = collect("q", q.id); if (Object.keys(v).length) H.push({ type: "q", n: r.n, pack: q.pack, votes: v }); });
    (r.duels || []).forEach(d => { const v = collect("d", d.id); if (Object.keys(v).length) H.push({ type: "d", n: r.n, team: d.team.map(x => x.u), votes: v }); });
    (r.matches || []).forEach(m => { const v = collect("m", m.id); if (Object.keys(v).length) H.push({ type: "m", n: r.n, sides: [m.a.map(x => x.u), m.b.map(x => x.u)], votes: v }); });
  }
  return H;
}

export function stats(history, M) {
  const rec = {}, mat = {}, wins = {}, pt = {}, dw = {}, dp = {};
  M.forEach(a => { rec[a] = 0; dw[a] = 0; dp[a] = 0; mat[a] = {}; M.forEach(b => mat[a][b] = 0); });
  for (const h of history) {
    const vals = Object.entries(h.votes);
    if (!vals.length) continue;
    if (h.type === "q") {
      vals.forEach(([a, b]) => { if (rec[b] !== undefined) rec[b]++; if (mat[a] && mat[a][b] !== undefined) mat[a][b]++; });
      const c = {}; vals.forEach(([, b]) => c[b] = (c[b] || 0) + 1); const mx = Math.max(...Object.values(c));
      pt[h.pack] = (pt[h.pack] || 0) + 1; wins[h.pack] = wins[h.pack] || {};
      Object.keys(c).filter(k => c[k] === mx && rec[k] !== undefined).forEach(k => wins[h.pack][k] = (wins[h.pack][k] || 0) + 1);
    } else if (h.type === "d") {
      const c = {}; vals.forEach(([, b]) => c[b] = (c[b] || 0) + 1); const mx = Math.max(...Object.values(c));
      new Set(h.team).forEach(n => { if (dp[n] !== undefined) { dp[n]++; if (c[n] === mx) dw[n]++; } });
    } else {
      const c = [0, 0]; vals.forEach(([, b]) => { if (b === 0 || b === 1) c[b]++; }); const w = c[0] === c[1] ? -1 : c[0] > c[1] ? 0 : 1;
      h.sides.forEach((T, i) => new Set(T).forEach(n => { if (dp[n] !== undefined) { dp[n]++; if (i === w) dw[n]++; } }));
    }
  }
  return { rec, mat, wins, pt, dw, dp, rounds: new Set(history.map(h => h.n)).size };
}

export function makeCode() { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
