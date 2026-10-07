"use strict";

// =====================================================
// WhatsApp Provider — Fonnte (https://fonnte.com)
// POST {WHATSAPP_API_URL} (default https://api.fonnte.com/send)
// Header : Authorization: <WHATSAPP_API_TOKEN> (token mentah)
// Body   : application/x-www-form-urlencoded
//          target=<nomor 62...>&message=<teks>
//          (+ device=<WHATSAPP_SENDER> bila diisi)
// =====================================================

const assertConfigured = () => {
  if (
    !process.env.WHATSAPP_API_URL ||
    !process.env.WHATSAPP_API_TOKEN
  ) {
    const error = new Error(
      "Konfigurasi WhatsApp belum lengkap"
    );
    error.code = "PROVIDER_NOT_CONFIGURED";
    throw error;
  }
};

const send = async (to, text) => {
  assertConfigured();

  const body = new URLSearchParams({
    target: to,
    message: text,
  });

  if (process.env.WHATSAPP_SENDER) {
    body.append(
      "device",
      process.env.WHATSAPP_SENDER
    );
  }

  const response = await fetch(
    process.env.WHATSAPP_API_URL,
    {
      method: "POST",
      headers: {
        Authorization: process.env.WHATSAPP_API_TOKEN,
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

  // Fonnte kadang membalas HTTP 200 dengan status:false
  // (mis. device disconnect / kuota habis).
  if (
    !response.ok ||
    (payload && payload.status === false)
  ) {
    const error = new Error(
      "Gagal mengirim OTP via WhatsApp"
    );
    error.code = "PROVIDER_SEND_FAILED";
    error.status = response.status;
    throw error;
  }
};

module.exports = { send };
