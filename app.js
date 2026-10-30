"use strict";
const SUITS = ["\u2660\uFE0E", "\u2665\uFE0E", "\u2666\uFE0E", "\u2663\uFE0E"],
  RED_SUITS = ["\u2665\uFE0E", "\u2666\uFE0E"],
  RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"],
  CUT = { 1: 0.5, 2: 0.62, 4: 0.75, 8: 0.75 },
  NAMES = ["Marco", "Giulia", "Enrico", "Sara", "Franco", "Elena", "Dario", "Chiara", "Nico", "Irene"],
  VERB = { hit: "chiede carta", stand: "sta", double: "raddoppia", split: "divide" },
  CANCEL = { cancel: !0 },
  TABLE_SEATS = 7,
  MAX_SPOTS = 3,
  UI = {
    draw: null,
    render() {
      S && S.room ? roomBroadcast() : UI.draw && UI.draw();
    },
    pause() {
      return Promise.resolve();
    },
    onAsk: null,
  };
let S = null;
function money(e, t) {
  const a = "\u20AC" + Math.abs(e).toLocaleString("it-IT", { maximumFractionDigits: 2 });
  return t ? (e > 0 ? "+" : e < 0 ? "\u2212" : "") + a : e < 0 ? "\u2212" + a : a;
}
function sgn(e) {
  return e > 0 ? "+" + e : e < 0 ? "\u2212" + Math.abs(e) : "0";
}
function cardVal(e) {
  return e.r === "A" ? 11 : e.r === "K" || e.r === "Q" || e.r === "J" || e.r === "10" ? 10 : Number(e.r);
}
function hilo(e) {
  const t = cardVal(e);
  return t >= 2 && t <= 6 ? 1 : t <= 9 ? 0 : -1;
}
function evalHand(e) {
  let t = 0,
    a = 0;
  for (const s of e) s.r === "A" ? (a++, (t += 11)) : (t += cardVal(s));
  for (; t > 21 && a > 0;) ((t -= 10), a--);
  return { total: t, soft: a > 0 };
}
function isNatural(e) {
  return !e.fromSplit && e.cards.length === 2 && evalHand(e.cards).total === 21;
}
function newHand(e) {
  return { cards: [], bet: e, doubled: !1, done: !1, fromSplit: !1, splitAce: !1, result: null, net: 0 };
}
function shuffleArr(e) {
  for (let t = e.length - 1; t > 0; t--) {
    const a = Math.floor(Math.random() * (t + 1)),
      s = e[t];
    ((e[t] = e[a]), (e[a] = s));
  }
  return e;
}
function basicStrategy(e, t, a, s) {
  const n = evalHand(e);
  if (s && e.length === 2 && cardVal(e[0]) === cardVal(e[1])) {
    const i = cardVal(e[0]);
    if (
      i === 11 ||
      i === 8 ||
      (i === 9 && t !== 7 && t !== 10 && t !== 11) ||
      (i === 7 && t <= 7) ||
      (i === 6 && t <= 6) ||
      ((i === 3 || i === 2) && t <= 7) ||
      (i === 4 && (t === 5 || t === 6))
    )
      return "split";
  }
  const o = n.total;
  return n.soft
    ? o >= 19
      ? "stand"
      : o === 18
        ? t >= 3 && t <= 6
          ? a
            ? "double"
            : "stand"
          : t === 2 || t === 7 || t === 8
            ? "stand"
            : "hit"
        : o === 17
          ? t >= 3 && t <= 6 && a
            ? "double"
            : "hit"
          : o === 15 || o === 16
            ? t >= 4 && t <= 6 && a
              ? "double"
              : "hit"
            : (o === 13 || o === 14) && t >= 5 && t <= 6 && a
              ? "double"
              : "hit"
    : o >= 17
      ? "stand"
      : o >= 13
        ? t <= 6
          ? "stand"
          : "hit"
        : o === 12
          ? t >= 4 && t <= 6
            ? "stand"
            : "hit"
          : o === 11
            ? a && t !== 11
              ? "double"
              : "hit"
            : o === 10
              ? a && t <= 9
                ? "double"
                : "hit"
              : o === 9 && a && t >= 3 && t <= 6
                ? "double"
                : "hit";
}
const BJ_BOT_ERR = { low: 0.35, mid: 0.08, high: 0 };
function botAction(e, t, a) {
  const s = cardVal(S.dealer.cards[0]);
  let n = basicStrategy(e.cards, s, t, a);
  const o = BJ_BOT_ERR[S.cfg.diff] === void 0 ? BJ_BOT_ERR.mid : BJ_BOT_ERR[S.cfg.diff];
  if (Math.random() < o) {
    const i = evalHand(e.cards);
    !i.soft && i.total >= 12 && i.total <= 16 && (n === "hit" || n === "stand")
      ? (n = n === "hit" ? "stand" : "hit")
      : ((o > 0.2 && (n === "double" || n === "split")) || (o > 0.2 && n === "stand" && i.total <= 15)) &&
        (n = "hit");
  }
  return n;
}
function botBet() {
  const e = S.cfg.minBet,
    t = Math.random();
  return e * (t < 0.55 ? 1 : t < 0.8 ? 2 : t < 0.93 ? 3 : 5);
}
const SIDE_PP = { mixed: ["coppia mista", 6], colored: ["coppia colorata", 12], perfect: ["coppia perfetta", 25] },
  SIDE_T3 = {
    flush: ["colore", 5],
    straight: ["scala", 10],
    trips: ["tris", 30],
    sflush: ["scala colore", 40],
    suited: ["tris colorato", 100],
  },
  SIDE_ORDER = { A: 1, J: 11, Q: 12, K: 13 },
  sideRank = (c) => SIDE_ORDER[c.r] || Number(c.r),
  sideRed = (c) => RED_SUITS.includes(c.s);
function sidePP(a, b) {
  if (a.r !== b.r) return null;
  const k = a.s === b.s ? "perfect" : sideRed(a) === sideRed(b) ? "colored" : "mixed";
  return { name: SIDE_PP[k][0], odds: SIDE_PP[k][1] };
}
function side21p3(a, b, c) {
  const cs = [a, b, c],
    flush = cs.every((x) => x.s === a.s),
    trips = cs.every((x) => x.r === a.r),
    rk = cs.map(sideRank).sort((x, y) => x - y),
    run = (rk[1] === rk[0] + 1 && rk[2] === rk[1] + 1) || (rk[0] === 1 && rk[1] === 12 && rk[2] === 13),
    k = trips && flush ? "suited" : run && flush ? "sflush" : trips ? "trips" : run ? "straight" : flush ? "flush" : null;
  return k ? { name: SIDE_T3[k][0], odds: SIDE_T3[k][1] } : null;
}
const SIDE_DEF = [
    { k: "pp", name: "Perfect Pairs", desc: "coppia nelle tue prime 2 carte \xB7 6 / 12 / 25 a 1" },
    { k: "t3", name: "21+3", desc: "le tue 2 carte + quella del dealer \xB7 fino a 100 a 1" },
    { k: "ll", name: "Lucky Ladies", desc: "le tue prime 2 carte fanno 20 \xB7 da 4 a 125 a 1" },
    { k: "rm", name: "Royal Match", desc: "prime 2 carte dello stesso seme \xB7 5 a 2, K+Q 25 a 1" },
    { k: "un", name: "Sotto 13", desc: "le prime 2 carte sommano meno di 13 \xB7 1 a 1" },
    { k: "ov", name: "Sopra 13", desc: "le prime 2 carte sommano pi\xF9 di 13 \xB7 1 a 1" },
    { k: "md", name: "Match the Dealer", desc: "una tua carta come quella del dealer \xB7 4 a 1 (9 a 1 stesso seme)" },
    { k: "bu", name: "Buster", desc: "il dealer sballa \xB7 da 2 a 200 a 1, pi\xF9 carte usa" },
  ],
  SIDE_KEYS = SIDE_DEF.map((d) => d.k),
  sideZero = () => Object.fromEntries(SIDE_KEYS.map((k) => [k, 0])),
  sideSum = (sd) => SIDE_KEYS.reduce((n, k) => n + ((sd && sd[k]) || 0), 0),
  sideLow = (c) => (c.r === "A" ? 1 : cardVal(c));
function sideEval(k, c, up) {
  const a = c[0],
    b = c[1];
  switch (k) {
    case "pp":
      return sidePP(a, b);
    case "t3":
      return side21p3(a, b, up);
    case "ll": {
      if (evalHand(c).total !== 20) return null;
      if (a.r === "Q" && b.r === "Q" && a.s === b.s && a.s === SUITS[1]) return { name: "due dame di cuori", odds: 125 };
      if (a.r === b.r && a.s === b.s) return { name: "20 identico", odds: 19 };
      if (a.s === b.s) return { name: "20 dello stesso seme", odds: 10 };
      return { name: "20", odds: 4 };
    }
    case "rm":
      return a.s !== b.s
        ? null
        : (a.r === "K" && b.r === "Q") || (a.r === "Q" && b.r === "K")
          ? { name: "re e regina dello stesso seme", odds: 25 }
          : { name: "stesso seme", odds: 2.5 };
    case "un":
    case "ov": {
      const t = sideLow(a) + sideLow(b);
      return (k === "un" ? t < 13 : t > 13) ? { name: "totale " + t, odds: 1 } : null;
    }
    case "md": {
      let o = 0;
      for (const x of c) x.r === up.r && (o += x.s === up.s ? 9 : 4);
      return o ? { name: o > 9 ? "due carte uguali" : "carta uguale", odds: o } : null;
    }
  }
  return null;
}
function sideFit(sd, bet, spots, bank) {
  const r = sideZero();
  let room = Math.floor(bank / Math.max(1, spots)) - bet;
  if (!(room > 0)) return r;
  for (const k of SIDE_KEYS) {
    const v = Math.max(0, Math.min(bet, Math.floor(Number(sd && sd[k]) || 0), room));
    ((r[k] = v), (room -= v));
  }
  return r;
}
function sideResolve(label, cards, up, sd) {
  let credit = 0;
  const parts = [],
    lines = [];
  for (const d of SIDE_DEF) {
    if (!sd[d.k] || d.k === "bu") continue;
    const r = sideEval(d.k, cards, up);
    r
      ? ((credit += sd[d.k] * (r.odds + 1)),
        parts.push(`${d.name}: ${r.name} ${money(sd[d.k] * r.odds, !0)}`),
        lines.push({ name: d.name, txt: r.name, net: sd[d.k] * r.odds }))
      : (parts.push(`${d.name}: niente ${money(-sd[d.k], !0)}`), lines.push({ name: d.name, txt: "niente", net: -sd[d.k] }));
  }
  return {
    credit,
    net: credit - sideSum(sd),
    lines,
    txt: parts.length ? (label ? label + " \u2192 " : "") + parts.join(" \xB7 ") : "",
  };
}
function busterPay(stake) {
  const n = S.dealer.cards.length;
  if (evalHand(S.dealer.cards).total > 21) {
    const o = n >= 8 ? 200 : { 3: 2, 4: 4, 5: 9, 6: 20, 7: 50 }[n] || 2;
    return {
      credit: stake * (o + 1),
      txt: `Buster: il dealer sballa con ${n} carte ${money(stake * o, !0)}`,
      line: { name: "Buster", txt: `dealer sballa con ${n} carte`, net: stake * o },
    };
  }
  return { credit: 0, txt: `Buster: niente ${money(-stake, !0)}`, line: { name: "Buster", txt: "il dealer non sballa", net: -stake } };
}
async function sideSettle() {
  const sd = S.side;
  let net = 0;
  const txt = [];
  for (const m of S.seats) {
    if (!m.me) continue;
    const r = sideResolve(S.sel.length > 1 ? `Posto ${m.pos}` : "", m.hands[0].cards, S.dealer.cards[0], sd);
    ((S.bank += r.credit), (net += r.net), r.txt && txt.push(r.txt));
    for (const l of r.lines) {
      const o = S.sideLines.find((x) => x.name === l.name);
      o ? (o.net += l.net) : S.sideLines.push(Object.assign({}, l));
    }
  }
  ((S.sideNet = net), (S.sideTxt = txt.join(" | ")), S.sideTxt && ((S.msg = S.sideTxt), UI.render(), await pause("bot")));
}
function createSession(e) {
  const t = e.decks,
    a = t * 52,
    s = TABLE_SEATS,
    n = Math.max(1, Math.min(MAX_SPOTS, e.spots || 1, Math.floor(e.cash / e.minBet) || 1)),
    o = e.mode === "table" ? Math.min(e.others, s - n) : 0,
    i = shuffleArr(NAMES.slice()).slice(0, o),
    r = (e.seatPref || []).filter((u, p, d) => u >= 1 && u <= s && d.indexOf(u) === p).slice(0, n),
    l = shuffleArr(Array.from({ length: s }, (u, p) => p + 1).filter((u) => !r.includes(u))),
    c = r.concat(l.slice(0, n - r.length)),
    f = l.slice(n - r.length, n - r.length + o),
    m = c
      .map((u) => ({ pos: u, name: "Tu", me: !0, hands: [] }))
      .concat(f.map((u, p) => ({ pos: u, name: i[p], me: !1, hands: [] })));
  return (
    m.sort((u, p) => u.pos - p.pos),
    (S = {
      tableSeats: s,
      sel: c,
      cfg: Object.assign({}, e),
      decks: t,
      total: a,
      cutAt: Math.floor(a * CUT[t]),
      shoe: [],
      used: 0,
      rc: 0,
      counted: [],
      shuffles: 0,
      bank: e.cash,
      startBank: e.cash,
      side: sideZero(),
      sideLines: [],
      sideNet: 0,
      sideTxt: "",
      bet: e.minBet,
      lastBet: e.minBet,
      rounds: 0,
      seats: m,
      dealer: { cards: [] },
      phase: "init",
      turn: null,
      msg: "",
      notice: "",
      pending: null,
      insurance: 0,
      insNet: 0,
      roundNet: null,
      forfeited: !1,
      cancelled: !1,
    }),
    S
  );
}
function newShoe(e) {
  const t = [];
  for (let a = 0; a < S.decks; a++) for (const s of SUITS) for (const n of RANKS) t.push({ r: n, s });
  if ((shuffleArr(t), (S.shoe = t), (S.rc = 0), (S.counted = []), (S.used = 0), e)) {
    const s = Math.max(0.16999999999999998, CUT[S.decks] - 0.1),
      n = Math.floor(S.total * (0.12 + Math.random() * (s - 0.12)));
    (S.shoe.splice(0, n), (S.used = n));
  } else (S.shoe.pop(), (S.used = 1));
}
function needShuffle() {
  return S.used >= S.cutAt || S.shoe.length < Math.ceil(S.seats.length * 4 + 6);
}
const mySeats = () => S.seats.filter((e) => e.me);
function draw() {
  return (
    S.shoe.length === 0 &&
      (newShoe(!1), (S.notice = "Sabot esaurito: rimescolato a met\xE0 mano. Azzera il conteggio.")),
    S.used++,
    S.shoe.pop()
  );
}
function countCard(e) {
  ((S.rc += hilo(e)), S.counted.push(e));
}
function ask(e, t) {
  const a = S;
  return new Promise((s, n) => {
    ((a.pending = {
      kind: e,
      opts: t || {},
      reject: n,
      resolve: (o) => {
        a.pending && a.pending.kind === e && ((a.pending = null), s(o));
      },
    }),
      UI.render(),
      UI.onAsk && UI.onAsk(e, t || {}, a.pending));
  });
}
async function pause(e) {
  const t = S;
  if ((await UI.pause(e), S !== t || t.cancelled)) throw CANCEL;
}
const canSeat = () => S && !S.cancelled && S.phase === "bet";
function maxSpots() {
  return Math.max(1, Math.min(MAX_SPOTS, Math.floor(S.bank / S.cfg.minBet)));
}
function moveSeat(e) {
  if (!canSeat() || e < 1 || e > S.tableSeats || S.sel.includes(e)) return !1;
  const t = S.sel.shift();
  S.sel.push(e);
  const a = S.seats.find((n) => n.me && n.pos === t),
    s = S.seats.find((n) => n.pos === e);
  return (s && (s.pos = t), (a.pos = e), S.seats.sort((n, o) => n.pos - o.pos), UI.render(), !0);
}
function setSpots(e) {
  if (!canSeat() || ((e = Math.max(1, Math.min(maxSpots(), e))), e === S.sel.length)) return !1;
  for (; S.sel.length > e;) {
    const a = S.sel.pop();
    S.seats.splice(
      S.seats.findIndex((s) => s.me && s.pos === a),
      1,
    );
  }
  for (; S.sel.length < e;) {
    const a = S.sel[S.sel.length - 1],
      s = Array.from({ length: S.tableSeats }, (r, l) => l + 1)
        .filter((r) => !S.sel.includes(r))
        .sort((r, l) => Math.abs(r - a) - Math.abs(l - a) || r - l),
      n = s.find((r) => !S.seats.some((l) => l.pos === r)),
      o = n !== void 0 ? n : s[0],
      i = S.seats.find((r) => r.pos === o);
    (i &&
      (S.seats.splice(S.seats.indexOf(i), 1),
      (S.notice = `${i.name} lascia il tavolo per farti posto.`),
      (S.msg = S.notice)),
      S.seats.push({ pos: o, name: "Tu", me: !0, hands: [] }),
      S.sel.push(o));
  }
  S.seats.sort((a, s) => a.pos - s.pos);
  const t = S.cfg.minBet;
  return ((S.bet = Math.max(t, Math.min(S.bet, Math.floor(S.bank / S.sel.length)))), UI.render(), !0);
}
function leave() {
  if (S && ((S.cancelled = !0), S.pending)) {
    const e = S.pending;
    ((S.pending = null), e.reject(CANCEL));
  }
}
async function giveCard(e) {
  const t = draw();
  return ((t.anim = !0), e.cards.push(t), countCard(t), UI.render(), await pause("deal"), t);
}
async function dealerCard(e) {
  const t = draw();
  return (
    (t.anim = !0),
    (t.down = !e),
    S.dealer.cards.push(t),
    e && countCard(t),
    UI.render(),
    await pause("deal"),
    t
  );
}
async function revealHole() {
  const e = S.dealer.cards[1];
  e && e.down && ((e.down = !1), (e.anim = !0), countCard(e), UI.render(), await pause("reveal"));
}
async function playHand(e, t) {
  S.turn = { seat: e, hand: t };
  const a = S.sel.length > 1 ? `te \xB7 posto ${e.pos}` : "te";
  if (
    ((S.msg = e.me ? `Tocca a ${a}.` : `Tocca a ${e.name}.`),
    UI.render(),
    t.cards.length === 1 && (await giveCard(t)),
    isNatural(t))
  ) {
    ((t.done = !0),
      (S.msg = e.me
        ? S.sel.length > 1
          ? `Blackjack al posto ${e.pos}!`
          : "Blackjack!"
        : `${e.name} ha blackjack.`),
      UI.render(),
      await pause("bot"));
    return;
  }
  for (; !t.done;) {
    if (evalHand(t.cards).total >= 21) {
      t.done = !0;
      break;
    }
    const n = t.cards.length === 2 && (!e.me || S.bank >= t.bet),
      o =
        t.cards.length === 2 &&
        e.hands.length < 4 &&
        cardVal(t.cards[0]) === cardVal(t.cards[1]) &&
        (!e.me || S.bank >= t.bet);
    let i;
    if (e.me)
      do i = await ask("action", { double: n, split: o });
      while ((i === "double" && !n) || (i === "split" && !o));
    else (await pause("bot"), (i = botAction(t, n, o)), (S.msg = `${e.name} ${VERB[i]}.`), UI.render());
    if (i === "hit") await giveCard(t);
    else if (i === "stand") t.done = !0;
    else if (i === "double")
      (e.me && (S.bank -= t.bet), (t.bet *= 2), (t.doubled = !0), await giveCard(t), (t.done = !0));
    else if (i === "split") {
      e.me && (S.bank -= t.bet);
      const r = t.cards.pop(),
        l = newHand(t.bet);
      ((l.cards = [r]),
        (l.fromSplit = !0),
        (t.fromSplit = !0),
        r.r === "A" && ((t.splitAce = !0), (l.splitAce = !0)),
        e.hands.splice(e.hands.indexOf(t) + 1, 0, l),
        UI.render(),
        await pause("deal"),
        await giveCard(t));
    }
  }
  UI.render();
}
async function dealerPlay() {
  if (
    ((S.phase = "dealer"),
    (S.turn = null),
    (S.msg = "Gioca il dealer."),
    UI.render(),
    await pause("reveal"),
    await revealHole(),
    S.seats.some((t) => t.hands.some((a) => evalHand(a.cards).total <= 21 && !isNatural(a))))
  )
    for (; evalHand(S.dealer.cards).total < 17;) (await pause("draw"), await dealerCard(!0));
}
function settle() {
  const e = evalHand(S.dealer.cards),
    t = S.dealer.cards.length === 2 && e.total === 21,
    a = e.total > 21;
  const stake = S.cfg.side === "on" && S.side ? (S.side.bu || 0) * S.sel.length : 0;
  if (stake) {
    const r = busterPay(stake);
    ((S.bank += r.credit),
      (S.sideNet = (S.sideNet || 0) + r.credit),
      (S.sideTxt = (S.sideTxt ? S.sideTxt + " | " : "") + r.txt),
      S.sideLines.push(r.line));
  }
  let s = S.sideNet || 0;
  for (const n of S.seats)
    for (const o of n.hands) {
      const i = evalHand(o.cards),
        r = isNatural(o);
      let l,
        c = 0;
      (i.total > 21
        ? (l = "lose")
        : r && t
          ? ((l = "push"), (c = o.bet))
          : r
            ? ((l = "bj"), (c = o.bet * 2.5))
            : t
              ? (l = "lose")
              : a || i.total > e.total
                ? ((l = "win"), (c = o.bet * 2))
                : i.total === e.total
                  ? ((l = "push"), (c = o.bet))
                  : (l = "lose"),
        (o.result = l),
        (o.net = c - o.bet),
        n.me && ((S.bank += c), (s += o.net)));
    }
  (S.insurance > 0 &&
    (t ? ((S.bank += S.insurance * 3), (S.insNet = S.insurance * 2)) : (S.insNet = -S.insurance),
    (s += S.insNet)),
    (S.roundNet = s),
    S.rounds++);
}
async function endRound() {
  ((S.phase = "roundEnd"), (S.turn = null));
  const e = S.roundNet;
  ((S.msg =
    (S.dealerBJ ? "Il dealer ha blackjack. " : "") +
    (e > 0 ? `Mano vinta ${money(e, !0)}` : e < 0 ? `Mano persa ${money(e, !0)}` : "Mano pari") +
    (S.sideTxt ? ` \xB7 side bet ${money(S.sideNet, !0)} incluse` : "")),
    UI.render(),
    await ask("next"));
}
async function playRound() {
  ((S.phase = "dealing"),
    (S.turn = null),
    (S.roundNet = null),
    (S.insurance = 0),
    (S.insNet = 0),
    (S.sideNet = 0),
    (S.sideTxt = ""),
    (S.sideLines = []),
    (S.dealerBJ = !1),
    (S.msg = "Si distribuiscono le carte\u2026"));
  const e = S.bet,
    t = S.sel.length,
    sd = S.cfg.side === "on" ? sideFit(S.side, e, t, S.bank) : sideZero(),
    sideTot = sideSum(sd) * t;
  ((S.side = sd), (S.bank -= e * t + sideTot), (S.lastBet = e));
  for (const s of S.seats) s.hands = [newHand(s.me ? e : botBet())];
  ((S.dealer.cards = []), UI.render(), await pause("deal"));
  for (let s = 0; s < 2; s++) {
    for (const n of S.seats) await giveCard(n.hands[0]);
    await dealerCard(s === 0);
  }
  const a = S.dealer.cards[0];
  sideTot && (await sideSettle());
  if (a.r === "A") {
    const s = (e * t) / 2;
    S.bank >= s &&
      ((S.phase = "insurance"),
      (S.msg = "Il dealer mostra un asso."),
      (await ask("insurance", { cost: s })) && ((S.bank -= s), (S.insurance = s)));
  }
  if (a.r === "A" || cardVal(a) === 10) {
    if (
      ((S.phase = "peek"),
      (S.msg = "Il dealer controlla la carta coperta\u2026"),
      UI.render(),
      await pause("peek"),
      evalHand([a, S.dealer.cards[1]]).total === 21)
    ) {
      (await revealHole(), (S.dealerBJ = !0));
      for (const s of S.seats) for (const n of s.hands) n.done = !0;
      (settle(), await endRound());
      return;
    }
    S.insurance > 0 && ((S.msg = "Niente blackjack: assicurazione persa."), UI.render(), await pause("peek"));
  }
  S.phase = "play";
  for (const s of S.seats) for (let n = 0; n < s.hands.length; n++) await playHand(s, s.hands[n]);
  (await dealerPlay(), settle(), await endRound());
}
async function runSession(e) {
  try {
    for (S = e; ;) {
      ((S.dealer.cards = []),
        S.seats.forEach((s) => {
          s.hands = [];
        }),
        (S.turn = null));
      const t = S.cfg.minBet;
      if (
        (S.bank < t &&
          ((S.phase = "broke"), (S.msg = "Hai finito le fiches."), UI.render(), await ask("broke")),
        S.shoe.length === 0 || needShuffle())
      ) {
        const s = S.shuffles === 0;
        ((S.phase = "shuffle"),
          (S.msg = "Il dealer rimescola\u2026"),
          UI.render(),
          s || (await pause("shuffle")),
          newShoe(s && S.cfg.entry === "random"),
          S.shuffles++,
          (S.notice = s
            ? S.cfg.entry === "random"
              ? "Ti siedi a sabot gi\xE0 iniziato. Parti da zero e conta solo ci\xF2 che vedi."
              : "Sabot nuovo: conteggio a zero."
            : "Il dealer ha rimescolato: riparti da zero."));
      }
      for (S.phase = "bet"; S.sel.length > 1 && S.bank < t * S.sel.length;) {
        const s = S.sel.pop();
        (S.seats.splice(
          S.seats.findIndex((n) => n.me && n.pos === s),
          1,
        ),
          (S.notice = S.notice || "Fiches insufficienti: giochi un posto in meno."));
      }
      ((S.bet = Math.min(Math.max(S.lastBet, t), Math.floor(S.bank / S.sel.length))),
        (S.side = S.cfg.side === "on" ? sideFit(S.side, S.bet, S.sel.length, S.bank) : sideZero()),
        (S.msg = S.notice || "Fai la tua puntata."),
        await ask("bet"),
        (S.notice = ""));
      const a = Math.floor(S.bank / S.sel.length);
      ((S.bet = Math.max(t, Math.min(Math.floor(S.bet) || t, a))), await playRound());
    }
  } catch (t) {
    if (t !== CANCEL) throw t;
  }
}
const ROOM_TIMEOUT = 9e4,
  ROOM_AT_RISK = ["dealing", "insurance", "peek", "play", "dealer"];
function cleanName(e, t) {
  const a =
    String(e || "")
      .replace(/[^\p{L}\p{N} _.\-]/gu, "")
      .trim()
      .slice(0, 14) || "Giocatore";
  let s = a,
    n = 2;
  for (; t.includes(s);) s = a + " " + n++;
  return s;
}
const roomMax = () => (S.decks === 1 ? 3 : TABLE_SEATS);
function createRoom(e, t) {
  const a = e.decks,
    s = a * 52;
  return (
    (S = {
      tableSeats: TABLE_SEATS,
      cfg: Object.assign({}, e),
      decks: a,
      total: s,
      cutAt: Math.floor(s * CUT[a]),
      shoe: [],
      used: 0,
      rc: 0,
      counted: [],
      shuffles: 0,
      seats: [],
      dealer: { cards: [] },
      phase: "lobby",
      turn: null,
      msg: "",
      notice: "",
      pending: null,
      dealerBJ: !1,
      cancelled: !1,
      room: {
        io: t,
        code: e.code || "",
        players: [],
        seq: 0,
        askSeq: 0,
        started: !1,
        ended: !1,
        finals: null,
        reason: "",
        timeout: e.timeout === void 0 ? ROOM_TIMEOUT : e.timeout,
      },
    }),
    S
  );
}
function roomAdd(e, t, a) {
  const s = S.room;
  if (s.ended) return { err: "La partita \xE8 gi\xE0 finita." };
  const n = s.players.filter((l) => !l.left);
  if (n.length >= roomMax()) return { err: "Il tavolo \xE8 pieno." };
  const o = n.map((l) => l.pos);
  let i = 1;
  for (; o.includes(i);) i++;
  const r = {
    id: a || "p" + ++s.seq,
    name: cleanName(
      e,
      n.map((l) => l.name),
    ),
    host: !!t,
    pos: i,
    bank: S.cfg.cash,
    startBank: S.cfg.cash,
    lastBet: S.cfg.minBet,
    bet: S.cfg.minBet,
    rounds: 0,
    hands: [],
    ask: null,
    left: !1,
    insurance: 0,
    insNet: 0,
    roundNet: null,
  };
  return (s.players.push(r), roomBroadcast(), { p: r });
}
function roomFinals() {
  return S.room.players.map((e) => ({
    name: e.name,
    host: e.host,
    start: e.startBank,
    end: e.bank,
    rounds: e.rounds,
    left: e.left,
  }));
}
function roomLeave(e) {
  const t = S.room,
    a = t.players.find((s) => s.id === e);
  if (!(!a || a.left || t.ended)) {
    if (a.host) {
      roomEnd("Chi ha creato la stanza ha chiuso il tavolo.");
      return;
    }
    ((a.left = !0),
      a.ask && a.ask.resolve(a.ask.def),
      t.io.send(a.id, { t: "bye", finals: roomFinals() }),
      roomBroadcast());
  }
}
function roomEnd(e) {
  const t = S.room;
  if (!t.ended) {
    if (((t.ended = !0), (t.reason = e), (S.cancelled = !0), ROOM_AT_RISK.includes(S.phase)))
      for (const a of S.seats) a.left || (a.bank += a.hands.reduce((s, n) => s + n.bet, 0) + a.insurance);
    t.finals = roomFinals();
    for (const a of t.players)
      (a.ask && a.ask.resolve(a.ask.def),
        a.left || t.io.send(a.id, { t: "end", reason: e, finals: t.finals }));
  }
}
function roomMsg(e, t) {
  const a = S.room,
    s = a.players.find((n) => n.id === e && !n.left);
  if (!(!s || !t || a.ended))
    if (t.t === "ans") {
      const n = s.ask;
      n && n.id === t.id && n.resolve(n.fix(t.v));
    } else t.t === "leave" && roomLeave(e);
}
function roomStart() {
  const e = S.room;
  e.started ||
    e.ended ||
    ((e.started = !0),
    runRoom().catch((t) => {
      (console.error(t), (S.msg = "Errore: " + t.message), roomBroadcast());
    }));
}
function rask(e, t, a, s, n) {
  const o = S.room;
  return new Promise((i) => {
    if (e.left || o.ended) {
      i(s);
      return;
    }
    const r = {
      id: ++o.askSeq,
      kind: t,
      opts: a,
      def: s,
      fix: n || ((l) => l),
      timer: null,
      resolve: (l) => {
        e.ask === r && (clearTimeout(r.timer), (e.ask = null), i(l), roomBroadcast());
      },
    };
    ((e.ask = r), o.timeout && (r.timer = setTimeout(() => r.resolve(s), o.timeout)), roomBroadcast());
  }).then((i) => {
    if (S.cancelled) throw CANCEL;
    return i;
  });
}
function roomSnap(e) {
  const t = S.room,
    a = S.cfg.minBet,
    s = (c) => (c.down ? { down: 1, anim: c.anim ? 1 : 0 } : { r: c.r, s: c.s, anim: c.anim ? 1 : 0 }),
    n = (c) => ({
      cards: c.cards.map(s),
      bet: c.bet,
      doubled: c.doubled,
      done: c.done,
      fromSplit: c.fromSplit,
      splitAce: c.splitAce,
      result: c.result,
      net: c.net,
    }),
    o = (c) => S.seats.includes(c),
    i = (c) =>
      c.left
        ? "ha lasciato"
        : S.phase === "lobby"
          ? ""
          : c.bank < a && !(o(c) && !["bet", "roundEnd", "shuffle"].includes(S.phase))
            ? "senza fiches"
            : o(c)
              ? S.phase === "bet"
                ? c.ask && c.ask.kind === "bet"
                  ? "sta puntando\u2026"
                  : "ha puntato " + money(c.bet)
                : ""
              : "guarda \xB7 entra al prossimo giro",
    r = t.players
      .filter((c) => !c.left)
      .sort((c, f) => c.pos - f.pos)
      .map((c) => ({
        pid: c.id,
        pos: c.pos,
        name: c.name,
        host: c.host,
        bank: c.bank,
        status: i(c),
        hands: (c.hands || []).map(n),
      }));
  let l = null;
  return (
    S.phase !== "lobby" &&
      (e.bank < a && !(o(e) && !["bet", "roundEnd", "shuffle"].includes(S.phase))
        ? (l = "broke")
        : o(e) || (l = "late")),
    {
      t: "state",
      code: t.code,
      phase: S.phase,
      msg: S.msg,
      notice: S.notice,
      dealerBJ: !!S.dealerBJ,
      decks: S.decks,
      total: S.total,
      used: S.used,
      cutAt: S.cutAt,
      rc: S.rc,
      shuffles: S.shuffles,
      shoeLen: S.shoe.length,
      minBet: a,
      askCount: !!S.cfg.askCount,
      cfg: {
        decks: S.decks,
        cash: S.cfg.cash,
        minBet: a,
        entry: S.cfg.entry,
        askCount: !!S.cfg.askCount,
        side: S.cfg.side === "on",
      },
      dealer: S.dealer.cards.map(s),
      seats: r,
      turn: S.turn ? { pid: S.turn.seat.id, hi: S.turn.seat.hands.indexOf(S.turn.hand) } : null,
      me: {
        pid: e.id,
        host: e.host,
        bank: e.bank,
        startBank: e.startBank,
        bet: e.lastBet,
        rounds: e.rounds,
        roundNet: e.roundNet,
        insurance: e.insurance,
        sideTxt: e.sideTxt || "",
        sideNet: e.sideNet || 0,
        sideLines: e.sideLines || [],
        insNet: e.insNet || 0,
        spec: l,
      },
      ask: e.ask ? { id: e.ask.id, kind: e.ask.kind, opts: e.ask.opts } : null,
    }
  );
}
function roomBroadcast() {
  const e = S && S.room;
  if (!(!e || (e.ended && !e.finals))) {
    for (const t of e.players) t.left || e.io.send(t.id, roomSnap(t));
    for (const t of S.dealer.cards) t.anim = !1;
    for (const t of e.players) for (const a of t.hands || []) for (const s of a.cards) s.anim = !1;
  }
}
async function roomPlayHand(e, t) {
  if (
    ((S.turn = { seat: e, hand: t }),
    (S.msg = `Tocca a ${e.name}.`),
    UI.render(),
    t.cards.length === 1 && (await giveCard(t)),
    isNatural(t))
  ) {
    ((t.done = !0), (S.msg = `${e.name} ha blackjack.`), UI.render(), await pause("bot"));
    return;
  }
  for (; !t.done;) {
    if (evalHand(t.cards).total >= 21) {
      t.done = !0;
      break;
    }
    const s = t.cards.length === 2 && e.bank >= t.bet,
      n =
        t.cards.length === 2 &&
        e.hands.length < 4 &&
        cardVal(t.cards[0]) === cardVal(t.cards[1]) &&
        e.bank >= t.bet,
      o = await rask(e, "action", { double: s, split: n }, "stand", (i) =>
        i === "hit" || i === "stand" || (i === "double" && s) || (i === "split" && n) ? i : "stand",
      );
    if (((S.msg = `${e.name} ${VERB[o]}.`), o === "hit")) await giveCard(t);
    else if (o === "stand") ((t.done = !0), UI.render());
    else if (o === "double")
      ((e.bank -= t.bet), (t.bet *= 2), (t.doubled = !0), await giveCard(t), (t.done = !0));
    else if (o === "split") {
      e.bank -= t.bet;
      const i = t.cards.pop(),
        r = newHand(t.bet);
      ((r.cards = [i]),
        (r.fromSplit = !0),
        (t.fromSplit = !0),
        i.r === "A" && ((t.splitAce = !0), (r.splitAce = !0)),
        e.hands.splice(e.hands.indexOf(t) + 1, 0, r),
        UI.render(),
        await pause("deal"),
        await giveCard(t));
    }
  }
  UI.render();
}
function roomSettle() {
  const e = evalHand(S.dealer.cards),
    t = S.dealer.cards.length === 2 && e.total === 21,
    a = e.total > 21;
  for (const s of S.seats) {
    let n = s.left ? 0 : s.sideNet || 0;
    if (!s.left && s.sd && s.sd.bu) {
      const r = busterPay(s.sd.bu);
      ((s.bank += r.credit),
        (n += r.credit),
        (s.sideNet = (s.sideNet || 0) + r.credit),
        (s.sideTxt = (s.sideTxt ? s.sideTxt + " | " : "") + r.txt),
        (s.sideLines = (s.sideLines || []).concat([r.line])));
    }
    for (const o of s.hands) {
      const i = evalHand(o.cards),
        r = isNatural(o);
      let l,
        c = 0;
      (i.total > 21
        ? (l = "lose")
        : r && t
          ? ((l = "push"), (c = o.bet))
          : r
            ? ((l = "bj"), (c = o.bet * 2.5))
            : t
              ? (l = "lose")
              : a || i.total > e.total
                ? ((l = "win"), (c = o.bet * 2))
                : i.total === e.total
                  ? ((l = "push"), (c = o.bet))
                  : (l = "lose"),
        (o.result = l),
        (o.net = c - o.bet),
        s.left || ((s.bank += c), (n += o.net)));
    }
    (s.insurance > 0 &&
      !s.left &&
      (t ? ((s.bank += s.insurance * 3), (s.insNet = s.insurance * 2)) : (s.insNet = -s.insurance),
      (n += s.insNet)),
      (s.roundNet = n),
      s.left || s.rounds++);
  }
}
async function roomRound(e) {
  const t = S.cfg.minBet;
  ((S.phase = "dealing"), (S.turn = null), (S.dealerBJ = !1), (S.msg = "Si distribuiscono le carte\u2026"));
  for (const s of e) {
    const sd = S.cfg.side === "on" ? sideFit(s.sideReq, s.bet, 1, s.bank) : sideZero();
    ((s.sd = sd), (s.sideNet = 0), (s.sideTxt = ""), (s.sideLines = []), (s.bank -= sideSum(sd)));
  }
  for (const s of e)
    ((s.bank -= s.bet),
      (s.lastBet = s.bet),
      (s.insurance = 0),
      (s.insNet = 0),
      (s.roundNet = null),
      (s.hands = [newHand(s.bet)]));
  ((S.dealer.cards = []), UI.render(), await pause("deal"));
  for (let s = 0; s < 2; s++) {
    for (const n of e) await giveCard(n.hands[0]);
    await dealerCard(s === 0);
  }
  const a = S.dealer.cards[0];
  if (e.some((s) => sideSum(s.sd) > 0)) {
    for (const s of e) {
      if (!sideSum(s.sd)) continue;
      const r = sideResolve("", s.hands[0].cards, a, s.sd);
      ((s.bank += r.credit), (s.sideNet = r.net), (s.sideTxt = r.txt), (s.sideLines = r.lines));
    }
    ((S.msg = "Side bet risolte."), UI.render(), await pause("bot"));
  }
  if (
    (a.r === "A" &&
      ((S.phase = "insurance"),
      (S.msg = "Il dealer mostra un asso: assicurazione?"),
      await Promise.all(
        e.map(async (s) => {
          const n = s.bet / 2;
          if (s.bank < n) return;
          (await rask(s, "insurance", { cost: n }, !1, (i) => i === !0)) &&
            !s.left &&
            s.bank >= n &&
            ((s.bank -= n), (s.insurance = n));
        }),
      )),
    a.r === "A" || cardVal(a) === 10)
  ) {
    if (
      ((S.phase = "peek"),
      (S.msg = "Il dealer controlla la carta coperta\u2026"),
      UI.render(),
      await pause("peek"),
      evalHand([a, S.dealer.cards[1]]).total === 21)
    ) {
      (await revealHole(), (S.dealerBJ = !0));
      for (const s of e) for (const n of s.hands) n.done = !0;
      (roomSettle(), await roomEndRound(e));
      return;
    }
    e.some((s) => s.insurance > 0) &&
      ((S.msg = "Niente blackjack: assicurazioni perse."), UI.render(), await pause("peek"));
  }
  S.phase = "play";
  for (const s of e) for (let n = 0; n < s.hands.length; n++) await roomPlayHand(s, s.hands[n]);
  (await dealerPlay(), roomSettle(), await roomEndRound(e));
}
async function roomEndRound(e) {
  ((S.phase = "roundEnd"),
    (S.turn = null),
    (S.msg = S.dealerBJ ? "Il dealer ha blackjack." : "Mano conclusa."),
    UI.render(),
    await Promise.all(e.map((t) => rask(t, "next", {}, !0, () => !0))));
}
async function runRoom() {
  const e = S.room,
    t = S.cfg.minBet;
  try {
    for (;;) {
      ((S.dealer.cards = []), (S.turn = null));
      for (const n of e.players) n.hands = [];
      const a = e.players.filter((n) => !n.left && n.bank >= t).sort((n, o) => n.pos - o.pos);
      if (!a.length) {
        roomEnd("Nessuno ha pi\xF9 fiches: il tavolo si chiude.");
        return;
      }
      if (((S.seats = a), S.shoe.length === 0 || needShuffle())) {
        const n = S.shuffles === 0;
        ((S.phase = "shuffle"),
          (S.msg = "Il dealer rimescola\u2026"),
          UI.render(),
          n || (await pause("shuffle")),
          newShoe(n && S.cfg.entry === "random"),
          S.shuffles++,
          (S.notice = n
            ? S.cfg.entry === "random"
              ? "Sabot gi\xE0 iniziato: conta solo ci\xF2 che vedi da ora."
              : "Sabot nuovo: conteggio a zero."
            : "Il dealer ha rimescolato: si riparte da zero."));
      }
      if (
        ((S.phase = "bet"),
        (S.msg = S.notice || "Fate le vostre puntate."),
        await Promise.all(
          a.map(async (n) => {
            const o = Math.floor(n.bank),
              i = Math.max(t, Math.min(o, n.lastBet));
            const sideOn = S.cfg.side === "on",
              res = await rask(
                n,
                "bet",
                { min: t, max: o, last: i, side: sideOn, sideLast: n.sideReq || sideZero() },
                Object.assign({ b: i }, sideZero()),
                (r) => {
                  const q = r && typeof r == "object" ? r : { b: r };
                  let l = Number(q.b);
                  Number.isFinite(l) || (l = i);
                  const b = Math.max(t, Math.min(o, Math.floor(l))),
                    f = (x) => (sideOn ? Math.max(0, Math.min(b, Math.floor(Number(x) || 0))) : 0);
                  const out = { b };
                  for (const k of SIDE_KEYS) out[k] = f(q[k]);
                  return out;
                },
              );
            ((n.bet = res.b), (n.sideReq = Object.fromEntries(SIDE_KEYS.map((k) => [k, res[k] || 0]))), UI.render());
          }),
        ),
        (S.notice = ""),
        !a.filter((n) => !n.left).length)
      ) {
        roomEnd("Tutti hanno lasciato il tavolo.");
        return;
      }
      await roomRound(a);
    }
  } catch (a) {
    if (a !== CANCEL) throw a;
  }
}
typeof module != "undefined" &&
  module.exports &&
  (module.exports = {
    createRoom,
    roomAdd,
    roomMsg,
    roomLeave,
    roomEnd,
    roomStart,
    roomSnap,
    roomFinals,
    cleanName,
    createSession,
    runSession,
    leave,
    moveSeat,
    setSpots,
    evalHand,
    hilo,
    cardVal,
    isNatural,
    basicStrategy,
    UI,
    money,
    getS: () => S,
  });
const P_SUITS = ["\u2660\uFE0E", "\u2665\uFE0E", "\u2666\uFE0E", "\u2663\uFE0E"],
  P_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"],
  P_VAL = {};
P_RANKS.forEach((e, t) => {
  P_VAL[e] = t + 2;
});
const P_SI = {};
P_SUITS.forEach((e, t) => {
  P_SI[e] = t;
});
const P_CATS = [
    "Carta alta",
    "Coppia",
    "Doppia coppia",
    "Tris",
    "Scala",
    "Colore",
    "Full",
    "Poker",
    "Scala colore",
  ],
  P_BOTNAMES = ["Marco", "Giulia", "Enrico", "Sara", "Franco", "Elena", "Dario", "Chiara", "Nico", "Irene"],
  P_MAX = 9,
  P_TIMEOUT = 6e4,
  PCANCEL = { cancel: !0 };
function pkScore(e, t) {
  let a = e;
  for (let s = 0; s < 5; s++) a = a * 15 + (t[s] || 0);
  return a;
}
function pkStraightHigh(e) {
  const t = new Array(15).fill(!1);
  for (const a of e) t[a] = !0;
  t[1] = t[14];
  for (let a = 14; a >= 5; a--) {
    let s = !0;
    for (let n = 0; n < 5; n++)
      if (!t[a - n]) {
        s = !1;
        break;
      }
    if (s) return a;
  }
  return 0;
}
function pkEval(e) {
  const t = new Array(15).fill(0),
    a = [[], [], [], []];
  for (const f of e) {
    const m = P_VAL[f.r];
    (t[m]++, a[P_SI[f.s]].push(m));
  }
  let s = null;
  for (const f of a) f.length >= 5 && (s = f.slice().sort((m, u) => u - m));
  if (s) {
    const f = pkStraightHigh(s);
    if (f) return pkScore(8, [f]);
  }
  const n = [],
    o = [],
    i = [],
    r = [],
    l = [];
  for (let f = 14; f >= 2; f--)
    t[f] && (l.push(f), t[f] === 4 ? n.push(f) : t[f] === 3 ? o.push(f) : t[f] === 2 ? i.push(f) : r.push(f));
  if (n.length) return pkScore(7, [n[0], Math.max(o[0] || 0, i[0] || 0, r[0] || 0)]);
  if (o.length && (o.length > 1 || i.length)) return pkScore(6, [o[0], Math.max(o[1] || 0, i[0] || 0)]);
  if (s) return pkScore(5, s.slice(0, 5));
  const c = pkStraightHigh(l);
  return c
    ? pkScore(4, [c])
    : o.length
      ? pkScore(3, [o[0], r[0] || 0, r[1] || 0])
      : i.length >= 2
        ? pkScore(2, [i[0], i[1], Math.max(i[2] || 0, r[0] || 0)])
        : i.length === 1
          ? pkScore(1, [i[0], r[0] || 0, r[1] || 0, r[2] || 0])
          : pkScore(0, r.slice(0, 5));
}
const pkCat = (e) => Math.floor(e / 759375),
  P_LBL = { 11: "J", 12: "Q", 13: "K", 14: "A" },
  pkRankLbl = (e) => P_LBL[e] || String(e);
function pkDecode(e) {
  const t = [];
  let a = e;
  for (let s = 0; s < 5; s++) (t.unshift(a % 15), (a = Math.floor(a / 15)));
  return { cat: a, ks: t };
}
function pkName(e) {
  const { cat: t, ks: a } = pkDecode(e),
    s = pkRankLbl;
  switch (t) {
    case 0:
      return "Carta alta " + s(a[0]);
    case 1:
      return "Coppia di " + s(a[0]);
    case 2:
      return `Doppia coppia ${s(a[0])} e ${s(a[1])}`;
    case 3:
      return "Tris di " + s(a[0]);
    case 4:
      return "Scala fino a " + s(a[0]);
    case 5:
      return "Colore al " + s(a[0]);
    case 6:
      return `Full ${s(a[0])} su ${s(a[1])}`;
    case 7:
      return "Poker di " + s(a[0]);
    default:
      return a[0] === 14 ? "Scala reale" : "Scala colore fino a " + s(a[0]);
  }
}
const PK_CATS = ["carta alta", "coppia", "doppia coppia", "tris", "scala", "colore", "full", "poker", "scala colore"];
function pkBest5(e) {
  if (e.length <= 5) return e.slice();
  let t = -1,
    a = null;
  for (let s = 0; s < e.length - 4; s++)
    for (let n = s + 1; n < e.length - 3; n++)
      for (let o = n + 1; o < e.length - 2; o++)
        for (let i = o + 1; i < e.length - 1; i++)
          for (let r = i + 1; r < e.length; r++) {
            const l = [e[s], e[n], e[o], e[i], e[r]],
              c = pkEval(l);
            c > t && ((t = c), (a = l));
          }
  return a;
}
function pkWhy(w, o) {
  const a = pkDecode(w),
    s = pkDecode(o),
    r = pkRankLbl;
  if (a.cat !== s.cat) return `${PK_CATS[a.cat][0].toUpperCase() + PK_CATS[a.cat].slice(1)} batte ${PK_CATS[s.cat]}.`;
  let i = 0;
  for (; i < 5 && a.ks[i] === s.ks[i];) i++;
  if (i === 5) return "Stessa mano: il piatto si divide.";
  const kick = (a.cat === 1 && i >= 1) || (a.cat === 2 && i === 2) || (a.cat === 3 && i >= 1) || (a.cat === 7 && i === 1);
  const what =
    a.cat === 0 || a.cat === 5
      ? i === 0
        ? "la carta pi\xF9 alta"
        : "la carta successiva"
      : kick
        ? "il kicker (la carta che accompagna)"
        : a.cat === 2
          ? "la coppia pi\xF9 alta"
          : a.cat === 6
            ? i === 0
              ? "il tris pi\xF9 alto"
              : "la coppia del full"
            : a.cat === 4 || a.cat === 8
              ? "la scala pi\xF9 alta"
              : "la combinazione pi\xF9 alta";
  return `Stessa combinazione: decide ${what}, ${r(a.ks[i])} contro ${r(s.ks[i])}.`;
}
function pkDeck() {
  const e = [];
  for (const t of P_SUITS) for (const a of P_RANKS) e.push({ r: a, s: t });
  return e;
}
function pkShuffle(e) {
  for (let t = e.length - 1; t > 0; t--) {
    const a = Math.floor(Math.random() * (t + 1)),
      s = e[t];
    ((e[t] = e[a]), (e[a] = s));
  }
  return e;
}
const pkKey = (e) => e.r + e.s;
function pkRemaining(e) {
  const t = new Set(e.map(pkKey));
  return pkDeck().filter((a) => !t.has(pkKey(a)));
}
function pkSim(e, t, a, s) {
  const n = pkRemaining(e.concat(t)),
    o = 5 - t.length + 2 * a,
    i = n.length,
    r = new Array(9).fill(0);
  let l = 0,
    c = 0;
  for (let f = 0; f < s; f++) {
    for (let p = 0; p < o; p++) {
      const d = p + Math.floor(Math.random() * (i - p)),
        h = n[p];
      ((n[p] = n[d]), (n[d] = h));
    }
    const m = t.concat(n.slice(0, 5 - t.length)),
      u = pkEval(e.concat(m));
    if ((r[pkCat(u)]++, a > 0)) {
      let p = -1,
        d = 0,
        h = 5 - t.length;
      for (let b = 0; b < a; b++) {
        const k = pkEval([n[h], n[h + 1]].concat(m));
        ((h += 2), k > p ? ((p = k), (d = 1)) : k === p && d++);
      }
      u > p ? (l++, c++) : u === p && (c += 1 / (d + 1));
    }
  }
  return { n: s, cats: r, wins: l, eq: a > 0 ? c / s : 1 };
}
function pkPots(e) {
  const t = [...new Set(e.filter((n) => n.total > 0).map((n) => n.total))].sort((n, o) => n - o),
    a = [];
  let s = 0;
  for (const n of t) {
    const o = e.filter((l) => l.total >= n),
      i = (n - s) * o.length,
      r = o.filter((l) => !l.folded).map((l) => l.id);
    (r.length
      ? a.push({ amount: i, elig: r })
      : a.length
        ? (a[a.length - 1].amount += i)
        : a.push({ amount: i, elig: [] }),
      (s = n));
  }
  return a;
}
let PS = null;
const PUI = {
    pause() {
      return Promise.resolve();
    },
  },
  pkPause = async (e) => {
    const t = PS;
    if ((await PUI.pause(e), !PS || PS !== t || t.cancelled)) throw PCANCEL;
  },
  pkMoney = (e) => "\u20AC" + Math.round(e).toLocaleString("it-IT");
function pkClean(e, t) {
  const a =
    String(e || "")
      .replace(/[^\p{L}\p{N} _.\-]/gu, "")
      .trim()
      .slice(0, 14) || "Giocatore";
  let s = a,
    n = 2;
  for (; t.includes(s);) s = a + " " + n++;
  return s;
}
function pkCreate(e, t) {
  const a = Math.max(1, Math.floor(e.sb || 5));
  return (
    (PS = {
      cfg: Object.assign({ stack: 1e3, timeout: P_TIMEOUT, code: "" }, e, { sb: a, bb: a * 2 }),
      sb: a,
      bb: a * 2,
      io: t,
      code: e.code || "",
      players: [],
      seq: 0,
      askSeq: 0,
      started: !1,
      ended: !1,
      cancelled: !1,
      finals: null,
      reason: "",
      phase: "lobby",
      handNo: 0,
      button: -1,
      board: [],
      deck: [],
      log: [],
      H: null,
      results: [],
      showdown: [],
      outSeq: 0,
      curBet: 0,
      minRaise: a * 2,
    }),
    PS
  );
}
function pkAdd(e, t, a, s) {
  if (PS.started) return { err: "La partita \xE8 gi\xE0 iniziata." };
  if (PS.ended) return { err: "La partita \xE8 finita." };
  if (PS.players.filter((o) => !o.left).length >= P_MAX) return { err: "Il tavolo \xE8 pieno." };
  const n = {
    id: a || "p" + ++PS.seq,
    name: pkClean(
      e,
      PS.players.filter((o) => !o.left).map((o) => o.name),
    ),
    host: !!t,
    bot: !!s,
    aggr: 0.85 + Math.random() * 0.4,
    stack: PS.cfg.stack,
    startStack: PS.cfg.stack,
    hole: [],
    streetBet: 0,
    total: 0,
    folded: !0,
    allIn: !1,
    acted: !1,
    canRaise: !0,
    left: !1,
    out: !1,
    outAt: 0,
    shown: !1,
    ask: null,
    timeouts: 0,
    last: "",
    won: 0,
    handName: "",
  };
  return (PS.players.push(n), pkBroadcast(), { p: n });
}
function pkAddBots(e) {
  const t = pkShuffle(P_BOTNAMES.slice());
  for (let a = 0; a < e && !pkAdd(t[a], !1, "b" + (a + 1), !0).err; a++);
}
const pkLog = (e) => {
  (PS.log.push(e), PS.log.length > 40 && PS.log.shift());
};
function pkFinals() {
  const e = PS.players.filter((a) => !a.left && !a.out).sort((a, s) => s.stack - a.stack),
    t = PS.players.filter((a) => a.left || a.out).sort((a, s) => s.outAt - a.outAt);
  return e
    .concat(t)
    .map((a, s) => ({
      name: a.name,
      host: a.host,
      bot: a.bot,
      start: a.startStack,
      end: a.stack,
      place: s + 1,
      left: a.left,
    }));
}
function pkEnd(e) {
  if (!(!PS || PS.ended)) {
    if (((PS.ended = !0), (PS.cancelled = !0), (PS.reason = e), PS.H && !PS.H.done))
      for (const t of PS.players) t.left || ((t.stack += t.total), (t.total = 0), (t.streetBet = 0));
    PS.finals = pkFinals();
    for (const t of PS.players)
      (t.ask && t.ask.resolve(t.ask.def),
        !t.left && !t.bot && PS.io.send(t.id, { t: "pend", reason: e, finals: PS.finals }));
  }
}
function pkLeave(e) {
  if (!PS || PS.ended) return;
  const t = PS.players.find((a) => a.id === e);
  if (!(!t || t.left)) {
    if (t.host) {
      pkEnd("Chi ha creato la stanza ha chiuso il tavolo.");
      return;
    }
    if (!PS.started) {
      (PS.players.splice(PS.players.indexOf(t), 1),
        PS.io.send(t.id, { t: "pbye", finals: [] }),
        pkBroadcast());
      return;
    }
    ((t.left = !0),
      (t.outAt = ++PS.outSeq),
      pkLog(`${t.name} lascia il tavolo.`),
      PS.H && !t.folded && (t.folded = !0),
      t.ask && t.ask.resolve(t.ask.def),
      PS.io.send(t.id, { t: "pbye", finals: pkFinals() }),
      pkBroadcast());
  }
}
function pkMsg(e, t) {
  if (!PS || !t || PS.ended) return;
  const a = PS.players.find((s) => s.id === e && !s.left);
  if (a)
    if (t.t === "ans") {
      const s = a.ask;
      s && s.id === t.id && ((a.timeouts = 0), s.resolve(s.fix(t.v)));
    } else t.t === "leave" && pkLeave(e);
}
function pkStart() {
  return PS.started || PS.ended || PS.players.filter((e) => !e.left).length < 2
    ? !1
    : ((PS.started = !0),
      pkRun().catch((e) => {
        (console.error(e), pkLog("Errore: " + e.message), pkBroadcast());
      }),
      !0);
}
function pkAsk(e, t, a, s) {
  return new Promise((n) => {
    if (e.left || PS.ended) {
      n(a);
      return;
    }
    const o = {
      id: ++PS.askSeq,
      opts: t,
      def: a,
      fix: s,
      timer: null,
      deadline: PS.cfg.timeout ? Date.now() + PS.cfg.timeout : 0,
      resolve: (i) => {
        e.ask === o && (clearTimeout(o.timer), (e.ask = null), n(i));
      },
    };
    ((e.ask = o),
      PS.cfg.timeout &&
        (o.timer = setTimeout(() => {
          e.ask === o && (e.timeouts++, o.resolve(a));
        }, PS.cfg.timeout)),
      pkBroadcast());
  }).then((n) => {
    if (PS.cancelled) throw PCANCEL;
    return n;
  });
}
const pkNext = (e, t) => (t + 1) % e.length;
function pkPost(e, t) {
  return (
    (t = Math.min(Math.max(0, Math.floor(t)), e.stack)),
    (e.stack -= t),
    (e.streetBet += t),
    (e.total += t),
    (e.inv = e.inv || {}),
    (e.inv[["flop", "turn", "river"].includes(PS.phase) ? PS.phase : "preflop"] =
      (e.inv[["flop", "turn", "river"].includes(PS.phase) ? PS.phase : "preflop"] || 0) + t),
    e.stack === 0 && (e.allIn = !0),
    t
  );
}
const pkLive = () => PS.H.ring.filter((e) => !e.folded),
  PK_LEVEL = {
    low: { noise: 0.22, sims: 25, aggr: 0.75 },
    mid: { noise: 0.05, sims: 1, aggr: 1 },
    high: { noise: 0, sims: 2.2, aggr: 1.12 },
  };
function pkBotDecide(e, t) {
  const a = pkLive().length - 1,
    s = PK_LEVEL[PS.cfg && PK_LEVEL[PS.cfg.diff] ? PS.cfg.diff : "mid"],
    n = s.sims < 3 ? Math.round((PS.board.length ? 140 : 90) * s.sims) : s.sims,
    o = Math.max(0, Math.min(1, pkSim(e.hole, PS.board, a, n).eq + (Math.random() - 0.5) * 2 * s.noise)),
    i = o * (a + 1),
    r = e.aggr * s.aggr,
    l = PS.H.pot(),
    c = Math.random() < 0.05 * r,
    f = (u) => {
      const p = PS.curBet + Math.max(PS.minRaise, Math.round((l * u) / PS.sb) * PS.sb);
      return p >= e.streetBet + e.stack * 0.7 ? e.streetBet + e.stack : p;
    };
  if (t.toCall === 0)
    return t.canRaise && (i > 1.55 / r || c)
      ? { a: "raise", to: f(0.4 + Math.random() * 0.5) }
      : { a: "check" };
  const m = t.toCall / (l + t.toCall);
  return t.canRaise && (i > 1.9 / r || (c && o > m * 0.7)) && o > m
    ? { a: "raise", to: f(0.6 + Math.random() * 0.5) }
    : o > m * 1.05 || (t.toCall <= e.stack * 0.04 && o > m * 0.8)
      ? { a: "call" }
      : { a: "fold" };
}
async function pkAct(e) {
  const t = Math.min(PS.curBet - e.streetBet, e.stack),
    a = e.canRaise && e.stack > PS.curBet - e.streetBet,
    s = Math.min(PS.curBet + PS.minRaise, e.streetBet + e.stack),
    n = e.streetBet + e.stack,
    o = { toCall: t, canCheck: t === 0, canRaise: a, minTo: s, maxTo: n, pot: PS.H.pot(), bb: PS.bb },
    i = { a: t === 0 ? "check" : "fold" };
  let r;
  if (
    (e.bot
      ? (await pkPause("bot"), (r = pkBotDecide(e, o)))
      : ((r = await pkAsk(e, o, i, (l) => {
          if (!l) return i;
          if (l.a === "fold") return { a: "fold" };
          if (l.a === "check") return t === 0 ? { a: "check" } : i;
          if (l.a === "call") return t === 0 ? { a: "check" } : { a: "call" };
          if (l.a === "raise" && a) {
            let c = Math.floor(Number(l.to));
            return Number.isFinite(c) ? { a: "raise", to: c } : i;
          }
          return i;
        })),
        e.timeouts >= 3 && !e.left && (pkLog(`${e.name} non risponde: esce dal tavolo.`), pkLeave(e.id))),
    r.a === "raise"
      ? a
        ? (r = { a: "raise", to: Math.max(s, Math.min(n, r.to)) })
        : (r = { a: t === 0 ? "check" : "call" })
      : r.a === "check" && t > 0
        ? (r = { a: "call" })
        : r.a === "call" && t === 0 && (r = { a: "check" }),
    r.a === "fold")
  )
    ((e.folded = !0), (e.last = "Fold"), pkLog(`${e.name} passa.`));
  else if (r.a === "check") ((e.last = "Check"), pkLog(`${e.name} check.`));
  else if (r.a === "call")
    (pkPost(e, t),
      (e.last = e.allIn ? "All-in" : "Call"),
      pkLog(`${e.name} ${e.allIn ? "va all-in" : "segue"} (${pkMoney(e.streetBet)}).`));
  else {
    const l = PS.curBet,
      c = r.to - e.streetBet;
    pkPost(e, c);
    const f = e.streetBet,
      m = f - l;
    if (m >= PS.minRaise) {
      PS.minRaise = m;
      for (const u of PS.H.ring) u !== e && !u.folded && !u.allIn && ((u.acted = !1), (u.canRaise = !0));
    } else for (const u of PS.H.ring) u !== e && !u.folded && !u.allIn && u.acted && (u.canRaise = !1);
    ((PS.curBet = f),
      (e.last = e.allIn ? "All-in" : "Rilancio"),
      pkLog(`${e.name} ${e.allIn ? "va all-in" : l === 0 ? "punta" : "rilancia a"} ${pkMoney(f)}.`));
  }
  ((e.acted = !0), pkBroadcast());
}
async function pkBetRound(e) {
  const t = PS.H.ring,
    a = t.length;
  let s = e;
  for (let n = 0; n < 2e3; n++) {
    if (pkLive().length <= 1) return;
    const o = t.filter((r) => !r.folded && !r.allIn && !r.left);
    if (
      !o.length ||
      o.every((r) => r.acted && r.streetBet === PS.curBet) ||
      (o.length === 1 && o[0].streetBet >= PS.curBet)
    )
      return;
    const i = t[s % a];
    (s++,
      !(i.folded || i.allIn) &&
        ((i.acted && i.streetBet === PS.curBet) || ((PS.H.turn = i.id), await pkAct(i), (PS.H.turn = null))));
  }
}
function pkResetStreet() {
  ((PS.curBet = 0), (PS.minRaise = PS.bb));
  for (const e of PS.H.ring)
    ((e.streetBet = 0), (e.acted = !1), (e.canRaise = !0), (e.last = e.folded ? e.last : ""));
}
function pkAward() {
  const e = PS.H.ring,
    t = e.filter((l) => !l.folded),
    a = e.reduce((l, c) => l + c.total, 0),
    s = [];
  if (t.length === 1) {
    const l = t[0];
    return (
      (l.stack += a),
      (l.won = a),
      s.push({ pid: l.id, name: l.name, amount: a, hand: "", why: "Tutti gli altri hanno passato." }),
      pkLog(`${l.name} vince ${pkMoney(a)}.`),
      s
    );
  }
  const n = new Map();
  for (const l of t) {
    const c = pkEval(l.hole.concat(PS.board));
    (n.set(l.id, c), (l.handName = pkName(c)), (l.best = pkBest5(l.hole.concat(PS.board))));
  }
  const o = e.findIndex((l) => l === PS.H.btn),
    i = pkPots(e.map((l) => ({ id: l.id, total: l.total, folded: l.folded }))),
    r = new Map();
  for (const l of i) {
    if (!l.elig.length) continue;
    const c = Math.max(...l.elig.map((p) => n.get(p)));
    let f = l.elig.filter((p) => n.get(p) === c).map((p) => e.find((d) => d.id === p));
    f.sort(
      (p, d) =>
        ((e.indexOf(p) - o - 1 + e.length) % e.length) - ((e.indexOf(d) - o - 1 + e.length) % e.length),
    );
    const m = Math.floor(l.amount / f.length);
    let u = l.amount - m * f.length;
    for (const p of f) {
      const d = m + (u > 0 ? 1 : 0);
      (u > 0 && u--, (p.stack += d), r.set(p.id, (r.get(p.id) || 0) + d));
    }
  }
  for (const l of e)
    r.has(l.id) &&
      ((l.won = r.get(l.id)),
      s.push({ pid: l.id, name: l.name, amount: l.won, hand: l.handName }),
      pkLog(`${l.name} vince ${pkMoney(l.won)}${l.handName ? " con " + l.handName : ""}.`));
  const top = Math.max(...s.map((x) => n.get(x.pid))),
    others = t.filter((x) => !s.some((y) => y.pid === x.id));
  for (const x of s) {
    const mine = n.get(x.pid),
      rival = others.length ? Math.max(...others.map((y) => n.get(y.id))) : null;
    x.why =
      s.length > 1 && mine === top && s.every((y) => n.get(y.pid) === top)
        ? "Stessa mano: il piatto si divide."
        : rival !== null && rival <= mine
          ? pkWhy(mine, rival)
          : "Vince il piatto laterale (side pot) a cui partecipava.";
  }
  PS.showdown = t.map((l) => ({
    pid: l.id,
    name: l.name,
    hole: l.hole.map((c) => ({ r: c.r, s: c.s })),
    best: l.best.map((c) => ({ r: c.r, s: c.s })),
    hand: l.handName,
    win: s.some((x) => x.pid === l.id),
    won: l.won || 0,
  }));
  return s;
}
async function pkHand(e) {
  PS.handNo++;
  for (const c of PS.players)
    ((c.hole = []),
      (c.streetBet = 0),
      (c.total = 0),
      (c.inv = {}),
      (c.folded = !e.includes(c)),
      (c.allIn = !1),
      (c.acted = !1),
      (c.canRaise = !0),
      (c.shown = !1),
      (c.last = ""),
      (c.won = 0),
      (c.handName = ""));
  ((PS.board = []), (PS.results = []), (PS.showdown = []), (PS.deck = pkShuffle(pkDeck())));
  const t = e.slice(),
    a = t.length;
  let s = -1;
  if (PS.H && PS.H.btn) {
    const c = PS.players.indexOf(PS.H.btn);
    for (let f = 1; f <= PS.players.length; f++) {
      const m = PS.players[(c + f) % PS.players.length];
      if (t.includes(m)) {
        s = t.indexOf(m);
        break;
      }
    }
  }
  s < 0 && (s = Math.floor(Math.random() * a));
  const n = t[s];
  PS.H = { ring: t, btn: n, turn: null, revealed: !1, pot: () => t.reduce((c, f) => c + f.total, 0) };
  const o = a === 2,
    i = o ? n : t[(s + 1) % a],
    r = o ? t[(s + 1) % a] : t[(s + 2) % a];
  ((PS.H.sbP = i),
    (PS.H.bbP = r),
    (PS.curBet = 0),
    (PS.minRaise = PS.bb),
    pkPost(i, PS.sb),
    pkPost(r, PS.bb),
    (PS.curBet = Math.max(i.streetBet, r.streetBet)),
    (PS.phase = "preflop"),
    pkLog(`\u2014 Mano ${PS.handNo} \xB7 bottone ${n.name} \u2014`),
    pkBroadcast(),
    await pkPause("deal"));
  for (let c = 0; c < 2; c++) for (let f = 1; f <= a; f++) t[(s + f) % a].hole.push(PS.deck.pop());
  (pkBroadcast(), await pkPause("deal"));
  const l = o ? t.indexOf(i) : (s + 3) % a;
  await pkBetRound(l);
  for (const c of ["flop", "turn", "river"]) {
    if (pkLive().length <= 1) break;
    (pkResetStreet(), PS.deck.pop());
    const f = c === "flop" ? 3 : 1;
    for (let u = 0; u < f; u++) PS.board.push(PS.deck.pop());
    PS.phase = c;
    const m = pkLive().filter((u) => !u.allIn);
    if (m.length < 2 && !PS.H.revealed) {
      PS.H.revealed = !0;
      for (const u of pkLive()) u.shown = !0;
    }
    (pkBroadcast(), await pkPause("street"), m.length >= 2 && (await pkBetRound((s + 1) % a)));
  }
  if (((PS.H.turn = null), (PS.phase = "showdown"), pkLive().length > 1))
    for (const c of pkLive()) c.shown = !0;
  ((PS.results = pkAward()), (PS.H.done = !0));
  for (const c of t) c.streetBet = 0;
  (pkBroadcast(), await pkPause("showdown"));
  for (const c of PS.players)
    !c.left &&
      !c.out &&
      c.stack === 0 &&
      ((c.out = !0), (c.outAt = ++PS.outSeq), pkLog(`${c.name} \xE8 eliminato.`));
  PS.phase = "between";
}
async function pkRun() {
  try {
    for (;;) {
      const e = PS.players.filter((t) => !t.left && !t.out && t.stack > 0);
      if (e.length < 2) {
        pkEnd(e.length === 1 ? `${e[0].name} ha vinto tutte le fiches!` : "Tutti hanno lasciato il tavolo.");
        return;
      }
      await pkHand(e);
    }
  } catch (e) {
    if (e !== PCANCEL) throw e;
  }
}
function pkSnap(e) {
  const t = PS.H,
    a = (i) => !!t && t.ring.includes(i) && PS.phase !== "lobby",
    s = (i) => ({ r: i.r, s: i.s }),
    n = PS.players
      .filter((i) => !i.left || PS.phase === "lobby")
      .map((i) => {
        let r = [];
        return (
          a(i) &&
            !i.folded &&
            (r = i.id === e.id || i.shown ? i.hole.map(s) : i.hole.map(() => ({ down: 1 }))),
          {
            pid: i.id,
            name: i.name,
            host: i.host,
            bot: i.bot,
            stack: i.stack,
            bet: i.streetBet,
            folded: a(i) ? i.folded : !1,
            allIn: i.allIn,
            out: i.out,
            dealer: !!t && t.btn === i,
            blind: t && t.sbP === i ? "SB" : t && t.bbP === i ? "BB" : "",
            cards: r,
            hand: i.shown && PS.phase === "showdown" ? i.handName : "",
            won: i.won || 0,
            last: i.last,
            inHand: a(i),
          }
        );
      }),
    o = e.ask;
  return {
    t: "pstate",
    code: PS.code,
    phase: PS.phase,
    handNo: PS.handNo,
    board: PS.board.map(s),
    pot: t ? t.pot() : 0,
    sb: PS.sb,
    bb: PS.bb,
    log: PS.log.slice(-6),
    seats: n,
    turn: t ? t.turn : null,
    results: PS.phase === "showdown" || PS.phase === "between" ? PS.results : [],
    showdown: PS.phase === "showdown" || PS.phase === "between" ? PS.showdown || [] : [],
    turnMs: o && o.deadline ? Math.max(0, o.deadline - Date.now()) : 0,
    ask: o ? { id: o.id, opts: o.opts } : null,
    cfg: { sb: PS.sb, bb: PS.bb, stack: PS.cfg.stack },
    started: PS.started,
    me: {
      pid: e.id,
      host: e.host,
      stack: e.stack,
      start: e.startStack,
      out: e.out,
      hole: a(e) && !e.folded ? e.hole.map(s) : [],
      inv: a(e) ? e.inv || {} : {},
      put: a(e) ? e.total : 0,
      won: e.won || 0,
      folded: a(e) ? e.folded : !0,
    },
  };
}
function pkBroadcast() {
  if (!(!PS || (PS.ended && !PS.finals)))
    for (const e of PS.players) !e.left && !e.bot && PS.io.send(e.id, pkSnap(e));
}
typeof module != "undefined" &&
  module.exports &&
  (module.exports = {
    pkEval,
    pkCat,
    pkName,
    pkDecode,
    pkSim,
    pkPots,
    pkDeck,
    pkRemaining,
    pkCreate,
    pkAdd,
    pkAddBots,
    pkStart,
    pkMsg,
    pkLeave,
    pkEnd,
    pkSnap,
    pkFinals,
    PUI,
    getPS: () => PS,
    P_CATS,
  });
const B_PTS = { 1: 11, 3: 10, 10: 4, 9: 3, 8: 2 },
  B_POW = { 1: 10, 3: 9, 10: 8, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 },
  B_SUITN = ["Denari", "Coppe", "Spade", "Bastoni"],
  B_FACE = { 1: "Asso", 8: "Fante", 9: "Cavallo", 10: "Re" },
  B_BOTNAMES = ["Marco", "Giulia", "Enrico", "Sara", "Franco", "Elena", "Dario", "Chiara"],
  B_TIMEOUT = 6e4,
  BCANCEL = { cancel: !0 },
  bV = (e) => (e % 10) + 1,
  bSuit = (e) => Math.floor(e / 10),
  bPts = (e) => B_PTS[bV(e)] || 0,
  bPow = (e) => B_POW[bV(e)],
  bName = (e) => `${B_FACE[bV(e)] || bV(e)} di ${B_SUITN[bSuit(e)]}`;
function bTrickWinner(e, t) {
  const a = bSuit(e[0].card);
  let s = 0;
  for (let n = 1; n < e.length; n++) {
    const o = e[n].card,
      i = e[s].card;
    bSuit(o) === t
      ? (bSuit(i) !== t || bPow(o) > bPow(i)) && (s = n)
      : bSuit(o) === a && bSuit(i) !== t && bPow(o) > bPow(i) && (s = n);
  }
  return s;
}
const BOT_ERR = { low: 0.45, mid: 0.1, high: 0 },
  botErr = (e) => (BOT_ERR[e] === void 0 ? BOT_ERR.mid : BOT_ERR[e]),
  botSlip = (e) => Math.random() < botErr(e);
function bBotChoose(e, t, a, s, n, o) {
  if (botSlip(o)) return e[Math.floor(Math.random() * e.length)];
  const i = (m) => bPts(m) + bPow(m) * 0.2 + (bSuit(m) === a ? 8 : 0),
    r = e.slice().sort((m, u) => i(m) - i(u));
  if (!t.length) return r[0];
  const l = t.reduce((m, u) => m + bPts(u.card), 0),
    c = t.length === s - 1;
  if (n) {
    if (c) {
      const m = e.filter((u) => bSuit(u) !== a && bPts(u) > 0).sort((u, p) => bPts(p) - bPts(u));
      if (m.length) return m[0];
    }
    return r[0];
  }
  const f = e.filter((m) => bTrickWinner(t.concat([{ card: m }]), a) === t.length);
  if (f.length) {
    const m = f.filter((p) => bSuit(p) !== a).sort((p, d) => i(p) - i(d));
    if (m.length && (l > 0 || bPts(m[0]) === 0)) return m[0];
    const u = f.filter((p) => bSuit(p) === a).sort((p, d) => i(p) - i(d));
    if (u.length && (l >= 10 || (l >= 4 && bPts(u[0]) <= 3) || (c && l >= 3))) return u[0];
  }
  return r[0];
}
let BR = null;
const BUI = {
    pause() {
      return Promise.resolve();
    },
  },
  bPause = async (e) => {
    const t = BR;
    if ((await BUI.pause(e), !BR || BR !== t || t.cancelled)) throw BCANCEL;
  },
  bShuffle = (e) => {
    for (let t = e.length - 1; t > 0; t--) {
      const a = Math.floor(Math.random() * (t + 1)),
        s = e[t];
      ((e[t] = e[a]), (e[a] = s));
    }
    return e;
  };
function bClean(e, t) {
  const a =
    String(e || "")
      .replace(/[^\p{L}\p{N} _.\-]/gu, "")
      .trim()
      .slice(0, 14) || "Giocatore";
  let s = a,
    n = 2;
  for (; t.includes(s);) s = a + " " + n++;
  return s;
}
function brCreate(e, t) {
  const a = [2, 3, 4].includes(e.mode) ? e.mode : 2;
  return (
    (BR = {
      cfg: Object.assign({ rounds: 1, timeout: B_TIMEOUT, code: "" }, e, { mode: a }),
      mode: a,
      io: t,
      code: e.code || "",
      players: [],
      seq: 0,
      askSeq: 0,
      started: !1,
      ended: !1,
      cancelled: !1,
      finals: null,
      reason: "",
      phase: "lobby",
      round: 0,
      deck: [],
      trump: -1,
      trumpSuit: -1,
      table: [],
      turn: null,
      dealer: -1,
      leader: 0,
      log: [],
      lastTrick: null,
      seen: [],
      roundRes: null,
      over: !1,
    }),
    BR
  );
}
const bTeamOf = (e, t) => (BR.mode === 4 ? t % 2 : t);
function brAdd(e, t, a, s) {
  if (BR.started) return { err: "La partita \xE8 gi\xE0 iniziata." };
  if (BR.players.length >= BR.mode) return { err: "Il tavolo \xE8 pieno." };
  const n = {
    id: a || "p" + ++BR.seq,
    name: bClean(
      e,
      BR.players.map((o) => o.name),
    ),
    host: !!t,
    bot: !!s,
    human: !s,
    hand: [],
    pile: [],
    wins: 0,
    total: 0,
    ask: null,
    timeouts: 0,
    left: !1,
  };
  return (BR.players.push(n), brBroadcast(), { p: n });
}
function brFillBots() {
  const e = bShuffle(B_BOTNAMES.slice().filter((a) => !BR.players.some((s) => s.name === a)));
  let t = 0;
  for (; BR.players.length < BR.mode;) brAdd(e[t++], !1, "b" + ++BR.seq, !0);
}
const bLog = (e) => {
  (BR.log.push(e), BR.log.length > 30 && BR.log.shift());
};
function bScores() {
  const e = BR.players.length,
    t = BR.mode === 4 ? 2 : e,
    a = new Array(t).fill(0);
  return (
    BR.players.forEach((s, n) => {
      a[bTeamOf(s, n)] += s.pile.reduce((o, i) => o + bPts(i), 0);
    }),
    a
  );
}
function brFinals() {
  const e = BR.mode === 4 ? 2 : BR.players.length,
    t = BR.players.map((n, o) => ({
      name: n.name,
      host: n.host,
      bot: n.bot,
      human: n.human,
      team: bTeamOf(n, o),
      wins: n.wins,
      pts: n.total,
    })),
    a = (n) => n.wins * 1e5 + n.pts,
    s = t
      .map((n) => a(n))
      .filter((n, o, i) => i.indexOf(n) === o)
      .sort((n, o) => o - n);
  return (
    t.forEach((n) => {
      n.place = s.indexOf(a(n)) + 1;
    }),
    t.sort((n, o) => n.place - o.place)
  );
}
function brEnd(e) {
  if (!(!BR || BR.ended)) {
    ((BR.ended = !0), (BR.cancelled = !0), (BR.reason = e), (BR.finals = brFinals()));
    for (const t of BR.players)
      (t.ask && t.ask.resolve(t.ask.def),
        t.human && !t.left && !t.bot && BR.io.send(t.id, { t: "bend", reason: e, finals: BR.finals }));
  }
}
function bToBot(e, t) {
  ((e.bot = !0),
    (e.left = !0),
    /\(bot\)$/.test(e.name) || (e.name = e.name.slice(0, 8) + " (bot)"),
    bLog(t),
    e.ask && e.ask.resolve(e.ask.def));
}
function brLeave(e) {
  if (!BR || BR.ended) return;
  const t = BR.players.find((a) => a.id === e);
  if (!(!t || t.left)) {
    if (t.host) {
      brEnd("Chi ha creato la stanza ha chiuso il tavolo.");
      return;
    }
    if (!BR.started) {
      (BR.players.splice(BR.players.indexOf(t), 1),
        BR.io.send(t.id, { t: "bbye", finals: [] }),
        brBroadcast());
      return;
    }
    (bToBot(t, `${t.name} lascia il tavolo: gioca un bot al suo posto.`),
      BR.io.send(t.id, { t: "bbye", finals: brFinals() }),
      brBroadcast());
  }
}
function brMsg(e, t) {
  if (!BR || !t || BR.ended) return;
  const a = BR.players.find((s) => s.id === e && !s.left);
  if (a)
    if (t.t === "ans") {
      const s = a.ask;
      s && s.id === t.id && ((a.timeouts = 0), s.resolve(s.fix(t.v)));
    } else t.t === "leave" && brLeave(e);
}
function brStart() {
  return BR.started || BR.ended
    ? !1
    : (brFillBots(),
      (BR.started = !0),
      brRun().catch((e) => {
        (console.error(e), bLog("Errore: " + e.message), brBroadcast());
      }),
      !0);
}
function bAsk(e, t, a) {
  return new Promise((s) => {
    if (e.left || BR.ended) {
      s(t);
      return;
    }
    const n = {
      id: ++BR.askSeq,
      def: t,
      fix: a,
      timer: null,
      deadline: BR.cfg.timeout ? Date.now() + BR.cfg.timeout : 0,
      resolve: (o) => {
        e.ask === n && (clearTimeout(n.timer), (e.ask = null), s(o));
      },
    };
    ((e.ask = n),
      BR.cfg.timeout &&
        (n.timer = setTimeout(() => {
          e.ask === n && (e.timeouts++, n.resolve(t));
        }, BR.cfg.timeout)),
      brBroadcast());
  }).then((s) => {
    if (BR.cancelled) throw BCANCEL;
    return s;
  });
}
async function bPlayCard(e, t) {
  const a = BR.trumpSuit,
    s = (i) => bPts(i) + bPow(i) * 0.2 + (bSuit(i) === a ? 8 : 0),
    n = e.hand.slice().sort((i, r) => s(i) - s(r))[0];
  let o;
  if (((BR.turn = e.id), e.bot)) {
    await bPause("bot");
    let i = !1;
    if (BR.mode === 4 && BR.table.length) {
      const r = bTrickWinner(BR.table, a),
        l = BR.players.find((c) => c.id === BR.table[r].pid);
      i = BR.players.indexOf(l) % 2 === t % 2;
    }
    o = bBotChoose(e.hand, BR.table, a, BR.mode, i, BR.cfg.diff);
  } else
    ((o = await bAsk(e, n, (i) => (Number.isInteger(i) && e.hand.includes(i) ? i : n))),
      e.timeouts >= 3 &&
        !e.left &&
        !e.bot &&
        (bToBot(e, `${e.name} non risponde: gioca un bot al suo posto.`),
        BR.io.send(e.id, { t: "bbye", finals: brFinals() })));
  (e.hand.includes(o) || (o = n),
    e.hand.splice(e.hand.indexOf(o), 1),
    BR.table.push({ pid: e.id, card: o }),
    BR.seen.push(o),
    (BR.turn = null),
    brBroadcast(),
    await bPause("card"));
}
async function bRound() {
  const e = BR.players.length;
  (BR.round++, (BR.table = []), (BR.lastTrick = null), (BR.roundRes = null), (BR.seen = []));
  const t = bShuffle(Array.from({ length: 40 }, (c, f) => f));
  (e === 3 && t.splice(t.indexOf(1), 1),
    (BR.deck = t),
    (BR.trump = t[0]),
    (BR.trumpSuit = bSuit(t[0])),
    BR.seen.push(BR.trump));
  for (const c of BR.players) ((c.hand = []), (c.pile = []));
  ((BR.dealer = (BR.dealer + 1) % e),
    (BR.phase = "deal"),
    bLog(`\u2014 Mano ${BR.round} \xB7 briscola: ${bName(BR.trump)} \u2014`));
  for (let c = 0; c < 3; c++)
    for (let f = 1; f <= e; f++) BR.players[(BR.dealer + f) % e].hand.push(BR.deck.pop());
  (brBroadcast(), await bPause("deal"));
  let a = (BR.dealer + 1) % e;
  for (BR.phase = "play"; BR.players.some((c) => c.hand.length);) {
    BR.table = [];
    for (let d = 0; d < e; d++) {
      const h = (a + d) % e;
      await bPlayCard(BR.players[h], h);
    }
    const c = bTrickWinner(BR.table, BR.trumpSuit),
      f = BR.table[c].pid,
      m = BR.players.find((d) => d.id === f),
      u = BR.players.indexOf(m),
      p = BR.table.reduce((d, h) => d + bPts(h.card), 0);
    (m.pile.push(...BR.table.map((d) => d.card)),
      (BR.lastTrick = { pid: m.id, name: m.name, pts: p, cards: BR.table.map((d) => d.card) }),
      bLog(`${m.name} prende${p ? ` ${p} punt${p === 1 ? "o" : "i"}` : ""}.`),
      (BR.phase = "trick"),
      brBroadcast(),
      await bPause("trick"),
      (BR.table = []),
      (BR.phase = "play"));
    for (let d = 0; d < e && BR.deck.length; d++) BR.players[(u + d) % e].hand.push(BR.deck.pop());
    ((a = u), brBroadcast());
  }
  const s = bScores(),
    n = s.length,
    o = 120,
    i = Math.max(...s),
    r = s.map((c, f) => (c === i ? f : -1)).filter((c) => c >= 0),
    l = e === 2 || BR.mode === 4 ? s[0] === s[1] : r.length > 1;
  (BR.players.forEach((c, f) => {
    const m = bTeamOf(c, f);
    ((c.total += s[m]), !l && r.includes(m) && c.wins++);
  }),
    (BR.roundRes = {
      pts: s,
      drawn: l,
      winners: l ? [] : r,
      teams: n,
      mode: BR.mode,
      round: BR.round,
      rounds: BR.cfg.rounds,
    }),
    (BR.phase = "roundEnd"),
    bLog(
      l ? "Mano pari." : BR.mode === 4 ? `Vince la coppia ${r[0] + 1}.` : `Vince ${BR.players[r[0]].name}.`,
    ),
    brBroadcast(),
    await bPause("round"));
}
async function brRun() {
  try {
    for (;;)
      if ((await bRound(), BR.round >= BR.cfg.rounds)) {
        BR.phase = "over";
        const e = brFinals().filter((t) => t.place === 1);
        brEnd(new Set(e.map((t) => t.team)).size > 1 ? "Partita finita: pareggio." : "Partita finita.");
        return;
      }
  } catch (e) {
    if (e !== BCANCEL) throw e;
  }
}
function brSnap(e) {
  const t = BR.players.length,
    a = BR.players.indexOf(e),
    s = bTeamOf(e, a),
    n = BR.players.reduce(
      (i, r, l) => i + (bTeamOf(r, l) === s ? r.pile.reduce((c, f) => c + bPts(f), 0) : 0),
      0,
    ),
    o = e.ask;
  return {
    t: "bstate",
    code: BR.code,
    started: BR.started,
    phase: BR.phase,
    mode: BR.mode,
    round: BR.round,
    rounds: BR.cfg.rounds,
    seats: BR.players.map((i, r) => ({
      pid: i.id,
      name: i.name,
      host: i.host,
      bot: i.bot,
      team: bTeamOf(i, r),
      cards: i.hand.length,
      dealer: r === BR.dealer,
      turn: BR.turn === i.id,
      wins: i.wins,
      total: i.total,
    })),
    me: { pid: e.id, seat: a, team: s, hand: e.hand.slice(), pts: n, wins: e.wins },
    table: BR.table.map((i) => ({ pid: i.pid, card: i.card })),
    trump: BR.deck.length ? BR.trump : -1,
    trumpSuit: BR.trumpSuit,
    deckLeft: BR.deck.length,
    turn: BR.turn,
    lastTrick: BR.lastTrick,
    seen: BR.seen.slice(),
    roundRes: BR.roundRes,
    log: BR.log.slice(-5),
    ask: o ? { id: o.id } : null,
    turnMs: o && o.deadline ? Math.max(0, o.deadline - Date.now()) : 0,
  };
}
function brBroadcast() {
  if (!(!BR || (BR.ended && !BR.finals)))
    for (const e of BR.players) e.human && !e.left && !e.bot && BR.io.send(e.id, brSnap(e));
}
typeof module != "undefined" &&
  module.exports &&
  (module.exports = {
    bTrickWinner,
    bBotChoose,
    bPts,
    bPow,
    bSuit,
    bV,
    bName,
    brCreate,
    brAdd,
    brStart,
    brMsg,
    brLeave,
    brEnd,
    brSnap,
    brFinals,
    BUI,
    getBR: () => BR,
  });
const SC_PRIM = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 },
  SC_SETTE = 6,
  SC_TIMEOUT = 6e4,
  SCANCEL = { cancel: !0 },
  scIsDen = (e) => bSuit(e) === 0;
function scOptions(e, t) {
  const a = bV(e),
    s = t.filter((i) => bV(i) === a);
  if (s.length) return s.map((i) => [i]);
  const n = [],
    o = t.length;
  for (let i = 1; i < 1 << o; i++) {
    let r = 0,
      l = !0;
    const c = [];
    for (let f = 0; f < o; f++)
      if (i & (1 << f)) {
        if (((r += bV(t[f])), r > a)) {
          l = !1;
          break;
        }
        c.push(t[f]);
      }
    l && r === a && n.push(c);
  }
  return n;
}
const scSame = (e, t) => e.length === t.length && e.every((a) => t.includes(a));
function scPrim(e) {
  let t = 0;
  for (let a = 0; a < 4; a++) {
    const s = Math.max(0, ...e.filter((n) => bSuit(n) === a).map((n) => SC_PRIM[bV(n)]));
    if (!s) return 0;
    t += s;
  }
  return t;
}
function scBotMoves(e, t) {
  const a = [];
  for (const s of e) {
    const n = scOptions(s, t);
    n.length ? n.forEach((o) => a.push({ card: s, take: o })) : a.push({ card: s, take: [] });
  }
  return a;
}
const SC_NOISE = { low: 7, mid: 0.4, high: 0.05 };
function scBotChoose(e, t, a, s) {
  let n = null,
    o = -1e9;
  const i = SC_NOISE[s] === void 0 ? SC_NOISE.mid : SC_NOISE[s];
  for (const r of scBotMoves(e, t)) {
    let l = Math.random() * i;
    const c = bV(r.card);
    if (r.take.length) {
      const f = r.take.concat(r.card);
      l += f.length;
      for (const u of f)
        (u === SC_SETTE && (l += 9),
          scIsDen(u) && (l += 1.6),
          bV(u) === 7 ? (l += 2) : (bV(u) === 6 || bV(u) === 1) && (l += 1));
      const m = t.filter((u) => !r.take.includes(u));
      m.length ? m.reduce((u, p) => u + bV(p), 0) <= 10 && (l -= 2.5) : (l += a ? 0 : 8);
    } else
      (r.card === SC_SETTE && (l -= 10),
        scIsDen(r.card) && (l -= 1.5),
        c === 7 ? (l -= 3) : (c === 6 || c === 1) && (l -= 1),
        (l -= c * 0.05),
        t.reduce((m, u) => m + bV(u), 0) + c <= 10 && (l -= 3));
    l > o && ((o = l), (n = r));
  }
  return n;
}
let SCG = null;
const SUI = {
    pause() {
      return Promise.resolve();
    },
  },
  scPause = async (e) => {
    const t = SCG;
    if ((await SUI.pause(e), !SCG || SCG !== t || t.cancelled)) throw SCANCEL;
  },
  scTeam = (e) => (SCG.mode === 4 ? e % 2 : e);
function scCreate(e, t) {
  const a = [2, 3, 4].includes(e.mode) ? e.mode : 2,
    s = a === 4 ? 2 : a;
  return (
    (SCG = {
      cfg: Object.assign({ target: 11, timeout: SC_TIMEOUT, code: "" }, e, { mode: a }),
      mode: a,
      io: t,
      code: e.code || "",
      players: [],
      seq: 0,
      askSeq: 0,
      started: !1,
      ended: !1,
      cancelled: !1,
      finals: null,
      reason: "",
      phase: "lobby",
      round: 0,
      deck: [],
      table: [],
      turn: null,
      dealer: -1,
      lastCap: -1,
      move: null,
      log: [],
      seen: [],
      roundRes: null,
      totals: new Array(s).fill(0),
      handWins: new Array(s).fill(0),
    }),
    SCG
  );
}
function scAdd(e, t, a, s) {
  if (SCG.started) return { err: "La partita \xE8 gi\xE0 iniziata." };
  if (SCG.players.length >= SCG.mode) return { err: "Il tavolo \xE8 pieno." };
  const n = {
    id: a || "p" + ++SCG.seq,
    name: bClean(
      e,
      SCG.players.map((o) => o.name),
    ),
    host: !!t,
    bot: !!s,
    human: !s,
    hand: [],
    pile: [],
    scope: 0,
    ask: null,
    timeouts: 0,
    left: !1,
  };
  return (SCG.players.push(n), scBroadcast(), { p: n });
}
function scFillBots() {
  const e = bShuffle(B_BOTNAMES.slice().filter((a) => !SCG.players.some((s) => s.name === a)));
  let t = 0;
  for (; SCG.players.length < SCG.mode;) scAdd(e[t++], !1, "b" + ++SCG.seq, !0);
}
const scLog = (e) => {
  (SCG.log.push(e), SCG.log.length > 30 && SCG.log.shift());
};
function scFinals() {
  const e = SCG.players.map((a, s) => ({
      name: a.name,
      host: a.host,
      bot: a.bot,
      human: a.human,
      team: scTeam(s),
      pts: SCG.totals[scTeam(s)],
      hands: SCG.handWins[scTeam(s)],
    })),
    t = e
      .map((a) => a.pts)
      .filter((a, s, n) => n.indexOf(a) === s)
      .sort((a, s) => s - a);
  return (
    e.forEach((a) => {
      a.place = t.indexOf(a.pts) + 1;
    }),
    e.sort((a, s) => a.place - s.place)
  );
}
function scEnd(e) {
  if (!(!SCG || SCG.ended)) {
    ((SCG.ended = !0), (SCG.cancelled = !0), (SCG.reason = e), (SCG.finals = scFinals()));
    for (const t of SCG.players)
      (t.ask && t.ask.resolve(t.ask.def),
        t.human && !t.left && !t.bot && SCG.io.send(t.id, { t: "send", reason: e, finals: SCG.finals }));
  }
}
function scToBot(e, t) {
  ((e.bot = !0),
    (e.left = !0),
    /\(bot\)$/.test(e.name) || (e.name = e.name.slice(0, 8) + " (bot)"),
    scLog(t),
    e.ask && e.ask.resolve(e.ask.def));
}
function scLeave(e) {
  if (!SCG || SCG.ended) return;
  const t = SCG.players.find((a) => a.id === e);
  if (!(!t || t.left)) {
    if (t.host) {
      scEnd("Chi ha creato la stanza ha chiuso il tavolo.");
      return;
    }
    if (!SCG.started) {
      (SCG.players.splice(SCG.players.indexOf(t), 1),
        SCG.io.send(t.id, { t: "sbye", finals: [] }),
        scBroadcast());
      return;
    }
    (scToBot(t, `${t.name} lascia il tavolo: gioca un bot al suo posto.`),
      SCG.io.send(t.id, { t: "sbye", finals: scFinals() }),
      scBroadcast());
  }
}
function scMsg(e, t) {
  if (!SCG || !t || SCG.ended) return;
  const a = SCG.players.find((s) => s.id === e && !s.left);
  if (a)
    if (t.t === "ans") {
      const s = a.ask;
      s && s.id === t.id && ((a.timeouts = 0), s.resolve(s.fix(t.v)));
    } else t.t === "leave" && scLeave(e);
}
function scStart() {
  return SCG.started || SCG.ended
    ? !1
    : (scFillBots(),
      (SCG.started = !0),
      scRun().catch((e) => {
        (console.error(e), scLog("Errore: " + e.message), scBroadcast());
      }),
      !0);
}
function scAsk(e, t, a) {
  const s = SCG;
  return new Promise((n) => {
    if (e.left || SCG.ended) {
      n(t);
      return;
    }
    const o = {
      id: ++SCG.askSeq,
      def: t,
      fix: a,
      timer: null,
      deadline: SCG.cfg.timeout ? Date.now() + SCG.cfg.timeout : 0,
      resolve: (i) => {
        e.ask === o && (clearTimeout(o.timer), (e.ask = null), n(i));
      },
    };
    ((e.ask = o),
      SCG.cfg.timeout &&
        (o.timer = setTimeout(() => {
          e.ask === o && (e.timeouts++, o.resolve(t));
        }, SCG.cfg.timeout)),
      scBroadcast());
  }).then((n) => {
    if (s.cancelled || s !== SCG) throw SCANCEL;
    return n;
  });
}
const scLastPlay = () => SCG.deck.length === 0 && SCG.players.every((e) => !e.hand.length);
async function scTurn(e) {
  const t = SCG.players[e],
    a = SCG.table.slice(),
    s = scBotChoose(t.hand, a, !1);
  let n;
  ((SCG.turn = t.id),
    t.bot
      ? (await scPause("bot"),
        (n = scBotChoose(
          t.hand,
          a,
          t.hand.length === 1 && SCG.deck.length === 0 && SCG.players.every((r) => r === t || !r.hand.length),
          SCG.cfg.diff,
        )))
      : ((n = await scAsk(t, s, (r) => {
          if (!r || !Number.isInteger(r.card) || !t.hand.includes(r.card)) return s;
          const l = scOptions(r.card, a),
            c = Array.isArray(r.take) ? r.take.filter(Number.isInteger) : [],
            f = l.length ? l.find((m) => scSame(m, c)) || l[0] : [];
          return { card: r.card, take: f };
        })),
        t.timeouts >= 3 &&
          !t.left &&
          !t.bot &&
          (scToBot(t, `${t.name} non risponde: gioca un bot al suo posto.`),
          SCG.io.send(t.id, { t: "sbye", finals: scFinals() }))),
    (!n || !t.hand.includes(n.card)) && (n = s));
  const o = n.card,
    i = n.take;
  if ((t.hand.splice(t.hand.indexOf(o), 1), SCG.seen.push(o), (SCG.turn = null), i.length)) {
    const r = SCG.table.filter((c) => !i.includes(c)),
      l = !r.length && !scLastPlay();
    ((SCG.move = { pid: t.id, name: t.name, card: o, take: i.slice(), scopa: l }),
      SCG.table.push(o),
      (SCG.phase = "take"),
      scBroadcast(),
      await scPause(l ? "scopa" : "take"),
      (SCG.table = r),
      t.pile.push(...i, o),
      l ? (t.scope++, scLog(`${t.name} fa scopa!`)) : scLog(`${t.name} prende ${i.length + 1} carte.`),
      (SCG.lastCap = e),
      (SCG.phase = "play"),
      scBroadcast());
  } else
    ((SCG.move = { pid: t.id, name: t.name, card: o, take: [], scopa: !1 }),
      SCG.table.push(o),
      scLog(`${t.name} posa ${bName(o)}.`),
      scBroadcast(),
      await scPause("card"));
}
function scScoreHand() {
  const e = SCG.totals.length,
    t = Array.from({ length: e }, () => ({ cards: [], scope: 0 }));
  SCG.players.forEach((n, o) => {
    const i = t[scTeam(o)];
    (i.cards.push(...n.pile), (i.scope += n.scope));
  });
  const a = t.map((n) => ({
      cards: n.cards.length,
      denari: n.cards.filter(scIsDen).length,
      sette: n.cards.includes(SC_SETTE),
      prim: scPrim(n.cards),
      scope: n.scope,
      got: {},
      pts: 0,
    })),
    s = (n, o) => {
      const i = Math.max(...a.map(o));
      if (i <= 0) return;
      const r = a.filter((l) => o(l) === i);
      r.length === 1 && ((r[0].got[n] = !0), r[0].pts++);
    };
  return (
    s("cards", (n) => n.cards),
    s("denari", (n) => n.denari),
    s("sette", (n) => (n.sette ? 1 : 0)),
    s("prim", (n) => n.prim),
    a.forEach((n) => {
      n.pts += n.scope;
    }),
    a
  );
}
async function scRound() {
  const e = SCG.players.length;
  (SCG.round++,
    (SCG.table = []),
    (SCG.move = null),
    (SCG.roundRes = null),
    (SCG.seen = []),
    (SCG.lastCap = -1));
  let t;
  do ((t = bShuffle(Array.from({ length: 40 }, (l, c) => c))), (SCG.table = t.splice(0, 4)));
  while (SCG.table.filter((l) => bV(l) === 10).length >= 3);
  ((SCG.deck = t), SCG.seen.push(...SCG.table));
  for (const l of SCG.players) ((l.hand = []), (l.pile = []), (l.scope = 0));
  ((SCG.dealer = (SCG.dealer + 1) % e), scLog(`\u2014 Mano ${SCG.round} \u2014`));
  const a = (SCG.dealer + 1) % e;
  for (; SCG.deck.length;) {
    SCG.phase = "deal";
    for (let l = 0; l < 3; l++)
      for (let c = 0; c < e; c++) SCG.players[(a + c) % e].hand.push(SCG.deck.pop());
    (scBroadcast(), await scPause("deal"), (SCG.phase = "play"));
    for (let l = 0; l < 3; l++) for (let c = 0; c < e; c++) await scTurn((a + c) % e);
  }
  (SCG.table.length &&
    SCG.lastCap >= 0 &&
    (SCG.players[SCG.lastCap].pile.push(...SCG.table),
    scLog(`${SCG.players[SCG.lastCap].name} prende le carte rimaste.`)),
    (SCG.table = []),
    (SCG.move = null));
  const s = scScoreHand();
  s.forEach((l, c) => {
    SCG.totals[c] += l.pts;
  });
  const n = Math.max(...s.map((l) => l.pts)),
    o = s.filter((l) => l.pts === n);
  o.length === 1 && SCG.handWins[s.indexOf(o[0])]++;
  const i = SCG.totals.slice().sort((l, c) => c - l),
    r = i[0] >= SCG.cfg.target && i[0] > (i[1] === void 0 ? -1 : i[1]);
  return (
    (SCG.roundRes = {
      round: SCG.round,
      rows: s,
      totals: SCG.totals.slice(),
      target: SCG.cfg.target,
      mode: SCG.mode,
      over: r,
    }),
    (SCG.phase = "roundEnd"),
    scLog(`Fine mano ${SCG.round}.`),
    scBroadcast(),
    await scPause("round"),
    r
  );
}
async function scRun() {
  try {
    for (;;)
      if (await scRound()) {
        ((SCG.phase = "over"), scEnd("Partita finita."));
        return;
      }
  } catch (e) {
    if (e !== SCANCEL) throw e;
  }
}
function scSnap(e) {
  const t = SCG.players.indexOf(e),
    a = scTeam(t),
    s = e.ask,
    n = SCG.players.filter((o, i) => scTeam(i) === a);
  return {
    t: "sstate",
    code: SCG.code,
    started: SCG.started,
    phase: SCG.phase,
    mode: SCG.mode,
    round: SCG.round,
    target: SCG.cfg.target,
    seats: SCG.players.map((o, i) => ({
      pid: o.id,
      name: o.name,
      host: o.host,
      bot: o.bot,
      team: scTeam(i),
      cards: o.hand.length,
      dealer: i === SCG.dealer,
      turn: SCG.turn === o.id,
      scope: o.scope,
      taken: o.pile.length,
    })),
    me: {
      pid: e.id,
      seat: t,
      team: a,
      hand: e.hand.slice(),
      pile: [].concat(...n.map((o) => o.pile)),
      scope: n.reduce((o, i) => o + i.scope, 0),
      total: SCG.totals[a],
    },
    totals: SCG.totals.slice(),
    table: SCG.table.slice(),
    deckLeft: SCG.deck.length,
    turn: SCG.turn,
    move: SCG.move,
    seen: SCG.seen.slice(),
    roundRes: SCG.roundRes,
    log: SCG.log.slice(-5),
    ask: s ? { id: s.id } : null,
    turnMs: s && s.deadline ? Math.max(0, s.deadline - Date.now()) : 0,
  };
}
function scBroadcast() {
  if (!(!SCG || (SCG.ended && !SCG.finals)))
    for (const e of SCG.players) e.human && !e.left && !e.bot && SCG.io.send(e.id, scSnap(e));
}
typeof module != "undefined" &&
  module.exports &&
  (module.exports = {
    scOptions,
    scPrim,
    scBotChoose,
    scCreate,
    scAdd,
    scStart,
    scMsg,
    scLeave,
    scEnd,
    scSnap,
    scFinals,
    SUI,
    getSC: () => SCG,
  });
const BI_SEQ = [5, 4, 3, 2, 1],
  BI_ACE = 0,
  BICANCEL = { cancel: !0 },
  BI_TIMEOUT = 6e4,
  biPow = (e) => (3 - bSuit(e)) * 10 + bV(e) - 1,
  biEff = (e) => (e.card === BI_ACE ? (e.ace === "min" ? -1 : 100) : biPow(e.card));
function biTrickWinner(e) {
  let t = 0;
  for (let a = 1; a < e.length; a++) biEff(e[a]) > biEff(e[t]) && (t = a);
  return t;
}
function biBotBid(e, t, a, s) {
  let n = 0;
  for (const i of e) n += i === BI_ACE ? 0.6 : Math.pow((biPow(i) + 1) / 40, t - 1);
  s === "low" ? (n += (Math.random() - 0.5) * 2.4) : s !== "high" && (n += (Math.random() - 0.5) * 0.7);
  let o = Math.max(0, Math.min(e.length, Math.round(n)));
  if (o === a) {
    const i = [o - 1, o + 1].filter((r) => r >= 0 && r <= e.length);
    (i.sort((r, l) => Math.abs(n - r) - Math.abs(n - l)), (o = i[0]));
  }
  return o;
}
function biBotBid1(e, t, a) {
  const s = [];
  for (let r = 0; r < 40; r++) e.includes(r) || s.push(r);
  const n = Math.max(-2, ...e.map((r) => (r === BI_ACE ? 100 : biPow(r))));
  let i = s.filter((r) => r === BI_ACE || biPow(r) > n).length / s.length > 0.5 ? 1 : 0;
  return (botSlip(a) && (i = 1 - i), i === t && (i = 1 - i), i);
}
function biBotPlay(e, t, a, s) {
  const n = [];
  for (const l of e)
    l === BI_ACE ? n.push({ card: l, ace: "max" }, { card: l, ace: "min" }) : n.push({ card: l });
  n.sort((l, c) => biEff(l) - biEff(c));
  const o = t.length ? Math.max(...t.map(biEff)) : -2,
    i = (l) => biEff(l) > o;
  if (a > 0) {
    if (a >= s) return n[n.length - 1];
    if (t.length) {
      const l = n.filter(i);
      return l.length ? l[0] : n.find((c) => c.card !== BI_ACE) || n[0];
    }
    return n[n.length - 1];
  }
  const r = n.filter((l) => !i(l));
  return r.length ? r[r.length - 1] : n[0];
}
let BI = null;
const BIUI = {
    pause() {
      return Promise.resolve();
    },
  },
  biPause = async (e) => {
    const t = BI;
    if ((await BIUI.pause(e), !BI || BI !== t || t.cancelled)) throw BICANCEL;
  };
function biCreate(e, t) {
  const a = Math.max(2, Math.min(8, e.mode | 0 || 2));
  return (
    (BI = {
      cfg: Object.assign({ lives: 3, loss: "diff", timeout: BI_TIMEOUT, code: "" }, e, { mode: a }),
      mode: a,
      io: t,
      code: e.code || "",
      players: [],
      seq: 0,
      askSeq: 0,
      started: !1,
      ended: !1,
      cancelled: !1,
      finals: null,
      reason: "",
      phase: "lobby",
      round: 0,
      cards: 0,
      dealer: -1,
      table: [],
      turn: null,
      leader: null,
      log: [],
      seen: [],
      roundRes: null,
      trick: null,
    }),
    BI
  );
}
function biAdd(e, t, a, s) {
  if (BI.started) return { err: "La partita \xE8 gi\xE0 iniziata." };
  if (BI.players.length >= BI.mode) return { err: "Il tavolo \xE8 pieno." };
  const n = {
    id: a || "p" + ++BI.seq,
    name: bClean(
      e,
      BI.players.map((o) => o.name),
    ),
    host: !!t,
    bot: !!s,
    human: !s,
    hand: [],
    lives: BI.cfg.lives,
    bid: -1,
    won: 0,
    out: !1,
    outAt: 0,
    ask: null,
    timeouts: 0,
    left: !1,
  };
  return (BI.players.push(n), biBroadcast(), { p: n });
}
function biFillBots() {
  const e = bShuffle(B_BOTNAMES.slice().filter((a) => !BI.players.some((s) => s.name === a)));
  let t = 0;
  for (; BI.players.length < BI.mode;) biAdd(e[t++], !1, "b" + ++BI.seq, !0);
}
const biLog = (e) => {
  (BI.log.push(e), BI.log.length > 30 && BI.log.shift());
};
function biFinals() {
  const e = (s) => (s.out ? s.outAt : 1e6 + s.lives),
    t = BI.players.map((s) => ({
      name: s.name,
      host: s.host,
      bot: s.bot,
      human: s.human,
      lives: s.lives,
      out: s.out,
      k: e(s),
    })),
    a = t
      .map((s) => s.k)
      .filter((s, n, o) => o.indexOf(s) === n)
      .sort((s, n) => n - s);
  return (
    t.forEach((s) => {
      ((s.place = a.indexOf(s.k) + 1), delete s.k);
    }),
    t.sort((s, n) => s.place - n.place)
  );
}
function biEnd(e) {
  if (!(!BI || BI.ended)) {
    ((BI.ended = !0), (BI.cancelled = !0), (BI.reason = e), (BI.finals = biFinals()));
    for (const t of BI.players)
      (t.ask && t.ask.resolve(t.ask.def),
        t.human && !t.left && !t.bot && BI.io.send(t.id, { t: "ixend", reason: e, finals: BI.finals }));
  }
}
function biToBot(e, t) {
  ((e.bot = !0),
    (e.left = !0),
    /\(bot\)$/.test(e.name) || (e.name = e.name.slice(0, 8) + " (bot)"),
    biLog(t),
    e.ask && e.ask.resolve(e.ask.def));
}
function biLeave(e) {
  if (!BI || BI.ended) return;
  const t = BI.players.find((a) => a.id === e);
  if (!(!t || t.left)) {
    if (t.host) {
      biEnd("Chi ha creato la stanza ha chiuso il tavolo.");
      return;
    }
    if (!BI.started) {
      (BI.players.splice(BI.players.indexOf(t), 1),
        BI.io.send(t.id, { t: "ixbye", finals: [] }),
        biBroadcast());
      return;
    }
    (biToBot(t, `${t.name} lascia il tavolo: gioca un bot al suo posto.`),
      BI.io.send(t.id, { t: "ixbye", finals: biFinals() }),
      biBroadcast());
  }
}
function biMsg(e, t) {
  if (!BI || !t || BI.ended) return;
  const a = BI.players.find((s) => s.id === e && !s.left);
  if (a)
    if (t.t === "ans") {
      const s = a.ask;
      s && s.id === t.id && ((a.timeouts = 0), s.resolve(s.fix(t.v)));
    } else t.t === "leave" && biLeave(e);
}
function biStart() {
  return BI.started || BI.ended || BI.players.length < 1
    ? !1
    : (biFillBots(),
      (BI.started = !0),
      biRun().catch((e) => {
        (console.error(e), biLog("Errore: " + e.message), biBroadcast());
      }),
      !0);
}
function biAsk(e, t, a, s, n) {
  const o = BI;
  return new Promise((i) => {
    if (e.left || BI.ended) {
      i(s);
      return;
    }
    const r = Object.assign(
      {
        id: ++BI.askSeq,
        kind: t,
        def: s,
        fix: n,
        timer: null,
        deadline: BI.cfg.timeout ? Date.now() + BI.cfg.timeout : 0,
        resolve: (l) => {
          e.ask === r && (clearTimeout(r.timer), (e.ask = null), i(l));
        },
      },
      a,
    );
    ((e.ask = r),
      BI.cfg.timeout &&
        (r.timer = setTimeout(() => {
          e.ask === r && (e.timeouts++, r.resolve(s));
        }, BI.cfg.timeout)),
      biBroadcast());
  }).then((i) => {
    if (o.cancelled || o !== BI) throw BICANCEL;
    return i;
  });
}
const biCheckIdle = (e) => {
  e.timeouts >= 3 &&
    !e.left &&
    !e.bot &&
    (biToBot(e, `${e.name} non risponde: gioca un bot al suo posto.`),
    BI.io.send(e.id, { t: "ixbye", finals: biFinals() }));
};
async function biBid(e, t, a, s, n) {
  const o = t && a - n >= 0 && a - n <= a ? a - n : -1,
    i = o === 0 ? 1 : 0;
  let r;
  return (
    (BI.turn = e.id),
    e.bot
      ? (await biPause("bot"),
        (r =
          a === 1
            ? biBotBid1(
                BI.players.filter((l) => !l.out && l !== e).map((l) => l.hand[0]),
                o,
                BI.cfg.diff,
              )
            : biBotBid(e.hand, s, o, BI.cfg.diff)))
      : ((r = await biAsk(e, "bid", { forbid: o, cards: a }, i, (l) =>
          Number.isInteger(l) && l >= 0 && l <= a && l !== o ? l : i,
        )),
        biCheckIdle(e)),
    (!Number.isInteger(r) || r < 0 || r > a || r === o) && (r = i),
    (e.bid = r),
    (BI.turn = null),
    biLog(`${e.name} dichiara ${r}.`),
    biBroadcast(),
    await biPause("card"),
    r
  );
}
async function biPlayCard(e, t, a) {
  let s;
  const n = biBotPlay(
    e.hand,
    BI.table.map((o) => ({ card: o.card, ace: o.ace })),
    t,
    a,
  );
  ((BI.turn = e.id),
    e.bot
      ? (await biPause("bot"),
        (s = n),
        botSlip(BI.cfg.diff) &&
          (s = {
            card: e.hand[Math.floor(Math.random() * e.hand.length)],
            ace: Math.random() < 0.5 ? "max" : "min",
          }))
      : ((s = await biAsk(e, "play", {}, n, (o) => {
          if (!o || !Number.isInteger(o.card)) return n;
          const i = o.card === -1 && e.hand.length === 1 && BI.cards === 1 ? e.hand[0] : o.card;
          return e.hand.includes(i) ? { card: i, ace: i === BI_ACE && o.ace === "min" ? "min" : "max" } : n;
        })),
        biCheckIdle(e)),
    (!s || !e.hand.includes(s.card)) && (s = n),
    BI.cards === 1 && s.card === BI_ACE && (s = { card: s.card, ace: "max" }),
    e.hand.splice(e.hand.indexOf(s.card), 1),
    BI.table.push({
      pid: e.id,
      card: s.card,
      ace: s.card === BI_ACE ? (s.ace === "min" ? "min" : "max") : "",
    }),
    BI.seen.push(s.card),
    (BI.turn = null),
    biBroadcast(),
    await biPause("card"));
}
async function biHand() {
  const e = BI.players.filter((u) => !u.out),
    t = e.length,
    a = BI_SEQ[BI.round % BI_SEQ.length];
  (BI.round++, (BI.cards = a), (BI.table = []), (BI.seen = []), (BI.roundRes = null), (BI.trick = null));
  let s = BI.dealer;
  do s = (s + 1) % BI.players.length;
  while (BI.players[s].out);
  BI.dealer = s;
  const n = bShuffle(Array.from({ length: 40 }, (u, p) => p));
  for (const u of BI.players) ((u.hand = []), (u.bid = -1), (u.won = 0));
  for (let u = 0; u < a; u++) for (const p of e) p.hand.push(n.pop());
  const o = BI.players[s],
    i = e.indexOf(o),
    r = e.slice(i + 1).concat(e.slice(0, i + 1));
  (biLog(`\u2014 Mano ${BI.round} \xB7 ${a} ${a === 1 ? "carta" : "carte"} \u2014`),
    (BI.phase = "deal"),
    biBroadcast(),
    await biPause("deal"),
    (BI.phase = "bid"));
  let l = 0;
  for (let u = 0; u < t; u++) l += await biBid(r[u], u === t - 1, a, t, l);
  BI.phase = "play";
  let c = 0;
  for (let u = 0; u < a; u++) {
    BI.table = [];
    const p = r.slice(c).concat(r.slice(0, c));
    for (const b of p) await biPlayCard(b, b.bid - b.won, a - u);
    const d = biTrickWinner(BI.table),
      h = BI.players.find((b) => b.id === BI.table[d].pid);
    (h.won++,
      (BI.trick = { pid: h.id, name: h.name }),
      biLog(`${h.name} vince la presa.`),
      (BI.phase = "trick"),
      biBroadcast(),
      await biPause("trick"),
      (BI.phase = "play"),
      (BI.trick = null),
      (c = r.indexOf(h)));
  }
  BI.table = [];
  const f = e.map((u) => {
      const p = Math.abs(u.bid - u.won),
        d = BI.cfg.loss === "diff" ? p : p ? 1 : 0;
      return (
        (u.lives = Math.max(0, u.lives - d)),
        u.lives <= 0 &&
          !u.out &&
          ((u.out = !0),
          (u.outAt = BI.round),
          u.ask && u.ask.resolve(u.ask.def),
          biLog(`${u.name} \xE8 fuori!`)),
        { pid: u.id, name: u.name, bid: u.bid, won: u.won, lost: d, lives: u.lives, out: u.out }
      );
    }),
    m = BI.players.filter((u) => !u.out).length;
  return (
    (BI.roundRes = { round: BI.round, cards: a, rows: f, over: m <= 1 }),
    (BI.phase = "handEnd"),
    biBroadcast(),
    await biPause("round"),
    m <= 1
  );
}
async function biRun() {
  try {
    for (;;)
      if (await biHand()) {
        BI.phase = "over";
        const e = BI.players.filter((t) => !t.out);
        biEnd(e.length === 1 ? `Vince ${e[0].name}!` : "Partita finita.");
        return;
      }
  } catch (e) {
    if (e !== BICANCEL) throw e;
  }
}
function biSnap(e) {
  const t = e.ask,
    a = BI.cards === 1 && !e.out && BI.phase !== "handEnd" && BI.phase !== "over",
    s = BI.cards === 1 && e.out;
  return {
    t: "istate",
    code: BI.code,
    started: BI.started,
    phase: BI.phase,
    mode: BI.mode,
    round: BI.round,
    cards: BI.cards,
    maxLives: BI.cfg.lives,
    loss: BI.cfg.loss,
    seats: BI.players.map((n, o) => ({
      pid: n.id,
      name: n.name,
      host: n.host,
      bot: n.bot,
      cards: n.hand.length,
      bid: n.bid,
      won: n.won,
      lives: n.lives,
      out: n.out,
      dealer: o === BI.dealer,
      turn: BI.turn === n.id,
      card: (a || s) && n !== e && n.hand.length === 1 ? n.hand[0] : void 0,
    })),
    me: {
      pid: e.id,
      seat: BI.players.indexOf(e),
      hand: a ? e.hand.map(() => -1) : e.hand.slice(),
      bid: e.bid,
      won: e.won,
      lives: e.lives,
      out: e.out,
    },
    table: BI.table.map((n) => ({ pid: n.pid, card: n.card, ace: n.ace })),
    turn: BI.turn,
    trick: BI.trick,
    seen: BI.seen.slice(),
    roundRes: BI.roundRes,
    log: BI.log.slice(-5),
    ask: t ? { id: t.id, kind: t.kind, forbid: t.forbid, cards: t.cards } : null,
    turnMs: t && t.deadline ? Math.max(0, t.deadline - Date.now()) : 0,
  };
}
function biBroadcast() {
  if (!(!BI || (BI.ended && !BI.finals)))
    for (const e of BI.players) e.human && !e.left && !e.bot && BI.io.send(e.id, biSnap(e));
}
typeof module != "undefined" &&
  module.exports &&
  (module.exports = {
    biPow,
    biEff,
    biTrickWinner,
    biBotBid,
    biBotBid1,
    biBotPlay,
    biCreate,
    biAdd,
    biStart,
    biMsg,
    biLeave,
    biEnd,
    biSnap,
    biFinals,
    BIUI,
    getBI: () => BI,
  });
const NC_ACC = ["#e8b830", "#c9402f", "#5f86c4", "#7a9c3a"],
  NC_DK = ["#7d5d0e", "#6f1b12", "#243f6e", "#34501a"],
  NC_SYM = [
    '<circle r="11" fill="#e8b830" stroke="#7d5d0e" stroke-width="1.5"/><circle r="8.3" fill="#f3cf5a" stroke="#7d5d0e" stroke-width=".9"/>' +
      [0, 1, 2, 3, 4, 5, 6, 7]
        .map((e) => {
          const t = (e * Math.PI) / 4;
          return `<circle cx="${(9.65 * Math.cos(t)).toFixed(2)}" cy="${(9.65 * Math.sin(t)).toFixed(2)}" r=".75" fill="#7d5d0e"/>`;
        })
        .join("") +
      '<path d="M0 -5.5L1.6 -1.6 5.5 0 1.6 1.6 0 5.5-1.6 1.6-5.5 0-1.6-1.6Z" fill="#c79a1c" stroke="#7d5d0e" stroke-width=".8"/><circle r="1.1" fill="#7d5d0e"/>',
    '<path d="M-9 -14H9C9 -5 5 -1 1.4 0.5H-1.4C-5 -1 -9 -5 -9 -14Z" fill="#c9402f" stroke="#6f1b12" stroke-width="1.3"/><path d="M-8.6 -10.5H8.6" stroke="#6f1b12" stroke-width=".9"/><ellipse cx="0" cy="-14" rx="9" ry="1.6" fill="#e07a6c" stroke="#6f1b12" stroke-width="1"/><path d="M-9 -12.5C-14 -12 -13 -5 -8 -5.5M9 -12.5C14 -12 13 -5 8 -5.5" fill="none" stroke="#6f1b12" stroke-width="1.3"/><rect x="-1.5" y="0.5" width="3" height="7" fill="#c9402f" stroke="#6f1b12" stroke-width="1"/><circle cy="4.2" r="2.7" fill="#e8b830" stroke="#7d5d0e" stroke-width="1"/><path d="M-8 14.5L-4.5 8.5H4.5L8 14.5Z" fill="#c9402f" stroke="#6f1b12" stroke-width="1.2"/>',
    '<path d="M8 -16C12 -7 7 2 -1 7.5L-3.4 6.8C2.5 1 5.5 -7 3.2 -13.5C4.6 -14.5 6.4 -15.4 8 -16Z" fill="#a9c1e6" stroke="#243f6e" stroke-width="1.3"/><path d="M6.8 -12.5C7.6 -6 4.5 0 -1 5" fill="none" stroke="#243f6e" stroke-width=".8"/><path d="M-9 7.2Q-1 3.2 7 8Q-1 11.2 -9 7.2Z" fill="#e8b830" stroke="#7d5d0e" stroke-width="1.1"/><rect x="-3.6" y="9" width="3.2" height="6" rx="1" transform="rotate(-8 -2 12)" fill="#7a4e24" stroke="#4a2c10" stroke-width=".8"/><circle cx="-2.6" cy="16.2" r="2" fill="#e8b830" stroke="#7d5d0e" stroke-width=".9"/>',
    '<path d="M-5 -15C-9 -14 -9 -8 -6.5 -5C-9 -2 -8 3 -4.2 4.5L-2.6 15H2.6L4.2 4.5C8 3 9 -2 6.5 -5C9 -8 9 -14 5 -15C2.6 -16.4 -2.6 -16.4 -5 -15Z" fill="#b98443" stroke="#5a3a14" stroke-width="1.4"/><ellipse cx="-2.2" cy="-10" rx="1.5" ry="1" fill="#5a3a14"/><ellipse cx="2.6" cy="-3.5" rx="1.5" ry="1" fill="#5a3a14"/><ellipse cx="-1.4" cy="2" rx="1.2" ry=".9" fill="#5a3a14"/><path d="M0 -15V8" stroke="#8a5f2a" stroke-width=".8" fill="none"/><path d="M-2.4 13C-7.5 12.5 -10 9.5 -10 6C-6 6 -3.5 9 -2.4 13ZM2.4 11C7.5 10.5 10 7.5 10 4C6 4 3.5 7 2.4 11Z" fill="#6f9a3a" stroke="#34501a" stroke-width=".9"/>',
  ],
  BK_SUITSVG = NC_SYM.map((e) => `<g transform="translate(12 16)">${e}</g>`),
  nSym = (e, t, a, s) => `<g transform="translate(${t} ${a}) scale(${s})">${NC_SYM[e]}</g>`,
  NC_LAYOUT = {
    2: {
      k: 0.8,
      p: [
        [30, 29],
        [30, 61],
      ],
    },
    3: {
      k: 0.58,
      p: [
        [30, 24],
        [30, 45],
        [30, 66],
      ],
    },
    4: {
      k: 0.74,
      p: [
        [21, 30],
        [39, 30],
        [21, 60],
        [39, 60],
      ],
    },
    5: {
      k: 0.66,
      p: [
        [21, 26],
        [39, 26],
        [30, 45],
        [21, 64],
        [39, 64],
      ],
    },
    6: {
      k: 0.55,
      p: [
        [21, 24],
        [39, 24],
        [21, 45],
        [39, 45],
        [21, 66],
        [39, 66],
      ],
    },
    7: {
      k: 0.5,
      p: [
        [21, 24],
        [39, 24],
        [30, 34.5],
        [21, 45],
        [39, 45],
        [21, 66],
        [39, 66],
      ],
    },
  };
function ncFigure(e, t) {
  const a = NC_ACC[t],
    s = NC_DK[t],
    n = "#f1cf9f";
  let o;
  return (
    e === 8
      ? (o = `<path d="M-6 -19Q0 -33 7 -20Z" fill="${a}" stroke="${s}" stroke-width="1"/><path d="M5 -25Q11 -28 12 -36" stroke="${s}" stroke-width="1.2" fill="none"/><circle cy="-16" r="5.2" fill="${n}" stroke="${s}" stroke-width="1"/><circle cx="-1.8" cy="-16.5" r=".6" fill="${s}"/><circle cx="1.8" cy="-16.5" r=".6" fill="${s}"/><path d="M-9 -10L9 -10L12 9L-12 9Z" fill="${a}" stroke="${s}" stroke-width="1.1"/><path d="M-9 -3L9 -3" stroke="${s}" stroke-width=".8"/><rect x="-8.5" y="9" width="6" height="15" fill="${s}"/><rect x="2.5" y="9" width="6" height="15" fill="${s}"/><rect x="-10" y="24" width="8.5" height="3" fill="#3a2a12"/><rect x="1.5" y="24" width="8.5" height="3" fill="#3a2a12"/>`)
      : e === 9
        ? (o =
            `<g transform="translate(0 -3)"><path d="M-14 8Q-23 12 -19 24" stroke="${s}" stroke-width="2" fill="none"/><ellipse cx="-2" cy="9" rx="14" ry="8" fill="#c9a266" stroke="${s}" stroke-width="1.2"/><path d="M8 4L13 -9L19 -9L22 -3L17 -1L14 7Z" fill="#c9a266" stroke="${s}" stroke-width="1.1"/><path d="M13 -9Q11 -3 9 4" stroke="${s}" stroke-width="1.6" fill="none"/><circle cx="18" cy="-6" r=".7" fill="${s}"/>` +
            [-12, -6, 4, 10]
              .map(
                (i) =>
                  `<rect x="${i}" y="15" width="3" height="12" fill="#c9a266" stroke="${s}" stroke-width=".8"/>`,
              )
              .join("") +
            `<path d="M-6 -3L2 -3L3 9L-8 9Z" fill="${a}" stroke="${s}" stroke-width="1.1"/><circle cx="-2" cy="-9" r="4.6" fill="${n}" stroke="${s}" stroke-width="1"/><path d="M-7 -11Q-2 -21 4 -11Z" fill="${a}" stroke="${s}" stroke-width="1"/></g>`)
        : (o = `<path d="M-7 -22L-7.5 -31L-3.8 -26L0 -32L3.8 -26L7.5 -31L7 -22Z" fill="#e8b830" stroke="#7d5d0e" stroke-width="1"/><circle cy="-16" r="6" fill="${n}" stroke="${s}" stroke-width="1"/><circle cx="-2.2" cy="-17" r=".7" fill="${s}"/><circle cx="2.2" cy="-17" r=".7" fill="${s}"/><path d="M-5.4 -13Q0 -2 5.4 -13Q0 -9 -5.4 -13Z" fill="#cdbba0" stroke="${s}" stroke-width=".8"/><path d="M-12 -8L12 -8L17 25L-17 25Z" fill="${a}" stroke="${s}" stroke-width="1.2"/><path d="M-3.5 -8L3.5 -8L5.5 25L-5.5 25Z" fill="#f3ead2" stroke="${s}" stroke-width=".8"/><path d="M-1.5 -1.5l1.5 1.5 1.5-1.5M-1.5 6.5l1.5 1.5 1.5-1.5M-1.5 14.5l1.5 1.5 1.5-1.5" stroke="${s}" stroke-width=".8" fill="none"/><path d="M15 -6V24" stroke="${s}" stroke-width="2"/><circle cx="15" cy="-8" r="2.6" fill="#e8b830" stroke="#7d5d0e" stroke-width="1"/>`),
    `<rect x="9.5" y="16" width="41" height="58" rx="3" fill="${a}" fill-opacity=".13" stroke="${s}" stroke-opacity=".6" stroke-width=".8"/><g transform="translate(30 46) scale(.93)">${o}</g>` +
      nSym(t, 46, 24, 0.3) +
      nSym(t, 14, 68, 0.3)
  );
}
const NC_RANK = { 1: "A", 8: "F", 9: "C", 10: "R" };
function nCardFace(e) {
  const t = bV(e),
    a = bSuit(e),
    n = `<text x="7" y="14" font-family="Fraunces,Georgia,serif" font-weight="700" font-size="12.5" fill="${NC_DK[a]}">${NC_RANK[t] || t}</text>${nSym(a, 10, 22, 0.27)}`;
  let o;
  if (t === 1) o = nSym(a, 30, 45, 1.5);
  else if (t >= 8) o = ncFigure(t, a);
  else {
    const i = NC_LAYOUT[t];
    o = i.p.map(([r, l]) => nSym(a, r, l, i.k)).join("");
  }
  return `<svg class="face" viewBox="0 0 60 90" preserveAspectRatio="none" aria-hidden="true">${n}<g transform="rotate(180 30 45)">${n}</g>${o}</svg>`;
}
const NET_KEY = "hilo.net.v1",
  STUN_DEF = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
  TURN_PUBLIC = {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  NetCfg = {
    load() {
      try {
        return Object.assign(
          { mode: "auto", app: "", key: "", url: "", user: "", cred: "" },
          JSON.parse(localStorage.getItem(NET_KEY) || "null") || {},
        );
      } catch {
        return { mode: "auto", app: "", key: "", url: "", user: "", cred: "" };
      }
    },
    save(e) {
      try {
        localStorage.setItem(NET_KEY, JSON.stringify(e));
      } catch {}
    },
    share(e) {
      const t =
        e.mode === "metered"
          ? { m: "metered", a: e.app, k: e.key }
          : e.mode === "manual"
            ? { m: "manual", u: e.url, n: e.user, c: e.cred }
            : null;
      return t
        ? location.href.split("#")[0] +
            "#net=" +
            encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(t)))))
        : "";
    },
    importHash() {
      const e = /[#&]net=([^&]+)/.exec(location.hash || "");
      if (!e) return !1;
      try {
        const t = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(e[1]))))),
          a =
            t.m === "metered"
              ? { mode: "metered", app: String(t.a || ""), key: String(t.k || "") }
              : t.m === "manual"
                ? { mode: "manual", url: String(t.u || ""), user: String(t.n || ""), cred: String(t.c || "") }
                : null;
        if (!a) return !1;
        NetCfg.save(Object.assign(NetCfg.load(), a));
        try {
          history.replaceState(null, "", location.href.split("#")[0]);
        } catch {}
        return !0;
      } catch {
        return !1;
      }
    },
  },
  Net = (() => {
    const e = "hilo-tavolo-";
    let t = null;
    async function a() {
      const o = NetCfg.load();
      if (o.mode === "manual" && o.url) {
        const i = o.url
          .split(/[\s,]+/)
          .filter(Boolean)
          .map((r) => (/^(turns?|stuns?):/.test(r) ? r : "turn:" + r));
        return [...STUN_DEF, { urls: i, username: o.user, credential: o.cred }];
      }
      if (o.mode === "metered" && o.app && o.key) {
        const i = o.app + "|" + o.key;
        if (t && t.key === i && Date.now() - t.t < 36e5) return t.servers;
        try {
          const r = await fetch(
            "https://" +
              o.app.replace(/\.metered\.live.*$/, "") +
              ".metered.live/api/v1/turn/credentials?apiKey=" +
              encodeURIComponent(o.key),
          );
          if (!r.ok) throw new Error("http " + r.status);
          const l = await r.json();
          if (!Array.isArray(l) || !l.length) throw new Error("vuoto");
          return ((t = { key: i, t: Date.now(), servers: [...STUN_DEF, ...l] }), t.servers);
        } catch {
          return [...STUN_DEF, TURN_PUBLIC];
        }
      }
      return [...STUN_DEF, TURN_PUBLIC];
    }
    function s(o) {
      const i = {
        onmessage: null,
        onclose: null,
        send(c) {
          try {
            o.send(c);
          } catch {}
        },
        close() {
          try {
            o.close();
          } catch {}
        },
      };
      o.on("data", (c) => {
        i.onmessage && i.onmessage(c);
      });
      let r = !1;
      const l = () => {
        r || ((r = !0), i.onclose && i.onclose());
      };
      return (o.on("close", l), o.on("error", l), i);
    }
    function n(o, i, r) {
      let l = null,
        c = !1;
      const f = {
        close() {
          c = !0;
          try {
            l && l.destroy();
          } catch {}
        },
      };
      return (
        a().then((m) => {
          c ||
            ((l = new Peer(o, { config: { iceServers: m, iceCandidatePoolSize: 4 }, debug: 0 })),
            l.on("disconnected", () => {
              if (!c)
                try {
                  l.reconnect();
                } catch {}
            }),
            r(l));
        }),
        f
      );
    }
    return {
      PREFIX: e,
      iceServers: a,
      host(o, i) {
        return typeof Peer == "undefined"
          ? (setTimeout(() => i.onError("nolib"), 0), { close() {} })
          : n(e + o, i, (r) => {
              (r.on("open", () => i.onReady()),
                r.on("error", (l) => i.onError(l.type || "errore")),
                r.on("connection", (l) => {
                  l.on("open", () => i.onConn(s(l)));
                }));
            });
      },
      join(o, i) {
        return typeof Peer == "undefined"
          ? (setTimeout(() => i.onError("nolib"), 0), { close() {} })
          : n(void 0, i, (r) => {
              (r.on("open", () => {
                const l = r.connect(e + o, { reliable: !0, serialization: "json" });
                (l.on("open", () => i.onOpen(s(l))),
                  l.on("error", (c) => i.onError((c && c.type) || "errore")));
              }),
                r.on("error", (l) => i.onError(l.type || "errore")));
            });
      },
      async test() {
        const o = Date.now(),
          i = await a(),
          r = { host: 0, srflx: 0, relay: 0 };
        if (typeof RTCPeerConnection == "undefined")
          return Object.assign(r, { servers: i.length, ms: 0, nowebrtc: !0 });
        const l = new RTCPeerConnection({ iceServers: i });
        (l.createDataChannel("t"),
          await new Promise((c) => {
            const f = setTimeout(c, 7e3);
            ((l.onicecandidate = (m) => {
              if (!m.candidate) {
                (clearTimeout(f), c());
                return;
              }
              const u = / typ (host|srflx|relay)/.exec(m.candidate.candidate);
              u && r[u[1]]++;
            }),
              l
                .createOffer()
                .then((m) => l.setLocalDescription(m))
                .catch(() => {
                  (clearTimeout(f), c());
                }));
          }));
        try {
          l.close();
        } catch {}
        return Object.assign(r, { servers: i.length, ms: Date.now() - o });
      },
    };
  })(),
  $ = (e, t = document) => t.querySelector(e),
  STORE_KEY = "hilo.cfg.v1",
  DEFAULT_CFG = {
    name: "",
    askCount: "on",
    decks: 4,
    cash: 1e3,
    minBet: 10,
    entry: "fresh",
    mode: "solo",
    others: 3,
    diff: "mid",
    speed: "normal",
    showCount: "off",
    showCards: "off",
    hint: "off",
    side: "off",
    spots: 1,
    seatPref: [],
  };
function loadCfg() {
  try {
    return Object.assign({}, DEFAULT_CFG, JSON.parse(localStorage.getItem(STORE_KEY) || "null") || {});
  } catch {
    return Object.assign({}, DEFAULT_CFG);
  }
}
function saveCfg() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
  } catch {}
}
let cfg = loadCfg(),
  guessNeg = !1,
  V = null,
  ROOM_UI = !1;
const esc = (e) =>
    String(e).replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    ),
  tcInfo = () => {
    const e = Math.max(0.5, Math.round((V.shoe.length / 52) * 2) / 2);
    return { rem: e, tc: Math.round((V.rc / e) * 10) / 10 };
  },
  fmtDec = (e) => e.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  fmtTC = (e) => (e > 0 ? "+" : e < 0 ? "\u2212" : "") + fmtDec(Math.abs(e)),
  SPEED = { calm: 1.6, normal: 1, fast: 0.5 },
  BASE = { deal: 430, bot: 800, draw: 750, reveal: 650, peek: 1e3, shuffle: 1200 };
UI.pause = (e) =>
  new Promise((t) => {
    const a = typeof window.__pauseScale == "number" ? window.__pauseScale : 1;
    setTimeout(t, BASE[e] * (SPEED[cfg.speed] || 1) * a);
  });
function show(e) {
  for (const t of [
    "home",
    "games",
    "net",
    "setup",
    "table",
    "count",
    "result",
    "hist",
    "lobby",
    "psetup",
    "plobby",
    "ptable",
    "presult",
    "bsetup",
    "blobby",
    "btable",
    "bresult",
    "ssetup",
    "slobby",
    "stable",
    "sresult",
    "isetup",
    "ilobby",
    "itable",
    "iresult",
  ])
    $("#screen-" + t).hidden = t !== e;
}
const HIST_KEY = "hilo.hist.v1";
let histBack = "setup",
  histConfirm = !1;
function loadHist() {
  try {
    const e = JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
    return Array.isArray(e) ? e : [];
  } catch {
    return [];
  }
}
function saveHist(e) {
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(e.slice(-300)));
  } catch {}
}
function addHist(e) {
  if (e.rounds < 1 && e.start === e.end) return;
  const t = loadHist();
  (t.push(e), saveHist(t), updateHistBtn());
}
function updateHistBtn() {
  const e = loadHist().length,
    t = $("#hist-n"),
    g = $("#gh-n");
  (t && (t.textContent = e ? "\xB7 " + e : ""), g && (g.textContent = e + loadGames().length ? "\xB7 " + (e + loadGames().length) : ""));
}
const fmtDate = (e) =>
  new Date(e).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) +
  " \xB7 " +
  new Date(e).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
function lineChart(e, t = !0, a = money) {
  const i = e.length,
    r = t ? [0, ...e] : e,
    l = Math.min(...r),
    c = Math.max(...r),
    f = c - l || 1,
    m = (h) => 8 + 304 * (r.length === 1 ? 0 : h / (r.length - 1)),
    u = (h) => 102 - (94 * (h - l)) / f,
    p = r.map((h, b) => (b ? "L" : "M") + m(b).toFixed(1) + " " + u(h).toFixed(1)).join(" "),
    d = e[i - 1];
  return `<svg viewBox="0 0 320 110" class="chart" role="img" aria-label="Andamento delle fiches nel tempo">
    ${t ? `<line x1="8" x2="312" y1="${u(0).toFixed(1)}" y2="${u(0).toFixed(1)}" class="ch-zero"/>` : ""}
    <path d="${p}" class="ch-line ${t ? (d >= 0 ? "up" : "dn") : "neu"}"/>
    <circle cx="${m(r.length - 1).toFixed(1)}" cy="${u(d).toFixed(1)}" r="4" class="ch-dot"/>
    <text x="8" y="12" class="ch-t">${a(c, t)}</text><text x="8" y="108" class="ch-t">${a(l, t)}</text></svg>`;
}
function divBars(e, t) {
  const a = Math.max(1, ...e.map(Math.abs));
  return (
    '<div class="dbars" role="img">' +
    e
      .map(
        (s, n) =>
          `<div title="${t[n]}"><i class="${s >= 0 ? "up" : "dn"}" style="height:${Math.max(3, Math.round((Math.abs(s) / a) * 46))}%;${s >= 0 ? "bottom:50%" : "top:50%"}"></i></div>`,
      )
      .join("") +
    "</div>"
  );
}
function simpleBars(e, t) {
  const a = Math.max(1, ...e);
  return (
    '<div class="bars neu">' +
    e
      .map((s, n) => `<i title="${t[n]}" style="height:${Math.max(6, Math.round((s / a) * 100))}%"></i>`)
      .join("") +
    "</div>"
  );
}
function errBars(e) {
  const t = e.map((s) => Math.abs(s.guess - s.real)),
    a = Math.max(3, ...t);
  return (
    '<div class="bars" role="img" aria-label="Scarto del conteggio per sessione">' +
    t
      .map(
        (s, n) =>
          `<i class="${s === 0 ? "ok" : ""}" style="height:${s === 0 ? 4 : Math.max(8, Math.round((s / a) * 100))}%" title="${fmtDate(e[n].t)} \xB7 scarto ${s}"></i>`,
      )
      .join("") +
    "</div>"
  );
}
function renderHist() {
  if (histTab === "all") return renderGameHist();
  const e = loadHist(),
    t = (s) => (s.length ? s.reduce((n, o) => n + o, 0) / s.length : 0);
  let a = histHead();
  if (!e.length)
    a +=
      '<p class="sub" style="color:var(--muted)">Ancora nessuna sessione. Quando lasci il tavolo e confermi il conteggio, la sessione viene salvata qui: cos\xEC nel tempo vedi come stai andando.</p>';
  else {
    const s = e.reduce((d, h) => d + (h.end - h.start), 0),
      n = e.reduce((d, h) => d + h.rounds, 0),
      o = e.filter((d) => typeof d.guess == "number"),
      i = o.filter((d) => d.guess === d.real).length,
      r = o.map((d) => Math.abs(d.guess - d.real)),
      l = r.slice(-5),
      c = r.slice(-10, -5);
    let f = "";
    if (l.length >= 3 && c.length >= 3) {
      const d = t(l) - t(c);
      f =
        d < -0.05
          ? `<p class="trend ok">Ultime 5 sessioni: scarto medio ${fmtDec(t(l))}, meglio delle 5 precedenti (${fmtDec(t(c))}).</p>`
          : d > 0.05
            ? `<p class="trend bad">Ultime 5 sessioni: scarto medio ${fmtDec(t(l))}, peggio delle 5 precedenti (${fmtDec(t(c))}).</p>`
            : `<p class="trend">Ultime 5 sessioni: scarto medio ${fmtDec(t(l))}, stabile.</p>`;
    }
    a += `<div class="stats">
      <div><span>Sessioni</span><b>${e.length}</b></div>
      <div><span>Mani</span><b>${n}</b></div>
      <div><span>Fiches nette</span><b style="color:var(${s >= 0 ? "--win" : "--lose"})">${money(s, !0)}</b></div>
      <div><span>Conteggi esatti</span><b>${o.length ? Math.round((100 * i) / o.length) + "%" : "\u2014"}</b></div>
      <div><span>Scarto medio</span><b>${o.length ? fmtDec(t(r)) : "\u2014"}</b></div>
      <div><span>Conteggi inseriti</span><b>${o.length}/${e.length}</b></div>
    </div>`;
    let m = 0;
    const u = e.slice(-30),
      p = u.map((d) => fmtDate(d.t));
    if (
      ((a +=
        '<h3 class="h-sub">Fiches nel tempo <small>(cumulato)</small></h3>' +
        lineChart(e.map((d) => (m += d.end - d.start)))),
      (a +=
        '<h3 class="h-sub">Risultato per sessione</h3>' +
        divBars(
          u.map((d) => d.end - d.start),
          u.map((d, h) => p[h] + " \xB7 " + money(d.end - d.start, !0)),
        )),
      (a +=
        '<h3 class="h-sub">Mani per sessione</h3>' +
        simpleBars(
          u.map((d) => d.rounds),
          u.map((d, h) => p[h] + " \xB7 " + d.rounds + " mani"),
        )),
      o.length)
    ) {
      let d = 0;
      const h = o.map((k, g) => (k.guess === k.real && d++, Math.round((100 * d) / (g + 1))));
      ((a +=
        '<h3 class="h-sub">Conteggi esatti nel tempo <small>(% cumulata)</small></h3>' +
        (h.length > 1
          ? lineChart(h, !1, (k) => Math.round(k) + "%")
          : '<p class="sub" style="color:var(--muted)">Servono almeno 2 conteggi inseriti.</p>')),
        (a +=
          '<h3 class="h-sub">Scarto del conteggio <small>(verde = esatto)</small></h3>' +
          errBars(o.slice(-30)) +
          f));
      const b = o.slice(-30);
      a +=
        '<h3 class="h-sub">Errore con segno <small>(sopra = hai contato di pi\xF9)</small></h3>' +
        divBars(
          b.map((k) => k.guess - k.real),
          b.map((k) => fmtDate(k.t) + " \xB7 " + sgn(k.guess) + " vs " + sgn(k.real)),
        );
    }
    ((a +=
      '<h3 class="h-sub">Sessioni</h3><div class="hlist">' +
      e
        .slice()
        .reverse()
        .map((d) => {
          const h = d.end - d.start,
            b =
              typeof d.guess == "number"
                ? d.guess === d.real
                  ? `<em class="ok">esatto ${sgn(d.real)}</em>`
                  : `<em class="bad">${sgn(d.guess)} vs ${sgn(d.real)}</em>`
                : "<em>non inserito</em>",
            k = typeof d.guess == "number";
          return `<div class="hrow"><div class="hh"><div><b>${fmtDate(d.t)}</b><small>${d.decks} ${d.decks === 1 ? "mazzo" : "mazzi"} \xB7 ${d.mode === "table" ? "con bot" : d.mode === "room" ? "amici online" : "solo"} \xB7 ${d.spots} ${d.spots === 1 ? "posto" : "posti"}${d.aids ? " \xB7 con aiuti" : ""}${d.forfeited ? " \xB7 mano persa" : ""}</small></div>
        <b class="hnet" style="color:var(${h >= 0 ? "--win" : "--lose"})">${money(h, !0)}</b></div>
        <div class="hgrid">
          <div><span>Fiches ingresso</span><b>${money(d.start)}</b></div>
          <div><span>Fiches uscita</span><b>${money(d.end)}</b></div>
          <div><span>Puntata minima</span><b>${money(d.minBet)}</b></div>
          <div><span>Mani giocate</span><b>${d.rounds}</b></div>
          <div><span>Conteggio finale</span><b>${sgn(d.real)}</b></div>
          <div><span>Conteggio segnato</span><b class="${k ? (d.guess === d.real ? "okc" : "badc") : ""}">${k ? sgn(d.guess) : "\u2014"}</b></div>
        </div></div>`;
        })
        .join("") +
      "</div>"),
      (a += `<button class="ghost wide danger" data-act="hist-clear">${histConfirm ? "Tocca ancora per cancellare tutto" : "Cancella lo storico"}</button>`));
  }
  $("#hist-body").innerHTML = a;
}
function openHist(e, tab) {
  ((histBack = e),
    (histTab = tab || "bj"),
    (histConfirm = !1),
    renderHist(),
    ($("#screen-hist").scrollTop = 0),
    ($("#hist-body").scrollTop = 0),
    show("hist"));
}
const CHIPS = [1, 5, 10, 25, 50, 100, 500],
  SEGS = {
    decks: [
      [1, "1 mazzo"],
      [2, "2 mazzi"],
      [4, "4 mazzi"],
      [8, "8 mazzi"],
    ],
    entry: [
      ["fresh", "Sabot nuovo"],
      ["random", "A sorpresa"],
    ],
    mode: [
      ["solo", "Solo"],
      ["table", "Con bot"],
      ["room", "Con amici"],
    ],
    askCount: [
      ["on", "S\xEC"],
      ["off", "No"],
    ],
    diff: [
      ["low", "Basso"],
      ["mid", "Medio"],
      ["high", "Alto"],
    ],
    speed: [
      ["calm", "Calma"],
      ["normal", "Normale"],
      ["fast", "Veloce"],
    ],
    showCount: [
      ["off", "Nascosto"],
      ["on", "Visibile"],
    ],
    showCards: [
      ["off", "Nascosto"],
      ["on", "Visibile"],
    ],
    hint: [
      ["off", "Spento"],
      ["on", "Acceso"],
    ],
    side: [
      ["off", "Senza side bet"],
      ["on", "Con side bet"],
    ],
  },
  seg = (e) =>
    `<div class="seg" role="group" data-seg="${e}">` +
    SEGS[e]
      .map(
        ([t, a]) =>
          `<button type="button" data-act="seg" data-key="${e}" data-val="${t}" aria-pressed="false">${a}</button>`,
      )
      .join("") +
    "</div>",
  quick = (e, t) =>
    '<div class="quick">' +
    t
      .map(
        (a) =>
          `<button type="button" data-act="quick" data-key="${e}" data-val="${a}" aria-pressed="false">${a.toLocaleString("it-IT")}</button>`,
      )
      .join("") +
    "</div>";
function buildSetup() {
  $("#setup-body").innerHTML = `
    <section class="panel"><h2>Come giochi</h2><div class="pmchip" data-pmchip></div>
      <div class="stepper-row" id="others-row"><span>Altri giocatori al tavolo</span>
        <div class="mini-stepper"><button type="button" data-act="others" data-d="-1" aria-label="Meno giocatori">\u2212</button><b id="others-n">3</b><button type="button" data-act="others" data-d="1" aria-label="Pi\xF9 giocatori">+</button></div></div>
      <p class="note" id="note-mode"></p></section>
    <section class="panel"><h2>Sabot</h2>${seg("decks")}
      <p class="note" id="note-decks"></p></section>
    <section class="panel"><h2>Fiches</h2>
      <div class="fields">
        <label class="field"><span>Cash-in</span><div class="money"><i>\u20AC</i><input id="in-cash" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Cash-in"></div></label>
        <label class="field"><span>Puntata minima</span><div class="money"><i>\u20AC</i><input id="in-min" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Puntata minima"></div></label>
      </div>
      ${quick("cash", [200, 500, 1e3, 2e3, 5e3])}
      ${quick("minBet", [5, 10, 25, 50, 100])}
    </section>
    <section class="panel"><h2>Quando ti siedi</h2>${seg("entry")}<p class="note" id="note-entry"></p></section>
    <section class="panel" id="diff-panel" hidden><h2>Livello dei bot</h2>${seg("diff")}<p class="note">Basso: giocano male, utile per imparare. Alto: strategia di base perfetta.</p></section>
    <section class="panel" id="room-panel" hidden><h2>Stanza con amici</h2>
      <label class="field"><span>Il tuo nome</span><input id="in-name" class="txt" maxlength="14" autocomplete="off" placeholder="Come ti chiamano al tavolo" aria-label="Il tuo nome"></label>
      <p class="lbl">Chiedere il conteggio a fine partita?</p>${seg("askCount")}
      <p class="note">Imposti tu mazzi, cash-in e puntata minima: valgono per tutti. Premi \xABCrea stanza\xBB e manda il codice agli amici.</p>
      <p class="lbl">Oppure entra nella stanza di un amico</p>
      <div class="joinrow"><input id="in-code" class="txt code-in" maxlength="5" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="CODICE" aria-label="Codice stanza"><button type="button" class="primary" data-act="room-join">Entra</button></div>
      <div class="err" id="room-err" role="alert"></div></section>
    <section class="panel"><h2>Side bet</h2>${seg("side")}
      <p class="note" id="note-side"></p>
      <details style="margin-top:10px"><summary>Cosa sono le side bet? Cos'\xE8 il 21+3?</summary><div class="sb-explain">${SIDE_HELP}</div></details></section>
    <section class="panel"><h2>Ritmo delle carte</h2>${seg("speed")}</section>
    <section class="panel"><h2>Aiuti per imparare</h2>
      <p class="lbl">Conteggio a vista (running e true count)</p>${seg("showCount")}
      <p class="lbl">Valore +1 / 0 / \u22121 su ogni carta</p>${seg("showCards")}
      <p class="lbl">Consiglio sulla mossa (strategia di base) e sulla puntata</p>${seg("hint")}
      <p class="note">Puoi accenderli e spegnerli anche mentre giochi. Con gli aiuti nascosti conti tutto a mente, come al tavolo vero.</p></section>
    <details><summary>Regole del tavolo</summary><ul>
      <li>Blackjack paga 3 a 2.</li>
      <li>Il dealer sta su tutti i 17, anche soft.</li>
      <li>Raddoppio su due carte, anche dopo lo split.</li>
      <li>Split di carte dello stesso valore, fino a 4 mani. Anche dopo lo split degli assi puoi chiedere carta, raddoppiare o dividere ancora. Un 21 dopo lo split paga 1 a 1, non come blackjack.</li>
      <li>Assicurazione 2 a 1 con asso del dealer. Con asso o dieci scoperti il dealer controlla la carta coperta.</li>
      <li>Nessuna resa. Carta di taglio al 75% del sabot (50% con 1 mazzo).</li>
      <li>Side bet (se attive), da \u20AC1 in su: Perfect Pairs, 21+3, Lucky Ladies, Royal Match, Sotto/Sopra 13, Match the Dealer e Buster. Si pagano subito dopo la distribuzione, tranne Buster che si paga a fine mano. Tabelle di pagamento nella spiegazione delle side bet.</li>
    </ul></details>`;
}
function syncSetup() {
  (document
    .querySelectorAll('[data-act="seg"]')
    .forEach((s) =>
      s.setAttribute("aria-pressed", String(cfg[s.dataset.key]) === s.dataset.val ? "true" : "false"),
    ),
    document
      .querySelectorAll('[data-act="quick"]')
      .forEach((s) =>
        s.setAttribute("aria-pressed", String(cfg[s.dataset.key]) === s.dataset.val ? "true" : "false"),
      ));
  const e = cfg.decks === 1 ? 2 : 6;
  (cfg.others > e && (cfg.others = e),
    ($("#others-n").textContent = cfg.others),
    ($("#others-row").hidden = cfg.mode !== "table"),
    ($("#room-panel").hidden = cfg.mode !== "room"),
    ($("#diff-panel").hidden = cfg.mode !== "table"),
    ($("#sit-btn").textContent = cfg.mode === "room" ? "Crea stanza" : "Siediti al tavolo"),
    document.activeElement !== $("#in-name") && ($("#in-name").value = cfg.name || ""));
  const t = $("#in-cash"),
    a = $("#in-min");
  (document.activeElement !== t && (t.value = cfg.cash || ""),
    document.activeElement !== a && (a.value = cfg.minBet || ""),
    ($("#note-decks").textContent =
      cfg.decks === 1
        ? "Con 1 mazzo si rimescola presto e al massimo siedono 2 altri giocatori."
        : "Pi\xF9 mazzi ci sono, pi\xF9 il conteggio va diviso per i mazzi rimasti (true count)."),
    ($("#note-side").textContent =
      cfg.side === "on"
        ? "Prima di ogni mano puoi puntare anche su Perfect Pairs, 21+3, Lucky Ladies, Royal Match, Sotto/Sopra 13, Match the Dealer e Buster, da \u20AC1 in su. Sono facoltative e hanno un vantaggio del banco pi\xF9 alto: il conteggio non le aiuta."
        : "Solo il blackjack classico, senza puntate accessorie."),
    ($("#note-entry").textContent =
      cfg.entry === "fresh"
        ? "Entri appena il dealer ha rimescolato: tutto il sabot \xE8 ancora da giocare e il conteggio parte da zero."
        : "Il sabot \xE8 gi\xE0 a met\xE0: alcune carte sono uscite e non sai quali. Parti da zero e conta solo da quando ti siedi."),
    ($("#note-mode").textContent =
      cfg.mode === "solo"
        ? "Giochi solo tu contro il dealer: poche carte per volta."
        : cfg.mode === "room"
          ? "Tavolo condiviso: ognuno gioca la propria mano con lo stesso dealer e lo stesso sabot."
          : "Stesse regole, ma ogni mano compaiono anche le carte degli altri giocatori da contare."));
}
function sit() {
  if (cfg.mode === "room") {
    roomCreate();
    return;
  }
  ROOM_UI = !1;
  const e = $("#setup-err");
  if (!(cfg.minBet >= 1)) {
    e.textContent = "Imposta una puntata minima di almeno \u20AC1.";
    return;
  }
  if (!(cfg.cash >= cfg.minBet)) {
    e.textContent = "Il cash-in deve coprire almeno una puntata minima.";
    return;
  }
  ((e.textContent = ""), saveCfg());
  const t = createSession(cfg);
  (show("table"),
    render(),
    runSession(t).catch((a) => {
      (console.error(a), ($("#status").textContent = "Errore: " + a.message));
    }));
}
function cardHTML(e, t) {
  if (e.down) return `<div class="card ${t} down${e.anim ? " deal" : ""}"></div>`;
  const a = RED_SUITS.includes(e.s) ? " red" : "",
    s = hilo(e),
    n =
      cfg.showCards === "on"
        ? `<i class="cb ${s > 0 ? "up" : s < 0 ? "dn" : "zr"}">${s > 0 ? "+1" : s < 0 ? "\u22121" : "0"}</i>`
        : "";
  return `<div class="card ${t}${a}${e.anim ? " deal" : ""}"><span class="r">${e.r}</span><span class="s">${e.s}</span><span class="big">${e.s}</span>${n}</div>`;
}
function totalTag(e) {
  if (!e.cards.length) return "";
  const t = evalHand(e.cards);
  return isNatural(e)
    ? "Blackjack"
    : t.total > 21
      ? "Sballato"
      : (t.soft && t.total < 21 ? "soft " : "") + t.total;
}
function resultPill(e) {
  if (!e.result) return "";
  const t = e.result === "push" ? "push" : e.result === "lose" ? "lose" : "win",
    a = e.result === "push" ? "Pari" : money(e.net, !0);
  return `<span class="pill ${t}">${a}</span>`;
}
function hboxHTML(e, t) {
  const a = V.phase === "play" && V.turn && V.turn.hand === e ? " active" : "",
    s = totalTag(e);
  return `<div class="hbox${a}"><div class="hand">${e.cards.map((n) => cardHTML(n, t)).join("")}</div>
    <div class="hmeta"><span class="chip-sm">${money(e.bet)}</span>${s ? `<span class="tot">${s}</span>` : ""}${resultPill(e)}</div></div>`;
}
function render() {
  (ROOM_UI || (V = S), paint());
}
function paint() {
  if (!V) return;
  (($("#meta").textContent =
    `${V.decks} ${V.decks === 1 ? "mazzo" : "mazzi"} \xB7 min ${money(V.cfg.minBet)}${V.room ? " \xB7 " + V.code : ""}`),
    ($("#bank").textContent = money(V.bank)),
    ($("#shoe-fill").style.width = Math.min(100, (V.used / V.total) * 100) + "%"),
    ($("#shoe-cut").style.left = (V.cutAt / V.total) * 100 + "%"),
    document
      .querySelectorAll(".tog")
      .forEach((d) => d.setAttribute("aria-pressed", cfg[d.dataset.key] === "on" ? "true" : "false")),
    $("#felt").classList.toggle("aid", cfg.showCards === "on"));
  const e = $("#readout");
  if (cfg.showCount === "on") {
    const d = tcInfo();
    e.innerHTML = `<span>Running<b>${sgn(V.rc)}</b></span><span>True<b>${fmtTC(d.tc)}</b></span>`;
  } else e.innerHTML = "";
  const t = V.dealer.cards,
    a = t.filter((d) => !d.down);
  let s = "";
  if (a.length) {
    const d = evalHand(a);
    s =
      !t.some((h) => h.down) && t.length === 2 && d.total === 21
        ? "Blackjack"
        : d.total > 21
          ? "Sballato"
          : (d.soft && d.total < 21 ? "soft " : "") + d.total;
  }
  (($("#dealer-tot").textContent = s),
    ($("#dealer-hand").innerHTML = t.map((d) => cardHTML(d, "l")).join("")));
  const n = V.seats.filter((d) => !d.me),
    o = $("#others"),
    i = V.phase === "bet" && !V.room,
    r = V.phase === "bet" && !!V.room;
  if (
    ((o.hidden = !i && !r && n.length === 0),
    o.classList.toggle("choose", i || (V.phase === "bet" && !!V.room)),
    i)
  ) {
    let d = "";
    for (let g = 1; g <= V.tableSeats; g++) {
      const v = V.seats.find((w) => w.pos === g),
        y = !!(v && v.me);
      d += `<button class="spotbtn${y ? " mine" : ""}${v ? "" : " free"}" data-act="seat" data-pos="${g}" aria-pressed="${y}" aria-label="Posto ${g}: ${y ? "il tuo" : v ? v.name : "libero"}"><b>${g}</b><span>${y ? "Tu \xB7 " + money(V.bet) : v ? v.name : "Libero"}</span></button>`;
    }
    const h = V.sel.length,
      b = maxSpots(),
      k = [1, 2, 3]
        .map(
          (g) =>
            `<button class="spotn" data-act="spots" data-n="${g}" aria-pressed="${g === h}" ${g > b ? "disabled" : ""}>${g}</button>`,
        )
        .join("");
    o.innerHTML = `<p class="cap">Il posto 1 gioca per primo, il ${V.tableSeats} per ultimo e vede pi\xF9 carte prima di decidere. Tocca un posto per sederti.</p>
      <div class="spotcount"><span>Posti da giocare</span><div class="mini-seg">${k}</div></div>${d}`;
  } else if (r) {
    let d = "";
    for (let h = 1; h <= V.tableSeats; h++) {
      const b = V.seats.find((y) => y.pos === h),
        k = !!(b && b.me),
        g = b ? (k ? "Tu" : esc(b.name)) : "Libero",
        v = b
          ? k && V.pending
            ? "sta puntando\u2026"
            : esc((b.status || "").replace("ha puntato ", ""))
          : "";
      d += `<div class="spotbtn${k ? " mine" : ""}${b ? "" : " free"}"><b>${h}</b><span>${g}</span><small>${v}</small></div>`;
    }
    o.innerHTML = `<p class="cap">Tutti al tavolo: vedi chi ha gi\xE0 puntato. Le carte arrivano dopo, per tutti insieme.</p>${d}`;
  } else
    o.innerHTML = n
      .map(
        (
          d,
        ) => `<div class="seat${V.phase === "play" && V.turn && V.turn.seat === d ? " active" : ""}"><div class="seat-head"><span class="nm">${esc(d.name)}</span><span class="pos">Posto ${d.pos}${d.bank != null ? " \xB7 " + money(d.bank) : ""}</span></div>
        ${d.status ? `<div class="sstat">${esc(d.status)}</div>` : ""}${d.hands.map((b) => hboxHTML(b, "s")).join("")}</div>`,
      )
      .join("");
  const l = V.seats.filter((d) => d.me),
    c = l.reduce((d, h) => d + h.hands.length, 0),
    f = c > 6 ? "s" : c > 2 ? "m" : "l",
    m = (d) => (l.length > 1 ? `<div class="spot-tag">Posto ${d.pos}</div>` : "");
  (($("#mine-label").textContent = l.length
    ? `Tu \xB7 ${l.length > 1 ? "Posti" : "Posto"} ${l.map((d) => d.pos).join(", ")}`
    : "Stai guardando il tavolo"),
    ($("#mine-hands").innerHTML = l
      .map(
        (d) =>
          `<div class="spotgrp">${m(d)}<div class="spot-hands">${d.hands.length ? d.hands.map((h) => hboxHTML(h, f)).join("") : `<div class="spot">${V.phase === "bet" ? money(V.bet) : ""}</div>`}</div></div>`,
      )
      .join("")));
  const u = $("#status");
  ((u.textContent = V.msg || ""),
    u.classList.toggle("notice", V.phase === "bet" && !!V.notice),
    renderDock());
  const p = $("#felt");
  if (
    (p.classList.remove("tight"),
    p.scrollHeight > p.clientHeight + 2 && p.classList.add("tight"),
    V.phase === "bet")
  )
    p.scrollTop = 0;
  else if (V.pending && ["action", "next", "insurance"].includes(V.pending.kind)) {
    const d = p.getBoundingClientRect(),
      h = $(".zone.mine").getBoundingClientRect();
    h.bottom > d.bottom && (p.scrollTop += h.bottom - d.bottom + 4);
  }
  for (const d of t) d.anim = !1;
  for (const d of V.seats) for (const h of d.hands) for (const b of h.cards) b.anim = !1;
}
const ACT_IT = { hit: "Carta", stand: "Stai", double: "Raddoppia", split: "Dividi" };
function moveAdvice(e) {
  const t = V.turn,
    a = t && t.hand,
    s = V.dealer.cards;
  if (!a || !s.length || s[0].down) return null;
  const n = cardVal(s[0]),
    o = evalHand(a.cards),
    i = n >= 2 && n <= 6;
  let r = basicStrategy(a.cards, n, !!e.opts.double, !!e.opts.split),
    l;
  return (
    r === "split"
      ? (l =
          a.cards[0].r === "A" || a.cards[0].r === "8"
            ? "assi e otto si dividono sempre"
            : "dividere qui rende pi\xF9 che tenere la coppia")
      : r === "double"
        ? (l = "mano forte contro una carta debole del dealer: metti pi\xF9 fiches")
        : r === "stand"
          ? (l =
              o.total >= 17
                ? "hai gi\xE0 un punteggio alto"
                : "il dealer ha una carta debole e pu\xF2 sballare: lascialo fare")
          : (l =
              o.total <= 11
                ? "non puoi sballare con una carta in pi\xF9"
                : "il dealer ha una carta forte: devi rischiare per battere"),
    { a: r, why: l }
  );
}
function renderDock() {
  const e = $("#controls"),
    t = V.cfg.minBet,
    a = V.pending;
  let s = "";
  if (V.room && V.me && V.me.spec && !a)
    s = `<p class="spec">${V.me.spec === "broke" ? "Hai finito le fiches: resti a guardare gli altri giocare." : "Entri dal prossimo giro: intanto guarda e conta."}</p>
      <button class="ghost wide" data-act="leave">${V.host ? "Chiudi il tavolo per tutti" : "Esci dal tavolo"}</button>`;
  else if (V.phase === "bet" && a && a.kind === "bet") {
    const n = V.sel.length,
      sdOn = sideOnV(V),
      sdT = sideTotal(V),
      o = Math.floor(V.bank / n) - sdT,
      i = CHIPS.map(
        (f) =>
          `<button class="chip c${f}" data-act="bet" data-d="${f}" ${V.bet + f <= o ? "" : "disabled"} aria-label="Aggiungi ${money(f)}"><b>${f}</b></button>`,
      ).join(""),
      r = V.bet < t,
      l = tcInfo().tc,
      c = Math.max(t, Math.min(o, Math.round(t * Math.max(1, Math.min(8, l - 0)))));
    const step = Math.max(1, Math.floor(t / 2)),
      sdRow = (k, name, desc) => {
        const v = V.side[k] || 0;
        return `<div class="sbrow"><div><b>${name}</b><small>${desc}</small></div><div class="mini-stepper"><button type="button" data-act="side" data-k="${k}" data-d="-1" ${v > 0 ? "" : "disabled"} aria-label="Meno ${name}">\u2212</button><b>${money(v)}</b><button type="button" data-act="side" data-k="${k}" data-d="1" ${v < V.bet && (V.bet + sdT + sideStep(v, 1)) * n <= V.bank ? "" : "disabled"} aria-label="Pi\xF9 ${name}">+</button></div></div>`;
      },
      sdHtml = sdOn
        ? `<div class="sidebets"><div class="sb-title">Side bet <small>${sdT ? money(sdT) + (n > 1 ? " per posto" : "") + " puntati" : "facoltative"}</small><button type="button" class="sb-help" data-act="side-open" aria-expanded="${sideListOpen}">${sideListOpen ? "Abbassa ▾" : sdT ? "Modifica" : "Scegli"}</button></div>${
            sideListOpen
              ? `<div class="sb-list"><button type="button" class="sb-help" data-act="side-help" aria-expanded="${sideHelpOpen}">${sideHelpOpen ? "Nascondi spiegazione" : "Come funzionano?"}</button>${sideHelpOpen ? `<div class="sb-explain">${SIDE_HELP}</div>` : ""}${SIDE_DEF.map((d) => sdRow(d.k, d.name, d.desc)).join("")}${cfg.hint === "on" ? '<p class="sugline">Consiglio: le side bet rendono meno del gioco base e il conteggio Hi-Lo non le aiuta. Se vuoi allenarti a contare, lasciale a zero.</p>' : ""}<button type="button" class="sb-help sb-close" data-act="side-open">Abbassa il menu ▾</button></div>`
              : ""
          }</div>`
        : "";
    s = `${cfg.hint === "on" ? `<p class="sugline">Consiglio: <b>${money(c)}</b> \u2014 true count ${fmtTC(l)}${l < 2 ? ": tieni la puntata minima" : ": il mazzo ti favorisce, puoi alzare"}.</p>` : ""}<div class="bet-row">${i}</div>${sdHtml}
    <div class="bet-tools">
      <button data-act="bet" data-d="clear" ${V.bet ? "" : "disabled"}>Azzera</button>
      <button data-act="bet" data-d="last" ${V.lastBet >= t && V.lastBet <= o && V.bet !== V.lastBet ? "" : "disabled"}>Ripeti ${money(Math.max(t, Math.min(o, V.lastBet || t)))}</button>
      <button data-act="bet" data-d="all" ${V.bet < o ? "" : "disabled"}>Tutto ${money(o)}</button>
    </div>
    <button class="primary wide" data-act="deal" ${r ? "disabled" : ""}>${r ? `Puntata minima ${money(t)}` : `Distribuisci \xB7 ${money(V.bet)}${n > 1 ? ` su ${n} posti` : ""}`}</button>`;
  } else if (a && a.kind === "insurance") {
    const n = tcInfo().tc,
      o = n >= 3;
    s = `${cfg.hint === "on" ? `<p class="sugline">Consiglio: <b>${o ? "s\xEC" : "no"}</b> \u2014 ${o ? "il true count \xE8 alto (+" + fmtDec(n) + "): restano molte carte da 10" : "con conteggio basso l'assicurazione costa pi\xF9 di quanto rende"}.</p>` : ""}<div class="pair"><button class="primary" data-act="ins" data-v="1">Assicurazione ${money(a.opts.cost)}</button><button data-act="ins" data-v="0">No grazie</button></div>`;
  } else if (a && a.kind === "action") {
    const n = cfg.hint === "on" ? moveAdvice(a) : null,
      o = (i) => (n && n.a === i ? " sug" : "");
    s = `${n ? `<p class="sugline">Consiglio: <b>${ACT_IT[n.a]}</b> \u2014 ${esc(n.why)}</p>` : ""}<div class="actions">
      <button class="hit${o("hit")}" data-act="move" data-v="hit">Carta</button>
      <button class="stand${o("stand")}" data-act="move" data-v="stand">Stai</button>
      <button class="${o("double").trim()}" data-act="move" data-v="double" ${a.opts.double ? "" : "disabled"}>Raddoppia</button>
      <button class="${o("split").trim()}" data-act="move" data-v="split" ${a.opts.split ? "" : "disabled"}>Dividi</button></div>`;
  } else
    a && a.kind === "next"
      ? (s = roundSummary(V) + '<button class="primary wide" data-act="next">Prossima mano</button>')
      : a &&
        a.kind === "broke" &&
        (s = '<button class="primary wide" data-act="leave">Lascia il tavolo</button>');
  e.innerHTML = s;
}
UI.draw = render;
const AT_RISK = ["dealing", "insurance", "peek", "play", "dealer"];
function openLeave() {
  !S ||
    S.cancelled ||
    (($("#sheet-msg").textContent = AT_RISK.includes(S.phase)
      ? "Hai una mano in corso: se ti alzi adesso perdi la puntata. Poi ti chiedo il conteggio."
      : "Prima di andare ti chiedo il conteggio che hai tenuto."),
    ($("#sheet").hidden = !1));
}
function confirmLeave() {
  (($("#sheet").hidden = !0),
    (S.forfeited = AT_RISK.includes(S.phase)),
    leave(),
    (guessNeg = !1),
    ($("#guess-in").value = ""),
    ($("#sign").textContent = "+"),
    ($("#count-err").textContent = ""),
    ($("#count-sub").textContent =
      S.shuffles > 1
        ? "Scrivi la somma Hi-Lo di tutte le carte scoperte dall'ultimo cambio mazzo."
        : "Scrivi la somma Hi-Lo di tutte le carte scoperte da quando ti sei seduto."),
    show("count"));
  try {
    $("#guess-in").focus();
  } catch {}
}
function submitGuess() {
  const e = $("#guess-in").value.replace(/\D/g, "");
  if (e === "") {
    $("#count-err").textContent = "Scrivi il numero, oppure scegli di non inserirlo.";
    return;
  }
  const t = parseInt(e, 10);
  showResult(t === 0 ? 0 : guessNeg ? -t : t);
}
function showResult(e) {
  if (ROOM_UI && RM && RM.done) return roomResult(e);
  const t = S.rc,
    { rem: a, tc: s } = tcInfo();
  S.logged ||
    ((S.logged = !0),
    addHist({
      t: Date.now(),
      decks: S.decks,
      mode: S.cfg.mode,
      entry: S.cfg.entry,
      spots: S.sel.length,
      minBet: S.cfg.minBet,
      rounds: S.rounds,
      start: S.startBank,
      end: S.bank,
      real: t,
      tc: s,
      guess: e,
      forfeited: !!S.forfeited,
      aids: cfg.showCount === "on" || cfg.showCards === "on",
    }));
  let n = "",
    o,
    i;
  e === null
    ? ((o = "Conteggio non inserito"), (i = `Il conteggio reale era ${sgn(t)}.`))
    : e === t
      ? ((n = "ok"), (o = "Conteggio esatto"), (i = `Avevi ${sgn(e)}, come il sabot.`))
      : ((n = "bad"),
        (o = `Scarto di ${Math.abs(e - t)}`),
        (i = `Hai detto ${sgn(e)}, il conteggio reale era ${sgn(t)}.`));
  const r = S.bank - S.startBank;
  (($("#result-body").innerHTML = `
    <p class="eyebrow">Hai lasciato il tavolo</p>
    <div class="verdict ${n}">${o}</div>
    <p class="sub" style="color:var(--muted)">${i}</p>
    ${S.forfeited ? '<p class="note">Hai lasciato una mano in corso: la puntata \xE8 andata persa.</p>' : ""}
    <div class="rows">
      <div class="row"><span>Conteggio reale</span><b>${sgn(t)}</b></div>
      <div class="row"><span>Il tuo conteggio</span><b>${e === null ? "\u2014" : sgn(e)}</b></div>
      <div class="row"><span>Mazzi rimasti nel sabot (circa)</span><b>${fmtDec(a)}</b></div>
      <div class="row"><span>True count (circa)</span><b>${fmtTC(s)}</b></div>
      <div class="row"><span>Carte scoperte</span><b>${S.counted.length}</b></div>
      <div class="row"><span>Mani giocate</span><b>${S.rounds}</b></div>
      <div class="row"><span>Fiches</span><b>${money(S.startBank)} \u2192 ${money(S.bank)} <small style="font-size:13px;color:var(${r >= 0 ? "--win" : "--lose"})">(${money(r, !0)})</small></b></div>
    </div>
    <div class="stack">
      <button class="primary wide" data-act="again">Rigioca con le stesse impostazioni</button>
      <button class="ghost wide" data-act="settings">Cambia impostazioni</button>
      <button class="ghost wide" data-act="hist">Vedi lo storico</button>
    </div>`),
    ($("#screen-result").scrollTop = 0),
    show("result"));
}
function rememberSeats() {
  ((cfg.spots = S.sel.length), (cfg.seatPref = S.sel.slice()), saveCfg());
}
const SIDE_HELP = `<p><b>Cosa sono.</b> Sono puntate extra, facoltative e separate dalla mano. Si decidono prima di distribuire e vincono o perdono per conto loro. Puoi puntare anche solo \u20AC1 su ognuna (non oltre la puntata principale). Tutte si pagano subito dopo le prime carte, tranne Buster che si paga a fine mano.</p>
<p><b>Perfect Pairs.</b> Le tue prime due carte sono una coppia (stesso valore, ad esempio due 7).<br>\u2022 Mista (colori diversi, es. 7\u2660 e 7\u2665): 6 a 1<br>\u2022 Colorata (stesso colore, seme diverso, es. 7\u2665 e 7\u2666): 12 a 1<br>\u2022 Perfetta (stesso seme, solo con pi\xF9 mazzi): 25 a 1</p>
<p><b>21+3.</b> Blackjack (21) + poker a 3 carte: si usano le tue due carte pi\xF9 quella scoperta del dealer, come una mano di poker.<br>\u2022 Colore (3 carte dello stesso seme): 5 a 1<br>\u2022 Scala (3 valori consecutivi, anche A-2-3 o Q-K-A): 10 a 1<br>\u2022 Tris (3 carte uguali): 30 a 1<br>\u2022 Scala colore: 40 a 1<br>\u2022 Tris colorato (identiche, stesso seme): 100 a 1<br>Esempio: hai 5\u2665 e 9\u2665, il dealer mostra K\u2665: tre cuori = colore, vinci 5 volte la puntata.</p>
<p><b>Lucky Ladies.</b> Le tue prime due carte fanno 20. Un 20 qualsiasi paga 4 a 1, dello stesso seme 10 a 1, due carte identiche 19 a 1, due dame di cuori 125 a 1.</p>
<p><b>Royal Match.</b> Le tue prime due carte sono dello stesso seme: 5 a 2. Re e regina dello stesso seme: 25 a 1.</p>
<p><b>Sotto 13 / Sopra 13.</b> Scommetti che il totale delle prime due carte (asso = 1) sia sotto o sopra 13. Il 13 esatto perde per entrambe. Paga 1 a 1.</p>
<p><b>Match the Dealer.</b> Una delle tue prime due carte ha lo stesso valore di quella scoperta del dealer: 4 a 1, se anche il seme \xE8 uguale 9 a 1. Se lo hanno entrambe le carte i premi si sommano.</p>
<p><b>Buster.</b> Scommetti che il dealer sballi. Pi\xF9 carte ha usato per sballare, pi\xF9 paga: 3 carte 2 a 1, 4 carte 4 a 1, 5 carte 9 a 1, 6 carte 20 a 1, 7 carte 50 a 1, 8 o pi\xF9 200 a 1.</p>
<p><b>Conviene?</b> \xC8 fortuna pura, con vantaggio del banco pi\xF9 alto del blackjack, e il conteggio Hi-Lo non aiuta. Se ti alleni a contare, lasciale a zero.</p>`;
let sideHelpOpen = !1,
  sideListOpen = !1;
function roundSummary(v) {
  const mine = v.seats.filter((x) => x.me),
    multi = mine.length > 1,
    RES = { win: "Vinta", lose: "Persa", push: "Pari", bj: "Blackjack" },
    rows = [];
  for (const m of mine)
    m.hands.forEach((h, i) => {
      const t = evalHand(h.cards.filter((c) => !c.down)).total;
      rows.push({
        l: `${multi ? "Posto " + m.pos + " \xB7 " : ""}Mano${m.hands.length > 1 ? " " + (i + 1) : ""}`,
        d: `${t > 21 ? "sballato" : t} \xB7 puntata ${money(h.bet)}${h.doubled ? " (raddoppiata)" : ""}`,
        r: RES[h.result] || "",
        n: h.net,
      });
    });
  const ins = v.me ? v.me.insNet : v.insNet,
    lines = (v.me ? v.me.sideLines : v.sideLines) || [],
    total = v.me ? v.me.roundNet : v.roundNet;
  ins && rows.push({ l: "Assicurazione", d: "", r: ins > 0 ? "Vinta" : "Persa", n: ins });
  for (const l of lines) rows.push({ l: l.name, d: l.txt, r: l.net > 0 ? "Vinta" : "Persa", n: l.net });
  if (!rows.length) return "";
  const cls = (n) => (n > 0 ? "win" : n < 0 ? "lose" : "push");
  const tot = `<div class="rsrow tot"><b>Totale mano</b><span class="rs-${cls(total || 0)}">${money(total || 0, !0)}</span></div>`;
  return `<div class="rsum"><div class="rsum-t">Cosa hai vinto e perso</div>${tot}${rows
    .map(
      (r) =>
        `<div class="rsrow"><div><b>${esc(r.l)}</b><small>${esc(r.d)}</small></div><span class="rs-${cls(r.n)}">${r.r ? r.r + " " : ""}${money(r.n, !0)}</span></div>`,
    )
    .join("")}</div>`;
}
const sideOnV = (t) => t.cfg.side === !0 || t.cfg.side === "on",
  sideTotal = (t) => (sideOnV(t) && t.side ? sideSum(t.side) : 0),
  sideStep = (v, d) => (d > 0 ? (v < 10 ? 1 : 5) : v <= 10 ? 1 : 5);
function adjustSide(k, d) {
  const t = ROOM_UI ? V : S,
    n = Math.max(1, t.sel.length),
    cur = t.side[k] || 0;
  let v = cur + d * sideStep(cur, d);
  (v = Math.max(0, Math.min(t.bet, v)),
    d > 0 && (t.bet + sideTotal(t) - cur + v) * n > t.bank && (v = cur),
    (t.side[k] = v),
    ROOM_UI && RM && (RM.side = t.side),
    render());
}
function adjustBet(e) {
  const t = ROOM_UI ? V : S,
    a = t.cfg.minBet,
    s = Math.floor(t.bank / Math.max(1, t.sel.length)) - sideTotal(t);
  (e === "clear"
    ? (t.bet = 0)
    : e === "all"
      ? (t.bet = s)
      : e === "last"
        ? (t.bet = Math.max(a, Math.min(s, t.lastBet || a)))
        : (t.bet = Math.min(s, Math.max(0, t.bet + Number(e)))),
    ROOM_UI && RM && (RM.bet = t.bet),
    render());
}
(document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act]");
  if (!t || t.disabled) return;
  const a = ROOM_UI ? V : S,
    s = t.dataset.act,
    n = a && a.pending;
  switch (s) {
    case "seg": {
      const o = t.dataset.val;
      ((cfg[t.dataset.key] = /^\d+$/.test(o) ? Number(o) : o), syncSetup());
      break;
    }
    case "quick":
      ((cfg[t.dataset.key] = Number(t.dataset.val)), syncSetup());
      break;
    case "others":
      ((cfg.others = Math.max(1, Math.min(cfg.decks === 1 ? 2 : 6, cfg.others + Number(t.dataset.d)))),
        syncSetup());
      break;
    case "sit":
      sit();
      break;
    case "leave":
      ROOM_UI ? roomOpenLeave() : openLeave();
      break;
    case "stay":
      $("#sheet").hidden = !0;
      break;
    case "leave-ok":
      ROOM_UI ? roomConfirmLeave() : confirmLeave();
      break;
    case "bet":
      n && n.kind === "bet" && adjustBet(t.dataset.d);
      break;
    case "side-open":
      ((sideListOpen = !sideListOpen), render());
      break;
    case "side-help":
      ((sideHelpOpen = !sideHelpOpen), render());
      break;
    case "side":
      n && n.kind === "bet" && adjustSide(t.dataset.k, Number(t.dataset.d));
      break;
    case "deal":
      n && n.kind === "bet" && a.bet >= a.cfg.minBet && n.resolve();
      break;
    case "ins":
      n && n.kind === "insurance" && n.resolve(t.dataset.v === "1");
      break;
    case "move":
      n && n.kind === "action" && n.resolve(t.dataset.v);
      break;
    case "next":
      n && n.kind === "next" && n.resolve();
      break;
    case "seat":
      S && moveSeat(Number(t.dataset.pos)) && rememberSeats();
      break;
    case "spots":
      S && setSpots(Number(t.dataset.n)) && rememberSeats();
      break;
    case "tog":
      ((cfg[t.dataset.key] = cfg[t.dataset.key] === "on" ? "off" : "on"), saveCfg(), V && paint());
      break;
    case "sign":
      ((guessNeg = !guessNeg), ($("#sign").textContent = guessNeg ? "\u2212" : "+"), $("#guess-in").focus());
      break;
    case "count-ok":
      submitGuess();
      break;
    case "count-skip":
      showResult(null);
      break;
    case "again":
      sit();
      break;
    case "hist":
      openHist($("#screen-result").hidden ? "setup" : "result");
      break;
    case "hist-back":
      show(histBack);
      break;
    case "hist-clear":
      (histConfirm ? (saveHist([]), (histConfirm = !1), updateHistBtn()) : (histConfirm = !0), renderHist());
      break;
    case "settings":
      (ROOM_UI && roomReset(), show("setup"), syncSetup());
      break;
    case "room-join":
      roomJoin();
      break;
    case "room-start":
      RM && RM.isHost && roomStart();
      break;
    case "room-share":
      roomShare();
      break;
  }
}),
  buildSetup(),
  $("#in-cash").addEventListener("input", (e) => {
    ((cfg.cash = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0), syncSetup());
  }),
  $("#in-min").addEventListener("input", (e) => {
    ((cfg.minBet = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0), syncSetup());
  }),
  $("#guess-in").addEventListener("input", (e) => {
    (/[-−–]/.test(e.target.value) && ((guessNeg = !0), ($("#sign").textContent = "\u2212")),
      (e.target.value = e.target.value.replace(/\D/g, "")),
      ($("#count-err").textContent = ""));
  }),
  $("#guess-in").addEventListener("keydown", (e) => {
    e.key === "Enter" && submitGuess();
  }),
  syncSetup(),
  updateHistBtn(),
  show("home"));
const CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  genCode = () =>
    Array.from({ length: 5 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join(""),
  netImpl = () => window.__net || Net;
let RM = null;
const NET_ERR = {
    nolib: "Il modulo di rete non si \xE8 caricato. Controlla la connessione e riapri l'app.",
    "peer-unavailable": "Codice non trovato: controlla le lettere e che la stanza sia ancora aperta.",
    timeout:
      "Nessuna risposta dalla stanza. Controlla il codice. Se siete su reti diverse o con i dati mobili, apri \xABRete\xBB dalla Home, imposta un relay e rifai la prova.",
    network: "Rete non raggiungibile. Riprova tra poco.",
    "server-error": "Il servizio di incontro non risponde. Riprova tra poco.",
    "socket-error": "Il servizio di incontro non risponde. Riprova tra poco.",
    "socket-closed": "Il servizio di incontro non risponde. Riprova tra poco.",
  },
  netErrText = (e) => NET_ERR[e] || "Collegamento non riuscito (" + e + ").";
function roomSetupErr(e) {
  $("#room-err").textContent = e || "";
}
function roomReset() {
  if (RM)
    try {
      clearTimeout(RM.joinTimer);
    } catch {}
  ((RM = null), (ROOM_UI = !1));
}
function roomBack(e) {
  const t = RM && RM.net;
  (setTimeout(() => {
    try {
      t && t.close();
    } catch {}
  }, 400),
    roomReset(),
    typeof S != "undefined" && S && S.room && (S = null),
    show("setup"),
    syncSetup(),
    roomSetupErr(e || ""));
}
function roomCreate() {
  const e = $("#setup-err");
  if (!(cfg.minBet >= 1)) {
    e.textContent = "Imposta una puntata minima di almeno \u20AC1.";
    return;
  }
  if (!(cfg.cash >= cfg.minBet)) {
    e.textContent = "Il cash-in deve coprire almeno una puntata minima.";
    return;
  }
  ((e.textContent = ""),
    roomSetupErr(""),
    (cfg.name = ($("#in-name").value || "").trim().slice(0, 14)),
    saveCfg(),
    openHostRoom(0));
}
function openHostRoom(e) {
  const t = genCode();
  ((RM = {
    isHost: !0,
    code: t,
    pid: "h",
    conns: {},
    pending: null,
    base: 0,
    lastShuffles: -1,
    bet: cfg.minBet,
    started: !1,
    done: !1,
    status: "Apro la stanza\u2026",
  }),
    (ROOM_UI = !0));
  const a = {
    send: (s, n) => {
      if (s === "h") roomClientMsg(n);
      else {
        const o = RM && RM.conns[s];
        o && o.send(n);
      }
    },
  };
  (createRoom(Object.assign({}, cfg, { code: t, askCount: cfg.askCount !== "off" }), a),
    (RM.send = (s) => roomMsg("h", s)),
    (RM.net = netImpl().host(t, {
      onReady() {
        ((RM.ready = !0), (RM.status = ""));
        const s = roomAdd(cfg.name, !0, "h");
        ((RM.myName = s.p.name), show("lobby"));
      },
      onConn(s) {
        hostAccept(s);
      },
      onError(s) {
        if (s === "unavailable-id" && e < 4) {
          try {
            RM.net.close();
          } catch {}
          (roomReset(), openHostRoom(e + 1));
          return;
        }
        RM && !RM.ready && roomBack(netErrText(s));
      },
    })),
    show("lobby"),
    renderLobby());
}
function hostAccept(e) {
  ((e.onmessage = (t) => {
    if (!(!RM || RM.done))
      if (e.pid) roomMsg(e.pid, t);
      else {
        if (!t || t.t !== "join") return;
        const a = roomAdd(t.name, !1);
        if (a.err) {
          (e.send({ t: "deny", why: a.err }), setTimeout(() => e.close(), 300));
          return;
        }
        ((e.pid = a.p.id),
          (RM.conns[e.pid] = e),
          e.send({ t: "welcome", pid: e.pid, code: RM.code }),
          roomBroadcast());
      }
  }),
    (e.onclose = () => {
      e.pid && RM && !RM.done && roomLeave(e.pid);
    }));
}
function roomJoin() {
  const e = ($("#in-code").value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(e)) {
    roomSetupErr("Il codice ha 5 caratteri (lettere e numeri).");
    return;
  }
  (roomSetupErr(""),
    (cfg.name = ($("#in-name").value || "").trim().slice(0, 14)),
    saveCfg(),
    (RM = {
      isHost: !1,
      code: e,
      pid: null,
      pending: null,
      base: 0,
      lastShuffles: -1,
      bet: null,
      started: !1,
      done: !1,
      status: "Mi collego alla stanza\u2026",
    }),
    (ROOM_UI = !0),
    (RM.send = (t) => {
      RM && RM.conn && RM.conn.send(t);
    }),
    (RM.joinTimer = setTimeout(() => {
      RM && !RM.pid && roomBack(netErrText("timeout"));
    }, 2e4)),
    (RM.net = netImpl().join(e, {
      onOpen(t) {
        RM &&
          ((RM.conn = t),
          (t.onmessage = roomClientMsg),
          (t.onclose = () => {
            RM &&
              !RM.done &&
              (RM.pid
                ? roomFinish("Connessione persa: il tavolo non \xE8 pi\xF9 raggiungibile.")
                : roomBack("La stanza non risponde."));
          }),
          t.send({ t: "join", name: cfg.name }));
      },
      onError(t) {
        RM && !RM.pid && roomBack(netErrText(t));
      },
    })),
    show("lobby"),
    renderLobby());
}
function roomClientMsg(e) {
  !RM ||
    !e ||
    (e.t === "welcome"
      ? ((RM.pid = e.pid), clearTimeout(RM.joinTimer), (RM.status = ""))
      : e.t === "deny"
        ? roomBack(e.why || "Non puoi entrare in questa stanza.")
        : e.t === "state"
          ? RM.done || roomState(e)
          : e.t === "bye"
            ? (RM.finals = e.finals)
            : e.t === "end" &&
              ((RM.finals = e.finals),
              roomFinish(RM.isHost ? "Hai chiuso il tavolo." : e.reason || "Il tavolo \xE8 stato chiuso.")));
}
const visRc = (e) => {
  let t = 0;
  for (const a of e.dealer) a.down || (t += hilo(a));
  for (const a of e.seats) for (const s of a.hands) for (const n of s.cards) n.down || (t += hilo(n));
  return t;
};
function roomState(e) {
  ((RM.snap = e), (RM.askCount = e.askCount));
  {
    const a = e.seats.find((s) => s.pid === RM.pid);
    a && (RM.myName = a.name);
  }
  (RM.lastShuffles !== e.shuffles &&
    ((RM.base = RM.lastShuffles === -1 && e.phase !== "lobby" ? e.rc - visRc(e) : 0),
    (RM.lastShuffles = e.shuffles)),
    e.phase !== "lobby" && (RM.started = !0));
  const t = e.ask;
  (t
    ? (!RM.pending || RM.pending.id !== t.id) &&
      (t.kind === "bet" && ((RM.bet = t.opts.last), (RM.side = Object.assign(sideZero(), t.opts.sideLast))),
      (RM.pending = {
        id: t.id,
        kind: t.kind,
        opts: t.opts,
        resolve(a) {
          !RM ||
            !RM.pending ||
            RM.pending.id !== t.id ||
            (t.kind === "bet" && a === void 0 && (a = Object.assign({ b: RM.bet }, RM.side)),
            (RM.pending = null),
            V && ((V.pending = null), paint()),
            RM.send({ t: "ans", id: t.id, v: a }));
        },
      }))
    : (RM.pending = null),
    buildView(e),
    e.phase === "lobby"
      ? (renderLobby(), $("#screen-lobby").hidden && show("lobby"))
      : ($("#screen-table").hidden && show("table"), paint()));
}
function buildView(e) {
  const t = e.seats.map((o) => ({
      pid: o.pid,
      pos: o.pos,
      name: o.name,
      host: o.host,
      bank: o.bank,
      status: o.status,
      me: o.pid === RM.pid,
      hands: o.hands,
    })),
    a = t.find((o) => o.me);
  let s = e.msg;
  if (e.phase === "roundEnd" && a && a.hands.length && e.me.roundNet != null) {
    const o = e.me.roundNet;
    s =
      (e.dealerBJ ? "Il dealer ha blackjack. " : "") +
      (o > 0 ? `Mano vinta ${money(o, !0)}` : o < 0 ? `Mano persa ${money(o, !0)}` : "Mano pari") +
      (e.me.sideTxt ? ` \xB7 side bet ${money(e.me.sideNet, !0)} incluse` : "");
  }
  const n = e.turn && t.find((o) => o.pid === e.turn.pid);
  return (
    (V = {
      room: !0,
      code: e.code,
      tableSeats: TABLE_SEATS,
      sel: a ? [a.pos] : [],
      cfg: { minBet: e.minBet, decks: e.decks, askCount: e.askCount, side: !!(e.cfg && e.cfg.side) },
      side: RM.side || sideZero(),
      decks: e.decks,
      total: e.total,
      used: e.used,
      cutAt: e.cutAt,
      shoe: { length: e.shoeLen },
      rc: e.rc - RM.base,
      shuffles: e.shuffles,
      bank: e.me.bank,
      startBank: e.me.startBank,
      bet: RM.bet != null ? RM.bet : e.minBet,
      lastBet: e.me.bet,
      rounds: e.me.rounds,
      seats: t,
      dealer: { cards: e.dealer },
      phase: e.phase,
      msg: s,
      notice: e.notice,
      pending: RM.pending,
      me: e.me,
      host: e.me.host,
      cfgS: e.cfg,
      turn: n ? { seat: n, hand: n.hands[e.turn.hi] } : null,
    }),
    V
  );
}
function renderLobby() {
  if (!RM) return;
  const e = RM.snap,
    t = $("#lobby-body"),
    a = e ? e.seats : [],
    s = e ? e.cfg : null,
    n = s
      ? `${s.decks} ${s.decks === 1 ? "mazzo" : "mazzi"} \xB7 cash ${money(s.cash)} \xB7 puntata minima ${money(s.minBet)} \xB7 ${s.entry === "fresh" ? "sabot nuovo" : "a sorpresa"} \xB7 conteggio finale ${s.askCount ? "richiesto" : "non richiesto"}`
      : "";
  t.innerHTML = `<p class="eyebrow">Stanza</p>
    <div class="roomcode" aria-label="Codice stanza">${esc(RM.code)}</div>
    ${RM.status ? `<p class="note">${esc(RM.status)}</p>` : '<button class="ghost wide" data-act="room-share">Condividi il codice</button>'}
    ${a.length ? `<h3 class="h-sub">Al tavolo (${a.length}/${V && V.decks === 1 ? 3 : 7})</h3><div class="plist">${a.map((o) => `<div class="prow"><b>${esc(o.name)}</b>${o.pid === RM.pid ? "<small>tu</small>" : ""}${o.host ? "<em>host</em>" : ""}</div>`).join("")}</div>` : ""}
    ${n ? `<p class="note">${esc(n)}</p>` : ""}
    ${
      RM.isHost
        ? `<button class="primary wide" data-act="room-start" ${RM.ready ? "" : "disabled"}>Inizia la partita</button>
      <p class="note">Gli amici possono entrare anche a partita iniziata: giocano dal giro dopo.</p>`
        : `<p class="note">${RM.pid ? "In attesa che chi ha creato la stanza inizi la partita\u2026" : ""}</p>`
    }
    <button class="ghost wide" data-act="leave">${RM.isHost ? "Chiudi la stanza" : "Esci"}</button>`;
}
function roomShare() {
  const e = `Vieni al mio tavolo Hi-Lo! Codice stanza: ${RM.code}`;
  try {
    if (navigator.share) {
      navigator.share({ text: e }).catch(() => {});
      return;
    }
  } catch {}
  try {
    (navigator.clipboard.writeText(RM.code),
      (RM.status = "Codice copiato."),
      renderLobby(),
      setTimeout(() => {
        RM && ((RM.status = ""), renderLobby());
      }, 1500));
  } catch {}
}
function roomOpenLeave() {
  if (!RM || RM.done) return;
  let e;
  (RM.isHost
    ? (e = "Se lasci il tavolo non esiste pi\xF9 e il gioco termina per tutti.")
    : RM.started
      ? (e =
          (V && V.me && !V.me.spec && ROOM_AT_RISK.includes(V.phase)
            ? "Hai una mano in corso: se esci adesso perdi la puntata. "
            : "") + (RM.askCount ? "Poi ti chiedo il conteggio." : ""))
      : (e = "Vuoi uscire dalla stanza?"),
    ($("#sheet-msg").textContent = e.trim() || "Vuoi uscire dal tavolo?"),
    ($("#sheet").hidden = !1));
}
function roomConfirmLeave() {
  if ((($("#sheet").hidden = !0), !(!RM || RM.done))) {
    if (RM.isHost) {
      (roomEnd("Chi ha creato la stanza ha chiuso il tavolo."), roomFinish("Hai chiuso il tavolo."));
      return;
    }
    ((RM.forfeited = !!(V && V.me && !V.me.spec && ROOM_AT_RISK.includes(V.phase))),
      RM.send({ t: "leave" }),
      roomFinish("Hai lasciato il tavolo."));
  }
}
function roomFinish(e) {
  if (!RM || RM.done) return;
  ((RM.done = !0), (RM.reason = e), (RM.pending = null));
  const t = RM.net;
  if (
    (setTimeout(() => {
      try {
        t && t.close();
      } catch {}
    }, 600),
    !RM.started)
  ) {
    roomBack(e);
    return;
  }
  if (
    ((guessNeg = !1),
    ($("#guess-in").value = ""),
    ($("#sign").textContent = "+"),
    ($("#count-err").textContent = ""),
    ($("#count-sub").textContent =
      RM.snap && RM.snap.shuffles > 1
        ? "Scrivi la somma Hi-Lo di tutte le carte scoperte dall'ultimo cambio mazzo."
        : "Scrivi la somma Hi-Lo di tutte le carte scoperte da quando sei entrato."),
    RM.askCount)
  ) {
    show("count");
    try {
      $("#guess-in").focus();
    } catch {}
  } else roomResult(null);
}
function roomResult(e) {
  const t = V ? V.rc : 0,
    a = V ? tcInfo() : { rem: 0, tc: 0 },
    s = (RM.finals || []).find((p) => p.name === RM.myName),
    n = V ? V.startBank : 0,
    o = s ? s.end : V ? V.bank : 0,
    i = o - n,
    r = V ? V.rounds : 0;
  let l = "",
    c = "Partita finita",
    f = esc(RM.reason || "");
  RM.askCount &&
    (e === null
      ? ((c = "Conteggio non inserito"), (f += ` Il conteggio reale era ${sgn(t)}.`))
      : e === t
        ? ((l = "ok"), (c = "Conteggio esatto"), (f += ` Avevi ${sgn(e)}, come il sabot.`))
        : ((l = "bad"),
          (c = `Scarto di ${Math.abs(e - t)}`),
          (f += ` Hai detto ${sgn(e)}, il conteggio reale era ${sgn(t)}.`)));
  const m = (RM.finals || []).slice().sort((p, d) => d.end - p.end),
    u = m.length
      ? `<h3 class="h-sub">Classifica del tavolo</h3><div class="plist">${m
          .map((p, d) => {
            const h = p.end - p.start;
            return `<div class="prow${p.name === RM.myName ? " me" : ""}"><span class="rk">${d + 1}</span><b>${esc(p.name)}</b>${p.host ? "<em>host</em>" : ""}${p.left ? "<small>uscito</small>" : ""}
      <span class="rr">${money(p.end)} <small style="color:var(${h >= 0 ? "--win" : "--lose"})">${money(h, !0)}</small></span></div>`;
          })
          .join("")}</div>`
      : "";
  (($("#result-body").innerHTML = `
    <p class="eyebrow">Tavolo con amici</p>
    <div class="verdict ${l}">${c}</div>
    <p class="sub" style="color:var(--muted)">${f}</p>
    ${RM.forfeited ? '<p class="note">Hai lasciato una mano in corso: la puntata \xE8 andata persa.</p>' : ""}
    <div class="rows">
      ${
        RM.askCount
          ? `<div class="row"><span>Conteggio reale</span><b>${sgn(t)}</b></div>
      <div class="row"><span>Il tuo conteggio</span><b>${e === null ? "\u2014" : sgn(e)}</b></div>
      <div class="row"><span>True count (circa)</span><b>${fmtTC(a.tc)}</b></div>`
          : ""
      }
      <div class="row"><span>Mani giocate</span><b>${r}</b></div>
      <div class="row"><span>Fiches</span><b>${money(n)} \u2192 ${money(o)} <small style="font-size:13px;color:var(${i >= 0 ? "--win" : "--lose"})">(${money(i, !0)})</small></b></div>
    </div>
    ${u}
    <div class="stack">
      <button class="primary wide" data-act="settings">Torna all'inizio</button>
      <button class="ghost wide" data-act="hist">Vedi lo storico</button>
    </div>`),
    (r > 0 || n !== o) &&
      addHist({
        t: Date.now(),
        decks: V.decks,
        mode: "room",
        entry: V.cfgS ? V.cfgS.entry : "fresh",
        spots: 1,
        minBet: V.cfg.minBet,
        rounds: r,
        start: n,
        end: o,
        real: t,
        tc: a.tc,
        guess: RM.askCount ? e : null,
        forfeited: !!RM.forfeited,
        aids: cfg.showCount === "on" || cfg.showCards === "on",
      }),
    ($("#screen-result").scrollTop = 0),
    show("result"));
}
let NETC = NetCfg.load();
function netRender() {
  (document
    .querySelectorAll('[data-act="net-mode"]')
    .forEach((e) => e.setAttribute("aria-pressed", String(e.dataset.val === NETC.mode))),
    ($("#net-f-metered").hidden = NETC.mode !== "metered"),
    ($("#net-f-manual").hidden = NETC.mode !== "manual"),
    ($("#net-app").value = NETC.app),
    ($("#net-key").value = NETC.key),
    ($("#net-url").value = NETC.url),
    ($("#net-user").value = NETC.user),
    ($("#net-cred").value = NETC.cred),
    ($("#net-share").hidden = NETC.mode === "auto"),
    ($("#net-note").textContent =
      NETC.mode === "auto"
        ? "Usa server pubblici gratuiti: vanno bene sulla stessa rete Wi\u2011Fi, ma con i dati mobili possono non bastare."
        : NETC.mode === "metered"
          ? "Inserisci i dati del tuo account Metered (gratuito)."
          : "Per chi ha gi\xE0 un server TURN (es. coturn)."));
}
function netSave() {
  ((NETC = Object.assign(NETC, {
    app: $("#net-app").value.trim(),
    key: $("#net-key").value.trim(),
    url: $("#net-url").value.trim(),
    user: $("#net-user").value.trim(),
    cred: $("#net-cred").value.trim(),
  })),
    NetCfg.save(NETC));
}
async function netTest() {
  netSave();
  const e = $("#net-test"),
    t = $("#net-res");
  ((e.disabled = !0), (t.textContent = "Controllo in corso (fino a 8 secondi)\u2026"));
  let a;
  try {
    a = await netImpl().test();
  } catch {
    a = null;
  }
  if (((e.disabled = !1), !a || a.nowebrtc)) {
    t.textContent = "Questo browser non supporta il collegamento tra telefoni.";
    return;
  }
  const s = [];
  (s.push(
    a.relay
      ? "\u2714 Relay raggiungibile: dovrebbe funzionare anche con i dati mobili."
      : "\u2716 Nessun relay raggiungibile: con i dati mobili la stanza potrebbe non collegarsi.",
  ),
    s.push(
      a.srflx
        ? "\u2714 Indirizzo pubblico trovato (STUN)."
        : "\u2716 Indirizzo pubblico non trovato (rete bloccata?).",
    ),
    a.relay || s.push("Imposta un relay (Metered gratuito) qui sotto e rifai la prova."),
    (t.textContent = s.join(" ")));
}
(document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act]");
  if (!(!t || t.disabled))
    switch (t.dataset.act) {
      case "go-net":
        ((NETC = NetCfg.load()),
          ($("#net-res").textContent = ""),
          ($("#net-share-n").textContent = ""),
          netRender(),
          show("net"));
        break;
      case "net-mode":
        (netSave(), (NETC.mode = t.dataset.val), NetCfg.save(NETC), netRender());
        break;
      case "net-test":
        netTest();
        break;
      case "net-share": {
        netSave();
        const a = NetCfg.share(NETC),
          s = $("#net-share-n");
        if (!a) {
          s.textContent = "Compila prima i dati del relay.";
          break;
        }
        const n = () => {
          s.textContent = "Link copiato: mandalo ai tuoi amici e fallo aprire prima di entrare nella stanza.";
        };
        navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(a).then(n, () => {
              s.textContent = a;
            })
          : (s.textContent = a);
        break;
      }
    }
}),
  NetCfg.importHash() &&
    ((NETC = NetCfg.load()),
    setTimeout(() => {
      (netRender(),
        ($("#net-res").textContent =
          "Configurazione di rete ricevuta dal link. Premi \xABProva la connessione\xBB."),
        show("net"));
    }, 0)));
const PK_DEF = {
    mode: "bots",
    name: "",
    bots: 3,
    stack: 1e3,
    sb: 5,
    diff: "mid",
    legend: "off",
    prob: "off",
    advice: "off",
  },
  pkCfg = () => ((cfg.pk = Object.assign({}, PK_DEF, cfg.pk || {})), cfg.pk);
let PK = null;
const PK_LEGEND = [
    [
      8,
      "Scala colore",
      "Cinque carte in fila dello stesso seme. La pi\xF9 alta (A K Q J 10) \xE8 la scala reale.",
    ],
    [7, "Poker", "Quattro carte dello stesso valore."],
    [6, "Full", "Un tris pi\xF9 una coppia."],
    [5, "Colore", "Cinque carte dello stesso seme."],
    [4, "Scala", "Cinque carte in fila (anche A-2-3-4-5)."],
    [3, "Tris", "Tre carte dello stesso valore."],
    [2, "Doppia coppia", "Due coppie diverse."],
    [1, "Coppia", "Due carte dello stesso valore."],
    [0, "Carta alta", "Nessuna combinazione: conta la carta pi\xF9 alta."],
  ],
  PK_PAUSE = { deal: 380, bot: 900, street: 800, showdown: 9e3 };
let pkSkipFn = null;
PUI.pause = (e) =>
  new Promise((t) => {
    const a = typeof window.__pauseScale == "number" ? window.__pauseScale : 1,
      id = setTimeout(() => {
        ((pkSkipFn = null), t());
      }, (PK_PAUSE[e] || 500) * a);
    e === "showdown" &&
      (pkSkipFn = () => {
        (clearTimeout(id), (pkSkipFn = null), t());
      });
  });
function pkSync() {
  const e = pkCfg();
  (document
    .querySelectorAll('[data-act="pk-seg"]')
    .forEach((s) =>
      s.setAttribute("aria-pressed", String(e[s.dataset.key]) === s.dataset.val ? "true" : "false"),
    ),
    document
      .querySelectorAll('[data-act="pk-quick"]')
      .forEach((s) =>
        s.setAttribute("aria-pressed", String(e[s.dataset.key]) === s.dataset.val ? "true" : "false"),
      ));
  const t = e.mode === "bots" ? 1 : 0,
    a = e.mode === "bots" ? 8 : 7;
  ((e.bots = Math.max(t, Math.min(a, e.bots))),
    ($("#pk-bots-n").textContent = e.bots),
    ($("#pk-room-panel").hidden = e.mode !== "room"),
    ($("#pk-go").textContent = e.mode === "room" ? "Crea stanza" : "Inizia la partita"),
    document.activeElement !== $("#pk-in-stack") && ($("#pk-in-stack").value = e.stack || ""),
    document.activeElement !== $("#pk-in-sb") && ($("#pk-in-sb").value = e.sb || ""),
    document.activeElement !== $("#pk-in-name") && ($("#pk-in-name").value = e.name || ""),
    ($("#pk-note-blinds").textContent =
      e.sb >= 1
        ? `Grande buio ${money(e.sb * 2)} (il doppio). ` +
          (e.stack >= e.sb * 20 ? `Hai ${Math.round(e.stack / (e.sb * 2))} grandi buio a testa.` : "")
        : ""),
    ($("#pk-note-mode").textContent =
      e.mode === "bots"
        ? "Tu contro i bot: nessun limite di tempo."
        : "Chi crea la stanza decide blinds e fiches per tutti. Gli amici entrano col codice; i bot riempiono i posti vuoti. Ognuno ha 60 secondi per decidere."),
    ($("#pk-note-bots").textContent =
      e.mode === "bots" ? "Da 1 a 8 bot." : "Da 0 a 7 bot, oltre agli amici (massimo 9 al tavolo)."));
}
function pkErr(e) {
  $("#pk-err").textContent = e || "";
}
function pkValidate() {
  const e = pkCfg();
  return e.sb >= 1
    ? e.stack >= e.sb * 2 * 10
      ? (pkErr(""), !0)
      : (pkErr(`Servono almeno 10 grandi buio a testa: almeno ${money(e.sb * 20)} di fiches.`), !1)
    : (pkErr("Imposta un piccolo buio di almeno \u20AC1."), !1);
}
function pkBegin() {
  const e = pkCfg();
  if (!pkValidate()) return;
  ((e.name = ($("#pk-in-name").value || "").trim().slice(0, 14)), saveCfg());
  const t = e.mode === "room",
    a = t ? genCode() : "";
  PK = {
    isHost: !0,
    room: t,
    code: a,
    pid: "h",
    conns: {},
    snap: null,
    ask: null,
    raiseOpen: !1,
    raiseTo: 0,
    ctlKey: "",
    done: !1,
    finals: null,
    started: !1,
    oddsKey: "",
    odds: null,
    askAt: 0,
    status: t ? "Apro la stanza\u2026" : "",
  };
  const s = {
    send: (o, i) => {
      if (o === "h") pkClientMsg(i);
      else {
        const r = PK && PK.conns[o];
        r && r.send(i);
      }
    },
  };
  (pkCreate({ sb: e.sb, stack: e.stack, diff: e.diff, timeout: t ? P_TIMEOUT : 0, code: a }, s),
    (PK.send = (o) => pkMsg("h", o)));
  const n = pkAdd(e.name || "Tu", !0, "h");
  if (((PK.myName = n.p.name), pkAddBots(e.bots), !t)) {
    (show("ptable"), pkStart());
    return;
  }
  (show("plobby"),
    pkRenderLobby(),
    (PK.net = netImpl().host(a, {
      onReady() {
        PK && ((PK.ready = !0), (PK.status = ""), pkRenderLobby());
      },
      onConn(o) {
        pkHostAccept(o);
      },
      onError(o) {
        PK && !PK.ready && pkBack(netErrText(o));
      },
    })));
}
function pkHostAccept(e) {
  ((e.onmessage = (t) => {
    if (!(!PK || PK.done))
      if (e.pid) pkMsg(e.pid, t);
      else {
        if (!t || t.t !== "join") return;
        const a = pkAdd(t.name, !1);
        if (a.err) {
          (e.send({ t: "deny", why: a.err }), setTimeout(() => e.close(), 300));
          return;
        }
        ((e.pid = a.p.id),
          (PK.conns[e.pid] = e),
          e.send({ t: "welcome", pid: e.pid, code: PK.code }),
          pkBroadcast());
      }
  }),
    (e.onclose = () => {
      e.pid && PK && !PK.done && pkLeave(e.pid);
    }));
}
function pkJoin() {
  const e = pkCfg(),
    t = ($("#pk-in-code").value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(t)) {
    pkErr("Il codice ha 5 caratteri (lettere e numeri).");
    return;
  }
  (pkErr(""),
    (e.name = ($("#pk-in-name").value || "").trim().slice(0, 14)),
    saveCfg(),
    (PK = {
      isHost: !1,
      room: !0,
      code: t,
      pid: null,
      snap: null,
      ask: null,
      raiseOpen: !1,
      raiseTo: 0,
      ctlKey: "",
      done: !1,
      finals: null,
      started: !1,
      oddsKey: "",
      odds: null,
      askAt: 0,
      status: "Mi collego alla stanza\u2026",
    }),
    (PK.send = (a) => {
      PK && PK.conn && PK.conn.send(a);
    }),
    (PK.joinTimer = setTimeout(() => {
      PK && !PK.pid && pkBack(netErrText("timeout"));
    }, 2e4)),
    (PK.net = netImpl().join(t, {
      onOpen(a) {
        PK &&
          ((PK.conn = a),
          (a.onmessage = pkClientMsg),
          (a.onclose = () => {
            PK &&
              !PK.done &&
              (PK.pid
                ? pkFinish("Connessione persa: il tavolo non \xE8 pi\xF9 raggiungibile.")
                : pkBack("La stanza non risponde."));
          }),
          a.send({ t: "join", name: e.name }));
      },
      onError(a) {
        PK && !PK.pid && pkBack(netErrText(a));
      },
    })),
    show("plobby"),
    pkRenderLobby());
}
function pkBack(e) {
  const t = PK && PK.net;
  (setTimeout(() => {
    try {
      t && t.close();
    } catch {}
  }, 400),
    PK && clearTimeout(PK.joinTimer),
    (PK = null),
    show("psetup"),
    pkSync(),
    pkErr(e || ""));
}
function pkClientMsg(e) {
  !PK ||
    !e ||
    (e.t === "welcome"
      ? ((PK.pid = e.pid), clearTimeout(PK.joinTimer), (PK.status = ""))
      : e.t === "deny"
        ? pkBack(e.why || "Non puoi entrare in questa stanza.")
        : e.t === "pstate"
          ? PK.done || pkState(e)
          : e.t === "pbye"
            ? ((PK.finals = e.finals), PK.done && PK.resultShown && pkResult())
            : e.t === "pend" &&
              ((PK.finals = e.finals),
              pkFinish(PK.closing ? "Hai chiuso il tavolo." : e.reason || "Il tavolo \xE8 stato chiuso."),
              PK.done && PK.resultShown && pkResult()));
}
function pkState(e) {
  const t = PK.snap;
  if (
    ((PK.snap = e), (PK.myName = (e.seats.find((s) => s.pid === PK.pid) || {}).name || PK.myName), !e.started)
  ) {
    (!$("#screen-plobby").hidden || t === null) && (show("plobby"), pkRenderLobby());
    return;
  }
  PK.started = !0;
  const a = e.ask;
  (a && (!PK.ask || PK.ask.id !== a.id)
    ? ((PK.ask = a), (PK.askAt = Date.now()), (PK.raiseOpen = !1), (PK.raiseTo = 0), (PK.ctlKey = ""))
    : a || (PK.ask = null),
    $("#screen-ptable").hidden && show("ptable"),
    pkRender());
}
function pkRenderLobby() {
  if (!PK) return;
  const e = PK.snap,
    t = $("#plobby-body"),
    a = e ? e.seats : [],
    s = e ? e.cfg : null,
    n = s
      ? `Fiches ${money(s.stack)} \xB7 blinds ${money(s.sb)} / ${money(s.bb)} \xB7 fino a 9 giocatori`
      : "";
  t.innerHTML = `<p class="eyebrow">Texas Hold'em</p>
    <div class="roomcode" aria-label="Codice stanza">${esc(PK.code)}</div>
    ${PK.status ? `<p class="note">${esc(PK.status)}</p>` : '<button class="ghost wide" data-act="pk-share">Condividi il codice</button>'}
    ${a.length ? `<h3 class="h-sub">Al tavolo (${a.length}/9)</h3><div class="plist">${a.map((o) => `<div class="prow"><b>${esc(o.name)}</b>${o.pid === PK.pid ? "<small>tu</small>" : ""}${o.host ? "<em>host</em>" : ""}${o.bot ? "<small>bot</small>" : ""}</div>`).join("")}</div>` : ""}
    ${n ? `<p class="note">${esc(n)}</p>` : ""}
    ${
      PK.isHost
        ? `<button class="primary wide" data-act="pk-start" ${PK.ready && a.length >= 2 ? "" : "disabled"}>Inizia la partita</button>
      <p class="note">${a.length < 2 ? "Servono almeno 2 giocatori: aspetta gli amici o riparti con dei bot." : "Una volta iniziata, nessuno pu\xF2 pi\xF9 entrare."}</p>`
        : `<p class="note">${PK.pid ? "In attesa che chi ha creato la stanza inizi la partita\u2026" : ""}</p>`
    }
    <button class="ghost wide" data-act="pk-leave">${PK.isHost ? "Chiudi la stanza" : "Esci"}</button>`;
}
function pkShare() {
  const e = `Vieni al mio tavolo di poker! Codice stanza: ${PK.code}`;
  try {
    if (navigator.share) {
      navigator.share({ text: e }).catch(() => {});
      return;
    }
  } catch {}
  try {
    (navigator.clipboard.writeText(PK.code),
      (PK.status = "Codice copiato."),
      pkRenderLobby(),
      setTimeout(() => {
        PK && ((PK.status = ""), pkRenderLobby());
      }, 1500));
  } catch {}
}
const pkCard = (e, t) =>
    e.down
      ? `<div class="card ${t} down"></div>`
      : `<div class="card ${t}${RED_SUITS.includes(e.s) ? " red" : ""}"><span class="r">${e.r}</span><span class="s">${e.s}</span><span class="big">${e.s}</span></div>`,
  PK_PH = {
    preflop: "Pre-flop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
    between: "",
  };
function pkBadges(e) {
  return (e.dealer ? '<i class="bdg d">D</i>' : "") + (e.blind ? `<i class="bdg">${e.blind}</i>` : "");
}
function pkOppHTML(e, t) {
  const a = t.turn === e.pid,
    s = t.results.some((r) => r.pid === e.pid),
    n = [
      "pkseat",
      e.folded || !e.inHand ? "dim" : "",
      a ? "active" : "",
      s ? "win" : "",
      e.out ? "out" : "",
    ].join(" "),
    o = e.cards.length ? e.cards.map((r) => pkCard(r, "s")).join("") : "";
  let i = "";
  return (
    e.out
      ? (i = '<span class="pkst">Eliminato</span>')
      : s
        ? (i = `<span class="pkst gain">+${money(t.results.find((r) => r.pid === e.pid).amount)}</span>`)
        : e.hand
          ? (i = `<span class="pkst">${esc(e.hand)}</span>`)
          : e.folded && e.inHand
            ? (i = '<span class="pkst">Fold</span>')
            : e.allIn
              ? (i = '<span class="pkst allin">All-in</span>')
              : e.last && e.inHand && (i = `<span class="pkst">${esc(e.last)}</span>`),
    `<div class="${n}"><div class="pkhead"><span class="nm">${esc(e.name)}</span>${pkBadges(e)}</div>
    <div class="pkstack">${money(e.stack)}</div><div class="pkcards">${o}</div>
    <div class="pkbet">${e.bet > 0 ? `<span class="pkchip">${money(e.bet)}</span>` : ""}</div>${i}</div>`
  );
}
function pkMeCat(e) {
  const t = e.me;
  return t.hole.length < 2 ? null : pkEval(t.hole.concat(e.board));
}
function pkRender() {
  const e = PK.snap;
  if (!e) return;
  const t = e.seats.find((r) => r.pid === PK.pid) || { stack: e.me.stack, bet: 0 },
    a = pkCfg();
  (($("#pk-meta").textContent =
    `Mano ${e.handNo} \xB7 ${PK_PH[e.phase] || ""}${PK_PH[e.phase] ? " \xB7 " : ""}${money(e.sb)}/${money(e.bb)}${PK.room ? " \xB7 " + PK.code : ""}`),
    ($("#pk-bank").textContent = money(e.me.stack)),
    document
      .querySelectorAll("#screen-ptable .tog")
      .forEach((r) => r.setAttribute("aria-pressed", a[r.dataset.key] === "on" ? "true" : "false")),
    ($("#pk-opps").innerHTML = e.seats
      .filter((r) => r.pid !== PK.pid)
      .map((r) => pkOppHTML(r, e))
      .join("")),
    ($("#pk-pot").innerHTML = `Piatto <b>${money(e.pot)}</b>`));
  const sdw = e.showdown || [],
    hl = new Set(sdw.filter((r) => r.win).flatMap((r) => r.best.map((c) => c.r + c.s)));
  let s = "";
  for (let r = 0; r < 5; r++)
    s += e.board[r]
      ? pkCard(e.board[r], "m" + (hl.size ? (hl.has(e.board[r].r + e.board[r].s) ? " hl" : " fade") : ""))
      : '<div class="pkslot"></div>';
  (($("#pk-board").innerHTML = s), pkRenderShowdown(e, hl));
  const n = e.seats.find((r) => r.pid === PK.pid),
    o = e.turn === PK.pid,
    i = e.results.find((r) => r.pid === PK.pid);
  (($("#pk-me").className = "pk-me" + (o ? " active" : "") + (i ? " win" : "")),
    ($("#pk-me").innerHTML =
      `<div class="pkhead"><span class="nm">${esc(PK.myName || "Tu")}</span>${n ? pkBadges(n) : ""}<span class="pkstack">${money(e.me.stack)}</span></div>
    <div class="pkmine">${e.me.hole.length ? e.me.hole.map((r) => pkCard(r, "xl" + (hl.size ? (hl.has(r.r + r.s) ? " hl" : " fade") : ""))).join("") : `<p class="spec">${e.me.out ? "Sei stato eliminato: resti a guardare." : e.me.folded && e.phase !== "showdown" ? "Hai passato la mano." : ""}</p>`}
    ${n && n.bet > 0 ? `<span class="pkchip">${money(n.bet)}</span>` : ""}</div>
    ${i ? `<div class="pkst gain">+${money(i.amount)}${i.hand ? " \xB7 " + esc(i.hand) : ""}</div>` : n && n.hand ? `<div class="pkst">${esc(n.hand)}</div>` : ""}`),
    pkRenderAids(e),
    pkRenderStatus(e),
    pkRenderControls(e),
    pkScrollMe());
}
function pkRenderShowdown(e, hl) {
  const el = $("#pk-sd"),
    res = e.results || [],
    sd = e.showdown || [];
  if (!res.length || !(e.phase === "showdown" || e.phase === "between")) {
    el.hidden = !0;
    el.innerHTML = "";
    return;
  }
  const meWin = res.some((r) => r.pid === PK.pid),
    names = res.map((r) => (r.pid === PK.pid ? "Tu" : esc(r.name))),
    title =
      res.length === 1
        ? `${names[0]} ${names[0] === "Tu" ? "vinci" : "vince"} <b>${money(res[0].amount)}</b>`
        : `${names.join(" e ")}: piatto diviso`,
    why = res[0].why ? `<p class="sdwhy">${esc(res[0].why)}</p>` : "";
  let rows = "";
  if (sd.length) {
    rows =
      '<div class="sdrows">' +
      sd
        .slice()
        .sort((a, b) => b.win - a.win)
        .map((p) => {
          const cards = p.hole.map((c) => pkCard(c, "m" + (p.win ? (hl.has(c.r + c.s) ? " hl" : " fade") : " fade"))).join("");
          return `<div class="sdrow${p.win ? " win" : ""}"><div class="sdcards">${cards}</div><div class="sdinfo"><b>${p.pid === PK.pid ? "Tu" : esc(p.name)}</b><span>${esc(p.hand)}</span></div><div class="sdres">${p.win ? `+${money(p.won)}` : "perde"}</div></div>`;
        })
        .join("") +
      "</div>";
  }
  const me = e.me,
    STREET = { preflop: "Pre-flop", flop: "Flop", turn: "Turn", river: "River" },
    inv = Object.keys(STREET).filter((k) => me.inv && me.inv[k] > 0),
    net = (me.won || 0) - (me.put || 0),
    bal = me.put > 0
      ? `<div class="rsum"><div class="rsum-t">Il tuo bilancio della mano</div>${inv
          .map((k) => `<div class="rsrow"><div><b>${STREET[k]}</b><small>puntato</small></div><span class="rs-lose">${money(-me.inv[k])}</span></div>`)
          .join("")}<div class="rsrow"><div><b>Incassato</b><small>${me.won > 0 ? "piatto vinto" : "nessun piatto"}</small></div><span class="rs-${me.won > 0 ? "win" : "push"}">${money(me.won || 0, !0)}</span></div><div class="rsrow tot"><b>Totale mano</b><span class="rs-${net > 0 ? "win" : net < 0 ? "lose" : "push"}">${money(net, !0)}</span></div></div>`
      : "",
    skip = !PK.room && e.phase === "showdown" ? '<button class="primary wide sdnext" data-act="pk-skip">Prossima mano</button>' : "";
  ((el.hidden = !1),
    (el.className = "pk-sd" + (meWin ? " mine" : "")),
    (el.innerHTML = `<div class="sdtitle">${meWin ? "Hai vinto la mano" : "Fine mano"}</div><div class="sdhead">${title}</div>${why}${rows}${bal}${skip}`));
}
function pkScrollMe() {
  if (!PK || !PK.ask) return;
  const e = $("#pk-felt"),
    t = e.getBoundingClientRect(),
    a = $("#pk-me").getBoundingClientRect();
  a.bottom > t.bottom && (e.scrollTop += a.bottom - t.bottom + 4);
}
function pkRenderStatus(e) {
  const t = $("#pk-status");
  let a;
  const s = e.results && e.results.length ? e.results : null;
  if (s && (e.phase === "showdown" || e.phase === "between"))
    a = s.map((n) => `${n.name} vince ${money(n.amount)}${n.hand ? " con " + n.hand : ""}`).join(" \xB7 ");
  else if (PK.ask) {
    const n = e.turnMs ? Math.max(0, Math.ceil((e.turnMs - (Date.now() - PK.askAt)) / 1e3)) : 0;
    a = "Tocca a te" + (n ? ` \xB7 ${n}s` : "");
  } else if (e.turn) {
    const n = e.seats.find((o) => o.pid === e.turn);
    a = n ? `Tocca a ${n.name}\u2026` : "";
  } else a = e.log[e.log.length - 1] || "";
  t.textContent = a;
}
let pkTimer = 0;
function pkTick() {
  PK && PK.snap && PK.ask && pkRenderStatus(PK.snap);
}
function pkRenderControls(e) {
  const t = $("#pk-controls"),
    a = PK.ask,
    s = [a ? a.id : 0, pkCfg().advice, PK.raiseOpen, e.me.out, PK.isHost, e.phase === "lobby"].join("|");
  if (s === PK.ctlKey) return;
  if (((PK.ctlKey = s), !a)) {
    e.me.out
      ? (t.innerHTML = `<p class="spec">${PK.isHost ? "Resti a guardare. Se chiudi il tavolo, la partita termina per tutti." : "Resti a guardare gli altri giocare, oppure esci."}</p>
      <button class="ghost wide" data-act="pk-leave">${PK.isHost ? "Chiudi il tavolo" : "Esci dal tavolo"}</button>`)
      : (t.innerHTML = "");
    return;
  }
  const n = a.opts,
    o = e.seats.find((l) => l.pid === PK.pid) || { bet: 0 },
    i = n.toCall > 0 ? `Segui ${money(n.toCall)}${n.toCall >= e.me.stack ? " (all-in)" : ""}` : "Check",
    r = Math.max(0, ...e.seats.map((l) => l.bet)) > 0;
  if (PK.raiseOpen && n.canRaise)
    (PK.raiseTo || (PK.raiseTo = n.minTo),
      (t.innerHTML = `<div class="rz"><div class="rz-top"><span>${r ? "Rilancia a" : "Punta"}</span><b id="rz-val"></b></div>
      <input type="range" id="rz-range" min="${n.minTo}" max="${n.maxTo}" step="1" value="${PK.raiseTo}" aria-label="Importo">
      <div class="quick rz-q"><button data-act="pk-rz" data-v="min">Min</button><button data-act="pk-rz" data-v="0.5">\xBD piatto</button><button data-act="pk-rz" data-v="1">Piatto</button><button data-act="pk-rz" data-v="max">All-in</button></div>
      <div class="pair"><button data-act="pk-rz-cancel">Indietro</button><button class="primary" id="rz-ok" data-act="pk-rz-ok"></button></div></div>`),
      pkRzLabel(),
      pkScrollMe());
  else {
    const l = pkCfg().advice === "on" ? pkAdvice(e, n) : null,
      c = (f) => (l && l.a === f ? " sug" : "");
    t.innerHTML = `${l ? `<p class="sugline">Consiglio: <b>${l.label}</b> \u2014 ${esc(l.why)}</p>` : ""}<div class="actions pk-actions"><button class="${c("fold").trim()}" data-act="pk-act" data-v="fold">Fold</button>
      <button class="hit${c("call")}" data-act="pk-act" data-v="${n.toCall > 0 ? "call" : "check"}">${i}</button>
      <button class="${c("raise").trim()}" data-act="pk-rz-open" ${n.canRaise ? "" : "disabled"}>${r ? "Rilancia" : "Punta"}</button></div>`;
  }
}
function pkAdvice(e, t) {
  if (e.me.hole.length < 2) return null;
  const a = Math.max(1, e.seats.filter((r) => r.pid !== PK.pid && r.inHand && !r.folded && !r.out).length),
    s = pkSim(e.me.hole, e.board, a, 500).eq,
    n = Math.round(s * 100),
    o = s * (a + 1);
  if (t.toCall === 0)
    return o > 1.5 && t.canRaise
      ? {
          a: "raise",
          label: "punta",
          why: `hai il ${n}% di vincere, pi\xF9 della tua parte: conviene puntare.`,
        }
      : { a: "call", label: "check", why: `hai il ${n}% di vincere: vedi gratis la prossima carta.` };
  const i = Math.round((t.toCall / (t.pot + t.toCall)) * 100);
  return s > t.toCall / (t.pot + t.toCall)
    ? o > 1.9 && t.canRaise
      ? { a: "raise", label: "rilancia", why: `hai il ${n}% di vincere e te ne servono ${i}%: mano forte.` }
      : {
          a: "call",
          label: "segui",
          why: `hai il ${n}% di vincere e te ne servono ${i}% per pareggiare il costo.`,
        }
    : { a: "fold", label: "fold", why: `hai il ${n}% di vincere ma te ne servono ${i}%: costa troppo.` };
}
function pkRzLabel() {
  const e = PK.ask;
  if (!e) return;
  const t = e.opts,
    a = PK.raiseTo,
    s = $("#rz-val"),
    n = $("#rz-ok");
  if (!s || !n) return;
  s.textContent = money(a);
  const o = a >= t.maxTo;
  n.textContent = o
    ? `All-in ${money(a)}`
    : `${Math.max(0, ...PK.snap.seats.map((i) => i.bet)) > 0 ? "Rilancia a" : "Punta"} ${money(a)}`;
}
function pkAnswer(e) {
  const t = PK.ask;
  t &&
    ((PK.ask = null),
    (PK.raiseOpen = !1),
    (PK.ctlKey = ""),
    ($("#pk-controls").innerHTML = ""),
    PK.send({ t: "ans", id: t.id, v: e }));
}
function pkRzQuick(e) {
  const t = PK.ask,
    a = t.opts,
    s = PK.snap,
    n = s.seats.find((l) => l.pid === PK.pid) || { bet: 0 },
    o = a.pot;
  let i;
  if (e === "min") i = a.minTo;
  else if (e === "max") i = a.maxTo;
  else {
    const l = Number(e);
    i = n.bet + a.toCall + Math.round(l * (o + a.toCall));
  }
  ((i = Math.round(i / s.sb) * s.sb), (PK.raiseTo = Math.max(a.minTo, Math.min(a.maxTo, i))));
  const r = $("#rz-range");
  (r && (r.value = PK.raiseTo), pkRzLabel());
}
function pkRenderAids(e) {
  const t = pkCfg(),
    a = pkMeCat(e),
    s = $("#pk-legend");
  if (((s.hidden = t.legend !== "on"), t.legend === "on")) {
    const r = a === null ? -1 : pkCat(a);
    s.innerHTML =
      `<h3>Le mani, dalla pi\xF9 forte${a === null ? "" : ` \xB7 <span class="now">Ora hai: ${esc(pkName(a))}</span>`}</h3>` +
      PK_LEGEND.map(
        ([l, c, f]) => `<div class="lg${l === r ? " on" : ""}"><b>${c}</b><span>${f}</span></div>`,
      ).join("") +
      '<p class="note">A parit\xE0 di combinazione vince la carta pi\xF9 alta rimasta (il kicker). Il seme non conta.</p>';
  }
  const n = $("#pk-odds");
  if (((n.hidden = t.prob !== "on"), t.prob !== "on")) return;
  if (e.me.hole.length < 2) {
    ((n.innerHTML =
      '<h3>Probabilit\xE0</h3><p class="note">Appena hai le carte vedrai qui le probabilit\xE0 delle tue mani.</p>'),
      (PK.oddsKey = ""));
    return;
  }
  const o = e.seats.filter((r) => r.pid !== PK.pid && r.inHand && !r.folded && !r.out).length,
    i = e.me.hole.map((r) => r.r + r.s).join() + "|" + e.board.map((r) => r.r + r.s).join() + "|" + o;
  if (i !== PK.oddsKey) {
    ((PK.oddsKey = i), (PK.odds = { n: 0, cats: new Array(9).fill(0), eqSum: 0, nOpp: o }));
    const r = i,
      l = e.me.hole.slice(),
      c = e.board.slice(),
      f = () => {
        if (!PK || PK.oddsKey !== r) return;
        const m = pkSim(l, c, o, 400);
        ((PK.odds.n += m.n),
          (PK.odds.eqSum += m.eq * m.n),
          m.cats.forEach((u, p) => {
            PK.odds.cats[p] += u;
          }),
          pkPaintOdds(),
          PK.odds.n < 3200 && setTimeout(f, 0));
      };
    setTimeout(f, 0);
  }
  pkPaintOdds();
}
function pkPaintOdds() {
  const e = $("#pk-odds"),
    t = PK && PK.odds;
  if (!t || !t.n) {
    e.innerHTML = '<h3>Probabilit\xE0</h3><p class="note">Calcolo\u2026</p>';
    return;
  }
  const a = (n) => Math.round(n * 1e3) / 10,
    s = PK_LEGEND.map(([n, o]) => {
      const i = a(t.cats[n] / t.n);
      return `<div class="orow"><span>${o}</span><i><u style="width:${Math.min(100, i)}%"></u></i><b>${i < 0.1 && i > 0 ? "<0,1" : String(i).replace(".", ",")}%</b></div>`;
    }).join("");
  e.innerHTML = `<h3>Probabilit\xE0 a fine mano</h3>
    ${t.nOpp > 0 ? `<div class="eq">Vittoria (o pari) contro ${t.nOpp} ${t.nOpp === 1 ? "avversario" : "avversari"}: <b>${String(a(t.eqSum / t.n)).replace(".", ",")}%</b></div>` : ""}
    <p class="note">Con che combinazione finirai, se arrivi al river. Stima su ${t.n} simulazioni.</p>${s}`;
}
function pkOpenLeave() {
  if (!PK || PK.done) return;
  const e = PK.snap,
    t = e ? e.seats.filter((s) => !s.bot).length : 1;
  let a;
  (PK.isHost
    ? (a =
        t > 1
          ? "Se lasci il tavolo non esiste pi\xF9 e il gioco termina per tutti."
          : "Vuoi lasciare il tavolo? La partita termina.")
    : PK.started
      ? e && e.me.out
        ? (a = "Vuoi uscire dal tavolo?")
        : (a = "Se esci adesso passi la mano e lasci il tavolo: le fiches che hai davanti escono con te.")
      : (a = "Vuoi uscire dalla stanza?"),
    ($("#psheet-msg").textContent = a),
    ($("#psheet").hidden = !1));
}
function pkConfirmLeave() {
  if ((($("#psheet").hidden = !0), !(!PK || PK.done))) {
    if (PK.isHost) {
      ((PK.closing = !0),
        pkEnd("Chi ha creato la stanza ha chiuso il tavolo."),
        PK.done || pkFinish("Hai chiuso il tavolo."));
      return;
    }
    if (!PK.started) {
      (PK.send({ t: "leave" }), pkBack(""));
      return;
    }
    (PK.send({ t: "leave" }), pkFinish("Hai lasciato il tavolo."));
  }
}
function pkFinish(e, t) {
  if (!PK || PK.done) return;
  ((PK.done = !0), (PK.reason = e), (PK.ask = null));
  const a = PK.net;
  if (
    (setTimeout(() => {
      try {
        a && a.close();
      } catch {}
    }, 600),
    !PK.started)
  ) {
    pkBack(e);
    return;
  }
  pkResult();
}
function pkResult() {
  PK.resultShown = !0;
  const e = PK.finals || [],
    t = e.find((r) => r.name === PK.myName),
    a = PK.snap,
    s = t ? t.start : a ? a.me.start : 0,
    n = t ? t.end : a ? a.me.stack : 0,
    o = n - s;
  logGame(PK, "pk", t, e.length, {
    detail: `${money(s)} \u2192 ${money(n)} (${money(o, !0)}) \xB7 ${a ? a.handNo : 0} mani`,
    net: o,
  });
  const i = t && t.place === 1 && !t.left ? "Hai vinto!" : t ? `${t.place}\xBA posto` : "Partita finita";
  (($("#presult-body").innerHTML = `<p class="eyebrow">Texas Hold'em</p>
    <div class="verdict ${t && t.place === 1 && !t.left ? "ok" : ""}">${i}</div>
    <p class="sub" style="color:var(--muted)">${esc(PK.reason || "")}</p>
    <div class="rows">
      <div class="row"><span>Mani giocate</span><b>${a ? a.handNo : 0}</b></div>
      <div class="row"><span>Fiches</span><b>${money(s)} \u2192 ${money(n)} <small style="font-size:13px;color:var(${o >= 0 ? "--win" : "--lose"})">(${money(o, !0)})</small></b></div>
    </div>
    ${
      e.length
        ? `<h3 class="h-sub">Classifica finale</h3><div class="plist">${e
            .map((r) => {
              const l = r.end - r.start;
              return `<div class="prow${r.name === PK.myName ? " me" : ""}"><span class="rk">${r.place}</span><b>${esc(r.name)}</b>${r.host ? "<em>host</em>" : ""}${r.bot ? "<small>bot</small>" : ""}${r.left ? "<small>uscito</small>" : ""}
        <span class="rr">${money(r.end)} <small style="color:var(${l >= 0 ? "--win" : "--lose"})">${money(l, !0)}</small></span></div>`;
            })
            .join("")}</div>`
        : ""
    }
    <div class="stack"><button class="primary wide" data-act="pk-again">Torna alle impostazioni</button><button class="ghost wide" data-act="go-home">Home</button></div>`),
    ($("#screen-presult").scrollTop = 0),
    show("presult"));
}
(document.addEventListener("click", (e) => {
  const t = e.target.closest(
    '[data-act^="pk-"],[data-act="go-pk"],[data-act="go-bj"],[data-act="go-home"],[data-act="home"],[data-act="pk-rz-cancel"]',
  );
  if (!t || t.disabled) return;
  switch (t.dataset.act) {
    case "go-pk":
      (show("psetup"), pkSync());
      break;
    case "go-bj":
      (show("setup"), syncSetup());
      break;
    case "go-home":
    case "home":
      show("home");
      break;
    case "pk-seg":
      ((pkCfg()[t.dataset.key] = /^\d+$/.test(t.dataset.val) ? Number(t.dataset.val) : t.dataset.val),
        saveCfg(),
        pkSync());
      break;
    case "pk-quick":
      ((pkCfg()[t.dataset.key] = Number(t.dataset.val)), saveCfg(), pkSync());
      break;
    case "pk-bots": {
      const s = pkCfg();
      ((s.bots += Number(t.dataset.d)), saveCfg(), pkSync());
      break;
    }
    case "pk-go":
      pkBegin();
      break;
    case "pk-skip":
      pkSkipFn && pkSkipFn();
      break;
    case "pk-join":
      pkJoin();
      break;
    case "pk-start":
      PK && PK.isHost && pkStart();
      break;
    case "pk-share":
      pkShare();
      break;
    case "pk-leave":
      pkOpenLeave();
      break;
    case "pk-stay":
      $("#psheet").hidden = !0;
      break;
    case "pk-leave-ok":
      pkConfirmLeave();
      break;
    case "pk-again":
      ((PK = null), show("psetup"), pkSync());
      break;
    case "pk-tog": {
      const s = pkCfg();
      ((s[t.dataset.key] = s[t.dataset.key] === "on" ? "off" : "on"),
        saveCfg(),
        PK && PK.snap && PK.started && ((PK.oddsKey = ""), pkRender()));
      break;
    }
    case "pk-act":
      pkAnswer({ a: t.dataset.v });
      break;
    case "pk-rz-open":
      PK &&
        PK.ask &&
        ((PK.raiseOpen = !0), (PK.raiseTo = PK.ask.opts.minTo), (PK.ctlKey = ""), pkRenderControls(PK.snap));
      break;
    case "pk-rz-cancel":
      PK && ((PK.raiseOpen = !1), (PK.ctlKey = ""), pkRenderControls(PK.snap));
      break;
    case "pk-rz":
      PK && PK.ask && pkRzQuick(t.dataset.v);
      break;
    case "pk-rz-ok":
      PK && PK.ask && pkAnswer({ a: "raise", to: PK.raiseTo });
      break;
  }
}),
  document.addEventListener("input", (e) => {
    e.target.id === "rz-range" && PK
      ? ((PK.raiseTo = Number(e.target.value)), pkRzLabel())
      : e.target.id === "pk-in-name"
        ? (pkCfg().name = e.target.value.slice(0, 14))
        : e.target.id === "in-name"
          ? (cfg.name = e.target.value.slice(0, 14))
          : e.target.id === "pk-in-stack"
            ? ((pkCfg().stack = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0), pkSync())
            : e.target.id === "pk-in-sb" &&
              ((pkCfg().sb = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0), pkSync());
  }),
  (pkTimer = setInterval(pkTick, 500)),
  pkSync());
const BK_DEF = { mode: "bots", name: "", players: 2, rounds: 3, diff: "mid", aids: "off" },
  bkCfg = () => ((cfg.bk = Object.assign({}, BK_DEF, cfg.bk || {})), cfg.bk);
let BK = null;
const BK_PAUSE = { deal: 450, bot: 900, card: 450, trick: 1300, round: 6e3 };
BUI.pause = (e) =>
  new Promise((t) => {
    const a = typeof window.__pauseScale == "number" ? window.__pauseScale : 1;
    setTimeout(t, (BK_PAUSE[e] || 500) * a);
  });
const BK_RANK = (e) => ({ 1: "A", 8: "F", 9: "C", 10: "R" })[e] || String(e),
  BK_RN = { 1: "Asso", 8: "Fante", 9: "Cavallo", 10: "Re" };
function bkCardHTML(e, t = {}) {
  return `<button type="button" class="bc${t.sel ? " sel" : ""}${t.win ? " win" : ""}${t.hint ? " hint" : ""}${t.dis ? " dis" : ""}${t.size ? " " + t.size : ""}" data-act="bk-card" data-id="${e}" aria-label="${bName(e)}">${nCardFace(e)}</button>`;
}
const bkCardBack = () => '<div class="bc back"></div>';
function bkSync() {
  const e = bkCfg();
  (document
    .querySelectorAll('[data-act="bk-seg"]')
    .forEach((t) =>
      t.setAttribute("aria-pressed", String(e[t.dataset.key]) === t.dataset.val ? "true" : "false"),
    ),
    ($("#bk-room-panel").hidden = e.mode !== "room"),
    ($("#bk-go").textContent = e.mode === "room" ? "Crea stanza" : "Inizia la partita"),
    document.activeElement !== $("#bk-in-name") && ($("#bk-in-name").value = e.name || ""),
    ($("#bk-note-mode").textContent =
      e.mode === "bots"
        ? "Tu contro i bot: nessun limite di tempo."
        : "Gli amici entrano col codice; i posti rimasti vuoti li prendono i bot. Ognuno ha 60 secondi per giocare. Se un amico esce, al suo posto gioca un bot."),
    ($("#bk-note-players").textContent =
      e.players === 4
        ? "2 contro 2: il tuo compagno \xE8 chi ti siede di fronte."
        : e.players === 3
          ? "Tutti contro tutti, senza un 2 nel mazzo."
          : "Uno contro uno."));
}
function bkErr(e) {
  $("#bk-err").textContent = e || "";
}
function bkBegin() {
  const e = bkCfg();
  ((e.name = ($("#bk-in-name").value || "").trim().slice(0, 14)), saveCfg());
  const t = e.mode === "room",
    a = t ? genCode() : "";
  BK = {
    isHost: !0,
    room: t,
    code: a,
    pid: "h",
    conns: {},
    snap: null,
    ask: null,
    sel: -1,
    done: !1,
    finals: null,
    started: !1,
    askAt: 0,
    status: t ? "Apro la stanza\u2026" : "",
  };
  const s = {
    send: (o, i) => {
      if (o === "h") bkClientMsg(i);
      else {
        const r = BK && BK.conns[o];
        r && r.send(i);
      }
    },
  };
  (brCreate({ mode: e.players, rounds: e.rounds, diff: e.diff, timeout: t ? B_TIMEOUT : 0, code: a }, s),
    (BK.send = (o) => brMsg("h", o)));
  const n = brAdd(e.name || "Tu", !0, "h");
  if (((BK.myName = n.p.name), !t)) {
    (show("btable"), brStart());
    return;
  }
  (show("blobby"),
    bkRenderLobby(),
    (BK.net = netImpl().host(a, {
      onReady() {
        BK && ((BK.ready = !0), (BK.status = ""), bkRenderLobby());
      },
      onConn(o) {
        bkHostAccept(o);
      },
      onError(o) {
        BK && !BK.ready && bkBack(netErrText(o));
      },
    })));
}
function bkHostAccept(e) {
  ((e.onmessage = (t) => {
    if (!(!BK || BK.done))
      if (e.pid) brMsg(e.pid, t);
      else {
        if (!t || t.t !== "join") return;
        const a = brAdd(t.name, !1);
        if (a.err) {
          (e.send({ t: "deny", why: a.err }), setTimeout(() => e.close(), 300));
          return;
        }
        ((e.pid = a.p.id),
          (BK.conns[e.pid] = e),
          e.send({ t: "welcome", pid: e.pid, code: BK.code }),
          brBroadcast());
      }
  }),
    (e.onclose = () => {
      e.pid && BK && !BK.done && brLeave(e.pid);
    }));
}
function bkJoin() {
  const e = bkCfg(),
    t = ($("#bk-in-code").value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(t)) {
    bkErr("Il codice ha 5 caratteri (lettere e numeri).");
    return;
  }
  (bkErr(""),
    (e.name = ($("#bk-in-name").value || "").trim().slice(0, 14)),
    saveCfg(),
    (BK = {
      isHost: !1,
      room: !0,
      code: t,
      pid: null,
      snap: null,
      ask: null,
      sel: -1,
      done: !1,
      finals: null,
      started: !1,
      askAt: 0,
      status: "Mi collego alla stanza\u2026",
    }),
    (BK.send = (a) => {
      BK && BK.conn && BK.conn.send(a);
    }),
    (BK.joinTimer = setTimeout(() => {
      BK && !BK.pid && bkBack(netErrText("timeout"));
    }, 2e4)),
    (BK.net = netImpl().join(t, {
      onOpen(a) {
        BK &&
          ((BK.conn = a),
          (a.onmessage = bkClientMsg),
          (a.onclose = () => {
            BK &&
              !BK.done &&
              (BK.pid
                ? bkFinish("Connessione persa: il tavolo non \xE8 pi\xF9 raggiungibile.")
                : bkBack("La stanza non risponde."));
          }),
          a.send({ t: "join", name: e.name }));
      },
      onError(a) {
        BK && !BK.pid && bkBack(netErrText(a));
      },
    })),
    show("blobby"),
    bkRenderLobby());
}
function bkBack(e) {
  const t = BK && BK.net;
  (setTimeout(() => {
    try {
      t && t.close();
    } catch {}
  }, 400),
    BK && clearTimeout(BK.joinTimer),
    (BK = null),
    show("bsetup"),
    bkSync(),
    bkErr(e || ""));
}
function bkClientMsg(e) {
  !BK ||
    !e ||
    (e.t === "welcome"
      ? ((BK.pid = e.pid), clearTimeout(BK.joinTimer), (BK.status = ""))
      : e.t === "deny"
        ? bkBack(e.why || "Non puoi entrare in questa stanza.")
        : e.t === "bstate"
          ? BK.done || bkState(e)
          : e.t === "bbye"
            ? ((BK.finals = e.finals), BK.done && BK.resultShown && bkResult())
            : e.t === "bend" &&
              ((BK.finals = e.finals),
              bkFinish(BK.closing ? "Hai chiuso il tavolo." : e.reason || "Il tavolo \xE8 stato chiuso."),
              BK.done && BK.resultShown && bkResult()));
}
function bkState(e) {
  const t = BK.snap;
  if (
    ((BK.snap = e), (BK.myName = (e.seats.find((s) => s.pid === BK.pid) || {}).name || BK.myName), !e.started)
  ) {
    (!$("#screen-blobby").hidden || t === null) && (show("blobby"), bkRenderLobby());
    return;
  }
  BK.started = !0;
  const a = e.ask;
  (a && (!BK.ask || BK.ask.id !== a.id)
    ? ((BK.ask = a), (BK.askAt = Date.now()), (BK.sel = -1))
    : a || ((BK.ask = null), (BK.sel = -1)),
    $("#screen-btable").hidden && show("btable"),
    bkRender());
}
function bkRenderLobby() {
  if (!BK) return;
  const e = BK.snap,
    t = $("#blobby-body"),
    a = e ? e.seats : [],
    s = e ? e.mode : 0;
  t.innerHTML = `<p class="eyebrow">Briscola</p>
    <div class="roomcode" aria-label="Codice stanza">${esc(BK.code)}</div>
    ${BK.status ? `<p class="note">${esc(BK.status)}</p>` : '<button class="ghost wide" data-act="bk-share">Condividi il codice</button>'}
    ${a.length ? `<h3 class="h-sub">Al tavolo (${a.length}/${s})</h3><div class="plist">${a.map((n) => `<div class="prow"><b>${esc(n.name)}</b>${n.pid === BK.pid ? "<small>tu</small>" : ""}${n.host ? "<em>host</em>" : ""}</div>`).join("")}</div>` : ""}
    ${e ? `<p class="note">${s} giocatori${s === 4 ? " \xB7 2 contro 2, i compagni si siedono di fronte (1\xBA con 3\xBA, 2\xBA con 4\xBA)" : ""} \xB7 ${e.rounds} ${e.rounds === 1 ? "mano" : "mani"}. I posti vuoti li prendono i bot.</p>` : ""}
    ${
      BK.isHost
        ? `<button class="primary wide" data-act="bk-start" ${BK.ready ? "" : "disabled"}>Inizia la partita</button>
      <p class="note">Una volta iniziata, nessuno pu\xF2 pi\xF9 entrare.</p>`
        : `<p class="note">${BK.pid ? "In attesa che chi ha creato la stanza inizi la partita\u2026" : ""}</p>`
    }
    <button class="ghost wide" data-act="bk-leave">${BK.isHost ? "Chiudi la stanza" : "Esci"}</button>`;
}
function bkShare() {
  const e = `Vieni a giocare a briscola! Codice stanza: ${BK.code}`;
  try {
    if (navigator.share) {
      navigator.share({ text: e }).catch(() => {});
      return;
    }
  } catch {}
  try {
    (navigator.clipboard.writeText(BK.code),
      (BK.status = "Codice copiato."),
      bkRenderLobby(),
      setTimeout(() => {
        BK && ((BK.status = ""), bkRenderLobby());
      }, 1500));
  } catch {}
}
function bkRender() {
  const e = BK.snap;
  if (!e) return;
  const t = e.seats[e.me.seat],
    a = (l) => (e.seats.find((c) => c.pid === l) || {}).name || "",
    s = (l) => e.mode === 4 && l.team === e.me.team && l.pid !== BK.pid;
  (($("#bk-meta").textContent =
    `Mano ${e.round}/${e.rounds} \xB7 ${e.mode === 4 ? "2 contro 2" : e.mode + " giocatori"}${BK.room ? " \xB7 " + BK.code : ""}`),
    ($("#bk-bank").textContent = `${e.me.wins}`),
    ($("#bk-opps").innerHTML = e.seats
      .filter((l) => l.pid !== BK.pid)
      .map((l) => {
        const c = e.lastTrick && e.phase === "trick" && e.lastTrick.pid === l.pid;
        return `<div class="bkseat${l.turn ? " active" : ""}${c ? " win" : ""}"><div class="pkhead"><span class="nm">${esc(l.name)}</span>${l.dealer ? '<i class="bdg d">M</i>' : ""}${s(l) ? '<i class="bdg">compagno</i>' : ""}</div>
      <div class="bkbacks">${Array.from({ length: l.cards }, bkCardBack).join("")}</div><div class="pkst">${(e.mode === 4, "")}${l.wins ? l.wins + " " + (l.wins === 1 ? "mano vinta" : "mani vinte") : ""}</div></div>`;
      })
      .join("")));
  const n =
    e.trump >= 0
      ? `<div class="bk-deck">${bkCardHTML(e.trump, { dis: !0, size: "sm" })}<div class="bc back sm stack"></div></div><div class="pkst">Mazzo: ${e.deckLeft}</div>`
      : `<div class="bk-suit"><svg viewBox="0 0 24 32" aria-hidden="true">${e.trumpSuit >= 0 ? BK_SUITSVG[e.trumpSuit] : ""}</svg></div><div class="pkst">Mazzo finito</div>`;
  $("#bk-trump").innerHTML =
    `<div class="pkst">Briscola${e.trumpSuit >= 0 ? ": <b>" + B_SUITN[e.trumpSuit] + "</b>" : ""}</div>${n}`;
  const o = e.table
    .map((l) => {
      const c = e.lastTrick && e.phase === "trick" && e.lastTrick.pid === l.pid;
      return `<div class="bkslot">${bkCardHTML(l.card, { dis: !0, win: c })}<span class="pkst">${esc(a(l.pid))}</span></div>`;
    })
    .join("");
  (($("#bk-table").innerHTML =
    o || `<p class="spec">${e.phase === "deal" ? "Si distribuiscono le carte\u2026" : ""}</p>`),
    ($("#bk-me").className = "bk-me" + (e.turn === BK.pid ? " active" : "")));
  const i = !!BK.ask,
    r = bkCfg().aids === "on" && i ? bkAdvice(e) : null;
  if (
    ((BK.sug = r),
    ($("#bk-hand").innerHTML = e.me.hand.length
      ? e.me.hand
          .map((l) =>
            bkCardHTML(l, { sel: BK.sel === l, hint: !!r && r.card === l && BK.sel !== l, dis: !i }),
          )
          .join("")
      : '<p class="spec">Non hai pi\xF9 carte in mano.</p>'),
    ($("#bk-me-name").textContent = `${BK.myName || "Tu"}${t && t.dealer ? " \xB7 mazziere" : ""}`),
    bkRenderAids(e),
    bkRenderRound(e),
    bkRenderStatus(e),
    bkRenderControls(e),
    BK.ask)
  ) {
    const l = $("#bk-felt"),
      c = l.getBoundingClientRect(),
      f = $("#bk-me").getBoundingClientRect();
    f.bottom > c.bottom && (l.scrollTop += f.bottom - c.bottom + 4);
  }
}
function bkRenderRound(e) {
  const t = $("#bk-sum"),
    a = e.roundRes;
  if (!a || e.phase !== "roundEnd") {
    t.hidden = !0;
    return;
  }
  t.hidden = !1;
  let s;
  e.mode === 4
    ? (s = [0, 1]
        .map(
          (i) =>
            `<div class="row"><span>Coppia ${i + 1}${e.me.team === i ? " (la tua)" : ""}: ${e.seats
              .filter((r) => r.team === i)
              .map((r) => esc(r.name))
              .join(" e ")}</span><b>${a.pts[i]}</b></div>`,
        )
        .join(""))
    : (s = e.seats
        .map(
          (i, r) =>
            `<div class="row"><span>${esc(i.name)}${i.pid === BK.pid ? " (tu)" : ""}</span><b>${a.pts[r]}</b></div>`,
        )
        .join(""));
  const n = a.winners.includes(e.me.team),
    o = a.drawn ? "Mano pari" : n ? "Mano vinta!" : "Mano persa";
  t.innerHTML = `<h3>Mano ${a.round} di ${a.rounds} \xB7 ${o}</h3><div class="rows">${s}</div>${a.round < a.rounds ? '<p class="note">Tra poco si riparte\u2026</p>' : `<p class="note">Era l'ultima mano.</p>`}`;
}
function bkRenderStatus(e) {
  const t = $("#bk-status");
  let a;
  if (e.phase === "roundEnd") a = e.log[e.log.length - 1] || "";
  else if (e.phase === "trick" && e.lastTrick)
    a = `${e.lastTrick.name} prende${e.lastTrick.pts ? ` ${e.lastTrick.pts} punti` : " (zero punti)"}`;
  else if (BK.ask) {
    const s = e.turnMs ? Math.max(0, Math.ceil((e.turnMs - (Date.now() - BK.askAt)) / 1e3)) : 0;
    a = "Tocca a te" + (BK.sel < 0 ? ": scegli una carta" : "") + (s ? ` \xB7 ${s}s` : "");
  } else if (e.turn) {
    const s = e.seats.find((n) => n.pid === e.turn);
    a = s ? `Tocca a ${s.name}\u2026` : "";
  } else a = "";
  t.textContent = a;
}
let bkTimer = setInterval(() => {
  BK && BK.snap && BK.ask && bkRenderStatus(BK.snap);
}, 500);
function bkRenderControls(e) {
  const t = $("#bk-controls"),
    a = [BK.ask ? BK.ask.id : 0, BK.sel].join("|");
  a !== BK.ctlKey &&
    ((BK.ctlKey = a),
    (t.innerHTML = BK.ask
      ? `<button class="primary wide" data-act="bk-play" ${BK.sel >= 0 ? "" : "disabled"}>${BK.sel >= 0 ? "Gioca " + esc(bName(BK.sel)) : "Scegli una carta"}</button>`
      : ""));
}
function bkAdvice(e) {
  if (!e.me.hand.length) return null;
  const t = e.table.map((i) => ({ pid: i.pid, card: i.card }));
  let a = !1;
  if (e.mode === 4 && t.length) {
    const i = bTrickWinner(t, e.trumpSuit);
    a = e.seats.findIndex((l) => l.pid === t[i].pid) % 2 === e.me.seat % 2;
  }
  const s = bBotChoose(e.me.hand, t, e.trumpSuit, e.mode, a, "high"),
    n = t.reduce((i, r) => i + bPts(r.card), 0);
  let o;
  return (
    t.length
      ? a
        ? (o =
            bPts(s) > 0
              ? "il compagno sta vincendo: carichi punti"
              : "il compagno sta vincendo: tieni le carte buone")
        : bTrickWinner(t.concat([{ card: s }]), e.trumpSuit) === t.length
          ? (o = n ? `prendi la mano e i ${n} punti sul tavolo` : "prendi la mano spendendo poco")
          : (o = "non vale la pena prendere: scarti la carta meno preziosa")
      : (o = "apri con una carta di poco valore: non regali punti"),
    { card: s, why: o }
  );
}
function bkRenderAids(e) {
  const t = bkCfg().aids === "on",
    a = $("#bk-aids");
  if (
    (document
      .querySelectorAll("#screen-btable .tog")
      .forEach((l) => l.setAttribute("aria-pressed", t ? "true" : "false")),
    (a.hidden = !t),
    !t)
  )
    return;
  const s = new Set(e.seen.concat(e.me.hand)),
    n = [];
  for (let l = 0; l < 40; l++) !(e.mode === 3 && l === 1) && !s.has(l) && n.push(l);
  const o = n.filter((l) => bSuit(l) === e.trumpSuit).length,
    i = n.filter((l) => bV(l) === 1 || bV(l) === 3).length,
    r = n.reduce((l, c) => l + bPts(c), 0);
  a.innerHTML =
    (BK.sug
      ? `<p class="sugline">Consiglio: <b>${esc(bName(BK.sug.card))}</b> \u2014 ${esc(BK.sug.why)}.</p>`
      : "") +
    `<div class="orow2"><span>${e.mode === 4 ? "Punti della tua coppia" : "I tuoi punti"}</span><b>${e.me.pts}</b></div>
    <div class="orow2"><span>Briscole non ancora uscite</span><b>${o}</b></div>
    <div class="orow2"><span>Assi e tre non ancora usciti</span><b>${i}</b></div>
    <div class="orow2"><span>Punti ancora in gioco (mazzo + mani altrui)</span><b>${r}</b></div>`;
}
function bkPlay() {
  if (!BK || !BK.ask || BK.sel < 0) return;
  const e = BK.ask,
    t = BK.sel;
  ((BK.ask = null),
    (BK.sel = -1),
    (BK.ctlKey = ""),
    ($("#bk-controls").innerHTML = ""),
    BK.send({ t: "ans", id: e.id, v: t }));
}
function bkOpenLeave() {
  if (!BK || BK.done) return;
  const e = BK.snap,
    t = e ? e.seats.filter((s) => !s.bot).length : 1;
  let a;
  (BK.isHost
    ? (a =
        t > 1
          ? "Se lasci il tavolo non esiste pi\xF9 e il gioco termina per tutti."
          : "Vuoi lasciare il tavolo? La partita termina.")
    : BK.started
      ? (a = "Se esci adesso, al tuo posto gioca un bot e la partita continua senza di te.")
      : (a = "Vuoi uscire dalla stanza?"),
    ($("#bsheet-msg").textContent = a),
    ($("#bsheet").hidden = !1));
}
function bkConfirmLeave() {
  if ((($("#bsheet").hidden = !0), !(!BK || BK.done))) {
    if (BK.isHost) {
      ((BK.closing = !0),
        brEnd("Chi ha creato la stanza ha chiuso il tavolo."),
        BK.done || bkFinish("Hai chiuso il tavolo."));
      return;
    }
    if (!BK.started) {
      (BK.send({ t: "leave" }), bkBack(""));
      return;
    }
    (BK.send({ t: "leave" }), bkFinish("Hai lasciato il tavolo."));
  }
}
function bkFinish(e) {
  if (!BK || BK.done) return;
  ((BK.done = !0), (BK.reason = e), (BK.ask = null));
  const t = BK.net;
  if (
    (setTimeout(() => {
      try {
        t && t.close();
      } catch {}
    }, 600),
    !BK.started)
  ) {
    bkBack(e);
    return;
  }
  bkResult();
}
function bkResult() {
  BK.resultShown = !0;
  const e = BK.finals || [],
    t = BK.snap,
    a = e.find((o) => o.name === BK.myName),
    s = a ? (a.place === 1 ? "Hai vinto!" : `${a.place}\xBA posto`) : "Partita finita",
    n = e.length === 4;
  (logGame(BK, "bk", a, e.length, a && { detail: `${a.wins} ${a.wins === 1 ? "mano vinta" : "mani vinte"} \xB7 ${a.pts} punti` }),
    ($("#bresult-body").innerHTML = `<p class="eyebrow">Briscola</p>
    <div class="verdict ${a && a.place === 1 ? "ok" : ""}">${s}</div>
    <p class="sub" style="color:var(--muted)">${esc(BK.reason || "")}</p>
    ${
      e.length
        ? `<h3 class="h-sub">Classifica</h3><div class="plist">${e
            .map(
              (
                o,
              ) => `<div class="prow${o.name === BK.myName ? " me" : ""}"><span class="rk">${o.place}</span><b>${esc(o.name)}</b>${o.host ? "<em>host</em>" : ""}${n ? `<small>coppia ${o.team + 1}</small>` : ""}
      <span class="rr">${o.wins} ${o.wins === 1 ? "mano" : "mani"} <small>${o.pts} pt</small></span></div>`,
            )
            .join("")}</div>`
        : ""
    }
    <div class="stack"><button class="primary wide" data-act="bk-again">Torna alle impostazioni</button><button class="ghost wide" data-act="go-home">Home</button></div>`),
    ($("#screen-bresult").scrollTop = 0),
    show("bresult"));
}
(document.addEventListener("click", (e) => {
  const t = e.target.closest('[data-act^="bk-"],[data-act="go-bk"]');
  if (!t || t.disabled) return;
  switch (t.dataset.act) {
    case "go-bk":
      (show("bsetup"), bkSync());
      break;
    case "bk-seg":
      ((bkCfg()[t.dataset.key] = /^\d+$/.test(t.dataset.val) ? Number(t.dataset.val) : t.dataset.val),
        saveCfg(),
        bkSync());
      break;
    case "bk-go":
      bkBegin();
      break;
    case "bk-join":
      bkJoin();
      break;
    case "bk-start":
      BK && BK.isHost && brStart();
      break;
    case "bk-share":
      bkShare();
      break;
    case "bk-leave":
      bkOpenLeave();
      break;
    case "bk-stay":
      $("#bsheet").hidden = !0;
      break;
    case "bk-leave-ok":
      bkConfirmLeave();
      break;
    case "bk-again":
      ((BK = null), show("bsetup"), bkSync());
      break;
    case "bk-tog": {
      const s = bkCfg();
      ((s.aids = s.aids === "on" ? "off" : "on"), saveCfg(), BK && BK.snap && BK.started && bkRender());
      break;
    }
    case "bk-card":
      if (BK && BK.ask) {
        const s = Number(t.dataset.id);
        BK.sel === s ? bkPlay() : ((BK.sel = s), (BK.ctlKey = ""), bkRender());
      }
      break;
    case "bk-play":
      bkPlay();
      break;
  }
}),
  document.addEventListener("input", (e) => {
    e.target.id === "bk-in-name" && (bkCfg().name = e.target.value.slice(0, 14));
  }),
  bkSync());
const SK_DEF = { mode: "bots", name: "", players: 2, target: 11, diff: "mid", aids: "off" },
  skCfg = () => ((cfg.sk = Object.assign({}, SK_DEF, cfg.sk || {})), cfg.sk);
let SK = null;
const SK_PAUSE = { deal: 500, bot: 1e3, card: 500, take: 1500, scopa: 2200, round: 8e3 };
SUI.pause = (e) =>
  new Promise((t) => {
    const a = typeof window.__pauseScale == "number" ? window.__pauseScale : 1;
    setTimeout(t, (SK_PAUSE[e] || 500) * a);
  });
function skCardHTML(e, t = {}) {
  if (e < 0)
    return `<button type="button" class="bc back${t.sel ? " sel" : ""}${t.dis ? " dis" : ""}${t.size ? " " + t.size : ""}" data-act="${t.act || "sc-card"}" data-id="-1" aria-label="Carta coperta"></button>`;
  const a = bV(e);
  return `<button type="button" class="bc${t.sel ? " sel" : ""}${t.win ? " win" : ""}${t.dis ? " dis" : ""}${t.pick ? " pick" : ""}${t.hint ? " hint" : ""}${t.size ? " " + t.size : ""}" data-act="${t.act || "sc-card"}" data-id="${e}" aria-label="${bName(e)}">${nCardFace(e)}</button>`;
}
function skSync() {
  const e = skCfg();
  (document
    .querySelectorAll('[data-act="sc-seg"]')
    .forEach((t) =>
      t.setAttribute("aria-pressed", String(e[t.dataset.key]) === t.dataset.val ? "true" : "false"),
    ),
    ($("#sk-room-panel").hidden = e.mode !== "room"),
    ($("#sk-go").textContent = e.mode === "room" ? "Crea stanza" : "Inizia la partita"),
    document.activeElement !== $("#sk-in-name") && ($("#sk-in-name").value = e.name || ""),
    ($("#sk-note-mode").textContent =
      e.mode === "bots"
        ? "Tu contro i bot: nessun limite di tempo."
        : "Gli amici entrano col codice; i posti rimasti vuoti li prendono i bot. Ognuno ha 60 secondi per giocare. Se un amico esce, al suo posto gioca un bot."),
    ($("#sk-note-players").textContent =
      e.players === 4
        ? "2 contro 2: il tuo compagno \xE8 chi ti siede di fronte. Le carte prese si sommano."
        : e.players === 3
          ? "Tutti contro tutti."
          : "Uno contro uno."));
}
function skErr(e) {
  $("#sk-err").textContent = e || "";
}
function skBegin() {
  const e = skCfg();
  ((e.name = ($("#sk-in-name").value || "").trim().slice(0, 14)), saveCfg());
  const t = e.mode === "room",
    a = t ? genCode() : "";
  SK = {
    isHost: !0,
    room: t,
    code: a,
    pid: "h",
    conns: {},
    snap: null,
    ask: null,
    sel: -1,
    pick: [],
    done: !1,
    finals: null,
    started: !1,
    askAt: 0,
    status: t ? "Apro la stanza\u2026" : "",
  };
  const s = {
    send: (o, i) => {
      if (o === "h") skClientMsg(i);
      else {
        const r = SK && SK.conns[o];
        r && r.send(i);
      }
    },
  };
  (scCreate({ mode: e.players, target: e.target, diff: e.diff, timeout: t ? SC_TIMEOUT : 0, code: a }, s),
    (SK.send = (o) => scMsg("h", o)));
  const n = scAdd(e.name || "Tu", !0, "h");
  if (((SK.myName = n.p.name), !t)) {
    (show("stable"), scStart());
    return;
  }
  (show("slobby"),
    skRenderLobby(),
    (SK.net = netImpl().host(a, {
      onReady() {
        SK && ((SK.ready = !0), (SK.status = ""), skRenderLobby());
      },
      onConn(o) {
        skHostAccept(o);
      },
      onError(o) {
        SK && !SK.ready && skBack(netErrText(o));
      },
    })));
}
function skHostAccept(e) {
  ((e.onmessage = (t) => {
    if (!(!SK || SK.done))
      if (e.pid) scMsg(e.pid, t);
      else {
        if (!t || t.t !== "join") return;
        const a = scAdd(t.name, !1);
        if (a.err) {
          (e.send({ t: "deny", why: a.err }), setTimeout(() => e.close(), 300));
          return;
        }
        ((e.pid = a.p.id),
          (SK.conns[e.pid] = e),
          e.send({ t: "welcome", pid: e.pid, code: SK.code }),
          scBroadcast());
      }
  }),
    (e.onclose = () => {
      e.pid && SK && !SK.done && scLeave(e.pid);
    }));
}
function skJoin() {
  const e = skCfg(),
    t = ($("#sk-in-code").value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(t)) {
    skErr("Il codice ha 5 caratteri (lettere e numeri).");
    return;
  }
  (skErr(""),
    (e.name = ($("#sk-in-name").value || "").trim().slice(0, 14)),
    saveCfg(),
    (SK = {
      isHost: !1,
      room: !0,
      code: t,
      pid: null,
      snap: null,
      ask: null,
      sel: -1,
      pick: [],
      done: !1,
      finals: null,
      started: !1,
      askAt: 0,
      status: "Mi collego alla stanza\u2026",
    }),
    (SK.send = (a) => {
      SK && SK.conn && SK.conn.send(a);
    }),
    (SK.joinTimer = setTimeout(() => {
      SK && !SK.pid && skBack(netErrText("timeout"));
    }, 2e4)),
    (SK.net = netImpl().join(t, {
      onOpen(a) {
        SK &&
          ((SK.conn = a),
          (a.onmessage = skClientMsg),
          (a.onclose = () => {
            SK &&
              !SK.done &&
              (SK.pid
                ? skFinish("Connessione persa: il tavolo non \xE8 pi\xF9 raggiungibile.")
                : skBack("La stanza non risponde."));
          }),
          a.send({ t: "join", name: e.name }));
      },
      onError(a) {
        SK && !SK.pid && skBack(netErrText(a));
      },
    })),
    show("slobby"),
    skRenderLobby());
}
function skBack(e) {
  const t = SK && SK.net;
  (setTimeout(() => {
    try {
      t && t.close();
    } catch {}
  }, 400),
    SK && clearTimeout(SK.joinTimer),
    (SK = null),
    show("ssetup"),
    skSync(),
    skErr(e || ""));
}
function skClientMsg(e) {
  !SK ||
    !e ||
    (e.t === "welcome"
      ? ((SK.pid = e.pid), clearTimeout(SK.joinTimer), (SK.status = ""))
      : e.t === "deny"
        ? skBack(e.why || "Non puoi entrare in questa stanza.")
        : e.t === "sstate"
          ? SK.done || skState(e)
          : e.t === "sbye"
            ? ((SK.finals = e.finals), SK.done && SK.resultShown && skResult())
            : e.t === "send" &&
              ((SK.finals = e.finals),
              skFinish(SK.closing ? "Hai chiuso il tavolo." : e.reason || "Il tavolo \xE8 stato chiuso."),
              SK.done && SK.resultShown && skResult()));
}
function skState(e) {
  const t = SK.snap;
  if (
    ((SK.snap = e), (SK.myName = (e.seats.find((s) => s.pid === SK.pid) || {}).name || SK.myName), !e.started)
  ) {
    (!$("#screen-slobby").hidden || t === null) && (show("slobby"), skRenderLobby());
    return;
  }
  SK.started = !0;
  const a = e.ask;
  (a && (!SK.ask || SK.ask.id !== a.id)
    ? ((SK.ask = a), (SK.askAt = Date.now()), (SK.sel = -1), (SK.pick = []))
    : a || ((SK.ask = null), (SK.sel = -1), (SK.pick = [])),
    $("#screen-stable").hidden && show("stable"),
    skRender());
}
function skRenderLobby() {
  if (!SK) return;
  const e = SK.snap,
    t = $("#slobby-body"),
    a = e ? e.seats : [],
    s = e ? e.mode : 0;
  t.innerHTML = `<p class="eyebrow">Scopa</p>
    <div class="roomcode" aria-label="Codice stanza">${esc(SK.code)}</div>
    ${SK.status ? `<p class="note">${esc(SK.status)}</p>` : '<button class="ghost wide" data-act="sc-share">Condividi il codice</button>'}
    ${a.length ? `<h3 class="h-sub">Al tavolo (${a.length}/${s})</h3><div class="plist">${a.map((n) => `<div class="prow"><b>${esc(n.name)}</b>${n.pid === SK.pid ? "<small>tu</small>" : ""}${n.host ? "<em>host</em>" : ""}</div>`).join("")}</div>` : ""}
    ${e ? `<p class="note">${s} giocatori${s === 4 ? " \xB7 2 contro 2, i compagni si siedono di fronte (1\xBA con 3\xBA, 2\xBA con 4\xBA)" : ""} \xB7 si gioca a ${e.target} punti. I posti vuoti li prendono i bot.</p>` : ""}
    ${
      SK.isHost
        ? `<button class="primary wide" data-act="sc-start" ${SK.ready ? "" : "disabled"}>Inizia la partita</button>
      <p class="note">Una volta iniziata, nessuno pu\xF2 pi\xF9 entrare.</p>`
        : `<p class="note">${SK.pid ? "In attesa che chi ha creato la stanza inizi la partita\u2026" : ""}</p>`
    }
    <button class="ghost wide" data-act="sc-leave">${SK.isHost ? "Chiudi la stanza" : "Esci"}</button>`;
}
function skShare() {
  const e = `Vieni a giocare a scopa! Codice stanza: ${SK.code}`;
  try {
    if (navigator.share) {
      navigator.share({ text: e }).catch(() => {});
      return;
    }
  } catch {}
  try {
    (navigator.clipboard.writeText(SK.code),
      (SK.status = "Codice copiato."),
      skRenderLobby(),
      setTimeout(() => {
        SK && ((SK.status = ""), skRenderLobby());
      }, 1500));
  } catch {}
}
const skOpts = () => (SK && SK.snap && SK.sel >= 0 ? scOptions(SK.sel, SK.snap.table) : []);
function skReady() {
  if (!SK || !SK.ask || SK.sel < 0) return !1;
  const e = skOpts();
  return !e.length || e.some((t) => scSame(t, SK.pick));
}
function skChoose(e) {
  SK.sel = e;
  const t = skOpts();
  SK.pick = t.length === 1 ? t[0].slice() : [];
}
function skRender() {
  const e = SK.snap;
  if (!e) return;
  const t = e.seats[e.me.seat],
    a = (c) => (e.seats.find((f) => f.pid === c) || {}).name || "",
    s = (c) => e.mode === 4 && c.team === e.me.team && c.pid !== SK.pid;
  (($("#sk-meta").textContent =
    `Mano ${e.round} \xB7 a ${e.target} punti${SK.room ? " \xB7 " + SK.code : ""}`),
    ($("#sk-bank").textContent = `${e.me.total}`),
    ($("#sk-opps").innerHTML = e.seats
      .filter((c) => c.pid !== SK.pid)
      .map((c) => {
        const f = e.move && e.phase === "take" && e.move.pid === c.pid;
        return `<div class="bkseat${c.turn ? " active" : ""}${f ? " win" : ""}"><div class="pkhead"><span class="nm">${esc(c.name)}</span>${c.dealer ? '<i class="bdg d">M</i>' : ""}${s(c) ? '<i class="bdg">compagno</i>' : ""}</div>
      <div class="bkbacks">${Array.from({ length: c.cards }, bkCardBack).join("")}</div><div class="pkst">${c.taken} prese${c.scope ? " \xB7 " + c.scope + (c.scope === 1 ? " scopa" : " scope") : ""}</div></div>`;
      })
      .join("")));
  const n = !!SK.ask && SK.sel >= 0 && skOpts().length > 1,
    o = new Set([].concat(...skOpts())),
    i = e.phase === "take" ? e.move : null;
  (($("#sk-table").innerHTML = e.table.length
    ? e.table
        .map((c) =>
          skCardHTML(c, {
            size: "sm",
            act: "sc-tcard",
            dis: !n,
            pick: n && SK.pick.includes(c),
            hint: n && o.has(c) && !SK.pick.includes(c),
            win: !!i && i.take.includes(c),
            sel: !!i && i.card === c,
          }),
        )
        .join("")
    : `<p class="spec">${e.phase === "deal" ? "Si distribuiscono le carte\u2026" : "Tavolo vuoto"}</p>`),
    ($("#sk-deck").innerHTML =
      `<div class="bc back sm stack"></div><div class="pkst">Mazzo: ${e.deckLeft}</div>`),
    ($("#sk-me").className = "bk-me" + (e.turn === SK.pid ? " active" : "")));
  const r = !!SK.ask,
    l = skCfg().aids === "on" && r ? skAdvice(e) : null;
  if (
    ((SK.sug = l),
    ($("#sk-hand").innerHTML = e.me.hand.length
      ? e.me.hand
          .map((c) =>
            skCardHTML(c, { sel: SK.sel === c, hint: !!l && l.card === c && SK.sel !== c, dis: !r }),
          )
          .join("")
      : '<p class="spec">Non hai pi\xF9 carte in mano.</p>'),
    ($("#sk-me-name").textContent =
      `${SK.myName || "Tu"}${t && t.dealer ? " \xB7 mazziere" : ""}${t && t.scope ? " \xB7 " + e.me.scope + (e.me.scope === 1 ? " scopa" : " scope") : ""}`),
    skRenderAids(e),
    skRenderRound(e),
    skRenderStatus(e),
    skRenderControls(e),
    SK.ask)
  ) {
    const c = $("#sk-felt"),
      f = c.getBoundingClientRect(),
      m = $("#sk-me").getBoundingClientRect();
    m.bottom > f.bottom && (c.scrollTop += m.bottom - f.bottom + 4);
  }
}
function skRenderRound(e) {
  const t = $("#sk-sum"),
    a = e.roundRes;
  if (!a || e.phase !== "roundEnd") {
    t.hidden = !0;
    return;
  }
  t.hidden = !1;
  const s = (r) =>
      e.mode === 4
        ? `Coppia ${r + 1}${e.me.team === r ? " (la tua)" : ""}: ${e.seats
            .filter((l) => l.team === r)
            .map((l) => esc(l.name))
            .join(" e ")}`
        : `${esc(e.seats[r].name)}${e.seats[r].pid === SK.pid ? " (tu)" : ""}`,
    n = (r, l) => `<span class="sk-tag${r ? " on" : ""}">${l}</span>`,
    o = a.rows
      .map(
        (r, l) => `<div class="sk-rrow"><div class="row"><span>${s(l)}</span><b>+${r.pts}</b></div>
    <div class="sk-tags">${n(r.got.cards, "Carte " + r.cards)}${n(r.got.denari, "Denari " + r.denari)}${n(r.got.sette, "Settebello")}${n(r.got.prim, "Primiera " + (r.prim || "\u2014"))}${n(r.scope, "Scope " + r.scope)}</div></div>`,
      )
      .join(""),
    i = a.totals.map((r, l) => `${e.mode === 4 ? "C" + (l + 1) : esc(e.seats[l].name)} ${r}`).join(" \xB7 ");
  t.innerHTML = `<h3>Fine mano ${a.round}</h3>${o}<p class="note">Totale: ${i}</p>${a.over ? '<p class="note">Partita decisa!</p>' : `<p class="note">Si continua fino a ${a.target} punti: tra poco si riparte\u2026</p>`}`;
}
function skRenderStatus(e) {
  const t = $("#sk-status");
  let a;
  if (e.phase === "roundEnd") a = e.log[e.log.length - 1] || "";
  else if (e.phase === "take" && e.move)
    a = e.move.scopa ? `SCOPA! ${e.move.name}` : `${e.move.name} prende ${e.move.take.length + 1} carte`;
  else if (SK.ask) {
    const s = e.turnMs ? Math.max(0, Math.ceil((e.turnMs - (Date.now() - SK.askAt)) / 1e3)) : 0,
      n = skOpts();
    let o = "Tocca a te: scegli una carta";
    (SK.sel >= 0 &&
      (o = n.length
        ? n.length === 1
          ? "Presa obbligata"
          : skReady()
            ? "Presa pronta"
            : "Tocca le carte da prendere"
        : "Nessuna presa: la carta va sul tavolo"),
      (a = o + (s ? ` \xB7 ${s}s` : "")));
  } else if (e.turn) {
    const s = e.seats.find((n) => n.pid === e.turn);
    a = s ? `Tocca a ${s.name}\u2026` : "";
  } else a = "";
  ((t.textContent = a), t.classList.toggle("scopa", !!(e.phase === "take" && e.move && e.move.scopa)));
}
let skTimer = setInterval(() => {
  SK && SK.snap && SK.ask && skRenderStatus(SK.snap);
}, 500);
function skRenderControls(e) {
  const t = $("#sk-controls"),
    a = [SK.ask ? SK.ask.id : 0, SK.sel, SK.pick.join(",")].join("|");
  if (a === SK.ctlKey) return;
  if (((SK.ctlKey = a), !SK.ask)) {
    t.innerHTML = "";
    return;
  }
  const s = skOpts();
  let n,
    o = !1;
  (SK.sel < 0
    ? ((n = "Scegli una carta"), (o = !0))
    : s.length
      ? skReady()
        ? (n = `Prendi con ${bName(SK.sel)} (${SK.pick.length} ${SK.pick.length === 1 ? "carta" : "carte"})`)
        : ((n = "Scegli le carte da prendere"), (o = !0))
      : (n = "Posa " + bName(SK.sel)),
    (t.innerHTML = `<button class="primary wide" data-act="sc-play" ${o ? "disabled" : ""}>${esc(n)}</button>`));
}
function skAdvice(e) {
  if (!e.me.hand.length) return null;
  const t = scBotChoose(e.me.hand, e.table, e.me.hand.length === 1 && e.deckLeft === 0, "high");
  if (!t) return null;
  const a = e.table.filter((n) => !t.take.includes(n));
  let s;
  return (
    t.take.length
      ? a.length
        ? t.take.concat(t.card).includes(SC_SETTE)
          ? (s = "prendi il settebello")
          : (s = `prendi ${t.take.length} ${t.take.length === 1 ? "carta" : "carte"}: pi\xF9 carte, denari e primiera`)
        : (s = "\xE8 una scopa!")
      : (s = "nessuna presa buona: posa la carta che regala meno all'avversario"),
    { card: t.card, take: t.take, why: s }
  );
}
function skRenderAids(e) {
  const t = skCfg().aids === "on",
    a = $("#sk-aids");
  if (
    (document
      .querySelectorAll("#screen-stable .tog")
      .forEach((p) => p.setAttribute("aria-pressed", t ? "true" : "false")),
    (a.hidden = !t),
    !t)
  )
    return;
  const s = e.me.pile,
    n = new Set(s),
    o = s.filter(scIsDen).length,
    i = new Set(e.seen.concat(e.me.hand, s)),
    r = [];
  for (let p = 0; p < 40; p++) i.has(p) || r.push(p);
  const l = e.table.reduce((p, d) => p + bV(d), 0),
    c = scPrim(s);
  let f = "in gioco";
  n.has(SC_SETTE)
    ? (f = "tuo")
    : e.table.includes(SC_SETTE)
      ? (f = "sul tavolo")
      : e.me.hand.includes(SC_SETTE)
        ? (f = "in mano")
        : e.seen.includes(SC_SETTE) && (f = "preso");
  const m = skOpts(),
    u = (p, d, h) => `<div class="sk-tile${h ? " hot" : ""}"><small>${p}</small><b>${d}</b></div>`;
  a.innerHTML =
    (SK.sug
      ? `<p class="sugline">Consiglio: <b>${esc(bName(SK.sug.card))}</b>${SK.sug.take.length ? " prende " + SK.sug.take.map((p) => esc(bName(p))).join(", ") : ""} \u2014 ${esc(SK.sug.why)}.</p>`
      : "") +
    `<div class="sk-tiles">${u("Carte (21)", s.length)}${u("Denari (6)", o)}${u("Settebello", f)}
    ${u("Primiera", c || "\u2014")}${u(e.table.length && l <= 10 ? "Somma: scopa!" : "Somma tavolo", l, e.table.length && l <= 10)}${u("Denari da uscire", r.filter(scIsDen).length)}
    ${u("Sette da uscire", r.filter((p) => bV(p) === 7).length)}${SK.ask && SK.sel >= 0 ? u("Prese possibili", m.length || "nessuna") : ""}</div>`;
}
function skPlay() {
  if (!skReady()) return;
  const e = SK.ask,
    t = { card: SK.sel, take: SK.pick.slice() };
  ((SK.ask = null),
    (SK.sel = -1),
    (SK.pick = []),
    (SK.ctlKey = ""),
    ($("#sk-controls").innerHTML = ""),
    SK.send({ t: "ans", id: e.id, v: t }));
}
function skOpenLeave() {
  if (!SK || SK.done) return;
  const e = SK.snap,
    t = e ? e.seats.filter((s) => !s.bot).length : 1;
  let a;
  (SK.isHost
    ? (a =
        t > 1
          ? "Se lasci il tavolo non esiste pi\xF9 e il gioco termina per tutti."
          : "Vuoi lasciare il tavolo? La partita termina.")
    : SK.started
      ? (a = "Se esci adesso, al tuo posto gioca un bot e la partita continua senza di te.")
      : (a = "Vuoi uscire dalla stanza?"),
    ($("#ssheet-msg").textContent = a),
    ($("#ssheet").hidden = !1));
}
function skConfirmLeave() {
  if ((($("#ssheet").hidden = !0), !(!SK || SK.done))) {
    if (SK.isHost) {
      ((SK.closing = !0),
        scEnd("Chi ha creato la stanza ha chiuso il tavolo."),
        SK.done || skFinish("Hai chiuso il tavolo."));
      return;
    }
    if (!SK.started) {
      (SK.send({ t: "leave" }), skBack(""));
      return;
    }
    (SK.send({ t: "leave" }), skFinish("Hai lasciato il tavolo."));
  }
}
function skFinish(e) {
  if (!SK || SK.done) return;
  ((SK.done = !0), (SK.reason = e), (SK.ask = null));
  const t = SK.net;
  if (
    (setTimeout(() => {
      try {
        t && t.close();
      } catch {}
    }, 600),
    !SK.started)
  ) {
    skBack(e);
    return;
  }
  skResult();
}
function skResult() {
  SK.resultShown = !0;
  const e = SK.finals || [],
    t = e.find((n) => n.name === SK.myName),
    a = t ? (t.place === 1 ? "Hai vinto!" : `${t.place}\xBA posto`) : "Partita finita",
    s = e.length === 4;
  (logGame(SK, "sc", t, e.length, t && { detail: `${t.pts} punti \xB7 ${t.hands} ${t.hands === 1 ? "mano" : "mani"}` }),
    ($("#sresult-body").innerHTML = `<p class="eyebrow">Scopa</p>
    <div class="verdict ${t && t.place === 1 ? "ok" : ""}">${a}</div>
    <p class="sub" style="color:var(--muted)">${esc(SK.reason || "")}</p>
    ${
      e.length
        ? `<h3 class="h-sub">Classifica</h3><div class="plist">${e
            .map(
              (
                n,
              ) => `<div class="prow${n.name === SK.myName ? " me" : ""}"><span class="rk">${n.place}</span><b>${esc(n.name)}</b>${n.host ? "<em>host</em>" : ""}${s ? `<small>coppia ${n.team + 1}</small>` : ""}
      <span class="rr">${n.pts} <small>pt \xB7 ${n.hands} ${n.hands === 1 ? "mano" : "mani"}</small></span></div>`,
            )
            .join("")}</div>`
        : ""
    }
    <div class="stack"><button class="primary wide" data-act="sc-again">Torna alle impostazioni</button><button class="ghost wide" data-act="go-home">Home</button></div>`),
    ($("#screen-sresult").scrollTop = 0),
    show("sresult"));
}
(document.addEventListener("click", (e) => {
  const t = e.target.closest('[data-act^="sc-"],[data-act="go-sc"]');
  if (!t || t.disabled) return;
  switch (t.dataset.act) {
    case "go-sc":
      (show("ssetup"), skSync());
      break;
    case "sc-seg":
      ((skCfg()[t.dataset.key] = /^\d+$/.test(t.dataset.val) ? Number(t.dataset.val) : t.dataset.val),
        saveCfg(),
        skSync());
      break;
    case "sc-go":
      skBegin();
      break;
    case "sc-join":
      skJoin();
      break;
    case "sc-start":
      SK && SK.isHost && scStart();
      break;
    case "sc-share":
      skShare();
      break;
    case "sc-leave":
      skOpenLeave();
      break;
    case "sc-stay":
      $("#ssheet").hidden = !0;
      break;
    case "sc-leave-ok":
      skConfirmLeave();
      break;
    case "sc-again":
      ((SK = null), show("ssetup"), skSync());
      break;
    case "sc-tog": {
      const s = skCfg();
      ((s.aids = s.aids === "on" ? "off" : "on"), saveCfg(), SK && SK.snap && SK.started && skRender());
      break;
    }
    case "sc-card":
      if (SK && SK.ask) {
        const s = Number(t.dataset.id);
        SK.sel === s && skReady() ? skPlay() : (skChoose(s), (SK.ctlKey = ""), skRender());
      }
      break;
    case "sc-tcard":
      if (SK && SK.ask && SK.sel >= 0) {
        const s = Number(t.dataset.id),
          n = skOpts();
        n.length > 1 &&
          [].concat(...n).includes(s) &&
          ((SK.pick = SK.pick.includes(s) ? SK.pick.filter((o) => o !== s) : SK.pick.concat(s)),
          (SK.ctlKey = ""),
          skRender());
      }
      break;
    case "sc-play":
      skPlay();
      break;
  }
}),
  document.addEventListener("input", (e) => {
    e.target.id === "sk-in-name" && (skCfg().name = e.target.value.slice(0, 14));
  }),
  skSync());
const BX_DEF = { mode: "bots", name: "", players: 4, lives: 3, loss: "diff", diff: "mid", aids: "off" },
  bxCfg = () => ((cfg.bx = Object.assign({}, BX_DEF, cfg.bx || {})), cfg.bx);
let BX = null;
const BX_PAUSE = { deal: 500, bot: 900, card: 450, trick: 1300, round: 7e3 };
BIUI.pause = (e) =>
  new Promise((t) => {
    const a = typeof window.__pauseScale == "number" ? window.__pauseScale : 1;
    setTimeout(t, (BX_PAUSE[e] || 500) * a);
  });
const bxHearts = (e, t) =>
  "\u2665".repeat(Math.max(0, e)) + '<span class="lost">' + "\u2665".repeat(Math.max(0, t - e)) + "</span>";
function bxSync() {
  const e = bxCfg();
  (document
    .querySelectorAll('[data-act="bx-seg"]')
    .forEach((t) =>
      t.setAttribute("aria-pressed", String(e[t.dataset.key]) === t.dataset.val ? "true" : "false"),
    ),
    ($("#bx-room-panel").hidden = e.mode !== "room"),
    ($("#bx-go").textContent = e.mode === "room" ? "Crea stanza" : "Inizia la partita"),
    document.activeElement !== $("#bx-in-name") && ($("#bx-in-name").value = e.name || ""),
    ($("#bx-note-mode").textContent =
      e.mode === "bots"
        ? "Tu contro i bot: nessun limite di tempo."
        : "Gli amici entrano col codice; i posti rimasti vuoti li prendono i bot. Ognuno ha 60 secondi per giocare. Se un amico esce, al suo posto gioca un bot."),
    ($("#bx-note-loss").textContent =
      e.loss === "diff"
        ? "Se dichiari 2 e ne fai 4, perdi 2 vite."
        : "Se sbagli, perdi sempre 1 vita sola."));
}
function bxErr(e) {
  $("#bx-err").textContent = e || "";
}
function bxBegin() {
  const e = bxCfg();
  ((e.name = ($("#bx-in-name").value || "").trim().slice(0, 14)), saveCfg());
  const t = e.mode === "room",
    a = t ? genCode() : "";
  BX = {
    isHost: !0,
    room: t,
    code: a,
    pid: "h",
    conns: {},
    snap: null,
    ask: null,
    sel: -1,
    ace: "",
    done: !1,
    finals: null,
    started: !1,
    askAt: 0,
    status: t ? "Apro la stanza\u2026" : "",
  };
  const s = {
    send: (o, i) => {
      if (o === "h") bxClientMsg(i);
      else {
        const r = BX && BX.conns[o];
        r && r.send(i);
      }
    },
  };
  (biCreate(
    { mode: e.players, lives: e.lives, loss: e.loss, diff: e.diff, timeout: t ? BI_TIMEOUT : 0, code: a },
    s,
  ),
    (BX.send = (o) => biMsg("h", o)));
  const n = biAdd(e.name || "Tu", !0, "h");
  if (((BX.myName = n.p.name), !t)) {
    (show("itable"), biStart());
    return;
  }
  (show("ilobby"),
    bxRenderLobby(),
    (BX.net = netImpl().host(a, {
      onReady() {
        BX && ((BX.ready = !0), (BX.status = ""), bxRenderLobby());
      },
      onConn(o) {
        bxHostAccept(o);
      },
      onError(o) {
        BX && !BX.ready && bxBack(netErrText(o));
      },
    })));
}
function bxHostAccept(e) {
  ((e.onmessage = (t) => {
    if (!(!BX || BX.done))
      if (e.pid) biMsg(e.pid, t);
      else {
        if (!t || t.t !== "join") return;
        const a = biAdd(t.name, !1);
        if (a.err) {
          (e.send({ t: "deny", why: a.err }), setTimeout(() => e.close(), 300));
          return;
        }
        ((e.pid = a.p.id),
          (BX.conns[e.pid] = e),
          e.send({ t: "welcome", pid: e.pid, code: BX.code }),
          biBroadcast());
      }
  }),
    (e.onclose = () => {
      e.pid && BX && !BX.done && biLeave(e.pid);
    }));
}
function bxJoin() {
  const e = bxCfg(),
    t = ($("#bx-in-code").value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(t)) {
    bxErr("Il codice ha 5 caratteri (lettere e numeri).");
    return;
  }
  (bxErr(""),
    (e.name = ($("#bx-in-name").value || "").trim().slice(0, 14)),
    saveCfg(),
    (BX = {
      isHost: !1,
      room: !0,
      code: t,
      pid: null,
      snap: null,
      ask: null,
      sel: -1,
      ace: "",
      done: !1,
      finals: null,
      started: !1,
      askAt: 0,
      status: "Mi collego alla stanza\u2026",
    }),
    (BX.send = (a) => {
      BX && BX.conn && BX.conn.send(a);
    }),
    (BX.joinTimer = setTimeout(() => {
      BX && !BX.pid && bxBack(netErrText("timeout"));
    }, 2e4)),
    (BX.net = netImpl().join(t, {
      onOpen(a) {
        BX &&
          ((BX.conn = a),
          (a.onmessage = bxClientMsg),
          (a.onclose = () => {
            BX &&
              !BX.done &&
              (BX.pid
                ? bxFinish("Connessione persa: il tavolo non \xE8 pi\xF9 raggiungibile.")
                : bxBack("La stanza non risponde."));
          }),
          a.send({ t: "join", name: e.name }));
      },
      onError(a) {
        BX && !BX.pid && bxBack(netErrText(a));
      },
    })),
    show("ilobby"),
    bxRenderLobby());
}
function bxBack(e) {
  const t = BX && BX.net;
  (setTimeout(() => {
    try {
      t && t.close();
    } catch {}
  }, 400),
    BX && clearTimeout(BX.joinTimer),
    (BX = null),
    show("isetup"),
    bxSync(),
    bxErr(e || ""));
}
function bxClientMsg(e) {
  !BX ||
    !e ||
    (e.t === "welcome"
      ? ((BX.pid = e.pid), clearTimeout(BX.joinTimer), (BX.status = ""))
      : e.t === "deny"
        ? bxBack(e.why || "Non puoi entrare in questa stanza.")
        : e.t === "istate"
          ? BX.done || bxState(e)
          : e.t === "ixbye"
            ? ((BX.finals = e.finals), BX.done && BX.resultShown && bxResult())
            : e.t === "ixend" &&
              ((BX.finals = e.finals),
              bxFinish(BX.closing ? "Hai chiuso il tavolo." : e.reason || "Il tavolo \xE8 stato chiuso."),
              BX.done && BX.resultShown && bxResult()));
}
function bxState(e) {
  const t = BX.snap;
  if (
    ((BX.snap = e), (BX.myName = (e.seats.find((s) => s.pid === BX.pid) || {}).name || BX.myName), !e.started)
  ) {
    (!$("#screen-ilobby").hidden || t === null) && (show("ilobby"), bxRenderLobby());
    return;
  }
  BX.started = !0;
  const a = e.ask;
  (a && (!BX.ask || BX.ask.id !== a.id)
    ? ((BX.ask = a), (BX.askAt = Date.now()), (BX.sel = -1), (BX.ace = ""))
    : a || ((BX.ask = null), (BX.sel = -1), (BX.ace = "")),
    $("#screen-itable").hidden && show("itable"),
    bxRender());
}
function bxRenderLobby() {
  if (!BX) return;
  const e = BX.snap,
    t = $("#ilobby-body"),
    a = e ? e.seats : [],
    s = e ? e.mode : 0;
  t.innerHTML = `<p class="eyebrow">Bisca</p>
    <div class="roomcode" aria-label="Codice stanza">${esc(BX.code)}</div>
    ${BX.status ? `<p class="note">${esc(BX.status)}</p>` : '<button class="ghost wide" data-act="bx-share">Condividi il codice</button>'}
    ${a.length ? `<h3 class="h-sub">Al tavolo (${a.length}/${s})</h3><div class="plist">${a.map((n) => `<div class="prow"><b>${esc(n.name)}</b>${n.pid === BX.pid ? "<small>tu</small>" : ""}${n.host ? "<em>host</em>" : ""}</div>`).join("")}</div>` : ""}
    ${e ? `<p class="note">${s} giocatori \xB7 ${e.maxLives} vite ciascuno. I posti vuoti li prendono i bot.</p>` : ""}
    ${
      BX.isHost
        ? `<button class="primary wide" data-act="bx-start" ${BX.ready ? "" : "disabled"}>Inizia la partita</button>
      <p class="note">Una volta iniziata, nessuno pu\xF2 pi\xF9 entrare.</p>`
        : `<p class="note">${BX.pid ? "In attesa che chi ha creato la stanza inizi la partita\u2026" : ""}</p>`
    }
    <button class="ghost wide" data-act="bx-leave">${BX.isHost ? "Chiudi la stanza" : "Esci"}</button>`;
}
function bxShare() {
  const e = `Vieni a giocare a Bisca! Codice stanza: ${BX.code}`;
  try {
    if (navigator.share) {
      navigator.share({ text: e }).catch(() => {});
      return;
    }
  } catch {}
  try {
    (navigator.clipboard.writeText(BX.code),
      (BX.status = "Codice copiato."),
      bxRenderLobby(),
      setTimeout(() => {
        BX && ((BX.status = ""), bxRenderLobby());
      }, 1500));
  } catch {}
}
function bxRender() {
  const e = BX.snap;
  if (!e) return;
  const t = (i) => (e.seats.find((r) => r.pid === i) || {}).name || "";
  (($("#bx-meta").textContent =
    `Mano ${e.round} \xB7 ${e.cards} ${e.cards === 1 ? "carta" : "carte"}${BX.room ? " \xB7 " + BX.code : ""}`),
    ($("#bx-bank").innerHTML = bxHearts(e.me.lives, e.maxLives)),
    ($("#bx-opps").innerHTML = e.seats
      .filter((i) => i.pid !== BX.pid)
      .map((i) => {
        const r = e.trick && e.phase === "trick" && e.trick.pid === i.pid,
          l = i.out
            ? "fuori"
            : i.bid >= 0
              ? `dichiara ${i.bid} \xB7 prese ${i.won}`
              : e.phase === "bid"
                ? "\u2026"
                : "";
        return `<div class="bkseat${i.turn ? " active" : ""}${r ? " win" : ""}${i.out ? " out" : ""}"><div class="pkhead"><span class="nm">${esc(i.name)}</span>${i.dealer ? '<i class="bdg d">M</i>' : ""}</div>
      <div class="bx-lives">${bxHearts(i.lives, e.maxLives)}</div>
      ${i.card !== void 0 ? `<div class="bx-open">${skCardHTML(i.card, { size: "sm", act: "bx-none", dis: !0 })}</div>` : `<div class="bkbacks">${Array.from({ length: i.cards }, bkCardBack).join("")}</div>`}<div class="pkst">${l}</div></div>`;
      })
      .join("")));
  const a = e.phase === "trick" && e.trick ? e.trick.pid : "";
  $("#bx-table").innerHTML = e.table.length
    ? e.table
        .map(
          (i) =>
            `<div class="bkslot">${skCardHTML(i.card, { size: "sm", act: "bx-none", dis: !0, win: i.pid === a })}<span class="pkst">${esc(t(i.pid))}${i.ace ? (i.ace === "min" ? " \u25BC minimo" : " \u25B2 massimo") : ""}</span></div>`,
        )
        .join("")
    : `<p class="spec">${e.phase === "deal" ? "Si distribuiscono le carte\u2026" : e.phase === "bid" ? "Si dichiarano le prese" : ""}</p>`;
  const s = e.seats[e.me.seat];
  $("#bx-me").className = "bk-me" + (e.turn === BX.pid ? " active" : "");
  const n = !!BX.ask && BX.ask.kind === "play",
    o = bxCfg().aids === "on" && BX.ask && !e.me.out ? bxAdvice(e) : null;
  if (
    ((BX.sug = o),
    ($("#bx-hand").innerHTML = e.me.hand.length
      ? e.me.hand
          .map((i) =>
            skCardHTML(i, {
              act: "bx-card",
              sel: BX.sel === (i < 0 ? 100 : i),
              hint: !!o && o.card === i && BX.sel !== i,
              dis: !n,
            }),
          )
          .join("")
      : `<p class="spec">${e.me.out ? "Sei fuori: guardi la partita." : "Non hai pi\xF9 carte in mano."}</p>`),
    ($("#bx-me-name").innerHTML =
      `${esc(BX.myName || "Tu")}${s && s.dealer ? " \xB7 mazziere" : ""}${e.me.bid >= 0 && !e.me.out ? ` \xB7 dichiari ${e.me.bid}, prese ${e.me.won}` : ""}`),
    bxRenderAids(e),
    bxRenderRound(e),
    bxRenderStatus(e),
    bxRenderControls(e),
    BX.ask)
  ) {
    const i = $("#bx-felt"),
      r = i.getBoundingClientRect(),
      l = $("#bx-me").getBoundingClientRect();
    l.bottom > r.bottom && (i.scrollTop += l.bottom - r.bottom + 4);
  }
}
function bxRenderRound(e) {
  const t = $("#bx-sum"),
    a = e.roundRes;
  if (!a || e.phase !== "handEnd") {
    t.hidden = !0;
    return;
  }
  ((t.hidden = !1),
    (t.innerHTML = `<h3>Fine mano ${a.round}</h3><div class="rows">${a.rows.map((s) => `<div class="row"><span>${esc(s.name)}${s.pid === BX.pid ? " (tu)" : ""}: dich. ${s.bid}, prese ${s.won}</span><b>${s.lost ? "\u2212" + s.lost + " " : ""}${s.out ? "fuori" : bxHearts(s.lives, e.maxLives)}</b></div>`).join("")}</div>
    ${a.over ? '<p class="note">Partita decisa!</p>' : '<p class="note">Tra poco si riparte\u2026</p>'}`));
}
function bxRenderStatus(e) {
  const t = $("#bx-status");
  let a;
  if (e.phase === "handEnd") a = e.log[e.log.length - 1] || "";
  else if (e.phase === "trick" && e.trick) a = `${e.trick.name} vince la presa`;
  else if (BX.ask) {
    const s = e.turnMs ? Math.max(0, Math.ceil((e.turnMs - (Date.now() - BX.askAt)) / 1e3)) : 0;
    ((a =
      BX.ask.kind === "bid"
        ? "Tocca a te: quante prese farai?"
        : BX.sel < 0
          ? "Tocca a te: scegli una carta"
          : BX.sel === 0 && !BX.ace
            ? "Asso di denari: alto o basso?"
            : "Giocala"),
      (a += s ? ` \xB7 ${s}s` : ""));
  } else if (e.turn) {
    const s = e.seats.find((n) => n.pid === e.turn);
    a = s ? (e.phase === "bid" ? `${s.name} sta dichiarando\u2026` : `Tocca a ${s.name}\u2026`) : "";
  } else a = e.me.out ? "Sei fuori dalla partita" : "";
  t.textContent = a;
}
let bxTimer = setInterval(() => {
  BX && BX.snap && BX.ask && bxRenderStatus(BX.snap);
}, 500);
function bxRenderControls(e) {
  const t = $("#bx-controls"),
    a = [BX.ask ? BX.ask.id : 0, BX.sel, BX.ace].join("|");
  if (a !== BX.ctlKey) {
    if (((BX.ctlKey = a), !BX.ask)) {
      t.innerHTML = "";
      return;
    }
    if (BX.ask.kind === "bid") {
      t.innerHTML = `<div class="bx-bids">${Array.from({ length: BX.ask.cards + 1 }, (s, n) => `<button class="${n === BX.ask.forbid ? "" : "primary"}${BX.sug && BX.sug.bid === n ? " sug" : ""}" data-act="bx-bid" data-n="${n}" ${n === BX.ask.forbid ? "disabled" : ""}>${n}</button>`).join("")}</div>
      ${BX.ask.forbid >= 0 ? `<p class="note" style="margin:6px 0 0;text-align:center">Sei l'ultimo: non puoi dire ${BX.ask.forbid}.</p>` : ""}`;
      return;
    }
    if (BX.sel < 0) {
      t.innerHTML = '<button class="primary wide" disabled>Scegli una carta</button>';
      return;
    }
    if (BX.sel === 100) {
      t.innerHTML = '<button class="primary wide" data-act="bx-play">Gioca la tua carta coperta</button>';
      return;
    }
    if (BX.sel === 0 && !BX.ace) {
      t.innerHTML =
        '<div class="pair"><button class="primary" data-act="bx-ace" data-v="max">Come pi\xF9 alta \u25B2</button><button class="primary" data-act="bx-ace" data-v="min">Come pi\xF9 bassa \u25BC</button></div>';
      return;
    }
    t.innerHTML = `<button class="primary wide" data-act="bx-play">Gioca ${esc(bName(BX.sel))}${BX.sel === 0 ? (BX.ace === "min" ? " (bassa)" : " (alta)") : ""}</button>`;
  }
}
function bxAdvice(e) {
  const t = e.me.hand;
  if (BX.ask.kind === "bid") {
    const i = BX.ask.forbid,
      r = e.cards;
    if (t.includes(-1)) {
      const c = e.seats.filter((m) => m.card !== void 0).map((m) => m.card),
        f = biBotBid1(c, i, "high");
      return {
        bid: f,
        why: f
          ? "le carte che vedi sono basse: \xE8 probabile che la tua vinca"
          : "vedi carte alte: \xE8 probabile che la tua perda",
      };
    }
    return { bid: biBotBid(t, r, i, "high"), why: "stima in base a quante delle tue carte sono alte" };
  }
  if (t.includes(-1)) return null;
  const a = e.me.bid - e.me.won,
    s = t.length,
    n = biBotPlay(
      t,
      e.table.map((i) => ({ card: i.card, ace: i.ace })),
      a,
      s,
    ),
    o =
      a <= 0
        ? "hai gi\xE0 le prese dichiarate: cerca di non vincere"
        : a >= s
          ? "ti servono tutte le prese: gioca la carta pi\xF9 forte"
          : "ti servono ancora prese: vinci se puoi con la carta pi\xF9 bassa possibile";
  return {
    card: n.card,
    ace: n.ace,
    why:
      o + (n.card === 0 ? (n.ace === "min" ? " (asso come pi\xF9 basso)" : " (asso come pi\xF9 alto)") : ""),
  };
}
function bxRenderAids(e) {
  const t = bxCfg().aids === "on",
    a = $("#bx-aids");
  if (
    (document
      .querySelectorAll("#screen-itable .tog")
      .forEach((h) => h.setAttribute("aria-pressed", t ? "true" : "false")),
    (a.hidden = !t || e.me.out),
    !t || e.me.out)
  )
    return;
  const s = e.seats.reduce((h, b) => h + (b.bid > 0 ? b.bid : 0), 0),
    n = e.seats.every((h) => h.out || h.bid >= 0),
    o = e.me.hand.includes(-1),
    i = e.me.hand.filter((h) => h >= 0),
    r = e.seats.filter((h) => h.card !== void 0).map((h) => h.card),
    l = new Set(e.seen.concat(i, r)),
    c = [];
  for (let h = 0; h < 40; h++) l.has(h) || c.push(h);
  const f = i.filter((h) => h !== 0).sort((h, b) => biPow(b) - biPow(h))[0];
  let m;
  if (o) {
    const h = (g) => (g === 0 ? 100 : biPow(g)),
      b = Math.max(
        -2,
        ...r.map(h),
        ...e.table.map((g) => (g.card === 0 ? (g.ace === "min" ? -1 : 100) : biPow(g.card))),
      );
    m = [
      "Prob. che vinca la tua carta",
      (c.length ? Math.round((100 * c.filter((g) => g === 0 || biPow(g) > b).length) / c.length) : 0) + "%",
    ];
  } else
    m = [
      "Pi\xF9 forti della tua migliore",
      f === void 0 ? "\u2014" : c.filter((h) => h !== 0 && biPow(h) > biPow(f)).length,
    ];
  let u = "ancora fuori";
  i.includes(0)
    ? (u = "ce l'hai tu")
    : e.seen.includes(0)
      ? (u = "gi\xE0 uscito")
      : r.includes(0) && (u = "ce l'ha un altro");
  const p = e.me.bid >= 0 ? e.me.bid - e.me.won : null,
    d = (h, b, k) => `<div class="sk-tile${k ? " hot" : ""}"><small>${h}</small><b>${b}</b></div>`;
  a.innerHTML =
    (BX.sug
      ? `<p class="sugline">Consiglio: <b>${BX.sug.bid !== void 0 ? "dichiara " + BX.sug.bid : esc(bName(BX.sug.card))}</b> \u2014 ${esc(BX.sug.why)}.</p>`
      : "") +
    `<div class="sk-tiles">${d("Prese dichiarate", `${s}/${e.cards}`, n && s !== e.cards)}${d("Ti servono", p === null ? "\u2014" : p, p !== null && p < 0)}
    ${d("Carte da giocare", e.me.hand.length)}${d(m[0], m[1])}${d("Asso di denari", u)}${d("Vite", `${e.me.lives}/${e.maxLives}`)}</div>`;
}
function bxSend(e) {
  const t = BX.ask;
  t &&
    ((BX.ask = null),
    (BX.sel = -1),
    (BX.ace = ""),
    (BX.ctlKey = ""),
    ($("#bx-controls").innerHTML = ""),
    BX.send({ t: "ans", id: t.id, v: e }));
}
function bxPlay() {
  !BX ||
    !BX.ask ||
    BX.ask.kind !== "play" ||
    BX.sel < 0 ||
    (BX.sel === 0 && !BX.ace) ||
    bxSend({ card: BX.sel === 100 ? -1 : BX.sel, ace: BX.ace || "max" });
}
function bxOpenLeave() {
  if (!BX || BX.done) return;
  const e = BX.snap,
    t = e ? e.seats.filter((s) => !s.bot).length : 1;
  let a;
  (BX.isHost
    ? (a =
        t > 1
          ? "Se lasci il tavolo non esiste pi\xF9 e il gioco termina per tutti."
          : "Vuoi lasciare il tavolo? La partita termina.")
    : BX.started
      ? (a = "Se esci adesso, al tuo posto gioca un bot e la partita continua senza di te.")
      : (a = "Vuoi uscire dalla stanza?"),
    ($("#isheet-msg").textContent = a),
    ($("#isheet").hidden = !1));
}
function bxConfirmLeave() {
  if ((($("#isheet").hidden = !0), !(!BX || BX.done))) {
    if (BX.isHost) {
      ((BX.closing = !0),
        biEnd("Chi ha creato la stanza ha chiuso il tavolo."),
        BX.done || bxFinish("Hai chiuso il tavolo."));
      return;
    }
    if (!BX.started) {
      (BX.send({ t: "leave" }), bxBack(""));
      return;
    }
    (BX.send({ t: "leave" }), bxFinish("Hai lasciato il tavolo."));
  }
}
function bxFinish(e) {
  if (!BX || BX.done) return;
  ((BX.done = !0), (BX.reason = e), (BX.ask = null));
  const t = BX.net;
  if (
    (setTimeout(() => {
      try {
        t && t.close();
      } catch {}
    }, 600),
    !BX.started)
  ) {
    bxBack(e);
    return;
  }
  bxResult();
}
function bxResult() {
  BX.resultShown = !0;
  const e = BX.finals || [],
    t = e.find((s) => s.name === BX.myName),
    a = t ? (t.place === 1 ? "Hai vinto!" : `${t.place}\xBA posto`) : "Partita finita";
  (logGame(BX, "bx", t, e.length, t && { detail: t.out ? "eliminato" : `${t.lives} ${t.lives === 1 ? "vita rimasta" : "vite rimaste"}` }),
    ($("#iresult-body").innerHTML = `<p class="eyebrow">Bisca</p>
    <div class="verdict ${t && t.place === 1 ? "ok" : ""}">${a}</div>
    <p class="sub" style="color:var(--muted)">${esc(BX.reason || "")}</p>
    ${
      e.length
        ? `<h3 class="h-sub">Classifica</h3><div class="plist">${e
            .map(
              (
                s,
              ) => `<div class="prow${s.name === BX.myName ? " me" : ""}"><span class="rk">${s.place}</span><b>${esc(s.name)}</b>${s.host ? "<em>host</em>" : ""}
      <span class="rr">${s.out ? "eliminato" : bxHearts(s.lives, s.lives)}</span></div>`,
            )
            .join("")}</div>`
        : ""
    }
    <div class="stack"><button class="primary wide" data-act="bx-again">Torna alle impostazioni</button><button class="ghost wide" data-act="go-home">Home</button></div>`),
    ($("#screen-iresult").scrollTop = 0),
    show("iresult"));
}
(document.addEventListener("click", (e) => {
  const t = e.target.closest('[data-act^="bx-"],[data-act="go-bx"]');
  if (!t || t.disabled) return;
  switch (t.dataset.act) {
    case "go-bx":
      (show("isetup"), bxSync());
      break;
    case "bx-seg":
      ((bxCfg()[t.dataset.key] = /^\d+$/.test(t.dataset.val) ? Number(t.dataset.val) : t.dataset.val),
        saveCfg(),
        bxSync());
      break;
    case "bx-go":
      bxBegin();
      break;
    case "bx-join":
      bxJoin();
      break;
    case "bx-start":
      BX && BX.isHost && biStart();
      break;
    case "bx-share":
      bxShare();
      break;
    case "bx-leave":
      bxOpenLeave();
      break;
    case "bx-stay":
      $("#isheet").hidden = !0;
      break;
    case "bx-leave-ok":
      bxConfirmLeave();
      break;
    case "bx-again":
      ((BX = null), show("isetup"), bxSync());
      break;
    case "bx-tog": {
      const s = bxCfg();
      ((s.aids = s.aids === "on" ? "off" : "on"), saveCfg(), BX && BX.snap && BX.started && bxRender());
      break;
    }
    case "bx-bid":
      BX && BX.ask && BX.ask.kind === "bid" && bxSend(Number(t.dataset.n));
      break;
    case "bx-card":
      if (BX && BX.ask && BX.ask.kind === "play") {
        let s = Number(t.dataset.id);
        (s < 0 && (s = 100),
          BX.sel === s && s !== 0 ? bxPlay() : ((BX.sel = s), (BX.ace = ""), (BX.ctlKey = ""), bxRender()));
      }
      break;
    case "bx-ace":
      BX && BX.ask && BX.sel === 0 && ((BX.ace = t.dataset.v), (BX.ctlKey = ""), bxPlay());
      break;
    case "bx-play":
      bxPlay();
      break;
  }
}),
  document.addEventListener("input", (e) => {
    e.target.id === "bx-in-name" && (bxCfg().name = e.target.value.slice(0, 14));
  }),
  bxSync());

/* ---------- Navigazione: con chi giochi -> gioco -> impostazioni ---------- */
const PM = {
    solo: { title: "Da solo", ico: "1", sub: "Solo il blackjack si gioca senza avversari." },
    bots: { title: "Con i bot", ico: "VS", sub: "Gli avversari li gestisce il telefono: scegli il gioco." },
    room: { title: "Con gli amici", ico: "+", sub: "Scegli il gioco: poi crei la stanza o entri con un codice." },
  },
  GAME_ACTS = ["go-bj", "go-pk", "go-bk", "go-sc", "go-bx"],
  pmNow = () => (PM[cfg.pm] ? cfg.pm : "bots");
function applyPM() {
  const m = pmNow(),
    other = m === "room" ? "room" : "bots";
  ((cfg.mode = m === "solo" ? "solo" : m === "room" ? "room" : "table"),
    (pkCfg().mode = other),
    (bkCfg().mode = other),
    (skCfg().mode = other),
    (bxCfg().mode = other),
    saveCfg(),
    document.querySelectorAll("[data-pmchip]").forEach((c) => {
      c.innerHTML = `<b>${PM[m].title}</b><button type="button" class="ghost" data-act="home">Cambia</button>`;
    }));
}
function renderGames() {
  const m = pmNow();
  (($("#games-title").textContent = PM[m].title),
    ($("#games-sub").textContent = PM[m].sub),
    ($("#games-ico").textContent = PM[m].ico),
    document.querySelectorAll("#screen-games .gamecard").forEach((b) => {
      b.hidden = !b.dataset.modes.split(" ").includes(m);
    }),
    ($("#games-solo-note").hidden = m !== "solo"),
    ($("#games-net").hidden = m !== "room"));
}
document.addEventListener(
  "click",
  (e) => {
    const t = e.target.closest("[data-act]");
    if (!t || t.disabled) return;
    const a = t.dataset.act;
    if (GAME_ACTS.includes(a)) applyPM();
    else if (a === "pm") {
      ((cfg.pm = t.dataset.val), saveCfg(), renderGames(), show("games"), e.stopPropagation());
    } else if (a === "games") {
      (renderGames(), show("games"), e.stopPropagation());
    } else if (a === "hist-all") {
      (openHist("home", "all"), e.stopPropagation());
    }
  },
  !0,
);

/* ---------- Storico di tutti i giochi ---------- */
const GAMES_KEY = "hilo.games.v1",
  GAME_NAMES = { bj: "Blackjack", pk: "Poker", bk: "Briscola", sc: "Scopa", bx: "Bisca" },
  MODE_NAMES = { solo: "da solo", bots: "con bot", room: "con amici" };
let histTab = "all",
  histFilter = "all";
function loadGames() {
  try {
    const e = JSON.parse(localStorage.getItem(GAMES_KEY) || "[]");
    return Array.isArray(e) ? e : [];
  } catch {
    return [];
  }
}
function saveGames(e) {
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(e.slice(-300)));
  } catch {}
}
function logGame(G, game, me, total, extra) {
  if (!G || G.logged) return;
  G.logged = !0;
  const cut = /lasciato|chiuso/i.test(G.reason || ""),
    e = loadGames();
  (e.push(
    Object.assign(
      {
        t: Date.now(),
        g: game,
        mode: G.room ? "room" : "bots",
        n: total,
        place: cut || !me ? null : me.place,
        res: cut ? "left" : me ? (me.place === 1 && !me.left ? "win" : "loss") : "na",
      },
      extra || {},
    ),
  ),
    saveGames(e),
    updateHistBtn());
}
function allGames() {
  const bj = loadHist().map((d) => {
      const n = d.end - d.start;
      return {
        t: d.t,
        g: "bj",
        mode: d.mode === "table" ? "bots" : d.mode,
        res: n > 0 ? "win" : n < 0 ? "loss" : "draw",
        net: n,
        detail: `${money(d.start)} → ${money(d.end)} (${money(n, !0)}) \xB7 ${d.rounds} mani`,
      };
    }),
    e = loadGames().concat(bj);
  return e.sort((a, b) => b.t - a.t);
}
function histHead() {
  const tab = (k, l) =>
    `<button type="button" data-act="hist-tab" data-val="${k}" aria-pressed="${histTab === k}">${l}</button>`;
  return `<button class="ghost back" data-act="hist-back">‹ Indietro</button><h2 class="h-title">Storico</h2>
    <div class="seg" role="group" style="margin-bottom:14px">${tab("all", "Tutte le partite")}${tab("bj", "Blackjack: conteggio")}</div>`;
}
function renderGameHist() {
  const all = allGames(),
    list = histFilter === "all" ? all : all.filter((x) => x.g === histFilter);
  let a = histHead();
  const chips = ["all", "bj", "pk", "bk", "sc", "bx"]
    .map(
      (k) =>
        `<button type="button" data-act="hist-filter" data-val="${k}" aria-pressed="${histFilter === k}">${k === "all" ? "Tutti" : GAME_NAMES[k]}</button>`,
    )
    .join("");
  a += `<div class="chipbar">${chips}</div>`;
  if (!list.length) {
    a +=
      '<p class="sub" style="color:var(--muted)">Ancora nessuna partita. Quando una partita finisce viene salvata qui, con il risultato e il tipo di tavolo.</p>';
  } else {
    const w = list.filter((x) => x.res === "win").length,
      l = list.filter((x) => x.res === "loss").length,
      pct = Math.round((100 * w) / Math.max(1, w + l));
    let streak = 0;
    for (const x of list) {
      if (x.res !== "win") break;
      streak++;
    }
    a += `<div class="stats">
      <div><span>Partite</span><b>${list.length}</b></div>
      <div><span>Vinte</span><b style="color:var(--win)">${w}</b></div>
      <div><span>Perse</span><b style="color:var(--lose)">${l}</b></div>
      <div><span>% vittorie</span><b>${pct}%</b></div>
      <div><span>Serie vinte</span><b>${streak}</b></div>
      <div><span>Interrotte / pari</span><b>${list.length - w - l}</b></div>
    </div>`;
    if (histFilter === "all") {
      const rows = Object.keys(GAME_NAMES)
        .map((k) => {
          const g = all.filter((x) => x.g === k && (x.res === "win" || x.res === "loss"));
          if (!g.length) return "";
          const gw = g.filter((x) => x.res === "win").length,
            p = Math.round((100 * gw) / g.length);
          return `<div class="gbar"><span>${GAME_NAMES[k]}</span><i><u style="width:${p}%"></u></i><b>${gw}/${g.length}</b></div>`;
        })
        .join("");
      a += `<h3 class="h-sub">Vittorie per gioco</h3><div class="gbars">${rows}</div>`;
    }
    a +=
      '<h3 class="h-sub">Partite</h3><div class="hlist">' +
      list
        .slice(0, 100)
        .map((x) => {
          const pill =
              x.res === "win" ? "Vittoria" : x.res === "loss" ? "Sconfitta" : x.res === "draw" ? "Pari" : x.res === "left" ? "Interrotta" : "Finita",
            place = x.place && x.n ? ` \xB7 ${x.place}\xBA su ${x.n}` : "";
          return `<div class="hrow ghr"><div class="hh"><div><b>${GAME_NAMES[x.g] || x.g}</b><small>${fmtDate(x.t)} \xB7 ${MODE_NAMES[x.mode] || ""}${place}</small>${x.detail ? `<small>${esc(x.detail)}</small>` : ""}</div>
            <span class="rpill ${x.res}">${pill}</span></div></div>`;
        })
        .join("") +
      "</div>";
  }
  a += `<button class="ghost wide danger" data-act="hist-clear">${histConfirm ? "Tocca ancora per cancellare tutto" : "Cancella lo storico"}</button>`;
  $("#hist-body").innerHTML = a;
}
document.addEventListener(
  "click",
  (e) => {
    const t = e.target.closest("[data-act]");
    if (!t || t.disabled) return;
    const a = t.dataset.act;
    if (a === "hist-tab") {
      ((histTab = t.dataset.val), (histConfirm = !1), renderHist(), e.stopPropagation());
    } else if (a === "hist-filter") {
      ((histFilter = t.dataset.val), renderHist(), e.stopPropagation());
    } else if (a === "hist-clear" && histTab === "all") {
      (histConfirm ? (saveGames([]), saveHist([]), (histConfirm = !1), updateHistBtn()) : (histConfirm = !0),
        renderHist(),
        e.stopPropagation());
    }
  },
  !0,
);

/* ---------- Carte "in mano": ventaglio ---------- */
function fanify(el) {
  const k = Array.from(el.children).filter((c) => c.matches(".bc,.card"));
  if (!k.length || k.length !== el.children.length) return el.classList.remove("fan");
  const n = k.length,
    step = n > 4 ? 6 : n === 2 ? 8 : 7;
  (el.classList.add("fan"), el.style.setProperty("--n", n));
  k.forEach((c, i) => {
    const m = i - (n - 1) / 2;
    (c.style.setProperty("--a", (m * step).toFixed(1) + "deg"),
      c.style.setProperty("--y", (m * m * (n > 3 ? 2.6 : 3.4)).toFixed(1) + "px"),
      (c.style.zIndex = i + 1));
  });
}
for (const sel of ["#bk-hand", "#sk-hand", "#bx-hand", "#pk-me"]) {
  const el = $(sel);
  el &&
    new MutationObserver(() => {
      const t = sel === "#pk-me" ? $(".pkmine", el) : el;
      t && fanify(t);
    }).observe(el, { childList: true });
}

/* ---------- Nome giocatore: si imposta una volta sola in Home ---------- */
(function () {
  const ids = ["in-name", "pk-in-name", "bk-in-name", "sk-in-name", "bx-in-name"],
    home = $("#home-name"),
    apply = (v) => {
      ((cfg.name = v), (pkCfg().name = v), (bkCfg().name = v), (skCfg().name = v), (bxCfg().name = v), saveCfg());
      for (const i of ids) $("#" + i) && ($("#" + i).value = v);
    };
  for (const i of ids) {
    const l = $("#" + i) && $("#" + i).closest("label");
    l && (l.hidden = !0);
  }
  home.value = cfg.name || pkCfg().name || bkCfg().name || skCfg().name || bxCfg().name || "";
  apply(home.value);
  home.addEventListener("input", () => apply(home.value.slice(0, 14).trim()));
})();
