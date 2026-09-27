require("dotenv").config();

const app = require("./src/app");
const db = require("./src/config/database");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Cek koneksi MySQL
    await db.query("SELECT 1");

    console.log("MySQL terhubung");

    // Jalankan server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("MySQL gagal terhubung:", error.message);
  }
}

startServer();