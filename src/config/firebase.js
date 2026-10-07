"use strict";

// =====================================================
// Firebase Admin SDK — verifikasi Firebase ID Token
// untuk Google Login (POST /api/auth/google).
//
// Kredensial 100% dari environment variables:
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY  (format .env: \n untuk newline)
//
// Inisialisasi lazy + graceful: bila kredensial belum
// diisi, modul tetap ke-load dan endpoint menjawab 503
// dengan pesan jelas (server tidak crash saat start).
//
// NOTE: firebase-admin v14 (modular): credential dibuat
// via cert() dari 'firebase-admin/app', verifikasi via
// getAuth() dari 'firebase-admin/auth'.
// =====================================================

const {
  initializeApp,
  getApps,
  cert,
} = require("firebase-admin/app");

const { getAuth } = require("firebase-admin/auth");

const isConfigured = () =>
  Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );

const getAdminAuth = () => {
  if (!isConfigured()) {
    const error = new Error(
      "Konfigurasi Firebase Admin belum lengkap"
    );
    error.code = "FIREBASE_NOT_CONFIGURED";
    throw error;
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Private key di .env ditulis satu baris
        // dengan \n — kembalikan ke newline asli.
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(
          /\\n/g,
          "\n"
        ),
      }),
    });
  }

  return getAuth();
};

module.exports = {
  isConfigured,
  getAuth: getAdminAuth,
};
