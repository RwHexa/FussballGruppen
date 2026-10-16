/**
 * Turnierdaten mit zwei Gruppen (A/B), Gruppenspielen und K.-o.-Runde
 * (Halbfinale, Spiel um Platz 3, Finale) – gespeichert im localStorage.
 *
 * Aufbau des Speichers:
 *   teams   Mannschaften, jede fest einer Gruppe "A" oder "B" zugeordnet
 *   spiele  nur Gruppenspiele; beide Mannschaften stehen in derselben Gruppe
 *   ko      vier feste Plätze: hf1, hf2, platz3, finale
 *
 * Die Paarungen der K.-o.-Runde stehen nicht im Speicher: sie ergeben sich
 * aus den Gruppentabellen (Halbfinale) bzw. aus den Halbfinals (Finale,
 * Spiel um Platz 3). Ein eingetragenes Ergebnis merkt sich aber, mit welchen
 * Mannschaften es gespielt wurde – aendert sich der Gruppenstand nachtraeglich,
 * faellt das auf und die Seite "K.-o.-Runde" weist darauf hin.
 */
(function (global) {
  const STORAGE_KEY = "fgr-turnier-v1";
  const EXPORT_APP = "fgr-gruppen";
  const GRUPPEN = ["A", "B"];
  const KO_SLOTS = ["hf1", "hf2", "platz3", "finale"];

  const KO_TITEL = {
    hf1: "Halbfinale 1",
    hf2: "Halbfinale 2",
    platz3: "Spiel um Platz 3",
    finale: "Finale",
  };

  /** @typedef {"A" | "B"} Gruppe */
  /** @typedef {"hf1" | "hf2" | "platz3" | "finale"} KoSlot */

  /** @typedef {{
   *   id: string;
   *   name: string;
   *   gruppe: Gruppe;
   *   spiele: number;
   *   siege: number;
   *   unentschieden: number;
   *   niederlagen: number;
   *   toreErzielt: number;
   *   toreErhalten: number;
   *   punkte: number;
   * }} Mannschaft */

  /** @typedef {{
   *   id: string;
   *   heimId: string;
   *   gastId: string;
   *   toreHeim: number;
   *   toreGast: number;
   *   erstelltAm: string;
   * }} Spiel */

  /** @typedef {{
   *   heimId: string;
   *   gastId: string;
   *   toreHeim: number;
   *   toreGast: number;
   *   elfHeim: number | null;
   *   elfGast: number | null;
   *   erstelltAm: string;
   * }} KoErgebnis */

  function neueId() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  }

  function leereStatistik() {
    return {
      spiele: 0,
      siege: 0,
      unentschieden: 0,
      niederlagen: 0,
      toreErzielt: 0,
      toreErhalten: 0,
      punkte: 0,
    };
  }

  function leererZustand() {
    return { version: 1, meta: {}, teams: [], spiele: [], ko: leereKo() };
  }

  function leereKo() {
    return { hf1: null, hf2: null, platz3: null, finale: null };
  }

  /** @param {unknown} wert */
  function normalisiereGruppe(wert) {
    const g = String(wert || "").trim().toUpperCase();
    return GRUPPEN.includes(g) ? g : "A";
  }

  /* ---------- Speicher lesen und schreiben ---------- */

  /** @returns {{version: number, meta: object, teams: Mannschaft[], spiele: Spiel[], ko: object}} */
  function leseSpeicher() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return leererZustand();
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.teams)) return leererZustand();
      return baueZustand(data);
    } catch {
      return leererZustand();
    }
  }

  /** Rohdaten (Speicher oder Importdatei) in einen sauberen Zustand bringen. */
  function baueZustand(data) {
    const teams = data.teams.map((t) => ({
      ...leereStatistik(),
      ...t,
      gruppe: normalisiereGruppe(t.gruppe),
    }));
    const spiele = bereinigeSpiele(teams, Array.isArray(data.spiele) ? data.spiele : []);
    const ko = bereinigeKo(teams, data.ko);
    const meta = data.meta && typeof data.meta === "object" ? data.meta : {};
    return {
      version: 1,
      meta,
      teams: aktualisiereStatistikAusSpielen(teams, spiele),
      spiele,
      ko,
    };
  }

  function schreibeSpeicher(state) {
    const teams = state.teams.map((t) => ({ ...t, gruppe: normalisiereGruppe(t.gruppe) }));
    const spiele = bereinigeSpiele(teams, state.spiele);
    const ko = bereinigeKo(teams, state.ko);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        meta: state.meta || {},
        teams: aktualisiereStatistikAusSpielen(teams, spiele),
        spiele,
        ko,
      })
    );
  }

  /** Gruppenspiele: beide Mannschaften muessen existieren und in derselben Gruppe stehen. */
  function bereinigeSpiele(teams, spiele) {
    const gruppeVon = new Map(teams.map((t) => [t.id, t.gruppe]));
    return spiele.filter(
      (s) =>
        s &&
        gruppeVon.has(s.heimId) &&
        gruppeVon.has(s.gastId) &&
        s.heimId !== s.gastId &&
        gruppeVon.get(s.heimId) === gruppeVon.get(s.gastId) &&
        Number.isFinite(s.toreHeim) &&
        Number.isFinite(s.toreGast)
    );
  }

  /** K.-o.-Ergebnisse: nur Plaetze mit zwei noch vorhandenen Mannschaften bleiben. */
  function bereinigeKo(teams, roh) {
    const ids = new Set(teams.map((t) => t.id));
    const ko = leereKo();
    if (!roh || typeof roh !== "object") return ko;

    for (const slot of KO_SLOTS) {
      const e = roh[slot];
      if (!e || typeof e !== "object") continue;
      if (!ids.has(e.heimId) || !ids.has(e.gastId) || e.heimId === e.gastId) continue;
      const th = Number(e.toreHeim);
      const tg = Number(e.toreGast);
      if (!Number.isInteger(th) || !Number.isInteger(tg)) continue;
      if (th < 0 || tg < 0 || th > 99 || tg > 99) continue;
      ko[slot] = {
        heimId: e.heimId,
        gastId: e.gastId,
        toreHeim: th,
        toreGast: tg,
        elfHeim: zahlOderNull(e.elfHeim),
        elfGast: zahlOderNull(e.elfGast),
        erstelltAm: typeof e.erstelltAm === "string" ? e.erstelltAm : new Date().toISOString(),
      };
    }
    return ko;
  }

  function zahlOderNull(wert) {
    if (wert === null || wert === undefined || wert === "") return null;
    const n = Number(wert);
    if (!Number.isInteger(n) || n < 0 || n > 99) return null;
    return n;
  }

  /** Punkte und Tore aller Mannschaften aus den Gruppenspielen neu rechnen. */
  function aktualisiereStatistikAusSpielen(teams, spiele) {
    const byId = new Map(teams.map((t) => [t.id, { ...t, ...leereStatistik() }]));

    for (const s of spiele) {
      const heim = byId.get(s.heimId);
      const gast = byId.get(s.gastId);
      if (!heim || !gast) continue;

      const th = s.toreHeim;
      const tg = s.toreGast;

      heim.spiele += 1;
      gast.spiele += 1;
      heim.toreErzielt += th;
      heim.toreErhalten += tg;
      gast.toreErzielt += tg;
      gast.toreErhalten += th;

      if (th > tg) {
        heim.siege += 1;
        heim.punkte += 3;
        gast.niederlagen += 1;
      } else if (th < tg) {
        gast.siege += 1;
        gast.punkte += 3;
        heim.niederlagen += 1;
      } else {
        heim.unentschieden += 1;
        gast.unentschieden += 1;
        heim.punkte += 1;
        gast.punkte += 1;
      }
    }

    return teams.map((t) => byId.get(t.id) || t);
  }

  /* ---------- Mannschaften ---------- */

  /** @returns {Mannschaft[]} */
  function getMannschaften() {
    return leseSpeicher().teams;
  }

  /** @param {Gruppe} gruppe @returns {Mannschaft[]} */
  function getMannschaftenDerGruppe(gruppe) {
    const g = normalisiereGruppe(gruppe);
    return getMannschaften().filter((t) => t.gruppe === g);
  }

  function createMannschaft(name, gruppe) {
    return {
      id: neueId(),
      name: String(name).trim(),
      gruppe: normalisiereGruppe(gruppe),
      ...leereStatistik(),
    };
  }

  /** @param {Mannschaft[]} teams */
  function setMannschaften(teams) {
    const state = leseSpeicher();
    state.teams = teams;
    if (teams.length === 0) {
      state.spiele = [];
      state.ko = leereKo();
    }
    schreibeSpeicher(state);
  }

  /** @param {string} name @param {Gruppe} gruppe */
  function addMannschaft(name, gruppe) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return { ok: false, error: "Bitte einen Mannschaftsnamen eingeben." };
    const state = leseSpeicher();
    if (state.teams.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, error: "Diese Mannschaft existiert bereits." };
    }
    state.teams.push(createMannschaft(trimmed, gruppe));
    schreibeSpeicher(state);
    return { ok: true, teams: getMannschaften() };
  }

  /** @param {string} id @param {string} name */
  function updateMannschaftName(id, name) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return { ok: false, error: "Der Name darf nicht leer sein." };
    const state = leseSpeicher();
    const idx = state.teams.findIndex((t) => t.id === id);
    if (idx === -1) return { ok: false, error: "Mannschaft nicht gefunden." };
    if (state.teams.some((t, i) => i !== idx && t.name.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, error: "Dieser Name ist bereits vergeben." };
    }
    state.teams[idx] = { ...state.teams[idx], name: trimmed };
    schreibeSpeicher(state);
    return { ok: true, teams: getMannschaften() };
  }

  /**
   * Mannschaft in die andere Gruppe setzen. Ihre bisherigen Gruppenspiele
   * gehoeren dann zu zwei verschiedenen Gruppen und fallen weg.
   * @param {string} id @param {Gruppe} gruppe
   */
  function setMannschaftGruppe(id, gruppe) {
    const state = leseSpeicher();
    const idx = state.teams.findIndex((t) => t.id === id);
    if (idx === -1) return { ok: false, error: "Mannschaft nicht gefunden." };
    const vorher = state.spiele.length;
    state.teams[idx] = { ...state.teams[idx], gruppe: normalisiereGruppe(gruppe) };
    schreibeSpeicher(state);
    const nachher = getSpiele().length;
    return { ok: true, entfernteSpiele: vorher - nachher, teams: getMannschaften() };
  }

  /** Zaehlt die Gruppenspiele, an denen eine Mannschaft beteiligt ist. */
  function zaehleSpieleVonMannschaft(id) {
    return getSpiele().filter((s) => s.heimId === id || s.gastId === id).length;
  }

  /** @param {string} id */
  function removeMannschaft(id) {
    const state = leseSpeicher();
    state.teams = state.teams.filter((t) => t.id !== id);
    state.spiele = state.spiele.filter((s) => s.heimId !== id && s.gastId !== id);
    schreibeSpeicher(state);
    return getMannschaften();
  }

  /** Reihum A, B, A, B … – verteilt die vorhandenen Mannschaften gleichmaessig. */
  function verteileGruppen() {
    const state = leseSpeicher();
    state.teams = state.teams.map((t, i) => ({ ...t, gruppe: GRUPPEN[i % 2] }));
    schreibeSpeicher(state);
    return getMannschaften();
  }

  /* ---------- Gruppenspiele ---------- */

  /** @returns {Spiel[]} */
  function getSpiele() {
    return leseSpeicher().spiele;
  }

  function parseTore(value) {
    if (value === "" || value === null || value === undefined) {
      return { ok: false, error: "Bitte Tore für beide Mannschaften eingeben." };
    }
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 99) {
      return { ok: false, error: "Tore müssen ganze Zahlen von 0 bis 99 sein." };
    }
    return { ok: true, value: n };
  }

  function validateSpielInput(input) {
    if (!input.heimId || !input.gastId) {
      return { ok: false, error: "Bitte Heim- und Gastmannschaft wählen." };
    }
    if (input.heimId === input.gastId) {
      return { ok: false, error: "Heim- und Gastmannschaft müssen unterschiedlich sein." };
    }
    const teams = getMannschaften();
    const heim = teams.find((t) => t.id === input.heimId);
    const gast = teams.find((t) => t.id === input.gastId);
    if (!heim || !gast) return { ok: false, error: "Gewählte Mannschaft existiert nicht mehr." };
    if (heim.gruppe !== gast.gruppe) {
      return {
        ok: false,
        error: `Gruppenspiele gehen nur innerhalb einer Gruppe: „${heim.name}“ steht in Gruppe ${heim.gruppe}, „${gast.name}“ in Gruppe ${gast.gruppe}.`,
      };
    }
    const th = parseTore(input.toreHeim);
    if (!th.ok) return th;
    const tg = parseTore(input.toreGast);
    if (!tg.ok) return tg;
    return { ok: true, toreHeim: th.value, toreGast: tg.value, gruppe: heim.gruppe };
  }

  function addSpiel(input) {
    const v = validateSpielInput(input);
    if (!v.ok) return v;
    const state = leseSpeicher();
    state.spiele.push({
      id: neueId(),
      heimId: input.heimId,
      gastId: input.gastId,
      toreHeim: v.toreHeim,
      toreGast: v.toreGast,
      erstelltAm: new Date().toISOString(),
    });
    schreibeSpeicher(state);
    return { ok: true, spiele: getSpiele(), gruppe: v.gruppe };
  }

  function updateSpiel(id, input) {
    const v = validateSpielInput(input);
    if (!v.ok) return v;
    const state = leseSpeicher();
    const idx = state.spiele.findIndex((s) => s.id === id);
    if (idx === -1) return { ok: false, error: "Spiel nicht gefunden." };
    state.spiele[idx] = {
      ...state.spiele[idx],
      heimId: input.heimId,
      gastId: input.gastId,
      toreHeim: v.toreHeim,
      toreGast: v.toreGast,
    };
    schreibeSpeicher(state);
    return { ok: true, spiele: getSpiele(), gruppe: v.gruppe };
  }

  function removeSpiel(id) {
    const state = leseSpeicher();
    state.spiele = state.spiele.filter((s) => s.id !== id);
    schreibeSpeicher(state);
    return getSpiele();
  }

  /** Gruppenspiele mit Namen und Gruppenbuchstabe, zum Anzeigen. */
  function getSpieleMitNamen(gruppe) {
    const state = leseSpeicher();
    const byId = new Map(state.teams.map((t) => [t.id, t]));
    const gefiltert = gruppe
      ? state.spiele.filter((s) => (byId.get(s.heimId) || {}).gruppe === normalisiereGruppe(gruppe))
      : state.spiele;
    return gefiltert.map((s) => ({
      ...s,
      heimName: (byId.get(s.heimId) || {}).name || "–",
      gastName: (byId.get(s.gastId) || {}).name || "–",
      gruppe: (byId.get(s.heimId) || {}).gruppe || "A",
    }));
  }

  /**
   * Noch nicht gespielte Paarungen einer Gruppe (jeder gegen jeden, einmal).
   * @param {Gruppe} gruppe
   */
  function getOffeneBegegnungen(gruppe) {
    const teams = getMannschaftenDerGruppe(gruppe);
    const gespielt = new Set(
      getSpiele().map((s) => [s.heimId, s.gastId].sort().join("|"))
    );
    const offen = [];
    for (let i = 0; i < teams.length; i += 1) {
      for (let j = i + 1; j < teams.length; j += 1) {
        const schluessel = [teams[i].id, teams[j].id].sort().join("|");
        if (!gespielt.has(schluessel)) {
          offen.push({ heim: teams[i], gast: teams[j] });
        }
      }
    }
    return offen;
  }

  /** Ist in beiden Gruppen jeder gegen jeden gespielt (und stehen überhaupt Teams drin)? */
  function istGruppenphaseKomplett() {
    return GRUPPEN.every((g) => {
      const teams = getMannschaftenDerGruppe(g);
      return teams.length >= 2 && getOffeneBegegnungen(g).length === 0;
    });
  }

  /* ---------- Gruppentabellen ---------- */

  function sortiereTabelle(teams) {
    const zeilen = teams.map((m) => ({ ...m, tordifferenz: m.toreErzielt - m.toreErhalten }));
    zeilen.sort((links, rechts) => {
      if (links.punkte !== rechts.punkte) return rechts.punkte - links.punkte;
      if (links.tordifferenz !== rechts.tordifferenz) return rechts.tordifferenz - links.tordifferenz;
      if (links.toreErzielt !== rechts.toreErzielt) return rechts.toreErzielt - links.toreErzielt;
      return links.name.localeCompare(rechts.name, "de");
    });
    return zeilen.map((m, i) => ({ ...m, platz: i + 1 }));
  }

  /**
   * Tabelle einer Gruppe: Punkte, dann Tordifferenz, dann erzielte Tore, dann Name.
   * @param {Gruppe} gruppe
   */
  function getTabelle(gruppe) {
    return sortiereTabelle(getMannschaftenDerGruppe(gruppe));
  }

  /** Beide Gruppentabellen auf einmal: { A: [...], B: [...] } */
  function getTabellen() {
    return { A: getTabelle("A"), B: getTabelle("B") };
  }

  /* ---------- K.-o.-Runde ---------- */

  /** Sieger eines K.-o.-Ergebnisses; bei Gleichstand entscheidet das Elfmeterschießen. */
  function koSieger(e) {
    if (!e) return null;
    if (e.toreHeim > e.toreGast) return e.heimId;
    if (e.toreHeim < e.toreGast) return e.gastId;
    if (e.elfHeim === null || e.elfGast === null || e.elfHeim === e.elfGast) return null;
    return e.elfHeim > e.elfGast ? e.heimId : e.gastId;
  }

  function koVerlierer(e) {
    const sieger = koSieger(e);
    if (!sieger) return null;
    return sieger === e.heimId ? e.gastId : e.heimId;
  }

  /** Kurzform einer Mannschaft für die Anzeige. */
  function teamKurz(team) {
    return team ? { id: team.id, name: team.name, gruppe: team.gruppe } : null;
  }

  /**
   * Die vier K.-o.-Spiele mit Soll-Paarung, Ergebnis und Sieger.
   * Soll-Paarung: Halbfinale 1 = A1 – B2, Halbfinale 2 = B1 – A2.
   * @returns {Record<KoSlot, object>}
   */
  function getKoRunde() {
    const state = leseSpeicher();
    const byId = new Map(state.teams.map((t) => [t.id, t]));
    const tabA = getTabelle("A");
    const tabB = getTabelle("B");

    const platz = (tab, i) => teamKurz(tab[i]);

    const soll = {
      hf1: { heim: platz(tabA, 0), gast: platz(tabB, 1) },
      hf2: { heim: platz(tabB, 0), gast: platz(tabA, 1) },
      platz3: { heim: null, gast: null },
      finale: { heim: null, gast: null },
    };

    const herkunft = {
      hf1: { heim: "1. Gruppe A", gast: "2. Gruppe B" },
      hf2: { heim: "1. Gruppe B", gast: "2. Gruppe A" },
      platz3: { heim: "Verlierer Halbfinale 1", gast: "Verlierer Halbfinale 2" },
      finale: { heim: "Sieger Halbfinale 1", gast: "Sieger Halbfinale 2" },
    };

    const sieger1 = koSieger(state.ko.hf1);
    const sieger2 = koSieger(state.ko.hf2);
    const verlierer1 = koVerlierer(state.ko.hf1);
    const verlierer2 = koVerlierer(state.ko.hf2);

    soll.finale = {
      heim: teamKurz(byId.get(sieger1)),
      gast: teamKurz(byId.get(sieger2)),
    };
    soll.platz3 = {
      heim: teamKurz(byId.get(verlierer1)),
      gast: teamKurz(byId.get(verlierer2)),
    };

    const runde = {};
    for (const slot of KO_SLOTS) {
      const ergebnis = state.ko[slot];
      const gespielt = ergebnis
        ? { heim: teamKurz(byId.get(ergebnis.heimId)), gast: teamKurz(byId.get(ergebnis.gastId)) }
        : null;

      // Die Soll-Paarung gilt unabhaengig von der Reihenfolge Heim/Gast.
      const sollIds = [soll[slot].heim, soll[slot].gast].filter(Boolean).map((t) => t.id).sort();
      const istIds = ergebnis ? [ergebnis.heimId, ergebnis.gastId].sort() : [];
      const passt =
        !ergebnis ||
        (sollIds.length === 2 && sollIds[0] === istIds[0] && sollIds[1] === istIds[1]);

      const siegerId = koSieger(ergebnis);
      runde[slot] = {
        slot,
        titel: KO_TITEL[slot],
        herkunft: herkunft[slot],
        soll: soll[slot],
        bereit: Boolean(soll[slot].heim && soll[slot].gast),
        paarung: gespielt || soll[slot],
        ergebnis,
        sieger: teamKurz(byId.get(siegerId)),
        verlierer: teamKurz(byId.get(koVerlierer(ergebnis))),
        unentschiedenOhneElfer: Boolean(
          ergebnis && ergebnis.toreHeim === ergebnis.toreGast && !siegerId
        ),
        passtNichtMehr: !passt,
      };
    }
    return runde;
  }

  /**
   * Ergebnis eines K.-o.-Spiels eintragen oder aendern.
   * @param {KoSlot} slot
   * @param {{toreHeim: unknown, toreGast: unknown, elfHeim?: unknown, elfGast?: unknown}} input
   */
  function setKoErgebnis(slot, input) {
    if (!KO_SLOTS.includes(slot)) return { ok: false, error: "Unbekanntes K.-o.-Spiel." };
    const runde = getKoRunde();
    const paarung = runde[slot].soll;
    if (!paarung.heim || !paarung.gast) {
      return { ok: false, error: `Für ${KO_TITEL[slot]} stehen die Mannschaften noch nicht fest.` };
    }

    const th = parseTore(input.toreHeim);
    if (!th.ok) return th;
    const tg = parseTore(input.toreGast);
    if (!tg.ok) return tg;

    let elfHeim = null;
    let elfGast = null;
    if (th.value === tg.value) {
      const eh = zahlOderNull(input.elfHeim);
      const eg = zahlOderNull(input.elfGast);
      if (eh === null || eg === null) {
        return {
          ok: false,
          error: "Unentschieden: bitte das Elfmeterschießen eintragen – im K.-o.-Spiel muss ein Sieger feststehen.",
        };
      }
      if (eh === eg) {
        return { ok: false, error: "Das Elfmeterschießen kann nicht unentschieden enden." };
      }
      elfHeim = eh;
      elfGast = eg;
    }

    const state = leseSpeicher();
    state.ko[slot] = {
      heimId: paarung.heim.id,
      gastId: paarung.gast.id,
      toreHeim: th.value,
      toreGast: tg.value,
      elfHeim,
      elfGast,
      erstelltAm: new Date().toISOString(),
    };

    // Ein geaendertes Halbfinale kann Finale und Spiel um Platz 3 ungueltig machen.
    if (slot === "hf1" || slot === "hf2") {
      for (const abhaengig of ["finale", "platz3"]) {
        const e = state.ko[abhaengig];
        if (!e) continue;
        const neueSoll = naechsteRundePaarung(abhaengig, state);
        const ids = neueSoll.map((t) => t && t.id).filter(Boolean).sort();
        const alt = [e.heimId, e.gastId].sort();
        if (ids.length !== 2 || ids[0] !== alt[0] || ids[1] !== alt[1]) {
          state.ko[abhaengig] = null;
        }
      }
    }

    schreibeSpeicher(state);
    return { ok: true, ko: getKoRunde() };
  }

  /** Hilfsfunktion: Paarung von Finale bzw. Spiel um Platz 3 aus den Halbfinals. */
  function naechsteRundePaarung(slot, state) {
    const byId = new Map(state.teams.map((t) => [t.id, t]));
    if (slot === "finale") {
      return [byId.get(koSieger(state.ko.hf1)), byId.get(koSieger(state.ko.hf2))];
    }
    return [byId.get(koVerlierer(state.ko.hf1)), byId.get(koVerlierer(state.ko.hf2))];
  }

  /** @param {KoSlot} slot */
  function removeKoErgebnis(slot) {
    if (!KO_SLOTS.includes(slot)) return getKoRunde();
    const state = leseSpeicher();
    state.ko[slot] = null;
    if (slot === "hf1" || slot === "hf2") {
      state.ko.finale = null;
      state.ko.platz3 = null;
    }
    schreibeSpeicher(state);
    return getKoRunde();
  }

  /** Alle K.-o.-Ergebnisse loeschen. */
  function resetKo() {
    const state = leseSpeicher();
    state.ko = leereKo();
    schreibeSpeicher(state);
    return getKoRunde();
  }

  /** K.-o.-Spiele mit Namen und Ergebnis, zum Anzeigen (Ergebnisse, Aushang). */
  function getKoSpieleMitNamen() {
    const runde = getKoRunde();
    return KO_SLOTS.map((slot) => {
      const s = runde[slot];
      return {
        slot,
        titel: s.titel,
        heimName: s.paarung.heim ? s.paarung.heim.name : s.herkunft.heim,
        gastName: s.paarung.gast ? s.paarung.gast.name : s.herkunft.gast,
        ergebnis: s.ergebnis,
        siegerName: s.sieger ? s.sieger.name : "",
      };
    });
  }

  /** Endstand des Turniers: Sieger, Zweiter, Dritter, Vierter – soweit bekannt. */
  function getEndstand() {
    const runde = getKoRunde();
    const finale = runde.finale;
    const platz3 = runde.platz3;
    return {
      platz1: finale.sieger,
      platz2: finale.verlierer,
      platz3: platz3.sieger,
      platz4: platz3.verlierer,
    };
  }

  /**
   * Zu welcher Phase gehört eine Begegnung?
   * Gleiche Gruppe → Gruppenspiel, sonst ein anstehendes K.-o.-Spiel.
   * @returns {{ok: true, ziel: "gruppe"|"ko", bezeichnung: string, slot?: KoSlot}
   *          | {ok: false, error: string}}
   */
  function phaseFuerPaarung(heimId, gastId) {
    const teams = getMannschaften();
    const heim = teams.find((t) => t.id === heimId);
    const gast = teams.find((t) => t.id === gastId);
    if (!heim || !gast) return { ok: false, error: "Gewählte Mannschaft existiert nicht mehr." };
    if (heim.id === gast.id) {
      return { ok: false, error: "Heim- und Gastmannschaft müssen unterschiedlich sein." };
    }

    if (heim.gruppe === gast.gruppe) {
      return { ok: true, ziel: "gruppe", bezeichnung: `Gruppe ${heim.gruppe}` };
    }

    const runde = getKoRunde();
    const gesucht = [heim.id, gast.id].sort().join("|");
    for (const slot of KO_SLOTS) {
      const soll = runde[slot].soll;
      if (!soll.heim || !soll.gast) continue;
      if ([soll.heim.id, soll.gast.id].sort().join("|") !== gesucht) continue;
      return { ok: true, ziel: "ko", bezeichnung: KO_TITEL[slot], slot };
    }

    return {
      ok: false,
      error: `„${heim.name}“ (Gruppe ${heim.gruppe}) und „${gast.name}“ (Gruppe ${gast.gruppe}) treffen in keinem anstehenden K.-o.-Spiel aufeinander.`,
    };
  }

  /**
   * Ergebnis ohne Angabe der Phase eintragen (für die große Live-Anzeige):
   * gleiche Gruppe → Gruppenspiel, sonst passendes K.-o.-Spiel.
   */
  function eintrageSpielAutomatisch(input) {
    const phase = phaseFuerPaarung(input.heimId, input.gastId);
    if (!phase.ok) return phase;

    if (phase.ziel === "gruppe") {
      const ergebnis = addSpiel(input);
      if (!ergebnis.ok) return ergebnis;
      return { ok: true, ziel: "gruppe", bezeichnung: phase.bezeichnung };
    }

    // Seitenwahl der Live-Anzeige auf die Soll-Paarung der K.-o.-Runde drehen
    const soll = getKoRunde()[phase.slot].soll;
    const gedreht = soll.heim.id !== input.heimId;
    const ergebnis = setKoErgebnis(phase.slot, {
      toreHeim: gedreht ? input.toreGast : input.toreHeim,
      toreGast: gedreht ? input.toreHeim : input.toreGast,
      elfHeim: gedreht ? input.elfGast : input.elfHeim,
      elfGast: gedreht ? input.elfHeim : input.elfGast,
    });
    if (!ergebnis.ok) return ergebnis;
    return { ok: true, ziel: "ko", bezeichnung: phase.bezeichnung };
  }

  /* ---------- Demo-Daten ---------- */

  /** Demo: acht Mannschaften, vier je Gruppe, ohne Ergebnisse. */
  function ladeDemoMannschaften() {
    const demo = [
      ["FC Champions", "A"],
      ["SV Blau-Weiß", "A"],
      ["TSV Nord", "A"],
      ["SC Ried", "A"],
      ["VfB Altenburg", "B"],
      ["SG Hohenstein", "B"],
      ["FC Linden", "B"],
      ["SV Eintracht", "B"],
    ];
    const state = leseSpeicher();
    state.teams = demo.map(([name, gruppe]) => createMannschaft(name, gruppe));
    state.spiele = [];
    state.ko = leereKo();
    schreibeSpeicher(state);
    return getMannschaften();
  }

  /* ---------- Turnier-Metadaten (Name, Datum, Ort) ---------- */

  const META_DEFAULT = { turnierName: "Fußball-Turnier", datum: "", ort: "" };

  function getMeta() {
    return { ...META_DEFAULT, ...leseSpeicher().meta };
  }

  function setMeta(patch) {
    const state = leseSpeicher();
    state.meta = { ...getMeta(), ...patch };
    schreibeSpeicher(state);
    return getMeta();
  }

  /* ---------- Export / Import ---------- */

  /** Vollständiger Turnierstand als einfaches Objekt (für eine JSON-Datei). */
  function exportState() {
    const state = leseSpeicher();
    return {
      app: EXPORT_APP,
      version: 1,
      exportiertAm: new Date().toISOString(),
      meta: { ...META_DEFAULT, ...state.meta },
      teams: state.teams.map((t) => ({ id: t.id, name: t.name, gruppe: t.gruppe })),
      spiele: state.spiele.map((s) => ({
        id: s.id,
        heimId: s.heimId,
        gastId: s.gastId,
        toreHeim: s.toreHeim,
        toreGast: s.toreGast,
        erstelltAm: s.erstelltAm,
      })),
      ko: state.ko,
    };
  }

  /** Dateiname-Vorschlag, z. B. "gruppen-stadtmeisterschaft-2026-07-18.json" */
  function exportDateiname() {
    const name = getMeta().turnierName || "turnier";
    const slug =
      name
        .toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "turnier";
    const d = new Date();
    const datum =
      d.getFullYear() +
      "-" + String(d.getMonth() + 1).padStart(2, "0") +
      "-" + String(d.getDate()).padStart(2, "0");
    return `gruppen-${slug}-${datum}.json`;
  }

  /**
   * Prüft und übernimmt einen exportierten Turnierstand.
   * Dateien aus „Fussball Turnier Web“ (eine Liga, kein Gruppenfeld) werden
   * mitgenommen: ihre Mannschaften landen reihum in Gruppe A und B.
   */
  function importState(data) {
    if (!data || typeof data !== "object") {
      return { ok: false, error: "Die Datei enthält keine Turnierdaten." };
    }
    const bekannt = [EXPORT_APP, "ftv-turnier"];
    if (data.app && !bekannt.includes(data.app)) {
      return { ok: false, error: "Diese Datei stammt nicht aus „Fussball Gruppen“." };
    }
    if (!Array.isArray(data.teams)) {
      return { ok: false, error: "In der Datei fehlt die Liste der Mannschaften." };
    }

    const ohneGruppen = !data.teams.some((t) => t && t.gruppe);

    /** @type {Mannschaft[]} */
    const teams = [];
    const gesehen = new Set();
    data.teams.forEach((roh) => {
      if (!roh || typeof roh.name !== "string") return;
      const name = roh.name.trim();
      if (!name) return;
      const schluessel = name.toLowerCase();
      if (gesehen.has(schluessel)) return;
      gesehen.add(schluessel);
      const gruppe = ohneGruppen ? GRUPPEN[teams.length % 2] : roh.gruppe;
      const team = createMannschaft(name, gruppe);
      if (typeof roh.id === "string" && roh.id) team.id = roh.id;
      teams.push(team);
    });
    if (teams.length === 0) {
      return { ok: false, error: "Die Datei enthält keine gültigen Mannschaften." };
    }

    const idsDoppelt = new Set();
    for (const t of teams) {
      if (idsDoppelt.has(t.id)) t.id = neueId();
      idsDoppelt.add(t.id);
    }

    /** @type {Spiel[]} */
    const spiele = [];
    const rohSpiele = Array.isArray(data.spiele) ? data.spiele : [];
    for (const roh of rohSpiele) {
      if (!roh || typeof roh !== "object") continue;
      const th = Number(roh.toreHeim);
      const tg = Number(roh.toreGast);
      if (!Number.isInteger(th) || !Number.isInteger(tg)) continue;
      if (th < 0 || tg < 0 || th > 99 || tg > 99) continue;
      spiele.push({
        id: typeof roh.id === "string" && roh.id ? roh.id : neueId(),
        heimId: String(roh.heimId),
        gastId: String(roh.gastId),
        toreHeim: th,
        toreGast: tg,
        erstelltAm:
          typeof roh.erstelltAm === "string" ? roh.erstelltAm : new Date().toISOString(),
      });
    }

    const meta = { ...META_DEFAULT };
    if (data.meta && typeof data.meta === "object") {
      for (const key of Object.keys(META_DEFAULT)) {
        if (typeof data.meta[key] === "string") meta[key] = data.meta[key];
      }
    }

    // bereinigeSpiele() in schreibeSpeicher() wirft Spiele ueber Gruppengrenzen raus.
    schreibeSpeicher({ version: 1, meta, teams, spiele, ko: data.ko });
    return {
      ok: true,
      teams: getMannschaften(),
      spiele: getSpiele(),
      verworfeneSpiele: spiele.length - getSpiele().length,
    };
  }

  /** Liest eine vom Benutzer gewählte Datei und importiert sie. */
  function importStateAusDatei(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () =>
        resolve({ ok: false, error: "Die Datei konnte nicht gelesen werden." });
      reader.onload = () => {
        let data;
        try {
          data = JSON.parse(String(reader.result));
        } catch {
          return resolve({ ok: false, error: "Die Datei ist kein gültiges JSON." });
        }
        resolve(importState(data));
      };
      reader.readAsText(file, "utf-8");
    });
  }

  global.TurnierStore = {
    STORAGE_KEY,
    GRUPPEN,
    KO_SLOTS,
    KO_TITEL,
    getMannschaften,
    getMannschaftenDerGruppe,
    createMannschaft,
    setMannschaften,
    addMannschaft,
    updateMannschaftName,
    setMannschaftGruppe,
    zaehleSpieleVonMannschaft,
    removeMannschaft,
    verteileGruppen,
    getSpiele,
    getSpieleMitNamen,
    getOffeneBegegnungen,
    istGruppenphaseKomplett,
    addSpiel,
    updateSpiel,
    removeSpiel,
    phaseFuerPaarung,
    eintrageSpielAutomatisch,
    getTabelle,
    getTabellen,
    getKoRunde,
    setKoErgebnis,
    removeKoErgebnis,
    resetKo,
    getKoSpieleMitNamen,
    getEndstand,
    ladeDemoMannschaften,
    getMeta,
    setMeta,
    exportState,
    exportDateiname,
    importState,
    importStateAusDatei,
  };
})(window);
