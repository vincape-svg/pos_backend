const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

// =========================
// REGISTER
// =========================
const register = async (req, res) => {
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

    // User baru otomatis menjadi customer
    const [customerRole] = await db.query(
      "SELECT id FROM roles WHERE name = 'customer' AND status = 1 LIMIT 1"
    );

    if (customerRole.length === 0) {
      return res.status(500).json({
        message: "Role customer tidak ditemukan"
      });
    }

    const roleId = customerRole[0].id;

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    await db.query(
      `INSERT INTO users
      (
        username,
        email,
        password,
        role_id,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, 1, NOW())`,
      [
        username,
        email,
        hashedPassword,
        roleId
      ]
    );

    return res.status(201).json({
      message: "Register berhasil"
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// LOGIN
// =========================
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const [users] = await db.query(
      `SELECT
        users.id,
        users.username,
        users.email,
        users.password,
        users.role_id,
        roles.name AS role_name
      FROM users
      LEFT JOIN roles
        ON users.role_id = roles.id
      WHERE users.email = ?
        AND users.status = 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Email or password is incorrect"
      });
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Email or password is incorrect"
      });
    }

    if (!user.role_id || !user.role_name) {
      return res.status(403).json({
        message: "User belum memiliki role"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role: user.role_name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    return res.status(200).json({
      message: "Login berhasil",
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role: user.role_name
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =========================
// PROFILE
// =========================
const profile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.query(
      `SELECT
        users.id,
        users.username,
        users.email,
        users.profile_photo,
        users.role_id,
        roles.name AS role_name,
        users.status,
        users.created_at,
        users.created_by,
        users.updated_at,
        users.updated_by
      FROM users
      LEFT JOIN roles
        ON users.role_id = roles.id
      WHERE users.id = ?
        AND users.status = 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    return res.status(200).json({
      message: "Profile berhasil diambil",
      data: users[0]
    });

  } catch (error) {
    console.error("PROFILE ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


module.exports = {
  register,
  login,
  profile
};