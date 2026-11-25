/**
 * Fonctions partagées par toutes les pages.
 * L'API est jointe sur la même machine que la page, port 3000 :
 * fonctionne en local ET depuis un autre PC du réseau.
 */
const API_URL = `http://${window.location.hostname || "localhost"}:3000/api`;

// Appel générique à l'API : renvoie le JSON, ou lève une erreur lisible
async function api(chemin, options = {}) {
  const reponse = await fetch(API_URL + chemin, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new Error(donnees.erreur || `Erreur HTTP ${reponse.status}`);
  return donnees;
}

// Échappe le texte avant de l'insérer dans la page (protection contre l'injection de HTML / XSS)
function esc(texte) {
  return String(texte ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Affiche un bandeau de message (succès / erreur) en haut de la page
function afficherMessage(texte, type = "success") {
  const zone = document.getElementById("messages");
  if (!zone) return;
  zone.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">
    ${esc(texte)}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
}

// Voyant d'état de l'API dans la barre de navigation
async function verifierApi() {
  const badge = document.getElementById("statut-api");
  if (!badge) return;
  try {
    await api("/health");
    badge.className = "badge bg-success";
    badge.textContent = "API connectée";
  } catch {
    badge.className = "badge bg-danger";
    badge.textContent = "API injoignable";
  }
}
verifierApi();
setInterval(verifierApi, 15000);