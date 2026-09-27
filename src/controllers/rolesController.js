const db = require("../config/database");

// GET ALL ROLES
const getRoles = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name,
        description,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM roles
      WHERE status = 1
      ORDER BY id ASC
    `);

    res.status(200).json({
      message: "Data role berhasil diambil",
      data: rows,
    });
  } catch (error) {
    console.error("GET ROLES ERROR:", error);

    res.status(500).json({
      message: "Gagal mengambil data role",
      error: error.message,
    });
  }
};

// GET ROLE BY ID
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        description,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM roles
      WHERE id = ? AND status = 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Role tidak ditemukan",
      });
    }

    res.status(200).json({
      message: "Data role berhasil diambil",
      data: rows[0],
    });
  } catch (error) {
    console.error("GET ROLE BY ID ERROR:", error);

    res.status(500).json({
      message: "Gagal mengambil data role",
      error: error.message,
    });
  }
};

// CREATE ROLE
const createRole = async (req, res) => {
  try {
    const { name, description } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Nama role wajib diisi",
      });
    }

    const [existingRole] = await db.query(
      `
      SELECT id
      FROM roles
      WHERE name = ?
      `,
      [name.trim()]
    );

    if (existingRole.length > 0) {
      return res.status(400).json({
        message: "Nama role sudah digunakan",
      });
    }

    const userId = req.user?.id || null;

    const [result] = await db.query(
      `
      INSERT INTO roles
      (
        name,
        description,
        created_at,
        created_by,
        status
      )
      VALUES (?, ?, NOW(), ?, 1)
      `,
      [
        name.trim(),
        description?.trim() || null,
        userId,
      ]
    );

    res.status(201).json({
      message: "Role berhasil dibuat",
      data: {
        id: result.insertId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });
  } catch (error) {
    console.error("CREATE ROLE ERROR:", error);

    res.status(500).json({
      message: "Gagal membuat role",
      error: error.message,
    });
  }
};

// UPDATE ROLE
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Nama role wajib diisi",
      });
    }

    const [role] = await db.query(
      `
      SELECT id
      FROM roles
      WHERE id = ? AND status = 1
      `,
      [id]
    );

    if (role.length === 0) {
      return res.status(404).json({
        message: "Role tidak ditemukan",
      });
    }

    const [duplicate] = await db.query(
      `
      SELECT id
      FROM roles
      WHERE name = ?
      AND id != ?
      `,
      [name.trim(), id]
    );

    if (duplicate.length > 0) {
      return res.status(400).json({
        message: "Nama role sudah digunakan",
      });
    }

    const userId = req.user?.id || null;

    await db.query(
      `
      UPDATE roles
      SET
        name = ?,
        description = ?,
        updated_at = NOW(),
        updated_by = ?
      WHERE id = ?
      `,
      [
        name.trim(),
        description?.trim() || null,
        userId,
        id,
      ]
    );

    res.status(200).json({
      message: "Role berhasil diubah",
    });
  } catch (error) {
    console.error("UPDATE ROLE ERROR:", error);

    res.status(500).json({
      message: "Gagal mengubah role",
      error: error.message,
    });
  }
};

// DELETE ROLE / SOFT DELETE
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const [role] = await db.query(
      `
      SELECT id, name
      FROM roles
      WHERE id = ? AND status = 1
      `,
      [id]
    );

    if (role.length === 0) {
      return res.status(404).json({
        message: "Role tidak ditemukan",
      });
    }

    const userId = req.user?.id || null;

    await db.query(
      `
      UPDATE roles
      SET
        status = 0,
        deleted_at = NOW(),
        deleted_by = ?
      WHERE id = ?
      `,
      [userId, id]
    );

    res.status(200).json({
      message: "Role berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE ROLE ERROR:", error);

    res.status(500).json({
      message: "Gagal menghapus role",
      error: error.message,
    });
  }
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};