/** Gruppenspiele eintragen und bearbeiten – Heim und Gast stehen in derselben Gruppe. */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-spiel");
  const selectGruppe = document.getElementById("spiel-gruppe");
  const selectHeim = document.getElementById("spiel-heim");
  const selectGast = document.getElementById("spiel-gast");
  const inputHeimTore = document.getElementById("spiel-tore-heim");
  const inputGastTore = document.getElementById("spiel-tore-gast");
  const btnSubmit = document.getElementById("btn-spiel-speichern");
  const btnAbbrechen = document.getElementById("btn-spiel-abbrechen");
  const messageEl = document.getElementById("spiele-message");
  const editingHint = document.getElementById("spiel-editing-hint");
  const listeBody = document.getElementById("spiele-liste-body");
  const emptyEl = document.getElementById("spiele-empty");
  const countEl = document.getElementById("spiele-anzahl");
  const noTeamsEl = document.getElementById("spiele-keine-mannschaften");
  const formPanel = document.getElementById("spiele-form-panel");
  const offenePanel = document.getElementById("offene-panel");
  const offeneListen = {
    A: document.getElementById("offene-liste-a"),
    B: document.getElementById("offene-liste-b"),
  };
  const offeneLeer = {
    A: document.getElementById("offene-leer-a"),
    B: document.getElementById("offene-leer-b"),
  };

  /** @type {string | null} */
  let editingId = null;

  function showMessage(text, type) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = "form-message " + (type === "error" ? "is-error" : "is-ok");
    if (type === "ok") {
      setTimeout(() => {
        messageEl.className = "form-message";
        messageEl.textContent = "";
      }, 2500);
    }
  }

  /** Heim- und Gastauswahl auf die Mannschaften der gewählten Gruppe setzen. */
  function fuelleMannschaftsSelects() {
    const teams = TurnierStore.getMannschaftenDerGruppe(selectGruppe.value);
    const vorherHeim = selectHeim.value;
    const vorherGast = selectGast.value;
    const opts =
      '<option value="">— Mannschaft wählen —</option>' +
      teams.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");

    selectHeim.innerHTML = opts;
    selectGast.innerHTML = opts;

    const ids = new Set(teams.map((t) => t.id));
    if (ids.has(vorherHeim)) selectHeim.value = vorherHeim;
    if (ids.has(vorherGast)) selectGast.value = vorherGast;
  }

  function setEditMode(id) {
    editingId = id;
    if (id) {
      const spiel = TurnierStore.getSpieleMitNamen().find((s) => s.id === id);
      if (!spiel) {
        setEditMode(null);
        return;
      }
      selectGruppe.value = spiel.gruppe;
      fuelleMannschaftsSelects();
      selectHeim.value = spiel.heimId;
      selectGast.value = spiel.gastId;
      inputHeimTore.value = String(spiel.toreHeim);
      inputGastTore.value = String(spiel.toreGast);
      btnSubmit.textContent = "Ergebnis speichern";
      editingHint.classList.add("is-visible");
      editingHint.textContent = `Bearbeitung: Spiel der Gruppe ${spiel.gruppe}.`;
      btnAbbrechen.hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      const gruppe = selectGruppe.value;
      form.reset();
      selectGruppe.value = gruppe;
      fuelleMannschaftsSelects();
      btnSubmit.textContent = "Spiel / Ergebnis hinzufügen";
      editingHint.classList.remove("is-visible");
      btnAbbrechen.hidden = true;
    }
  }

  /** Paarung aus „Offene Begegnungen“ ins Formular holen. */
  function uebernehmePaarung(gruppe, heimId, gastId) {
    editingId = null;
    btnSubmit.textContent = "Spiel / Ergebnis hinzufügen";
    editingHint.classList.remove("is-visible");
    btnAbbrechen.hidden = true;
    selectGruppe.value = gruppe;
    fuelleMannschaftsSelects();
    selectHeim.value = heimId;
    selectGast.value = gastId;
    inputHeimTore.value = "0";
    inputGastTore.value = "0";
    inputHeimTore.focus();
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderOffene() {
    let gesamtOffen = 0;
    let genugTeams = false;

    for (const g of TurnierStore.GRUPPEN) {
      const liste = offeneListen[g];
      const teams = TurnierStore.getMannschaftenDerGruppe(g);
      const offen = TurnierStore.getOffeneBegegnungen(g);
      gesamtOffen += offen.length;
      if (teams.length >= 2) genugTeams = true;

      liste.replaceChildren();
      offeneLeer[g].hidden = !(teams.length >= 2 && offen.length === 0);

      if (teams.length < 2) {
        const li = document.createElement("li");
        li.className = "offene-hinweis";
        li.textContent = "Mindestens zwei Mannschaften nötig.";
        liste.appendChild(li);
        continue;
      }

      for (const paarung of offen) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "offene-chip";
        btn.textContent = `${paarung.heim.name} – ${paarung.gast.name}`;
        btn.addEventListener("click", () =>
          uebernehmePaarung(g, paarung.heim.id, paarung.gast.id)
        );
        li.appendChild(btn);
        liste.appendChild(li);
      }
    }

    offenePanel.hidden = !genugTeams;
    return gesamtOffen;
  }

  function renderListe() {
    const rows = TurnierStore.getSpieleMitNamen();
    countEl.textContent = String(rows.length);

    listeBody.replaceChildren();
    if (rows.length === 0) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    // Nach Gruppe sortiert anzeigen, innerhalb der Gruppe in Eingabereihenfolge
    const sortiert = [...rows].sort((a, b) => a.gruppe.localeCompare(b.gruppe));

    sortiert.forEach((s, index) => {
      const tr = document.createElement("tr");

      const tdNr = document.createElement("td");
      tdNr.textContent = String(index + 1);

      const tdGruppe = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "gruppe-badge gruppe-badge--" + s.gruppe.toLowerCase();
      badge.textContent = s.gruppe;
      tdGruppe.appendChild(badge);

      const tdTeams = document.createElement("td");
      tdTeams.className = "spiel-teams";
      tdTeams.textContent = `${s.heimName}  vs.  ${s.gastName}`;

      const tdErgebnis = document.createElement("td");
      tdErgebnis.className = "spiel-ergebnis";
      tdErgebnis.textContent = `${s.toreHeim} : ${s.toreGast}`;

      const tdActions = document.createElement("td");
      tdActions.className = "spiel-actions";

      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn-small";
      btnEdit.textContent = "Bearbeiten";
      btnEdit.addEventListener("click", () => setEditMode(s.id));

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn-small btn-small--danger";
      btnDel.textContent = "Löschen";
      btnDel.addEventListener("click", () => {
        if (!confirm("Dieses Spiel wirklich löschen?")) return;
        TurnierStore.removeSpiel(s.id);
        if (editingId === s.id) setEditMode(null);
        showMessage("Spiel gelöscht. Tabelle wurde aktualisiert.", "ok");
        render();
      });

      tdActions.append(btnEdit, btnDel);
      tr.append(tdNr, tdGruppe, tdTeams, tdErgebnis, tdActions);
      listeBody.appendChild(tr);
    });
  }

  function render() {
    const spielbar = TurnierStore.GRUPPEN.some(
      (g) => TurnierStore.getMannschaftenDerGruppe(g).length >= 2
    );

    noTeamsEl.hidden = spielbar;
    formPanel.hidden = !spielbar;

    fuelleMannschaftsSelects();

    if (editingId) {
      const spiel = TurnierStore.getSpiele().find((s) => s.id === editingId);
      if (!spiel) setEditMode(null);
    }

    renderOffene();
    renderListe();
  }

  selectGruppe.addEventListener("change", () => {
    selectHeim.value = "";
    selectGast.value = "";
    fuelleMannschaftsSelects();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = {
      heimId: selectHeim.value,
      gastId: selectGast.value,
      toreHeim: inputHeimTore.value,
      toreGast: inputGastTore.value,
    };

    const result = editingId
      ? TurnierStore.updateSpiel(editingId, payload)
      : TurnierStore.addSpiel(payload);

    if (!result.ok) {
      showMessage(result.error, "error");
      return;
    }

    showMessage(
      editingId
        ? "Ergebnis gespeichert."
        : `Spiel der Gruppe ${result.gruppe} hinzugefügt. Tabelle wurde aktualisiert.`,
      "ok"
    );
    setEditMode(null);
    render();
  });

  btnAbbrechen.addEventListener("click", () => setEditMode(null));

  window.addEventListener("turnier:geaendert", render);
  window.addEventListener("storage", (e) => {
    if (e.key === TurnierStore.STORAGE_KEY) render();
  });

  render();
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
