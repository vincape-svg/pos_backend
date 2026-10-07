const mysql = require("mysql2/promise");

// =====================================================
// Konfigurasi koneksi MySQL.
// Semua nilai diambil dari environment variable
// (agar aman untuk production dan multi-environment).
//
// Untuk lokal (MariaDB/MySQL biasa):
//   DB_HOST=localhost
//   DB_PORT=3306
//   DB_USER=root
//   DB_PASSWORD=
//   DB_NAME=pos_db
//
// Untuk Aiven (production, wajib SSL):
//   DB_HOST=<host>.mysql.aivencloud.com
//   DB_PORT=<port>
//   DB_USER=avnadmin
//   DB_PASSWORD=<password>
//   DB_NAME=pos_db
//   DB_SSL_REJECT_UNAUTHORIZED=true
// =====================================================

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Aiven / database hosted membutuhkan SSL.
  // Setel DB_SSL_REJECT_UNAUTHORIZED=true untuk production Aiven.
  ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true"
    ? { rejectUnauthorized: false }
    : undefined
});

module.exports = db;

module.exports = db;