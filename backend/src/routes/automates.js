/**
 * CRUD des automates : GET / POST / PUT / DELETE  /api/automates
 */
const express = require("express");
const pool = require("../db");
const { synchroniser } = require("../services/poller");

const router = express.Router();

function valider(b) {
  if (!b.nom || !b.adresse_ip) return "Les champs nom et adresse_ip sont obligatoires";
  return null;
}

function champs(b) {
  return [b.nom, b.adresse_ip, b.port ?? 502, b.unit_id ?? 1, b.description ?? null];
}

router.get("/", async (req, res) => {
  res.json(await pool.query("SELECT * FROM automates ORDER BY id"));
});

router.post("/", async (req, res) => {
  const b = req.body ?? {};
  const erreur = valider(b);
  if (erreur) return res.status(400).json({ erreur });

  const r = await pool.query(
    "INSERT INTO automates (nom, adresse_ip, port, unit_id, description) VALUES (?, ?, ?, ?, ?)",
    champs(b)
  );
  res.status(201).json({ id: r.insertId });
});

router.put("/:id", async (req, res) => {
  const b = req.body ?? {};
  const erreur = valider(b);
  if (erreur) return res.status(400).json({ erreur });

  const r = await pool.query(
    "UPDATE automates SET nom = ?, adresse_ip = ?, port = ?, unit_id = ?, description = ? WHERE id = ?",
    [...champs(b), req.params.id]
  );
  if (r.affectedRows === 0) return res.status(404).json({ erreur: "Automate introuvable" });
  await synchroniser(); // l'IP a pu changer : on met à jour les lectures
  res.json({ message: "Automate modifié" });
});

router.delete("/:id", async (req, res) => {
  const r = await pool.query("DELETE FROM automates WHERE id = ?", [req.params.id]);
  if (r.affectedRows === 0) return res.status(404).json({ erreur: "Automate introuvable" });
  await synchroniser(); // ses variables ont été supprimées en cascade
  res.json({ message: "Automate supprimé" });
});

module.exports = router;