const mysql = require('mysql2');

// Konfigurasi koneksi MySQL - support Railway atau local
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQL_USER || process.env.MYSQLUSER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'db_nosty_gacoan',
    port: process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise wrapper untuk async/await
const promisePool = pool.promise();

module.exports = promisePool;
