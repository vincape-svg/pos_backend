-- =====================================================
-- Migration 001: password_reset_otps
-- Forgot Password via OTP (WhatsApp / SMS)
--
-- RULE:
-- - Tabel BARU. Tabel `password_resets` (alur email lama)
--   TIDAK diubah agar autentikasi existing tetap utuh.
-- - Hanya hash OTP yang disimpan (otp_hash CHAR(64)),
--   tidak pernah menyimpan OTP plaintext.
-- =====================================================

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id INT(11) NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  channel VARCHAR(10) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT(11) NOT NULL DEFAULT 0,
  verified_at DATETIME NULL DEFAULT NULL,
  reset_token_hash CHAR(64) NULL DEFAULT NULL,
  reset_token_expires_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_pro_user (user_id),
  KEY idx_pro_created (created_at),
  CONSTRAINT fk_pro_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_pro_channel
    CHECK (channel IN ('whatsapp', 'sms'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
