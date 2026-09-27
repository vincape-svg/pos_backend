const db = require("../config/database");

// =========================
// CREATE CATEGORY
// =========================
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body || {};

    if (!name) {
      return res.status(400).json({
        message: "Name is required"
      });
    }

    const [existingCategory] = await db.query(
      "SELECT id FROM categories WHERE name = ? AND status = 1",
      [name]
    );

    if (existingCategory.length > 0) {
      return res.status(409).json({
        message: "Category already exists"
      });
    }

    const createdBy = req.user.id;

    await db.query(
      `INSERT INTO categories
      (name, description, status, created_at, created_by)
      VALUES (?, ?, 1, NOW(), ?)`,
      [name, description || null, createdBy]
    );

    return res.status(201).json({
      message: "Category berhasil dibuat"
    });

  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// GET ALL CATEGORIES
// =========================
const getCategories = async (req, res) => {
  try {
    const [categories] = await db.query(
      `SELECT
        id,
        name,
        description,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM categories
      WHERE status = 1`
    );

    return res.status(200).json({
      message: "Data category berhasil diambil",
      data: categories
    });

  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// GET CATEGORY BY ID
// =========================
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [categories] = await db.query(
      `SELECT
        id,
        name,
        description,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM categories
      WHERE id = ? AND status = 1`,
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        message: "Category tidak ditemukan"
      });
    }

    return res.status(200).json({
      message: "Data category berhasil diambil",
      data: categories[0]
    });

  } catch (error) {
    console.error("GET CATEGORY ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// UPDATE CATEGORY
// =========================
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body || {};

    if (!name) {
      return res.status(400).json({
        message: "Name is required"
      });
    }

    const [category] = await db.query(
      "SELECT id FROM categories WHERE id = ? AND status = 1",
      [id]
    );

    if (category.length === 0) {
      return res.status(404).json({
        message: "Category tidak ditemukan"
      });
    }

    const [nameCheck] = await db.query(
      `SELECT id FROM categories
       WHERE name = ?
       AND id != ?
       AND status = 1`,
      [name, id]
    );

    if (nameCheck.length > 0) {
      return res.status(409).json({
        message: "Category already exists"
      });
    }

    const updatedBy = req.user.id;

    await db.query(
      `UPDATE categories
       SET name = ?,
           description = ?,
           updated_at = NOW(),
           updated_by = ?
       WHERE id = ? AND status = 1`,
      [name, description || null, updatedBy, id]
    );

    return res.status(200).json({
      message: "Category berhasil diupdate"
    });

  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// DELETE CATEGORY - SOFT DELETE
// =========================
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [category] = await db.query(
      "SELECT id FROM categories WHERE id = ? AND status = 1",
      [id]
    );

    if (category.length === 0) {
      return res.status(404).json({
        message: "Category tidak ditemukan"
      });
    }

    const deletedBy = req.user.id;

    await db.query(
      `UPDATE categories
       SET status = 0,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?`,
      [deletedBy, id]
    );

    return res.status(200).json({
      message: "Category berhasil dihapus"
    });

  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};