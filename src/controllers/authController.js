const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const mailer = require("../config/mailer");

// =====================================================
// REGISTER
// =====================================================
const register = async (req, res) => {
  try {
    const {
      username,
      email,
      phone,
      password
    } = req.body || {};

    if (!username || !email || !phone || !password) {
      return res.status(400).json({
        message:
          "Username, email, phone, and password are required"
      });
    }

    const [existingEmail] = await db.query(
      `SELECT id
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }

    const [existingPhone] = await db.query(
      `SELECT id
       FROM users
       WHERE phone = ?`,
      [phone]
    );

    if (existingPhone.length > 0) {
      return res.status(409).json({
        message: "Phone number already exists"
      });
    }

    const [customerRole] = await db.query(
      `SELECT id
       FROM roles
       WHERE name = 'customer'
         AND status = 1
       LIMIT 1`
    );

    if (customerRole.length === 0) {
      return res.status(500).json({
        message: "Role customer tidak ditemukan"
      });
    }

    const roleId = customerRole[0].id;

    const hashedPassword =
      await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users
      (
        username,
        email,
        phone,
        password,
        role_id,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [
        username,
        email,
        phone,
        hashedPassword,
        roleId
      ]
    );

    return res.status(201).json({
      message: "Register berhasil"
    });

  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =====================================================
// LOGIN
// Email ATAU nomor telepon
// =====================================================
const login = async (req, res) => {
  try {
    const {
      login,
      password
    } = req.body || {};

    console.log("=== LOGIN DEBUG ===");
    console.log("LOGIN:", login);
    console.log(
      "PASSWORD:",
      password ? "[ADA]" : "[KOSONG]"
    );

    if (!login || !password) {
      console.log(
        "LOGIN GAGAL: input kosong"
      );

      return res.status(400).json({
        message:
          "Email/phone and password are required"
      });
    }

    const [users] = await db.query(
      `SELECT
        users.id,
        users.username,
        users.email,
        users.phone,
        users.password,
        users.role_id,
        roles.name AS role_name
      FROM users
      LEFT JOIN roles
        ON users.role_id = roles.id
      WHERE
        (users.email = ? OR users.phone = ?)
        AND users.status = 1`,
      [
        login,
        login
      ]
    );

    console.log(
      "USER DITEMUKAN:",
      users.length
    );

    if (users.length === 0) {
      console.log(
        "LOGIN GAGAL: user tidak ditemukan"
      );

      return res.status(401).json({
        message:
          "Email/phone or password is incorrect"
      });
    }

    const user = users[0];

    console.log(
      "USER ID:",
      user.id
    );

    console.log(
      "USERNAME:",
      user.username
    );

    console.log(
      "ROLE:",
      user.role_name
    );

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    console.log(
      "PASSWORD MATCH:",
      passwordMatch
    );

    if (!passwordMatch) {
      console.log(
        "LOGIN GAGAL: password salah"
      );

      return res.status(401).json({
        message:
          "Email/phone or password is incorrect"
      });
    }

    if (
      !user.role_id ||
      !user.role_name
    ) {
      console.log(
        "LOGIN GAGAL: role tidak ditemukan"
      );

      return res.status(403).json({
        message:
          "User belum memiliki role"
      });
    }

    console.log(
      "JWT_SECRET:",
      process.env.JWT_SECRET
        ? "ADA"
        : "KOSONG"
    );

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role: user.role_name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    console.log(
      "LOGIN BERHASIL"
    );

    console.log(
      "==================="
    );

    return res.status(200).json({
      message: "Login berhasil",

      token,

      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role: user.role_name
      }
    });

  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    console.log(
      "==================="
    );

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =====================================================
// PROFILE
// =====================================================
const profile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.query(
      `SELECT
        users.id,
        users.username,
        users.email,
        users.phone,
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
        message:
          "User tidak ditemukan"
      });
    }

    return res.status(200).json({
      message:
        "Profile berhasil diambil",
      data: users[0]
    });

  } catch (error) {
    console.error(
      "PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};


// =====================================================
// FORGOT PASSWORD
// OTP VIA EMAIL
//
// RULE:
// - Maksimal 3 request OTP dalam 1 hari
// - Setelah request ke-3, cooldown 15 menit
// - OTP berlaku 10 menit
// =====================================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const [users] = await db.query(
      `SELECT
        id,
        username,
        email
      FROM users
      WHERE email = ?
        AND status = 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message:
          "Email tidak ditemukan"
      });
    }

    const user = users[0];

    const [todayRequests] = await db.query(
      `SELECT
        id,
        created_at
      FROM password_resets
      WHERE user_id = ?
        AND DATE(created_at) = CURDATE()
      ORDER BY id DESC`,
      [user.id]
    );

    if (todayRequests.length >= 3) {
      const lastRequest =
        todayRequests[0];

      const [cooldown] = await db.query(
        `SELECT
          TIMESTAMPDIFF(
            MINUTE,
            created_at,
            NOW()
          ) AS minutes_passed
        FROM password_resets
        WHERE id = ?`,
        [lastRequest.id]
      );

      const minutesPassed =
        cooldown[0].minutes_passed;

      if (minutesPassed < 15) {
        const remaining =
          15 - minutesPassed;

        return res.status(429).json({
          message:
            `Terlalu banyak request OTP. Coba lagi dalam ${remaining} menit.`,
          cooldown_minutes:
            remaining
        });
      }
    }

    const otp = Math.floor(
      100000 +
      Math.random() * 900000
    ).toString();

    await db.query(
      `UPDATE password_resets
       SET used_at = NOW()
       WHERE user_id = ?
         AND used_at IS NULL`,
      [user.id]
    );

    await db.query(
      `INSERT INTO password_resets
      (
        user_id,
        otp,
        expires_at,
        created_at
      )
      VALUES
      (
        ?,
        ?,
        DATE_ADD(
          NOW(),
          INTERVAL 10 MINUTE
        ),
        NOW()
      )`,
      [
        user.id,
        otp
      ]
    );

    await mailer.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject:
        "OTP Reset Password POS",

      text: `Halo ${user.username},

Kode OTP untuk reset password Anda adalah:

${otp}

Kode OTP ini berlaku selama 10 menit.

Jika Anda tidak meminta reset password, abaikan email ini.`
    });

    return res.status(200).json({
      message:
        "OTP berhasil dikirim ke email"
    });

  } catch (error) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Gagal mengirim OTP"
    });
  }
};


// =====================================================
// VERIFY OTP
// =====================================================
const verifyOtp = async (req, res) => {
  try {
    const {
      email,
      otp
    } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({
        message:
          "Email and OTP are required"
      });
    }

    const [users] = await db.query(
      `SELECT id
       FROM users
       WHERE email = ?
         AND status = 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message:
          "Email tidak ditemukan"
      });
    }

    const userId = users[0].id;

    const [resets] = await db.query(
      `SELECT
        id
       FROM password_resets
       WHERE user_id = ?
         AND otp = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [
        userId,
        otp
      ]
    );

    if (resets.length === 0) {
      return res.status(400).json({
        message:
          "OTP tidak valid atau sudah expired"
      });
    }

    return res.status(200).json({
      message: "OTP valid",
      reset_id:
        resets[0].id
    });

  } catch (error) {
    console.error(
      "VERIFY OTP ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Gagal memverifikasi OTP"
    });
  }
};


// =====================================================
// RESET PASSWORD
// =====================================================
const resetPassword = async (req, res) => {
  try {
    const {
      email,
      otp,
      password
    } = req.body || {};

    if (!email || !otp || !password) {
      return res.status(400).json({
        message:
          "Email, OTP, and password are required"
      });
    }

    const [users] = await db.query(
      `SELECT id
       FROM users
       WHERE email = ?
         AND status = 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message:
          "Email tidak ditemukan"
      });
    }

    const userId = users[0].id;

    const [resets] = await db.query(
      `SELECT
        id
       FROM password_resets
       WHERE user_id = ?
         AND otp = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [
        userId,
        otp
      ]
    );

    if (resets.length === 0) {
      return res.status(400).json({
        message:
          "OTP tidak valid atau sudah expired"
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    await db.query(
      `UPDATE users
       SET
         password = ?,
         updated_at = NOW()
       WHERE id = ?
         AND status = 1`,
      [
        hashedPassword,
        userId
      ]
    );

    await db.query(
      `UPDATE password_resets
       SET used_at = NOW()
       WHERE id = ?`,
      [
        resets[0].id
      ]
    );

    return res.status(200).json({
      message:
        "Password berhasil direset"
    });

  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Gagal mereset password"
    });
  }
};


// =====================================================
// EXPORT
// =====================================================
module.exports = {
  register,
  login,
  profile,
  forgotPassword,
  verifyOtp,
  resetPassword
};