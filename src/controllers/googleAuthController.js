"use strict";

// =====================================================
// GOOGLE LOGIN (Firebase Authentication)
// POST /api/auth/google
// Header: Authorization: Bearer <Firebase ID Token>
//
// ALUR:
// 1. Ambil Firebase ID Token dari Authorization header.
// 2. Verifikasi via Firebase Admin SDK (JANGAN percaya
//    email mentah dari frontend).
// 3. Wajib: email + email_verified dari token.
// 4. Cari user MySQL berdasarkan email (UNIQUE).
//    - Ada (status=1)  -> pakai user existing apa adanya
//                        (password & role TIDAK diubah).
//    - Tidak ada       -> buat user baru role customer.
// 5. Terbitkan JWT POS dengan mekanisme yang SAMA dengan
//    login biasa (payload, JWT_SECRET, expiresIn 1d).
// 6. Respons kompatibel login biasa: { message, token, user }.
//
// TIDAK MENYENTUH: login biasa, authMiddleware, OTP,
// forgot/reset password, tabel existing.
// =====================================================

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const firebase = require("../config/firebase");

const findUserWithRole = async (userId) => {
  const [users] = await db.query(
    `SELECT
       users.id,
       users.username,
       users.email,
       users.phone,
       users.profile_photo,
       users.role_id,
       roles.name AS role_name
     FROM users
     LEFT JOIN roles
       ON users.role_id = roles.id
     WHERE users.id = ?
       AND users.status = 1`,
    [userId]
  );

  return users.length > 0 ? users[0] : null;
};

const issuePosToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role_id: user.role_id,
      role: user.role_name,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  role_id: user.role_id,
  role: user.role_name,
});

const googleLogin = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Token tidak ditemukan",
      });
    }

    const idToken = authHeader.split(" ")[1];

    if (!idToken) {
      return res.status(401).json({
        message: "Token tidak valid",
      });
    }

    // Verifikasi Firebase ID Token (server-side).
    let decoded;

    try {
      decoded = await firebase
        .getAuth()
        .verifyIdToken(idToken);
    } catch (verifyError) {
      if (
        verifyError.code === "FIREBASE_NOT_CONFIGURED"
      ) {
        return res.status(503).json({
          message:
            "Login Google belum dikonfigurasi. Hubungi administrator.",
        });
      }

      return res.status(401).json({
        message: "Token Google tidak valid",
      });
    }

    const email = decoded.email || null;
    const emailVerified = decoded.email_verified === true;

    // Matching tahap pertama memakai email (kolom UNIQUE).
    // Hanya email terverifikasi Google yang diterima agar
    // akun orang lain tidak bisa diklaim via email palsu.
    if (!email || !emailVerified) {
      return res.status(403).json({
        message:
          "Email Google belum terverifikasi",
      });
    }

    const [existing] = await db.query(
      `SELECT id, status
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    let userId;

    if (existing.length > 0) {
      if (existing[0].status !== 1) {
        return res.status(403).json({
          message: "Akun tidak aktif",
        });
      }

      // User existing: pakai apa adanya.
      userId = existing[0].id;
    } else {
      const [customerRole] = await db.query(
        `SELECT id
         FROM roles
         WHERE name = 'customer'
           AND status = 1
         LIMIT 1`
      );

      if (customerRole.length === 0) {
        return res.status(500).json({
          message: "Role customer tidak ditemukan",
        });
      }

      const displayName =
        (decoded.name || "").trim() ||
        email.split("@")[0];

      // Password acak yang tidak bisa ditebak — hanya
      // pengisi kolom NOT NULL. Login password tetap
      // lewat bcrypt seperti biasa.
      const randomPassword = crypto
        .randomBytes(32)
        .toString("hex");

      const hashedPassword = await bcrypt.hash(
        randomPassword,
        10
      );

      const [inserted] = await db.query(
        `INSERT INTO users
         (
           username,
           email,
           phone,
           password,
           profile_photo,
           role_id,
           status,
           created_at
         )
         VALUES (?, ?, NULL, ?, ?, ?, 1, NOW())`,
        [
          displayName.slice(0, 100),
          email,
          hashedPassword,
          decoded.picture || null,
          customerRole[0].id,
        ]
      );

      userId = inserted.insertId;
    }

    const user = await findUserWithRole(userId);

    if (!user || !user.role_id || !user.role_name) {
      return res.status(403).json({
        message: "User belum memiliki role",
      });
    }

    const token = issuePosToken(user);

    return res.status(200).json({
      message: "Login berhasil",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  googleLogin,
};
