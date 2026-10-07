"use strict";

// =====================================================
// OTP Dispatcher — abstraksi pengiriman OTP
//
// Logic bisnis (controller/service) hanya memanggil
// dispatch(channel, to, text) dan TIDAK bergantung
// langsung pada provider tertentu.
//
// Channel yang didukung: "whatsapp" | "sms"
// =====================================================

const whatsappProvider = require("./whatsappProvider");
const smsProvider = require("./smsProvider");

const SUPPORTED_CHANNELS = ["whatsapp", "sms"];

// `sender` opsional (dependency injection) agar mudah di-test
// tanpa menyentuh provider asli. Default: provider sungguhan.
const dispatch = async (
  channel,
  to,
  text,
  sender = null
) => {
  if (!SUPPORTED_CHANNELS.includes(channel)) {
    const error = new Error(
      "Channel OTP tidak didukung"
    );
    error.code = "UNSUPPORTED_CHANNEL";
    throw error;
  }

  const sendFn =
    sender ||
    (channel === "whatsapp"
      ? whatsappProvider.send
      : smsProvider.send);

  await sendFn(to, text);
};

module.exports = {
  SUPPORTED_CHANNELS,
  dispatch,
};
