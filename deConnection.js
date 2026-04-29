const mysql = require('mysql2'); // [cite: 228]

// Création du pool de connexion [cite: 229]
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root', // Le mot de passe défini dans ta commande Docker [cite: 234]
    database: 'stock_service', // [cite: 233]
    port: 3306 // Port par défaut [cite: 235]
});

// Exportation en version Promise pour utiliser .then() ou async/await [cite: 237, 238]
module.exports = pool.promise();