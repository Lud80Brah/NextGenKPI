/**
 * Poller Modbus : lit chaque variable active à sa propre fréquence
 * et enregistre la valeur (après facteur d'échelle) dans la table mesures.
 * - Une minuterie par variable (setInterval).
 * - synchroniser() recharge la configuration depuis la base : appelée après chaque
 *   modification via l'API + toutes les 30 s par node-cron (sécurité).
 *   => les changements sont pris en compte SANS redémarrer le serveur.
 */
const ModbusRTU = require("modbus-serial");
const cron = require("node-cron");
const pool = require("../db");

const taches = new Map(); // id de variable -> { intervalId, signature, enCours }

// Transforme les octets reçus en nombre selon le type de donnée
function decoder(buffer, typeDonnee) {
  switch (typeDonnee) {
    case "int16":   return buffer.readInt16BE(0);
    case "uint16":  return buffer.readUInt16BE(0);
    case "float32": return buffer.readFloatBE(0); // 2 registres, ordre big-endian
    case "bool":    return buffer.readUInt16BE(0) !== 0 ? 1 : 0;
    default: throw new Error(`Type de donnée inconnu : ${typeDonnee}`);
  }
}

// Lit UNE variable sur son automate et enregistre la mesure
async function lireVariable(v) {
  const client = new ModbusRTU();
  try {
    await client.connectTCP(v.adresse_ip, { port: v.port });
    client.setID(v.unit_id);
    client.setTimeout(2000);

    const nbRegistres = v.type_donnee === "float32" ? 2 : 1;
    let brut;
    switch (v.type_registre) {
      case "holding":  brut = decoder((await client.readHoldingRegisters(v.adresse, nbRegistres)).buffer, v.type_donnee); break;
      case "input":    brut = decoder((await client.readInputRegisters(v.adresse, nbRegistres)).buffer, v.type_donnee); break;
      case "coil":     brut = (await client.readCoils(v.adresse, 1)).data[0] ? 1 : 0; break;
      case "discrete": brut = (await client.readDiscreteInputs(v.adresse, 1)).data[0] ? 1 : 0; break;
      default: throw new Error(`Type de registre inconnu : ${v.type_registre}`);
    }

    const valeur = Math.round(brut * v.facteur_echelle * 1e6) / 1e6; // arrondi anti-erreurs de virgule flottante
    await pool.query("INSERT INTO mesures (variable_id, valeur) VALUES (?, ?)", [v.id, valeur]);
  } catch (err) {
    // Automate injoignable, timeout, mauvaise adresse... : on logue et on réessaiera au prochain cycle
    console.error(`[Modbus] ${v.nom} (${v.adresse_ip}:${v.port}) : ${err.message}`);
  } finally {
    try { client.close(() => {}); } catch { /* connexion déjà fermée */ }
  }
}

// Compare la configuration en base avec les minuteries en cours, et ajuste
async function _synchroniser() {
  const variables = await pool.query(`
    SELECT v.*, a.adresse_ip, a.port, a.unit_id
    FROM variables v JOIN automates a ON a.id = v.automate_id
    WHERE v.actif = 1
  `);

  const idsActifs = new Set();
  for (const v of variables) {
    idsActifs.add(v.id);
    // "signature" = tout ce qui influence la lecture ; si elle change, on recrée la minuterie
    const signature = JSON.stringify([v.nom, v.adresse_ip, v.port, v.unit_id, v.type_registre,
      v.adresse, v.type_donnee, v.facteur_echelle, v.frequence_s]);
    const existante = taches.get(v.id);
    if (existante && existante.signature === signature) continue;
    if (existante) clearInterval(existante.intervalId);

    const tache = { signature, enCours: false };
    tache.intervalId = setInterval(async () => {
      if (tache.enCours) return; // la lecture précédente n'est pas finie : on saute ce cycle
      tache.enCours = true;
      await lireVariable(v);
      tache.enCours = false;
    }, v.frequence_s * 1000);
    taches.set(v.id, tache);
    console.log(`[Poller] ${v.nom} : lecture toutes les ${v.frequence_s} s`);
  }

  // Arrête les minuteries des variables supprimées ou désactivées
  for (const [id, tache] of taches) {
    if (!idsActifs.has(id)) {
      clearInterval(tache.intervalId);
      taches.delete(id);
      console.log(`[Poller] Variable ${id} : surveillance arrêtée`);
    }
  }
}

// File d'attente : deux synchronisations ne s'exécutent jamais en même temps
let file = Promise.resolve();
function synchroniser() {
  file = file.catch(() => {}).then(_synchroniser);
  return file;
}

function demarrer() {
  synchroniser().catch((err) => console.error("[Poller] Base indisponible :", err.message));
  cron.schedule("*/30 * * * * *", () => {
    synchroniser().catch((err) => console.error("[Poller] Resynchronisation impossible :", err.message));
  });
  console.log("[Poller] Démarré (resynchronisation automatique toutes les 30 s)");
}

module.exports = { demarrer, synchroniser };