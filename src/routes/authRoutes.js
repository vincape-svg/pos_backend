const express = require("express");

const router = express.Router();

const {
  register,
  login,
  profile,
  forgotPassword,
  verifyOtp,
  resetPassword
} = require("../controllers/authController");

const {
  requestOtp,
  verifyOtp: verifyOtpChannel,
  resetPassword: resetPasswordChannel
} = require("../controllers/forgotPasswordOtpController");

const {
  googleLogin,
} = require("../controllers/googleAuthController");

const authMiddleware = require("../middlewares/authMiddleware");

router.post("/register", register);

router.post("/login", login);

router.get("/profile", authMiddleware, profile);

router.post("/forgot-password", forgotPassword);

router.post("/verify-otp", verifyOtp);

router.post("/reset-password", resetPassword);

// =====================================================
// FORGOT PASSWORD VIA OTP (WhatsApp / SMS)
// Tabel `password_reset_otps`. Endpoint lama di atas
// tidak diubah demi backward compatibility.
// =====================================================

router.post(
  "/forgot-password/request",
  requestOtp
);

router.post(
  "/forgot-password/verify",
  verifyOtpChannel
);

router.post(
  "/forgot-password/reset",
  resetPasswordChannel
);

// =====================================================
// GOOGLE LOGIN (Firebase Authentication)
// Jalur tambahan — login biasa tidak diubah.
// =====================================================

router.post("/google", googleLogin);

module.exports = router;