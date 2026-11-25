/**
 * CRUD des variables : GET / POST / PUT / DELETE  /api/variables
 */
const express = require("express");
const pool = require("../db");
const { synchroniser } = require("../services/poller");

const router = express.Router();

function valider(b) {
  if (!b.automate_id || !b.nom || b.adresse === undefined || b.adresse === "") {
    return "Les champs automate_id, nom et adresse sont obligatoires";
  }
  return null;
}

// L'ordre correspond aux "?" des requêtes SQL ci-dessous
function champs(b) {
  return [
    b.automate_id, b.nom, b.type_registre ?? "holding", b.adresse, b.type_donnee ?? "int16",
    b.facteur_echelle ?? 1, b.unite ?? null, b.frequence_s ?? 5, b.actif ?? true,
  ];
}

router.get("/", async (req, res) => {
  res.json(await pool.query(`
    SELECT v.*, a.nom AS automate_nom, a.adresse_ip
    FROM variables v JOIN automates a ON a.id = v.automate_id
    ORDER BY v.id
  `));
});

router.post("/", async (req, res) => {
  const b = req.body ?? {};
  const erreur = valider(b);
  if (erreur) return res.status(400).json({ erreur });

  const r = await pool.query(
    `INSERT INTO variables (automate_id, nom, type_registre, adresse, type_donnee,
       facteur_echelle, unite, frequence_s, actif) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    champs(b)
  );
  await synchroniser(); // la nouvelle variable est surveillée immédiatement
  res.status(201).json({ id: r.insertId });
});

router.put("/:id", async (req, res) => {
  const b = req.body ?? {};
  const erreur = valider(b);
  if (erreur) return res.status(400).json({ erreur });

  const r = await pool.query(
    `UPDATE variables SET automate_id = ?, nom = ?, type_registre = ?, adresse = ?, type_donnee = ?,
       facteur_echelle = ?, unite = ?, frequence_s = ?, actif = ? WHERE id = ?`,
    [...champs(b), req.params.id]
  );
  if (r.affectedRows === 0) return res.status(404).json({ erreur: "Variable introuvable" });
  await synchroniser();
  res.json({ message: "Variable modifiée" });
});

router.delete("/:id", async (req, res) => {
  const r = await pool.query("DELETE FROM variables WHERE id = ?", [req.params.id]);
  if (r.affectedRows === 0) return res.status(404).json({ erreur: "Variable introuvable" });
  await synchroniser();
  res.json({ message: "Variable supprimée" });
});

module.exports = router;