/**
 * NextGenKPI - Point d'entrée du backend
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const poller = require("./services/poller");

const app = express();
const PORT = Number(process.env.BACKEND_PORT) || 3000;

app.use(cors());          // autorise le frontend à appeler l'API
app.use(express.json());  // lit le JSON envoyé dans les requêtes (req.body)

// Santé : vérifie que l'API et la base répondent
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ statut: "ok", baseDeDonnees: "connectée" });
  } catch (err) {
    res.status(503).json({ statut: "erreur", baseDeDonnees: err.message });
  }
});

app.use("/api/automates", require("./routes/automates"));
app.use("/api/variables", require("./routes/variables"));
app.use("/api/mesures", require("./routes/mesures"));

// Gestionnaire d'erreurs central : traduit les erreurs SQL en réponses claires
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ erreur: "JSON invalide" });
  }
  const erreursClient = {
    ER_DUP_ENTRY: [409, "Cet élément existe déjà"],
    ER_NO_REFERENCED_ROW_2: [400, "L'automate indiqué n'existe pas"],
    ER_CONSTRAINT_FAILED: [400, "Valeur hors limites (ex : fréquence inférieure à 1 s)"],
    WARN_DATA_TRUNCATED: [400, "Valeur invalide pour un champ (type, registre...)"],
    ER_BAD_NULL_ERROR: [400, "Un champ obligatoire est vide"],
    ER_WARN_DATA_OUT_OF_RANGE: [400, "Valeur numérique hors limites"],
  };
  const connue = erreursClient[err.code];
  if (connue) return res.status(connue[0]).json({ erreur: connue[1] });

  console.error("Erreur :", err);
  res.status(500).json({ erreur: "Erreur interne du serveur" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ API NextGenKPI démarrée sur http://localhost:${PORT}`);
  poller.demarrer();
});