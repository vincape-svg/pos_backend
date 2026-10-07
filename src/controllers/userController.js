const bcrypt = require("bcrypt");
const db = require("../config/database");

// =========================
// CREATE USER
// =========================
const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      phone,
      password,
      role_id
    } = req.body || {};

    if (
      !username ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        message:
          "Username, email, phone, and password are required"
      });
    }

    if (!role_id) {
      return res.status(400).json({
        message: "Role wajib dipilih"
      });
    }

    // =========================
    // CHECK EMAIL
    // =========================

    const [existingEmail] = await db.query(
      `SELECT id
       FROM users
       WHERE email = ?
       AND status = 1`,
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }

    // =========================
    // CHECK PHONE
    // =========================

    const [existingPhone] = await db.query(
      `SELECT id
       FROM users
       WHERE phone = ?
       AND status = 1`,
      [phone]
    );

    if (existingPhone.length > 0) {
      return res.status(409).json({
        message: "Nomor telepon sudah digunakan"
      });
    }

    // =========================
    // CHECK ROLE
    // =========================

    const [roles] = await db.query(
      `SELECT id
       FROM roles
       WHERE id = ?`,
      [role_id]
    );

    if (roles.length === 0) {
      return res.status(400).json({
        message: "Role tidak ditemukan"
      });
    }

    // =========================
    // HASH PASSWORD
    // =========================

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // ID dari TOKEN
    const createdBy = req.user.id;

    // =========================
    // INSERT USER
    // =========================

    await db.query(
      `INSERT INTO users
      (
        username,
        email,
        phone,
        password,
        role_id,
        status,
        created_at,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)`,
      [
        username,
        email,
        phone,
        hashedPassword,
        role_id,
        createdBy
      ]
    );

    return res.status(201).json({
      message: "User berhasil dibuat"
    });

  } catch (error) {
    console.error(
      "CREATE USER ERROR:",
      error
    );

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
        u.id,
        u.username,
        u.email,
        u.phone,
        u.profile_photo,
        u.role_id,
        r.name AS role,
        u.status,
        u.created_at,
        u.created_by,
        u.updated_at,
        u.updated_by
      FROM users u
      LEFT JOIN roles r
        ON u.role_id = r.id
      WHERE u.status = 1
      ORDER BY u.id DESC`
    );

    return res.status(200).json({
      message: "Data user berhasil diambil",
      data: users
    });

  } catch (error) {
    console.error(
      "GET USERS ERROR:",
      error
    );

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
        u.id,
        u.username,
        u.email,
        u.phone,
        u.profile_photo,
        u.role_id,
        r.name AS role,
        u.status,
        u.created_at,
        u.created_by,
        u.updated_at,
        u.updated_by
      FROM users u
      LEFT JOIN roles r
        ON u.role_id = r.id
      WHERE u.id = ?
      AND u.status = 1`,
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
    console.error(
      "GET USER ERROR:",
      error
    );

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

    const {
      username,
      email,
      phone,
      password,
      role_id
    } = req.body || {};

    if (
      !username ||
      !email ||
      !phone
    ) {
      return res.status(400).json({
        message:
          "Username, email, and phone are required"
      });
    }

    if (!role_id) {
      return res.status(400).json({
        message: "Role wajib dipilih"
      });
    }

    // =========================
    // CHECK USER
    // =========================

    const [users] = await db.query(
      `SELECT id
       FROM users
       WHERE id = ?
       AND status = 1`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    // =========================
    // CHECK EMAIL
    // =========================

    const [emailCheck] = await db.query(
      `SELECT id
       FROM users
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

    // =========================
    // CHECK PHONE
    // =========================

    const [phoneCheck] = await db.query(
      `SELECT id
       FROM users
       WHERE phone = ?
       AND id != ?
       AND status = 1`,
      [phone, id]
    );

    if (phoneCheck.length > 0) {
      return res.status(409).json({
        message:
          "Nomor telepon sudah digunakan"
      });
    }

    // =========================
    // CHECK ROLE
    // =========================

    const [roles] = await db.query(
      `SELECT id
       FROM roles
       WHERE id = ?`,
      [role_id]
    );

    if (roles.length === 0) {
      return res.status(400).json({
        message: "Role tidak ditemukan"
      });
    }

    // ID dari TOKEN
    const updatedBy = req.user.id;

    // =========================
    // UPDATE WITH PASSWORD
    // =========================

    if (password) {
      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      await db.query(
        `UPDATE users
        SET
          username = ?,
          email = ?,
          phone = ?,
          password = ?,
          role_id = ?,
          updated_at = NOW(),
          updated_by = ?
        WHERE id = ?
        AND status = 1`,
        [
          username,
          email,
          phone,
          hashedPassword,
          role_id,
          updatedBy,
          id
        ]
      );

    } else {

      // =========================
      // UPDATE WITHOUT PASSWORD
      // =========================

      await db.query(
        `UPDATE users
        SET
          username = ?,
          email = ?,
          phone = ?,
          role_id = ?,
          updated_at = NOW(),
          updated_by = ?
        WHERE id = ?
        AND status = 1`,
        [
          username,
          email,
          phone,
          role_id,
          updatedBy,
          id
        ]
      );
    }

    return res.status(200).json({
      message: "User berhasil diupdate"
    });

  } catch (error) {
    console.error(
      "UPDATE USER ERROR:",
      error
    );

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
      `SELECT id
       FROM users
       WHERE id = ?
       AND status = 1`,
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
      SET
        status = 0,
        deleted_at = NOW(),
        deleted_by = ?
      WHERE id = ?`,
      [deletedBy, id]
    );

    return res.status(200).json({
      message: "User berhasil dihapus"
    });

  } catch (error) {
    console.error(
      "DELETE USER ERROR:",
      error
    );

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