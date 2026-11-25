/**
 * Tableau de bord : une carte + un graphique Chart.js par variable active.
 * Chaque graphique se rafraîchit à la fréquence de SA variable.
 * La liste des variables est revérifiée toutes les 30 s (ajouts / modifications pris en compte).
 */
const graphiques = new Map(); // id variable -> { chart, timer }
let signatureActuelle = "";

async function chargerTableau() {
  let variables;
  try {
    variables = (await api("/variables")).filter((v) => v.actif);
  } catch (err) {
    afficherMessage("Impossible de charger les variables : " + err.message, "danger");
    return;
  }

  // Si la configuration n'a pas changé, on ne reconstruit rien
  const signature = JSON.stringify(variables.map((v) => [v.id, v.nom, v.frequence_s, v.unite, v.adresse_ip]));
  if (signature === signatureActuelle) return;
  signatureActuelle = signature;

  // Nettoyage des anciens graphiques
  graphiques.forEach((g) => { clearInterval(g.timer); g.chart.destroy(); });
  graphiques.clear();
  const grille = document.getElementById("grille");
  grille.innerHTML = "";

  if (variables.length === 0) {
    grille.innerHTML = `<p class="text-muted">Aucune variable active. Ajoutez-en dans
      <a href="config.html">Configuration</a>.</p>`;
    return;
  }

  for (const v of variables) {
    const col = document.createElement("div");
    col.className = "col-12 col-lg-6";
    col.innerHTML = `
      <div class="card shadow-sm h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h2 class="h5 mb-0">${esc(v.nom)}</h2>
              <small class="text-muted">${esc(v.automate_nom)} · ${esc(v.adresse_ip)} ·
                ${esc(v.type_registre)} ${v.adresse} · toutes les ${v.frequence_s} s</small>
            </div>
            <div class="valeur-actuelle" id="valeur-${v.id}">--</div>
          </div>
          <canvas id="graph-${v.id}" height="140"></canvas>
        </div>
      </div>`;
    grille.appendChild(col);

    const chart = new Chart(document.getElementById(`graph-${v.id}`), {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: `${v.nom} (${v.unite ?? ""})`,
          data: [],
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13, 110, 253, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        }],
      },
      options: {
        animation: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { maxTicksLimit: 6 } } },
      },
    });

    // Récupère les 60 dernières mesures et met à jour le graphique + la valeur actuelle
    const rafraichir = async () => {
      const zoneValeur = document.getElementById(`valeur-${v.id}`);
      try {
        const mesures = await api(`/mesures?variable_id=${v.id}&limite=60`);
        chart.data.labels = mesures.map((m) => new Date(m.horodatage).toLocaleTimeString("fr-FR"));
        chart.data.datasets[0].data = mesures.map((m) => m.valeur);
        chart.update();
        const derniere = mesures.at(-1);
        zoneValeur.textContent = derniere
          ? `${derniere.valeur.toLocaleString("fr-FR")} ${v.unite ?? ""}`
          : "--";
      } catch {
        zoneValeur.textContent = "Erreur";
      }
    };

    rafraichir();
    graphiques.set(v.id, { chart, timer: setInterval(rafraichir, v.frequence_s * 1000) });
  }
}

chargerTableau();
setInterval(chargerTableau, 30000);