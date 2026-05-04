const mysql = require('mysql2'); // CETTE LIGNE EST INDISPENSABLE 

const pool = mysql.createPool({
    host: 'mysqlservice', // Nom du service défini dans docker-compose [cite: 382]
    user: 'root',
    password: 'root',
    database: 'stock_service',
    port: 3306
});

// On exporte la version promise comme demandé [cite: 237-238]
module.exports = pool.promise();