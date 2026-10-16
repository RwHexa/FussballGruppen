/** Aushang: Turnier-Angaben pflegen und druckfertige Übersicht aufbauen. */
document.addEventListener("DOMContentLoaded", () => {
  const feldName = document.getElementById("feld-turniername");
  const feldOrt = document.getElementById("feld-ort");
  const feldDatum = document.getElementById("feld-datum");
  const btnDrucken = document.getElementById("btn-drucken");

  const titelEl = document.getElementById("aushang-titel");
  const untertitelEl = document.getElementById("aushang-untertitel");
  const tabellenBody = {
    A: document.getElementById("aushang-tabelle-body-a"),
    B: document.getElementById("aushang-tabelle-body-b"),
  };
  const tabellenLeer = {
    A: document.getElementById("aushang-tabelle-leer-a"),
    B: document.getElementById("aushang-tabelle-leer-b"),
  };
  const ergebnisseEl = {
    A: document.getElementById("aushang-ergebnisse-a"),
    B: document.getElementById("aushang-ergebnisse-b"),
  };
  const ergebnisseLeer = {
    A: document.getElementById("aushang-ergebnisse-leer-a"),
    B: document.getElementById("aushang-ergebnisse-leer-b"),
  };
  const koEl = document.getElementById("aushang-ko");
  const endstandBlock = document.getElementById("aushang-endstand-block");
  const endstandEl = document.getElementById("aushang-endstand");
  const standEl = document.getElementById("aushang-stand");

  const datumFormat = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  /** "2026-07-18" → "Samstag, 18. Juli 2026"; leer/ungültig → "" */
  function formatiereDatum(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    if (Number.isNaN(d.getTime())) return "";
    return datumFormat.format(d);
  }

  function zelle(text, klasse) {
    const td = document.createElement("td");
    td.textContent = text;
    if (klasse) td.className = klasse;
    return td;
  }

  function renderKopf() {
    const meta = TurnierStore.getMeta();
    titelEl.textContent = meta.turnierName || "Fußball-Turnier";
    const teile = [meta.ort, formatiereDatum(meta.datum)].filter(Boolean);
    untertitelEl.textContent = teile.join(" · ");
    untertitelEl.hidden = teile.length === 0;
  }

  function renderTabelle(gruppe) {
    const zeilen = TurnierStore.getTabelle(gruppe);
    const body = tabellenBody[gruppe];
    body.replaceChildren();
    tabellenLeer[gruppe].hidden = zeilen.length > 0;

    for (const m of zeilen) {
      const tr = document.createElement("tr");
      if (m.platz <= 2) tr.className = "ist-podest";
      const diff = m.tordifferenz;
      tr.append(
        zelle(String(m.platz), "spalte-platz"),
        zelle(m.name, "spalte-team"),
        zelle(String(m.spiele)),
        zelle(String(m.siege)),
        zelle(String(m.unentschieden)),
        zelle(String(m.niederlagen)),
        zelle(`${m.toreErzielt} : ${m.toreErhalten}`),
        zelle(diff > 0 ? `+${diff}` : String(diff)),
        zelle(String(m.punkte), "spalte-punkte")
      );
      body.appendChild(tr);
    }
  }

  function zeileErgebnis(heimName, toreText, gastName) {
    const li = document.createElement("li");

    const heim = document.createElement("span");
    heim.className = "ergebnis-heim";
    heim.textContent = heimName;

    const tore = document.createElement("span");
    tore.className = "ergebnis-tore";
    tore.textContent = toreText;

    const gast = document.createElement("span");
    gast.className = "ergebnis-gast";
    gast.textContent = gastName;

    li.append(heim, tore, gast);
    return li;
  }

  function renderErgebnisse(gruppe) {
    const spiele = TurnierStore.getSpieleMitNamen(gruppe);
    const liste = ergebnisseEl[gruppe];
    liste.replaceChildren();
    ergebnisseLeer[gruppe].hidden = spiele.length > 0;
    liste.hidden = spiele.length === 0;

    for (const s of spiele) {
      liste.appendChild(
        zeileErgebnis(s.heimName, `${s.toreHeim} : ${s.toreGast}`, s.gastName)
      );
    }
  }

  function renderKo() {
    koEl.replaceChildren();
    for (const s of TurnierStore.getKoSpieleMitNamen()) {
      const li = document.createElement("li");

      const titel = document.createElement("span");
      titel.className = "aushang-ko__titel";
      titel.textContent = s.titel;

      const paarung = document.createElement("span");
      paarung.className = "aushang-ko__paarung";
      paarung.textContent = `${s.heimName} – ${s.gastName}`;

      const ergebnis = document.createElement("span");
      ergebnis.className = "aushang-ko__ergebnis";
      if (s.ergebnis) {
        const elfer =
          s.ergebnis.elfHeim !== null && s.ergebnis.elfGast !== null
            ? ` (n. E. ${s.ergebnis.elfHeim} : ${s.ergebnis.elfGast})`
            : "";
        ergebnis.textContent = `${s.ergebnis.toreHeim} : ${s.ergebnis.toreGast}${elfer}`;
      } else {
        ergebnis.textContent = "– : –";
        li.classList.add("ist-offen");
      }

      li.append(titel, paarung, ergebnis);
      koEl.appendChild(li);
    }
  }

  function renderEndstand() {
    const endstand = TurnierStore.getEndstand();
    const plaetze = [
      ["1. Platz", endstand.platz1],
      ["2. Platz", endstand.platz2],
      ["3. Platz", endstand.platz3],
      ["4. Platz", endstand.platz4],
    ].filter(([, team]) => Boolean(team));

    endstandEl.replaceChildren();
    endstandBlock.hidden = plaetze.length === 0;

    for (const [label, team] of plaetze) {
      const li = document.createElement("li");
      const platz = document.createElement("span");
      platz.className = "aushang-endstand__platz";
      platz.textContent = label;
      const name = document.createElement("span");
      name.className = "aushang-endstand__name";
      name.textContent = `${team.name} (Gruppe ${team.gruppe})`;
      li.append(platz, name);
      endstandEl.appendChild(li);
    }
  }

  function renderStand() {
    const jetzt = new Date();
    standEl.textContent =
      "Stand: " +
      jetzt.toLocaleDateString("de-DE") +
      ", " +
      jetzt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) +
      " Uhr";
  }

  function render() {
    renderKopf();
    TurnierStore.GRUPPEN.forEach((g) => {
      renderTabelle(g);
      renderErgebnisse(g);
    });
    renderKo();
    renderEndstand();
    renderStand();
  }

  function uebernehmeFelder() {
    const meta = TurnierStore.getMeta();
    feldName.value = meta.turnierName;
    feldOrt.value = meta.ort;
    feldDatum.value = meta.datum;
  }

  feldName.addEventListener("input", () => {
    TurnierStore.setMeta({ turnierName: feldName.value });
    renderKopf();
  });
  feldOrt.addEventListener("input", () => {
    TurnierStore.setMeta({ ort: feldOrt.value });
    renderKopf();
  });
  feldDatum.addEventListener("change", () => {
    TurnierStore.setMeta({ datum: feldDatum.value });
    renderKopf();
  });

  btnDrucken.addEventListener("click", () => {
    renderStand();
    window.print();
  });

  window.addEventListener("turnier:geaendert", () => {
    uebernehmeFelder();
    render();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === TurnierStore.STORAGE_KEY) {
      uebernehmeFelder();
      render();
    }
  });

  uebernehmeFelder();
  render();
});
