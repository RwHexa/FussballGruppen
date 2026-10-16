/** Startseite: Fußzeile aus den Turnier-Angaben (Aushang-Seite) und Turniersieger. */
document.addEventListener("DOMContentLoaded", () => {
  const meta = TurnierStore.getMeta();
  const titelEl = document.getElementById("start-titel");
  const datumEl = document.getElementById("start-datum");
  const ortEl = document.getElementById("start-ort");
  const siegerEl = document.getElementById("start-sieger");

  if (meta.turnierName && meta.turnierName !== "Fußball-Turnier") {
    titelEl.textContent = meta.turnierName;
    titelEl.hidden = false;
  }

  if (meta.datum) {
    const d = new Date(meta.datum + "T12:00:00");
    if (!Number.isNaN(d.getTime())) {
      datumEl.textContent = new Intl.DateTimeFormat("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    }
  }

  if (meta.ort) ortEl.textContent = meta.ort;

  const endstand = TurnierStore.getEndstand();
  if (endstand.platz1) {
    siegerEl.textContent = `🏆 Turniersieger: ${endstand.platz1.name}`;
    siegerEl.hidden = false;
  }
});
