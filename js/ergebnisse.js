/** Ergebnisübersicht: Gruppenspiele je Gruppe und die K.-o.-Runde. */
document.addEventListener("DOMContentLoaded", () => {
  const noTeams = document.getElementById("ergebnisse-keine-mannschaften");
  const inhalt = document.getElementById("ergebnisse-inhalt");
  const bodies = {
    A: document.getElementById("ergebnisse-body-a"),
    B: document.getElementById("ergebnisse-body-b"),
  };
  const leer = {
    A: document.getElementById("ergebnisse-empty-a"),
    B: document.getElementById("ergebnisse-empty-b"),
  };
  const anzahl = {
    A: document.getElementById("ergebnisse-anzahl-a"),
    B: document.getElementById("ergebnisse-anzahl-b"),
  };
  const koBody = document.getElementById("ergebnisse-ko-body");
  const koLeer = document.getElementById("ergebnisse-ko-empty");

  function zelle(text, klasse) {
    const td = document.createElement("td");
    td.textContent = text;
    if (klasse) td.className = klasse;
    return td;
  }

  function renderGruppe(gruppe) {
    const rows = TurnierStore.getSpieleMitNamen(gruppe);
    anzahl[gruppe].textContent = String(rows.length);
    bodies[gruppe].replaceChildren();
    leer[gruppe].hidden = rows.length > 0;

    rows.forEach((s, i) => {
      const tr = document.createElement("tr");
      tr.append(
        zelle(String(i + 1)),
        zelle(s.heimName, "spiel-teams"),
        zelle(`${s.toreHeim} : ${s.toreGast}`, "spiel-ergebnis"),
        zelle(s.gastName, "spiel-teams")
      );
      bodies[gruppe].appendChild(tr);
    });
  }

  function renderKo() {
    const spiele = TurnierStore.getKoSpieleMitNamen().filter((s) => s.ergebnis);
    koBody.replaceChildren();
    koLeer.hidden = spiele.length > 0;

    for (const s of spiele) {
      const tr = document.createElement("tr");
      const elfer =
        s.ergebnis.elfHeim !== null && s.ergebnis.elfGast !== null
          ? ` (n. E. ${s.ergebnis.elfHeim} : ${s.ergebnis.elfGast})`
          : "";
      tr.append(
        zelle(s.titel),
        zelle(s.heimName, "spiel-teams"),
        zelle(`${s.ergebnis.toreHeim} : ${s.ergebnis.toreGast}${elfer}`, "spiel-ergebnis"),
        zelle(s.gastName, "spiel-teams")
      );
      koBody.appendChild(tr);
    }
  }

  function render() {
    const teams = TurnierStore.getMannschaften();
    noTeams.hidden = teams.length > 0;
    inhalt.hidden = teams.length === 0;
    if (teams.length === 0) return;

    TurnierStore.GRUPPEN.forEach(renderGruppe);
    renderKo();
  }

  render();
  window.addEventListener("turnier:geaendert", render);
  window.addEventListener("storage", (e) => {
    if (e.key === TurnierStore.STORAGE_KEY) render();
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) render();
  });
});
