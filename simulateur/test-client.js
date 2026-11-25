/**
 * Client Modbus de test : lit les 2 registres du simulateur et applique les facteurs d'échelle.
 * C'est exactement la logique que le backend utilisera.
 */
const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

async function main() {
  try {
    await client.connectTCP("127.0.0.1", { port: 502 }); // 1. ouverture de la connexion TCP
    client.setID(1);                                     // 2. unit ID visé
    client.setTimeout(2000);                             // 3. abandon si pas de réponse en 2 s

    const reponse = await client.readHoldingRegisters(0, 2); // 4. fonction 03 : 2 registres dès l'adresse 0
    const [tempBrute, pressionBrute] = reponse.data;

    console.log(`Valeurs brutes : ${tempBrute}, ${pressionBrute}`);
    console.log(`Température : ${(tempBrute * 0.1).toFixed(1)} °C`);
    console.log(`Pression    : ${(pressionBrute * 0.01).toFixed(2)} bar`);
  } catch (err) {
    console.error("❌ Lecture impossible :", err.message);
  } finally {
    client.close(() => {});                              // 5. on ferme toujours la connexion
  }
}

main();