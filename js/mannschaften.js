/** Mannschaften verwalten: Name und Gruppe (A/B). */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-mannschaft-neu");
  const inputNeu = document.getElementById("mannschaft-name-neu");
  const selectGruppeNeu = document.getElementById("mannschaft-gruppe-neu");
  const gruppenWrap = document.getElementById("mannschaften-gruppen");
  const listen = {
    A: document.getElementById("mannschaften-liste-a"),
    B: document.getElementById("mannschaften-liste-b"),
  };
  const leerHinweise = {
    A: document.getElementById("gruppe-leer-a"),
    B: document.getElementById("gruppe-leer-b"),
  };
  const countEl = document.getElementById("mannschaften-anzahl");
  const countA = document.getElementById("mannschaften-anzahl-a");
  const countB = document.getElementById("mannschaften-anzahl-b");
  const emptyEl = document.getElementById("mannschaften-empty");
  const messageEl = document.getElementById("mannschaften-message");
  const btnDemo = document.getElementById("btn-demo-laden");
  const btnVerteilen = document.getElementById("btn-gruppen-verteilen");
  const btnAlleLoeschen = document.getElementById("btn-alle-loeschen");

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

  /** Eine Zeile der Mannschaftsliste aufbauen. */
  function baueZeile(team, nummer) {
    const li = document.createElement("li");

    const nr = document.createElement("span");
    nr.className = "mannschaften-nr";
    nr.textContent = String(nummer);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "mannschaften-name-input";
    nameInput.value = team.name;
    nameInput.setAttribute("aria-label", "Name der Mannschaft " + team.name);
    nameInput.addEventListener("change", () => {
      const result = TurnierStore.updateMannschaftName(team.id, nameInput.value);
      if (!result.ok) {
        showMessage(result.error, "error");
        nameInput.value = team.name;
        return;
      }
      showMessage("Name gespeichert.", "ok");
      render();
    });

    const gruppeSelect = document.createElement("select");
    gruppeSelect.className = "mannschaften-gruppe-select";
    gruppeSelect.setAttribute("aria-label", "Gruppe von " + team.name);
    for (const g of TurnierStore.GRUPPEN) {
      const option = document.createElement("option");
      option.value = g;
      option.textContent = "Gruppe " + g;
      gruppeSelect.appendChild(option);
    }
    gruppeSelect.value = team.gruppe;
    gruppeSelect.addEventListener("change", () => {
      const betroffen = TurnierStore.zaehleSpieleVonMannschaft(team.id);
      if (
        betroffen > 0 &&
        !confirm(
          `„${team.name}“ hat ${betroffen} Gruppenspiel(e). Beim Wechsel in Gruppe ` +
            `${gruppeSelect.value} entfallen diese Ergebnisse. Fortfahren?`
        )
      ) {
        gruppeSelect.value = team.gruppe;
        return;
      }
      const result = TurnierStore.setMannschaftGruppe(team.id, gruppeSelect.value);
      if (!result.ok) {
        showMessage(result.error, "error");
        gruppeSelect.value = team.gruppe;
        return;
      }
      showMessage(
        result.entfernteSpiele > 0
          ? `Gruppe geändert – ${result.entfernteSpiele} Gruppenspiel(e) entfernt.`
          : "Gruppe geändert.",
        "ok"
      );
      render();
      window.dispatchEvent(new CustomEvent("turnier:geaendert"));
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-icon-delete";
    delBtn.textContent = "Entfernen";
    delBtn.addEventListener("click", () => {
      if (!confirm(`„${team.name}“ wirklich entfernen?`)) return;
      TurnierStore.removeMannschaft(team.id);
      render();
      window.dispatchEvent(new CustomEvent("turnier:geaendert"));
    });

    li.append(nr, nameInput, gruppeSelect, delBtn);
    return li;
  }

  function render() {
    const teams = TurnierStore.getMannschaften();
    countEl.textContent = String(teams.length);

    const nachGruppe = {
      A: teams.filter((t) => t.gruppe === "A"),
      B: teams.filter((t) => t.gruppe === "B"),
    };
    countA.textContent = String(nachGruppe.A.length);
    countB.textContent = String(nachGruppe.B.length);

    if (teams.length === 0) {
      gruppenWrap.hidden = true;
      emptyEl.hidden = false;
      return;
    }

    gruppenWrap.hidden = false;
    emptyEl.hidden = true;

    for (const g of TurnierStore.GRUPPEN) {
      const liste = listen[g];
      liste.replaceChildren();
      nachGruppe[g].forEach((team, i) => liste.appendChild(baueZeile(team, i + 1)));
      leerHinweise[g].hidden = nachGruppe[g].length > 0;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = TurnierStore.addMannschaft(inputNeu.value, selectGruppeNeu.value);
    if (!result.ok) {
      showMessage(result.error, "error");
      inputNeu.focus();
      return;
    }
    inputNeu.value = "";
    showMessage(`Mannschaft zu Gruppe ${selectGruppeNeu.value} hinzugefügt.`, "ok");
    render();
    inputNeu.focus();
  });

  btnDemo.addEventListener("click", () => {
    if (
      TurnierStore.getMannschaften().length > 0 &&
      !confirm("Vorhandene Mannschaften, Spiele und K.-o.-Runde durch Demo-Daten ersetzen?")
    ) {
      return;
    }
    TurnierStore.ladeDemoMannschaften();
    showMessage("Demo-Mannschaften geladen: vier je Gruppe.", "ok");
    render();
    window.dispatchEvent(new CustomEvent("turnier:geaendert"));
  });

  btnVerteilen.addEventListener("click", () => {
    const teams = TurnierStore.getMannschaften();
    if (teams.length === 0) return;
    const betroffen = TurnierStore.getSpiele().length;
    if (
      !confirm(
        betroffen > 0
          ? `Die Mannschaften werden reihum auf A und B verteilt. Gruppenspiele, die dadurch über Gruppengrenzen gehen, entfallen. Fortfahren?`
          : "Die Mannschaften reihum auf Gruppe A und B verteilen?"
      )
    ) {
      return;
    }
    TurnierStore.verteileGruppen();
    showMessage("Gruppen neu aufgeteilt.", "ok");
    render();
    window.dispatchEvent(new CustomEvent("turnier:geaendert"));
  });

  btnAlleLoeschen.addEventListener("click", () => {
    if (TurnierStore.getMannschaften().length === 0) return;
    if (!confirm("Alle Mannschaften, Spiele und K.-o.-Ergebnisse wirklich löschen?")) return;
    TurnierStore.setMannschaften([]);
    render();
    window.dispatchEvent(new CustomEvent("turnier:geaendert"));
  });

  window.addEventListener("turnier:geaendert", render);
  window.addEventListener("storage", (e) => {
    if (e.key === TurnierStore.STORAGE_KEY) render();
  });

  render();
});
