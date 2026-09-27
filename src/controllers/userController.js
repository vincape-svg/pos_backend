const bcrypt = require("bcrypt");
const db = require("../config/database");

// =========================
// CREATE USER
// =========================
const createUser = async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required"
      });
    }

    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ID diambil dari TOKEN
    const createdBy = req.user.id;

    await db.query(
      `INSERT INTO users
      (username, email, password, status, created_at, created_by)
      VALUES (?, ?, ?, 1, NOW(), ?)`,
      [username, email, hashedPassword, createdBy]
    );

    return res.status(201).json({
      message: "User berhasil dibuat"
    });

  } catch (error) {
    console.error("CREATE USER ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// GET ALL USERS
// =========================
const getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT
        id,
        username,
        email,
        profile_photo,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM users
      WHERE status = 1`
    );

    return res.status(200).json({
      message: "Data user berhasil diambil",
      data: users
    });

  } catch (error) {
    console.error("GET USERS ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// GET USER BY ID
// =========================
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      `SELECT
        id,
        username,
        email,
        profile_photo,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM users
      WHERE id = ? AND status = 1`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    return res.status(200).json({
      message: "Data user berhasil diambil",
      data: users[0]
    });

  } catch (error) {
    console.error("GET USER ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// UPDATE USER
// =========================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body || {};

    if (!username || !email) {
      return res.status(400).json({
        message: "Username and email are required"
      });
    }

    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? AND status = 1",
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    const [emailCheck] = await db.query(
      `SELECT id FROM users
       WHERE email = ?
       AND id != ?
       AND status = 1`,
      [email, id]
    );

    if (emailCheck.length > 0) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }

    // ID dari TOKEN
    const updatedBy = req.user.id;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await db.query(
        `UPDATE users
        SET username = ?,
            email = ?,
            password = ?,
            updated_at = NOW(),
            updated_by = ?
        WHERE id = ? AND status = 1`,
        [username, email, hashedPassword, updatedBy, id]
      );

    } else {

      await db.query(
        `UPDATE users
        SET username = ?,
            email = ?,
            updated_at = NOW(),
            updated_by = ?
        WHERE id = ? AND status = 1`,
        [username, email, updatedBy, id]
      );
    }

    return res.status(200).json({
      message: "User berhasil diupdate"
    });

  } catch (error) {
    console.error("UPDATE USER ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// DELETE USER - SOFT DELETE
// =========================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? AND status = 1",
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    // ID dari TOKEN
    const deletedBy = req.user.id;

    await db.query(
      `UPDATE users
      SET status = 0,
          deleted_at = NOW(),
          deleted_by = ?
      WHERE id = ?`,
      [deletedBy, id]
    );

    return res.status(200).json({
      message: "User berhasil dihapus"
    });

  } catch (error) {
    console.error("DELETE USER ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
};