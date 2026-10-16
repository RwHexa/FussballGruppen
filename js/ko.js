/**
 * K.-o.-Runde: Halbfinale, Spiel um Platz 3, Finale.
 * Die Paarungen kommen aus den Gruppentabellen und werden hier nur angezeigt;
 * eingetragen wird allein das Ergebnis.
 */
document.addEventListener("DOMContentLoaded", () => {
  const messageEl = document.getElementById("ko-message");
  const statusEl = document.getElementById("ko-status");
  const wrapHalbfinale = document.getElementById("ko-halbfinale");
  const wrapFinalrunde = document.getElementById("ko-finalrunde");
  const endstandEl = document.getElementById("ko-endstand");
  const endstandListe = document.getElementById("ko-endstand-liste");
  const btnReset = document.getElementById("btn-ko-reset");

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "form-message " + (type === "error" ? "is-error" : "is-ok");
    if (type === "ok") {
      setTimeout(() => {
        messageEl.className = "form-message";
        messageEl.textContent = "";
      }, 2500);
    }
  }

  function torFeld(id, wert, label) {
    const feld = document.createElement("input");
    feld.type = "number";
    feld.id = id;
    feld.min = "0";
    feld.max = "99";
    feld.step = "1";
    feld.value = wert === null || wert === undefined ? "" : String(wert);
    feld.setAttribute("aria-label", label);
    return feld;
  }

  /** Name der Mannschaft oder – solange sie nicht feststeht – ihre Herkunft. */
  function seitenName(team, herkunft) {
    return team ? team.name : herkunft;
  }

  function baueKarte(spiel) {
    const karte = document.createElement("article");
    karte.className = "ko-karte";
    if (spiel.slot === "finale") karte.classList.add("ko-karte--finale");
    if (!spiel.bereit) karte.classList.add("ko-karte--offen");

    const titel = document.createElement("h3");
    titel.className = "ko-karte__titel";
    titel.textContent = spiel.titel;
    karte.appendChild(titel);

    const herkunft = document.createElement("p");
    herkunft.className = "ko-karte__herkunft";
    herkunft.textContent = `${spiel.herkunft.heim} – ${spiel.herkunft.gast}`;
    karte.appendChild(herkunft);

    const paarung = document.createElement("div");
    paarung.className = "ko-paarung";

    const heimName = document.createElement("span");
    heimName.className = "ko-paarung__team";
    heimName.textContent = seitenName(spiel.paarung.heim, spiel.herkunft.heim);

    const trenner = document.createElement("span");
    trenner.className = "ko-paarung__trenner";
    trenner.textContent = "–";

    const gastName = document.createElement("span");
    gastName.className = "ko-paarung__team";
    gastName.textContent = seitenName(spiel.paarung.gast, spiel.herkunft.gast);

    if (spiel.sieger) {
      const siegerSeite =
        spiel.ergebnis && spiel.sieger.id === spiel.ergebnis.heimId ? heimName : gastName;
      siegerSeite.classList.add("ist-sieger");
    }

    paarung.append(heimName, trenner, gastName);
    karte.appendChild(paarung);

    if (!spiel.bereit) {
      const hinweis = document.createElement("p");
      hinweis.className = "ko-karte__hinweis";
      hinweis.textContent =
        spiel.slot === "hf1" || spiel.slot === "hf2"
          ? "Die Mannschaft steht noch nicht fest – in beiden Gruppen müssen mindestens zwei Teams spielen."
          : "Erst wenn beide Halbfinals entschieden sind, steht diese Paarung fest.";
      karte.appendChild(hinweis);
      return karte;
    }

    if (spiel.passtNichtMehr) {
      const warnung = document.createElement("p");
      warnung.className = "ko-karte__warnung";
      warnung.textContent =
        "Der Gruppenstand hat sich geändert – dieses Ergebnis gehört nicht mehr zur aktuellen Paarung.";
      karte.appendChild(warnung);
    }

    /* ---------- Ergebnis-Formular ---------- */

    const form = document.createElement("form");
    form.className = "ko-form";

    const reihe = document.createElement("div");
    reihe.className = "ko-form__tore";
    const idHeim = `tore-heim-${spiel.slot}`;
    const idGast = `tore-gast-${spiel.slot}`;
    // Ohne Ergebnis bleiben die Felder leer: 0 : 0 waere ein Unentschieden
    // und wuerde gleich nach dem Elfmeterschiessen fragen.
    const feldHeim = torFeld(idHeim, spiel.ergebnis ? spiel.ergebnis.toreHeim : null, "Tore " + seitenName(spiel.soll.heim, spiel.herkunft.heim));
    const feldGast = torFeld(idGast, spiel.ergebnis ? spiel.ergebnis.toreGast : null, "Tore " + seitenName(spiel.soll.gast, spiel.herkunft.gast));
    const doppelpunkt = document.createElement("span");
    doppelpunkt.className = "ko-form__doppelpunkt";
    doppelpunkt.textContent = ":";
    reihe.append(feldHeim, doppelpunkt, feldGast);
    form.appendChild(reihe);

    const elferBlock = document.createElement("div");
    elferBlock.className = "ko-form__elfer";
    const elferLabel = document.createElement("span");
    elferLabel.className = "ko-form__elfer-label";
    elferLabel.textContent = "Elfmeterschießen";
    const feldElfHeim = torFeld(
      `elf-heim-${spiel.slot}`,
      spiel.ergebnis ? spiel.ergebnis.elfHeim : null,
      "Elfmeter " + seitenName(spiel.soll.heim, spiel.herkunft.heim)
    );
    const feldElfGast = torFeld(
      `elf-gast-${spiel.slot}`,
      spiel.ergebnis ? spiel.ergebnis.elfGast : null,
      "Elfmeter " + seitenName(spiel.soll.gast, spiel.herkunft.gast)
    );
    const elferTrenner = document.createElement("span");
    elferTrenner.className = "ko-form__doppelpunkt";
    elferTrenner.textContent = ":";
    elferBlock.append(elferLabel, feldElfHeim, elferTrenner, feldElfGast);
    form.appendChild(elferBlock);

    /** Das Elfmeterschießen nur bei Gleichstand zeigen. */
    function pruefeElfer() {
      const gleich =
        feldHeim.value !== "" &&
        feldGast.value !== "" &&
        Number(feldHeim.value) === Number(feldGast.value);
      elferBlock.hidden = !gleich;
    }
    feldHeim.addEventListener("input", pruefeElfer);
    feldGast.addEventListener("input", pruefeElfer);
    pruefeElfer();

    const aktionen = document.createElement("div");
    aktionen.className = "ko-form__actions";

    const btnSpeichern = document.createElement("button");
    btnSpeichern.type = "submit";
    btnSpeichern.className = "btn-primary";
    btnSpeichern.textContent = spiel.ergebnis ? "Ergebnis ändern" : "Ergebnis eintragen";
    aktionen.appendChild(btnSpeichern);

    if (spiel.ergebnis) {
      const btnLoeschen = document.createElement("button");
      btnLoeschen.type = "button";
      btnLoeschen.className = "btn-ghost";
      btnLoeschen.textContent = "Ergebnis löschen";
      btnLoeschen.addEventListener("click", () => {
        const folge =
          spiel.slot === "hf1" || spiel.slot === "hf2"
            ? " Finale und Spiel um Platz 3 werden dadurch zurückgesetzt."
            : "";
        if (!confirm(`Ergebnis von ${spiel.titel} löschen?${folge}`)) return;
        TurnierStore.removeKoErgebnis(spiel.slot);
        showMessage(`${spiel.titel}: Ergebnis gelöscht.`, "ok");
        render();
      });
      aktionen.appendChild(btnLoeschen);
    }

    form.appendChild(aktionen);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const result = TurnierStore.setKoErgebnis(spiel.slot, {
        toreHeim: feldHeim.value,
        toreGast: feldGast.value,
        elfHeim: feldElfHeim.value,
        elfGast: feldElfGast.value,
      });
      if (!result.ok) {
        showMessage(`${spiel.titel}: ${result.error}`, "error");
        return;
      }
      showMessage(`${spiel.titel}: Ergebnis gespeichert.`, "ok");
      render();
    });

    karte.appendChild(form);

    if (spiel.ergebnis) {
      const stand = document.createElement("p");
      stand.className = "ko-karte__stand";
      const elfer =
        spiel.ergebnis.elfHeim !== null && spiel.ergebnis.elfGast !== null
          ? ` (n. E. ${spiel.ergebnis.elfHeim} : ${spiel.ergebnis.elfGast})`
          : "";
      stand.textContent = `${spiel.ergebnis.toreHeim} : ${spiel.ergebnis.toreGast}${elfer}`;
      if (spiel.sieger) stand.textContent += ` · weiter: ${spiel.sieger.name}`;
      karte.appendChild(stand);
    }

    return karte;
  }

  function renderStatus() {
    if (TurnierStore.getMannschaften().length === 0) {
      statusEl.textContent = "Noch keine Mannschaften – bitte zuerst Mannschaften und Gruppenspiele erfassen.";
      statusEl.className = "ko-status is-warnung";
      return;
    }
    if (!TurnierStore.istGruppenphaseKomplett()) {
      statusEl.textContent =
        "Die Gruppenphase ist noch nicht beendet – die Halbfinal-Paarungen können sich noch ändern.";
      statusEl.className = "ko-status is-warnung";
      return;
    }
    statusEl.textContent = "Gruppenphase beendet – die Paarungen stehen fest.";
    statusEl.className = "ko-status is-fertig";
  }

  function renderEndstand() {
    const endstand = TurnierStore.getEndstand();
    const plaetze = [
      ["1. Platz", endstand.platz1, "🥇"],
      ["2. Platz", endstand.platz2, "🥈"],
      ["3. Platz", endstand.platz3, "🥉"],
      ["4. Platz", endstand.platz4, ""],
    ].filter(([, team]) => Boolean(team));

    endstandListe.replaceChildren();
    endstandEl.hidden = plaetze.length === 0;
    if (plaetze.length === 0) return;

    for (const [label, team, medaille] of plaetze) {
      const li = document.createElement("li");
      li.className = "ko-endstand__zeile";
      const platz = document.createElement("span");
      platz.className = "ko-endstand__platz";
      platz.textContent = `${medaille} ${label}`.trim();
      const name = document.createElement("span");
      name.className = "ko-endstand__name";
      name.textContent = `${team.name} (Gruppe ${team.gruppe})`;
      li.append(platz, name);
      endstandListe.appendChild(li);
    }
  }

  function render() {
    const runde = TurnierStore.getKoRunde();

    wrapHalbfinale.replaceChildren(baueKarte(runde.hf1), baueKarte(runde.hf2));
    wrapFinalrunde.replaceChildren(baueKarte(runde.finale), baueKarte(runde.platz3));

    renderStatus();
    renderEndstand();
  }

  btnReset.addEventListener("click", () => {
    if (!confirm("Alle Ergebnisse der K.-o.-Runde löschen? Die Gruppenspiele bleiben erhalten.")) {
      return;
    }
    TurnierStore.resetKo();
    showMessage("K.-o.-Runde zurückgesetzt.", "ok");
    render();
  });

  window.addEventListener("turnier:geaendert", render);
  window.addEventListener("storage", (e) => {
    if (e.key === TurnierStore.STORAGE_KEY) render();
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) render();
  });

  render();
});
