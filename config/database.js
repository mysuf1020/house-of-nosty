const mysql = require('mysql2');

// Konfigurasi koneksi MySQL (XAMPP)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // Default XAMPP tidak ada password
    database: 'db_nosty_gacoan',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise wrapper untuk async/await
const promisePool = pool.promise();

module.exports = promisePool;
