/** Zwei Gruppentabellen – Daten aus dem TurnierStore. */

/** @type {string | null} */
let selectedId = null;

function formatTorverhaeltnis(tordifferenz) {
  return tordifferenz > 0 ? `+${tordifferenz}` : String(tordifferenz);
}

/** Platz 1 und 2 sind im Halbfinale, dahinter ruhige Streifen. */
function rankRowClass(platz) {
  if (platz <= 2) return "rank-quali";
  return platz % 2 === 0 ? "rank-zebra-even" : "rank-zebra-odd";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderGruppe(gruppe) {
  const tbody = document.getElementById("tabelle-body-" + gruppe.toLowerCase());
  if (!tbody) return;

  const zeilen = TurnierStore.getTabelle(gruppe);
  tbody.replaceChildren();

  if (zeilen.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="9" class="tabelle-leer">Keine Mannschaft in Gruppe ${gruppe} – bitte unter „Mannschaften“ eintragen.</td>`;
    tbody.appendChild(tr);
    return;
  }

  zeilen.forEach((m) => {
    const tr = document.createElement("tr");
    const classes = [rankRowClass(m.platz)];
    if (m.id === selectedId) classes.push("selected");
    tr.className = classes.filter(Boolean).join(" ");

    tr.innerHTML = `
      <td class="col-platz">${m.platz}</td>
      <td class="col-mannschaft">${escapeHtml(m.name)}</td>
      <td>${m.spiele}</td>
      <td>${m.siege}</td>
      <td>${m.unentschieden}</td>
      <td>${m.niederlagen}</td>
      <td>${m.toreErzielt} : ${m.toreErhalten}</td>
      <td>${formatTorverhaeltnis(m.tordifferenz)}</td>
      <td class="col-punkte">${m.punkte}</td>
    `;

    tr.addEventListener("click", () => {
      selectedId = m.id === selectedId ? null : m.id;
      aktualisiereTabellen();
    });

    tbody.appendChild(tr);
  });
}

function renderStatus() {
  const statusEl = document.getElementById("tabellen-status");
  if (!statusEl) return;

  const offen = TurnierStore.GRUPPEN.map((g) => ({
    gruppe: g,
    teams: TurnierStore.getMannschaftenDerGruppe(g).length,
    offen: TurnierStore.getOffeneBegegnungen(g).length,
  }));

  if (offen.every((o) => o.teams === 0)) {
    statusEl.textContent = "";
    statusEl.className = "tabellen-status";
    return;
  }

  if (TurnierStore.istGruppenphaseKomplett()) {
    statusEl.textContent = "Gruppenphase beendet – die Halbfinals stehen fest.";
    statusEl.className = "tabellen-status is-fertig";
    return;
  }

  const text = offen
    .filter((o) => o.offen > 0)
    .map((o) => `Gruppe ${o.gruppe}: ${o.offen} offen`)
    .join(" · ");
  statusEl.textContent = text
    ? `Gruppenphase läuft – ${text}. Die Platzierungen können sich noch ändern.`
    : "Gruppenphase läuft.";
  statusEl.className = "tabellen-status";
}

function aktualisiereTabellen() {
  const alleIds = new Set(TurnierStore.getMannschaften().map((t) => t.id));
  if (selectedId && !alleIds.has(selectedId)) selectedId = null;
  TurnierStore.GRUPPEN.forEach(renderGruppe);
  renderStatus();
}

document.addEventListener("DOMContentLoaded", () => {
  aktualisiereTabellen();

  window.addEventListener("turnier:geaendert", aktualisiereTabellen);
  window.addEventListener("storage", (e) => {
    if (e.key === TurnierStore.STORAGE_KEY) aktualisiereTabellen();
  });
  // Zurueck-Knopf: holt der Browser die Seite aus seinem Rueckwaerts-Cache,
  // laufen die Skripte nicht neu an - dann stuenden hier die Tabellen von vorhin.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) aktualisiereTabellen();
  });
});
