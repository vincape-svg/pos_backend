"use strict";

// =====================================================
// Forgot Password via OTP (WhatsApp / SMS)
//
// Endpoint:
//   POST /api/auth/forgot-password/request  { identifier, channel }
//   POST /api/auth/forgot-password/verify   { identifier, otp }
//   POST /api/auth/forgot-password/reset    { reset_token, password, password_confirmation }
//
// CATATAN KOMPATIBILITAS:
// - Endpoint lama (/forgot-password, /verify-otp,
//   /reset-password via email) TIDAK diubah dan tetap
//   memakai tabel `password_resets`.
// - Alur baru ini memakai tabel `password_reset_otps`
//   dan TIDAK memengaruhi login / JWT / hashing existing.
// - Nilai OTP, password, dan reset token TIDAK pernah
//   di-log maupun dikembalikan di respons API.
// =====================================================

const bcrypt = require("bcrypt");
const db = require("../config/database");
const otpService = require("../services/otpService");
const otpIdService = require("../services/otpIdService");
const {
  dispatch,
  SUPPORTED_CHANNELS,
} = require("../services/channels/otpDispatcher");

// Respons generik agar tidak membocorkan
// apakah sebuah akun terdaftar atau tidak.
const GENERIC_SENT_MESSAGE =
  "Jika akun terdaftar, OTP telah dikirim. Periksa WhatsApp/SMS Anda.";

const INVALID_OTP_MESSAGE =
  "OTP tidak valid atau sudah expired";

// =====================================================
// REQUEST via OTP.ID (channel SMS).
// Baris sesi dibuat dulu agar external_id idempotent
// (pwdreset:{rowId}): retry aman, tidak dobel kirim/tagih.
// Kontrak respons ke frontend sama dengan alur lokal.
// =====================================================
const requestOtpViaOtpId = async (
  req,
  res,
  user
) => {
  const [inserted] = await db.query(
    `INSERT INTO password_reset_otps
     (user_id, channel, provider, otp_hash,
      expires_at, created_at)
     VALUES
     (?, 'sms', 'otpid', NULL,
      DATE_ADD(NOW(), INTERVAL 5 MINUTE),
      NOW())`,
    [user.id]
  );

  const resetRowId = inserted.insertId;

  try {
    let otpId;
    let expiresAt;

    try {
      const result =
        await otpIdService.requestSmsOtp({
          destination: otpService.normalizePhone(
            user.phone
          ),
          externalId: `pwdreset:${resetRowId}`,
        });

      otpId = result.otpId;
      expiresAt = result.expiresAt;
    } catch (requestError) {
      // Idempotency replay: pakai transaksi yang sudah ada.
      if (
        requestError.code ===
          "DUPLICATE_EXTERNAL_ID" &&
        requestError.existingOtpId
      ) {
        otpId = requestError.existingOtpId;
        expiresAt = null;
      } else {
        throw requestError;
      }
    }

    await db.query(
      `UPDATE password_reset_otps
       SET provider_otp_id = ?,
           expires_at = COALESCE(?, expires_at)
       WHERE id = ?`,
      [otpId, expiresAt, resetRowId]
    );

    return res.status(200).json({
      message: "OTP telah dikirim melalui SMS.",
      channel: "sms",
      expires_in_seconds:
        otpService.OTP_TTL_MINUTES * 60,
    });
  } catch (error) {
    await db.query(
      `UPDATE password_reset_otps
       SET used_at = NOW()
       WHERE id = ?`,
      [resetRowId]
    );

    if (error.code === "OTPID_NOT_CONFIGURED") {
      return res.status(503).json({
        message:
          "Layanan pengiriman OTP belum dikonfigurasi. Hubungi administrator.",
      });
    }

    return res
      .status(error.httpStatus || 502)
      .json({
        message:
          error.message ||
          "Gagal mengirim OTP. Coba lagi nanti.",
      });
  }
};

// =====================================================
// POST /forgot-password/request
// =====================================================
const requestOtp = async (req, res) => {
  try {
    const { identifier, channel } = req.body || {};

    if (!identifier) {
      return res.status(400).json({
        message: "Email atau nomor telepon wajib diisi",
      });
    }

    if (!channel || !SUPPORTED_CHANNELS.includes(channel)) {
      return res.status(400).json({
        message: "Channel OTP tidak didukung",
      });
    }

    const user = await otpService.findActiveUser(identifier);

    // Akun tidak ditemukan / tidak punya nomor tujuan:
    // tetap balas generik agar tidak bisa di-enumerasi.
    if (!user || !user.phone) {
      return res.status(200).json({
        message: GENERIC_SENT_MESSAGE,
      });
    }

    const latest = await otpService.getLatestRequest(user.id);

    if (latest && latest.created_at) {
      const [cooldown] = await db.query(
        `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW())
           AS seconds_passed
         FROM password_reset_otps
         WHERE id = ?`,
        [latest.id]
      );

      const secondsPassed = Number(
        cooldown[0].seconds_passed
      );

      if (
        secondsPassed <
        otpService.RESEND_COOLDOWN_SECONDS
      ) {
        return res.status(429).json({
          message:
            "Terlalu sering meminta OTP. Coba lagi nanti.",
          retry_after_seconds:
            otpService.RESEND_COOLDOWN_SECONDS -
            secondsPassed,
        });
      }
    }

    const recentTotal =
      await otpService.countRecentRequests(user.id);

    if (
      recentTotal >= otpService.MAX_REQUESTS_PER_HOUR
    ) {
      return res.status(429).json({
        message:
          "Terlalu banyak request OTP. Coba lagi nanti.",
      });
    }

    // OTP lama milik user langsung dinonaktifkan.
    await otpService.invalidateActiveOtps(user.id);

    // Channel SMS dialihkan ke OTP.ID bila API key tersedia.
    // WhatsApp tetap via dispatcher (Fonnte). Kode OTP
    // tidak pernah dibuat/disimpan di server ini untuk
    // baris provider 'otpid'.
    if (
      channel === "sms" &&
      process.env.OTP_ID_API_KEY
    ) {
      return requestOtpViaOtpId(req, res, user);
    }

    const otp = otpService.generateOtp();

    await db.query(
      `INSERT INTO password_reset_otps
       (user_id, channel, otp_hash, expires_at, created_at)
       VALUES
       (?, ?, ?,
        DATE_ADD(NOW(), INTERVAL 5 MINUTE),
        NOW())`,
      [user.id, channel, otpService.hashValue(otp)]
    );

    try {
      await dispatch(
        channel,
        otpService.normalizePhone(user.phone),
        `Kode OTP POS Kasir: ${otp}. Berlaku 5 menit. Jangan berikan kode ini ke siapa pun.`
      );
    } catch (sendError) {
      if (
        sendError.code === "PROVIDER_NOT_CONFIGURED"
      ) {
        return res.status(503).json({
          message:
            "Layanan pengiriman OTP belum dikonfigurasi. Hubungi administrator.",
        });
      }

      return res.status(502).json({
        message: "Gagal mengirim OTP. Coba lagi nanti.",
      });
    }

    return res.status(200).json({
      message:
        channel === "whatsapp"
          ? "OTP telah dikirim ke WhatsApp Anda."
          : "OTP telah dikirim melalui SMS.",
      channel,
      expires_in_seconds:
        otpService.OTP_TTL_MINUTES * 60,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD OTP ERROR:", error);

    return res.status(500).json({
      message: "Gagal memproses permintaan OTP",
    });
  }
};

// =====================================================
// VERIFY via OTP.ID (baris provider 'otpid').
// Mismatch (HTTP 200, verified:false) bukan error HTTP.
// Expired/lock/used datang sebagai 422 dan langsung
// meng-invalidate baris sesi lokal.
// =====================================================
const verifyOtpViaOtpId = async (
  req,
  res,
  user,
  active
) => {
  const { otp } = req.body || {};

  try {
    const result = await otpIdService.verifySmsOtp({
      otpId: active.provider_otp_id,
      otp,
    });

    if (!result.verified) {
      const nextAttempts = active.attempts + 1;

      await db.query(
        `UPDATE password_reset_otps
         SET attempts = ?
         WHERE id = ?`,
        [nextAttempts, active.id]
      );

      if (nextAttempts >= otpService.OTP_MAX_ATTEMPTS) {
        await otpService.invalidateActiveOtps(user.id);

        return res.status(403).json({
          message:
            "Terlalu banyak percobaan. Minta OTP baru.",
        });
      }

      return res.status(400).json({
        message: INVALID_OTP_MESSAGE,
      });
    }
  } catch (error) {
    await otpService.invalidateActiveOtps(user.id);

    return res
      .status(error.httpStatus || 400)
      .json({
        message:
          error.message || INVALID_OTP_MESSAGE,
      });
  }

  const resetToken = otpService.generateResetToken();

  await db.query(
    `UPDATE password_reset_otps
     SET verified_at = NOW(),
         reset_token_hash = ?,
         reset_token_expires_at =
           DATE_ADD(NOW(), INTERVAL 10 MINUTE)
     WHERE id = ?`,
    [otpService.hashValue(resetToken), active.id]
  );

  return res.status(200).json({
    message: "OTP valid",
    reset_token: resetToken,
    reset_token_expires_in_seconds:
      otpService.RESET_TOKEN_TTL_MINUTES * 60,
  });
};

// =====================================================
// POST /forgot-password/verify
// =====================================================
const verifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body || {};

    if (!identifier || !otp) {
      return res.status(400).json({
        message: "Identifier dan OTP wajib diisi",
      });
    }

    const user = await otpService.findActiveUser(identifier);

    if (!user) {
      return res.status(400).json({
        message: INVALID_OTP_MESSAGE,
      });
    }

    const active = await otpService.getActiveOtp(user.id);

    if (!active) {
      return res.status(400).json({
        message: INVALID_OTP_MESSAGE,
      });
    }

    if (active.attempts >= otpService.OTP_MAX_ATTEMPTS) {
      await otpService.invalidateActiveOtps(user.id);

      return res.status(403).json({
        message:
          "Terlalu banyak percobaan. Minta OTP baru.",
      });
    }

    // Baris OTP.ID: kode diverifikasi ke API OTP.ID,
    // bukan dibandingkan hash lokal.
    if (
      active.provider === "otpid" &&
      active.provider_otp_id
    ) {
      return verifyOtpViaOtpId(req, res, user, active);
    }

    let match = false;

    try {
      const crypto = require("crypto");
      const expected = Buffer.from(active.otp_hash, "hex");
      const actual = Buffer.from(
        otpService.hashValue(String(otp).trim()),
        "hex"
      );

      match =
        expected.length === actual.length &&
        crypto.timingSafeEqual(expected, actual);
    } catch {
      match = false;
    }

    if (!match) {
      const nextAttempts = active.attempts + 1;

      await db.query(
        `UPDATE password_reset_otps
         SET attempts = ?
         WHERE id = ?`,
        [nextAttempts, active.id]
      );

      if (nextAttempts >= otpService.OTP_MAX_ATTEMPTS) {
        await otpService.invalidateActiveOtps(user.id);

        return res.status(403).json({
          message:
            "Terlalu banyak percobaan. Minta OTP baru.",
        });
      }

      return res.status(400).json({
        message: INVALID_OTP_MESSAGE,
      });
    }

    const resetToken = otpService.generateResetToken();

    await db.query(
      `UPDATE password_reset_otps
       SET verified_at = NOW(),
           reset_token_hash = ?,
           reset_token_expires_at =
             DATE_ADD(NOW(), INTERVAL 10 MINUTE)
       WHERE id = ?`,
      [otpService.hashValue(resetToken), active.id]
    );

    return res.status(200).json({
      message: "OTP valid",
      reset_token: resetToken,
      reset_token_expires_in_seconds:
        otpService.RESET_TOKEN_TTL_MINUTES * 60,
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return res.status(500).json({
      message: "Gagal memverifikasi OTP",
    });
  }
};

// =====================================================
// POST /forgot-password/reset
// =====================================================
const resetPassword = async (req, res) => {
  try {
    const {
      reset_token: resetToken,
      password,
      password_confirmation: passwordConfirmation,
    } = req.body || {};

    if (!resetToken || !password || !passwordConfirmation) {
      return res.status(400).json({
        message:
          "Reset token, password, dan konfirmasi password wajib diisi",
      });
    }

    if (password !== passwordConfirmation) {
      return res.status(422).json({
        message: "Konfirmasi password tidak sama",
      });
    }

    if (String(password).length < 6) {
      return res.status(422).json({
        message: "Password minimal 6 karakter",
      });
    }

    const [rows] = await db.query(
      `SELECT id, user_id
       FROM password_reset_otps
       WHERE reset_token_hash = ?
         AND verified_at IS NOT NULL
         AND used_at IS NULL
         AND reset_token_expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [otpService.hashValue(String(resetToken))]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Sesi reset password tidak valid atau sudah expired",
      });
    }

    const resetRow = rows[0];

    // Hash password dengan sistem yang SAMA dengan
    // register/login existing (bcrypt, cost 10).
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users
       SET password = ?,
           updated_at = NOW()
       WHERE id = ?
         AND status = 1`,
      [hashedPassword, resetRow.user_id]
    );

    // OTP/sesi reset langsung dinonaktifkan setelah sukses.
    await db.query(
      `UPDATE password_reset_otps
       SET used_at = NOW(),
           reset_token_hash = NULL,
           reset_token_expires_at = NULL
       WHERE id = ?`,
      [resetRow.id]
    );

    await otpService.invalidateActiveOtps(resetRow.user_id);

    return res.status(200).json({
      message: "Password berhasil direset. Silakan login kembali.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Gagal mereset password",
    });
  }
};

module.exports = {
  requestOtp,
  verifyOtp,
  resetPassword,
};
