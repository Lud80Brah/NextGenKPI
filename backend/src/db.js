/**
 * Pool de connexions MariaDB : quelques connexions ouvertes, réutilisées par toutes les requêtes.
 */
const mariadb = require("mariadb");

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
  timezone: "Z",          // la base travaille en UTC
  bigIntAsNumber: true,   // évite les BigInt, que JSON ne sait pas convertir
  insertIdAsNumber: true,
});

module.exports = pool;