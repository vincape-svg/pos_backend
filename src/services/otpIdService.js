"use strict";

// =====================================================
// OTP.ID Service — channel SMS via OTP.ID V3 API
// (official SDK @otp-id/sdk, REST di baliknya)
//
// - OTP.ID yang generate + kirim + verifikasi kode.
//   Kode tidak pernah kembali ke server ini, tidak
//   disimpan, dan tidak di-log.
// - Yang disimpan: provider_otp_id (transaction ID)
//   + expires_at dari respons OTP.ID.
// - Attempts/expiry/reuse ditegakkan OTP.ID; rate-limit
//   lokal (cooldown + maks/jam) tetap jalan untuk
//   melindungi kredit.
// - Key hanya dari env OTP_ID_API_KEY, tidak pernah
//   dikirim ke frontend.
// =====================================================

const {
  OtpIdClient,
  APIError,
} = require("@otp-id/sdk");

const OTP_BRAND =
  process.env.OTP_BRAND || "POS Kasir";

// Peringatan saldo rendah (kredit prabayar) — agar tidak
// gagal diam-diam saat saldo menipis.
const LOW_BALANCE_THRESHOLD = 1000;

const assertConfigured = () => {
  if (!process.env.OTP_ID_API_KEY) {
    const error = new Error(
      "Konfigurasi OTP.ID belum lengkap"
    );
    error.code = "OTPID_NOT_CONFIGURED";
    throw error;
  }
};

const buildClient = (fetchImpl) =>
  new OtpIdClient(process.env.OTP_ID_API_KEY, {
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });

const warnLowBalance = (lastBalance) => {
  if (
    typeof lastBalance === "number" &&
    lastBalance < LOW_BALANCE_THRESHOLD
  ) {
    console.warn(
      `OTP.ID low balance: ${lastBalance} credits remaining`
    );
  }
};

// Map APIError OTP.ID -> { httpStatus, message }.
// Pesan aman untuk user (bahasa Indonesia).
const mapApiError = (error) => {
  if (!(error instanceof APIError)) {
    return {
      httpStatus: 502,
      message: "Gagal menghubungi layanan OTP.",
    };
  }

  switch (error.code) {
    case "INSUFFICIENT_BALANCE":
      return {
        httpStatus: 503,
        message:
          "Saldo layanan OTP habis. Hubungi administrator.",
      };

    case "RATE_LIMITED":
    case "DESTINATION_RATE_LIMITED":
      return {
        httpStatus: 429,
        message:
          "Terlalu sering meminta OTP. Coba lagi nanti.",
      };

    case "INVALID_NUMBER":
      return {
        httpStatus: 400,
        message: "Nomor tujuan tidak valid.",
      };

    case "UNAUTHORIZED":
    case "IP_NOT_ALLOWED":
      console.error(
        "OTP.ID auth error:",
        error.code
      );

      return {
        httpStatus: 500,
        message: "Gagal memproses permintaan OTP",
      };

    case "CHANNEL_UNAVAILABLE":
      return {
        httpStatus: 502,
        message:
          "Channel SMS sedang tidak tersedia. Coba lagi nanti.",
      };

    case "OTP_EXPIRED":
      return {
        httpStatus: 400,
        message: "OTP tidak valid atau sudah expired",
      };

    case "TOO_MANY_ATTEMPTS":
      return {
        httpStatus: 403,
        message:
          "Terlalu banyak percobaan. Minta OTP baru.",
      };

    case "ALREADY_USED":
      return {
        httpStatus: 400,
        message: "OTP tidak valid atau sudah expired",
      };

    case "OTP_NOT_FOUND":
      return {
        httpStatus: 400,
        message: "OTP tidak valid atau sudah expired",
      };

    default:
      return {
        httpStatus: 502,
        message: "Gagal memproses permintaan OTP",
      };
  }
};

// Minta OTP SMS ke OTP.ID. Mengembalikan transaction info.
// Melempar Error dengan .httpStatus + .message bila gagal,
// atau .duplicateOtpId bila DUPLICATE_EXTERNAL_ID.
const requestSmsOtp = async ({
  destination,
  externalId,
  fetchImpl,
}) => {
  assertConfigured();

  const client = buildClient(fetchImpl);

  let result;

  try {
    result = await client.requestOtp({
      channel: "sms",
      destination,
      brand: OTP_BRAND,
      otp_length: 6,
      ttl: 300,
      external_id: externalId,
    });
  } catch (error) {
    if (
      error instanceof APIError &&
      error.code === "DUPLICATE_EXTERNAL_ID"
    ) {
      const duplicate = new Error(
        "Duplicate external_id"
      );
      duplicate.code = "DUPLICATE_EXTERNAL_ID";
      duplicate.existingOtpId =
        error.details?.existing_otp_id || null;
      throw duplicate;
    }

    const mapped = mapApiError(error);
    const mappedError = new Error(mapped.message);
    mappedError.code = "OTPID_REQUEST_FAILED";
    mappedError.httpStatus = mapped.httpStatus;
    throw mappedError;
  }

  // Delivery gagal bukan error HTTP — cek status + failure.
  if (!result || result.status === "failed") {
    const failure = new Error(
      (result &&
        result.failure &&
        result.failure.message) ||
        "OTP gagal dikirim oleh operator, silakan coba lagi"
    );
    failure.code = "OTPID_DELIVERY_FAILED";
    failure.httpStatus = 502;
    throw failure;
  }

  warnLowBalance(result.last_balance);

  return {
    otpId: result.otp_id,
    expiresAt: result.expires_at || null,
    price: result.price,
    lastBalance: result.last_balance,
  };
};

// Verifikasi kode via OTP.ID.
// - Berhasil   -> { verified: true }
// - Salah kode -> { verified: false } (HTTP 200, bukan error)
// - Expired/lock/used -> throw dengan .httpStatus + .message
const verifySmsOtp = async ({
  otpId,
  otp,
  fetchImpl,
}) => {
  assertConfigured();

  const client = buildClient(fetchImpl);

  try {
    const result = await client.verifyOtp(
      otpId,
      String(otp).trim()
    );

    return { verified: result.verified === true };
  } catch (error) {
    const mapped = mapApiError(error);
    const mappedError = new Error(mapped.message);
    mappedError.code = "OTPID_VERIFY_FAILED";
    mappedError.httpStatus = mapped.httpStatus;
    throw mappedError;
  }
};

module.exports = {
  OTP_BRAND,
  requestSmsOtp,
  verifySmsOtp,
};
