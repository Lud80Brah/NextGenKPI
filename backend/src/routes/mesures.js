/**
 * Mesures :
 *  GET /api/mesures?variable_id=1&limite=100          -> dernières valeurs (pour les graphiques)
 *  GET /api/mesures/export?debut=...&fin=...&variable_id=1 -> fichier CSV (variable_id optionnel)
 */
const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const variableId = Number(req.query.variable_id);
  if (!variableId) return res.status(400).json({ erreur: "Paramètre variable_id obligatoire" });
  const limite = Math.min(Number(req.query.limite) || 100, 1000);

  const lignes = await pool.query(
    "SELECT horodatage, valeur FROM mesures WHERE variable_id = ? ORDER BY horodatage DESC LIMIT ?",
    [variableId, limite]
  );
  res.json(lignes.reverse()); // ordre chronologique pour le graphique
});

router.get("/export", async (req, res) => {
  const debut = new Date(req.query.debut);
  const fin = new Date(req.query.fin);
  if (isNaN(debut) || isNaN(fin)) {
    return res.status(400).json({ erreur: "Paramètres debut et fin obligatoires (dates valides)" });
  }

  let sql = `SELECT m.horodatage, v.nom, m.valeur, v.unite
             FROM mesures m JOIN variables v ON v.id = m.variable_id
             WHERE m.horodatage BETWEEN ? AND ?`;
  const params = [debut, fin];
  if (req.query.variable_id) {
    sql += " AND m.variable_id = ?";
    params.push(Number(req.query.variable_id));
  }
  sql += " ORDER BY m.horodatage";
  const lignes = await pool.query(sql, params);

  // CSV au format Excel français : séparateur ";" et virgule décimale
  const csv = [
    "horodatage (heure de Paris);variable;valeur;unite",
    ...lignes.map((l) => [
      l.horodatage.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }),
      l.nom,
      String(l.valeur).replace(".", ","),
      l.unite ?? "",
    ].join(";")),
  ].join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="nextgenkpi_export.csv"');
  res.send("\uFEFF" + csv); // BOM : pour qu'Excel affiche correctement les accents
});

module.exports = router;