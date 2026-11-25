/**
 * Page Configuration : CRUD des automates et des variables via l'API.
 * Le même formulaire sert à l'ajout (id vide) et à la modification (id rempli).
 */
let automates = [];
let variables = [];

const champ = (id) => document.getElementById(id);
const valeur = (id) => champ(id).value.trim();

// ---------- Affichage ----------
async function toutCharger() {
  try {
    [automates, variables] = await Promise.all([api("/automates"), api("/variables")]);
  } catch (err) {
    afficherMessage("Chargement impossible : " + err.message, "danger");
    return;
  }

  champ("table-automates").innerHTML = automates.map((a) => `
    <tr>
      <td>${esc(a.nom)}</td><td>${esc(a.adresse_ip)}</td><td>${a.port}</td><td>${a.unit_id}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" data-action="modifier-automate" data-id="${a.id}">Modifier</button>
        <button class="btn btn-sm btn-outline-danger" data-action="supprimer-automate" data-id="${a.id}">Supprimer</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="5" class="text-muted">Aucun automate</td></tr>`;

  champ("v-automate").innerHTML = automates
    .map((a) => `<option value="${a.id}">${esc(a.nom)} (${esc(a.adresse_ip)})</option>`).join("");

  champ("table-variables").innerHTML = variables.map((v) => `
    <tr>
      <td>${esc(v.nom)}</td><td>${esc(v.automate_nom)}</td>
      <td>${esc(v.type_registre)} ${v.adresse}</td><td>${esc(v.type_donnee)}</td>
      <td>${v.facteur_echelle}</td><td>${esc(v.unite ?? "")}</td><td>${v.frequence_s} s</td>
      <td>${v.actif ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Pause</span>'}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" data-action="modifier-variable" data-id="${v.id}">Modifier</button>
        <button class="btn btn-sm btn-outline-danger" data-action="supprimer-variable" data-id="${v.id}">Supprimer</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="9" class="text-muted">Aucune variable</td></tr>`;
}

// ---------- Formulaires : remise à zéro ----------
function resetAutomate() {
  champ("form-automate").reset();
  champ("a-id").value = "";
  champ("titre-form-automate").textContent = "Ajouter un automate";
}

function resetVariable() {
  champ("form-variable").reset();
  champ("v-id").value = "";
  champ("titre-form-variable").textContent = "Ajouter une variable";
}

// ---------- Enregistrement (ajout ou modification) ----------
champ("form-automate").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = champ("a-id").value;
  const corps = {
    nom: valeur("a-nom"),
    adresse_ip: valeur("a-ip"),
    port: Number(valeur("a-port")),
    unit_id: Number(valeur("a-unit")),
    description: valeur("a-description") || null,
  };
  try {
    await api(id ? `/automates/${id}` : "/automates", { method: id ? "PUT" : "POST", body: JSON.stringify(corps) });
    afficherMessage(id ? "Automate modifié" : "Automate ajouté");
    resetAutomate();
    await toutCharger();
  } catch (err) {
    afficherMessage(err.message, "danger");
  }
});

champ("form-variable").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = champ("v-id").value;
  const corps = {
    automate_id: Number(valeur("v-automate")),
    nom: valeur("v-nom"),
    type_registre: valeur("v-registre"),
    adresse: Number(valeur("v-adresse")),
    type_donnee: valeur("v-type"),
    facteur_echelle: Number(valeur("v-facteur")),
    unite: valeur("v-unite") || null,
    frequence_s: Number(valeur("v-frequence")),
    actif: champ("v-actif").checked,
  };
  try {
    await api(id ? `/variables/${id}` : "/variables", { method: id ? "PUT" : "POST", body: JSON.stringify(corps) });
    afficherMessage(id ? "Variable modifiée" : "Variable ajoutée : elle est surveillée immédiatement");
    resetVariable();
    await toutCharger();
  } catch (err) {
    afficherMessage(err.message, "danger");
  }
});

champ("annuler-automate").addEventListener("click", resetAutomate);
champ("annuler-variable").addEventListener("click", resetVariable);

// ---------- Boutons Modifier / Supprimer des tableaux ----------
document.addEventListener("click", async (e) => {
  const bouton = e.target.closest("[data-action]");
  if (!bouton) return;
  const id = Number(bouton.dataset.id);

  try {
    switch (bouton.dataset.action) {
      case "modifier-automate": {
        const a = automates.find((x) => x.id === id);
        champ("a-id").value = a.id;
        champ("a-nom").value = a.nom;
        champ("a-ip").value = a.adresse_ip;
        champ("a-port").value = a.port;
        champ("a-unit").value = a.unit_id;
        champ("a-description").value = a.description ?? "";
        champ("titre-form-automate").textContent = `Modifier l'automate « ${a.nom} »`;
        champ("form-automate").scrollIntoView({ behavior: "smooth" });
        break;
      }
      case "supprimer-automate":
        if (!confirm("Supprimer cet automate ? Ses variables et tout leur historique seront aussi supprimés.")) return;
        await api(`/automates/${id}`, { method: "DELETE" });
        afficherMessage("Automate supprimé");
        await toutCharger();
        break;

      case "modifier-variable": {
        const v = variables.find((x) => x.id === id);
        champ("v-id").value = v.id;
        champ("v-automate").value = v.automate_id;
        champ("v-nom").value = v.nom;
        champ("v-registre").value = v.type_registre;
        champ("v-adresse").value = v.adresse;
        champ("v-type").value = v.type_donnee;
        champ("v-facteur").value = v.facteur_echelle;
        champ("v-unite").value = v.unite ?? "";
        champ("v-frequence").value = v.frequence_s;
        champ("v-actif").checked = Boolean(v.actif);
        champ("titre-form-variable").textContent = `Modifier la variable « ${v.nom} »`;
        champ("form-variable").scrollIntoView({ behavior: "smooth" });
        break;
      }
      case "supprimer-variable":
        if (!confirm("Supprimer cette variable et tout son historique ? (Astuce : décochez « Active » pour la mettre en pause sans perdre l'historique.)")) return;
        await api(`/variables/${id}`, { method: "DELETE" });
        afficherMessage("Variable supprimée");
        await toutCharger();
        break;
    }
  } catch (err) {
    afficherMessage(err.message, "danger");
  }
});

toutCharger();