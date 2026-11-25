/**
 * Page Export : choix d'une variable (ou toutes) + plage de dates -> téléchargement du CSV.
 */

// Convertit une date JS au format attendu par <input type="datetime-local"> (heure locale)
function versChampLocal(date) {
  const locale = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return locale.toISOString().slice(0, 16);
}

async function initialiser() {
  try {
    const variables = await api("/variables");
    document.getElementById("e-variable").innerHTML =
      `<option value="">Toutes les variables</option>` +
      variables.map((v) => `<option value="${v.id}">${esc(v.nom)} (${esc(v.unite ?? "")})</option>`).join("");
  } catch (err) {
    afficherMessage("Impossible de charger les variables : " + err.message, "danger");
  }
  // Par défaut : la dernière heure
  const maintenant = new Date();
  document.getElementById("e-debut").value = versChampLocal(new Date(maintenant - 3600 * 1000));
  document.getElementById("e-fin").value = versChampLocal(maintenant);
}

document.getElementById("form-export").addEventListener("submit", (e) => {
  e.preventDefault();
  const debut = new Date(document.getElementById("e-debut").value);
  const fin = new Date(document.getElementById("e-fin").value);
  if (debut >= fin) {
    afficherMessage("La date de début doit être avant la date de fin.", "warning");
    return;
  }
  // Les dates sont envoyées en UTC (toISOString), comme elles sont stockées en base
  const params = new URLSearchParams({ debut: debut.toISOString(), fin: fin.toISOString() });
  const variableId = document.getElementById("e-variable").value;
  if (variableId) params.append("variable_id", variableId);

  window.location.href = `${API_URL}/mesures/export?${params}`; // déclenche le téléchargement
});

initialiser();