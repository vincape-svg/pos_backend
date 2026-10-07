"use strict";

// =====================================================
// OTP Service — Forgot Password via WhatsApp / SMS
//
// - OTP dibuat dengan crypto.randomInt (cryptographically secure)
// - Yang disimpan HANYA hash SHA-256 HMAC (otp_hash), dengan
//   pepper dari env OTP_HASH_PEPPER (fallback JWT_SECRET).
// - Nilai OTP / password tidak pernah di-log.
// - Kadaluarsa 5 menit, maks 5x percobaan, cooldown kirim
//   ulang 60 detik, maks 5 request per jam per user.
// =====================================================

const crypto = require("crypto");
const db = require("../config/database");

const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_REQUESTS_PER_HOUR = 5;
const RESET_TOKEN_TTL_MINUTES = 10;

const getPepper = () =>
  process.env.OTP_HASH_PEPPER ||
  process.env.JWT_SECRET ||
  "";

// 6 digit OTP, CSPRNG
const generateOtp = () =>
  crypto.randomInt(100000, 1000000).toString();

const hashValue = (value) =>
  crypto
    .createHmac("sha256", getPepper())
    .update(String(value))
    .digest("hex");

// Token sekali pakai untuk tahap reset password (32 byte hex)
const generateResetToken = () =>
  crypto.randomBytes(32).toString("hex");

// Normalisasi nomor HP Indonesia ke format internasional 62...
// "08xx" -> "628xx", "+62.." -> "62..", spasi/tanda dihapus.
const normalizePhone = (raw) => {
  if (!raw) return "";

  let digits = String(raw).replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  }

  return digits;
};

// Cari user aktif berdasarkan email ATAU phone
// (mengikuti logika login existing).
const findActiveUser = async (identifier) => {
  const normalizedPhone = normalizePhone(identifier);

  const [users] = await db.query(
    `SELECT id, username, email, phone
     FROM users
     WHERE (email = ? OR phone = ? OR phone = ?)
       AND status = 1
     LIMIT 1`,
    [identifier, identifier, normalizedPhone]
  );

  return users.length > 0 ? users[0] : null;
};

// Hapus OTP aktif lain milik user (OTP lama tidak bisa dipakai lagi)
const invalidateActiveOtps = async (userId) => {
  await db.query(
    `UPDATE password_reset_otps
     SET used_at = NOW()
     WHERE user_id = ?
       AND used_at IS NULL`,
    [userId]
  );
};

const getLatestRequest = async (userId) => {
  const [rows] = await db.query(
    `SELECT id, created_at
     FROM password_reset_otps
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );

  return rows.length > 0 ? rows[0] : null;
};

const countRecentRequests = async (userId) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM password_reset_otps
     WHERE user_id = ?
       AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
    [userId]
  );

  return Number(rows[0].total);
};

// Ambil OTP aktif terakhir (belum dipakai & belum expired)
const getActiveOtp = async (userId) => {
  const [rows] = await db.query(
    `SELECT id, provider, provider_otp_id,
            otp_hash, expires_at, attempts
     FROM password_reset_otps
     WHERE user_id = ?
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );

  return rows.length > 0 ? rows[0] : null;
};

module.exports = {
  OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  MAX_REQUESTS_PER_HOUR,
  RESET_TOKEN_TTL_MINUTES,
  generateOtp,
  hashValue,
  generateResetToken,
  normalizePhone,
  findActiveUser,
  invalidateActiveOtps,
  getLatestRequest,
  countRecentRequests,
  getActiveOtp,
};
