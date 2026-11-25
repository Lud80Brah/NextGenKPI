/**
 * NextGenKPI - Simulateur d'automate Modbus TCP
 * ---------------------------------------------
 * Remplace un vrai automate pendant le développement et la démo.
 * Il expose des registres dont les valeurs évoluent comme un process réel.
 *
 * Plan mémoire (holding registers) - cohérent avec database/02_seed.sql :
 *   registre 0 -> Température four, en dixièmes de °C   (1800 = 180,0 °C)
 *   registre 1 -> Pression ligne,   en centièmes de bar  (300  = 3,00 bar)
 */
const ModbusRTU = require("modbus-serial");

const PORT = Number(process.env.MODBUS_PORT) || 502; // 502 = port standard Modbus TCP
const UNIT_ID = 1;                                    // identifiant de l'esclave Modbus

// Mémoire de notre "automate" : 10 registres de 16 bits, initialisés à 0
const holdingRegisters = new Array(10).fill(0);

// --- Simulation du process : on met à jour les registres chaque seconde ---
let t = 0; // temps écoulé en secondes
setInterval(() => {
  t += 1;
  const bruit = () => Math.random() - 0.5; // petite variation aléatoire, comme un vrai capteur

  // Température : 180 °C ± 10 °C, sinusoïde lente (période 2 min) + bruit
  const temperature = 180 + 10 * Math.sin((2 * Math.PI * t) / 120) + bruit();
  // Pression : 3 bar ± 0,5 bar, sinusoïde (période 1 min) + bruit léger
  const pression = 3 + 0.5 * Math.sin((2 * Math.PI * t) / 60) + bruit() * 0.05;

  // Un registre Modbus ne contient que des ENTIERS : on applique l'échelle inverse
  holdingRegisters[0] = Math.round(temperature * 10);  // 180.3 °C -> 1803
  holdingRegisters[1] = Math.round(pression * 100);    // 3.12 bar -> 312

  if (t % 5 === 0) {
    console.log(`[t=${t}s] registres : temp=${holdingRegisters[0]}  pression=${holdingRegisters[1]}`);
  }
}, 1000);

// --- Le "vecteur" : les fonctions que la librairie appelle à chaque requête d'un client ---
const vector = {
  getHoldingRegister: (addr) => holdingRegisters[addr] ?? 0,      // fonction 03
  getInputRegister:   (addr) => holdingRegisters[addr] ?? 0,      // fonction 04
  setRegister: (addr, value) => { holdingRegisters[addr] = value; }, // écriture (fonction 06)
  getCoil: () => false,  // pas de bits simulés pour l'instant
  setCoil: () => {},
};

// "0.0.0.0" = écoute sur TOUTES les interfaces réseau du PC
// (indispensable pour que les conteneurs Docker puissent le joindre)
const serveur = new ModbusRTU.ServerTCP(vector, { host: "0.0.0.0", port: PORT, unitID: UNIT_ID });

console.log("Démarrage du simulateur Modbus TCP...");
serveur.on("initialized", () => console.log(`✅ Prêt sur le port ${PORT} (unit ID ${UNIT_ID})`));
serveur.on("socketError", (err) => console.error("Erreur socket :", err.message));