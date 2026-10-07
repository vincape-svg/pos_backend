"use strict";

// =====================================================
// SMS Provider — Zenziva SMS Reguler (Indonesia)
// POST {SMS_API_URL}
//   (default https://console.zenziva.net/reguler/api/mesinkirim/)
// Body : application/x-www-form-urlencoded
//   userkey = <SMS_API_KEY>
//   passkey = <SMS_SENDER>
//   nohp    = <nomor tujuan>
//   pesan   = <teks OTP>
//
// Jika nanti memakai provider SMS lain (mis. Twilio),
// sesuaikan hanya fungsi send/buildBody di bawah.
// =====================================================

const DEFAULT_URL =
  "https://console.zenziva.net/reguler/api/mesinkirim/";

const assertConfigured = () => {
  if (!process.env.SMS_API_KEY) {
    const error = new Error(
      "Konfigurasi SMS belum lengkap"
    );
    error.code = "PROVIDER_NOT_CONFIGURED";
    throw error;
  }
};

const send = async (to, text) => {
  assertConfigured();

  const body = new URLSearchParams({
    userkey: process.env.SMS_API_KEY,
    passkey: process.env.SMS_SENDER || "",
    nohp: to,
    pesan: text,
  });

  const response = await fetch(
    process.env.SMS_API_URL || DEFAULT_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  // Zenziva membalas {"status":1,...} bila sukses.
  if (
    !response.ok ||
    (payload &&
      payload.status !== 1 &&
      payload.status !== "1" &&
      payload.status !== true)
  ) {
    const error = new Error("Gagal mengirim OTP via SMS");
    error.code = "PROVIDER_SEND_FAILED";
    error.status = response.status;
    throw error;
  }
};

module.exports = { send };
