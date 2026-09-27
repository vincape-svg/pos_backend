const db = require("../config/database");

// =========================
// CREATE TAX
// =========================
const createTax = async (req, res) => {
  try {
    const { name, rate } = req.body || {};

    if (!name || rate === undefined) {
      return res.status(400).json({
        message: "Name and rate are required"
      });
    }

    const [existingTax] = await db.query(
      "SELECT id FROM ms_taxes WHERE name = ? AND status = 1",
      [name]
    );

    if (existingTax.length > 0) {
      return res.status(409).json({
        message: "Tax already exists"
      });
    }

    const createdBy = req.user.id;

    await db.query(
      `INSERT INTO ms_taxes
      (name, rate, status, created_at, created_by)
      VALUES (?, ?, 1, NOW(), ?)`,
      [name, rate, createdBy]
    );

    return res.status(201).json({
      message: "Tax berhasil dibuat"
    });

  } catch (error) {
    console.error("CREATE TAX ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// GET ALL TAXES
// =========================
const getTaxes = async (req, res) => {
  try {
    const [taxes] = await db.query(
      `SELECT
        id,
        name,
        rate,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM ms_taxes
      WHERE status = 1`
    );

    return res.status(200).json({
      message: "Data tax berhasil diambil",
      data: taxes
    });

  } catch (error) {
    console.error("GET TAXES ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// GET TAX BY ID
// =========================
const getTaxById = async (req, res) => {
  try {
    const { id } = req.params;

    const [taxes] = await db.query(
      `SELECT
        id,
        name,
        rate,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM ms_taxes
      WHERE id = ? AND status = 1`,
      [id]
    );

    if (taxes.length === 0) {
      return res.status(404).json({
        message: "Tax tidak ditemukan"
      });
    }

    return res.status(200).json({
      message: "Data tax berhasil diambil",
      data: taxes[0]
    });

  } catch (error) {
    console.error("GET TAX ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// UPDATE TAX
// =========================
const updateTax = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rate } = req.body || {};

    if (!name || rate === undefined) {
      return res.status(400).json({
        message: "Name and rate are required"
      });
    }

    const [tax] = await db.query(
      "SELECT id FROM ms_taxes WHERE id = ? AND status = 1",
      [id]
    );

    if (tax.length === 0) {
      return res.status(404).json({
        message: "Tax tidak ditemukan"
      });
    }

    const [nameCheck] = await db.query(
      `SELECT id FROM ms_taxes
       WHERE name = ?
       AND id != ?
       AND status = 1`,
      [name, id]
    );

    if (nameCheck.length > 0) {
      return res.status(409).json({
        message: "Tax already exists"
      });
    }

    const updatedBy = req.user.id;

    await db.query(
      `UPDATE ms_taxes
       SET name = ?,
           rate = ?,
           updated_at = NOW(),
           updated_by = ?
       WHERE id = ? AND status = 1`,
      [name, rate, updatedBy, id]
    );

    return res.status(200).json({
      message: "Tax berhasil diupdate"
    });

  } catch (error) {
    console.error("UPDATE TAX ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// DELETE TAX - SOFT DELETE
// =========================
const deleteTax = async (req, res) => {
  try {
    const { id } = req.params;

    const [tax] = await db.query(
      "SELECT id FROM ms_taxes WHERE id = ? AND status = 1",
      [id]
    );

    if (tax.length === 0) {
      return res.status(404).json({
        message: "Tax tidak ditemukan"
      });
    }

    const deletedBy = req.user.id;

    await db.query(
      `UPDATE ms_taxes
       SET status = 0,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?`,
      [deletedBy, id]
    );

    return res.status(200).json({
      message: "Tax berhasil dihapus"
    });

  } catch (error) {
    console.error("DELETE TAX ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


module.exports = {
  createTax,
  getTaxes,
  getTaxById,
  updateTax,
  deleteTax
};