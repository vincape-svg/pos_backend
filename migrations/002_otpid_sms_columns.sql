-- =====================================================
-- Migration 002: OTP.ID (SMS channel)
--
-- RULE:
-- - Aditif saja. Tidak mengubah tabel `users`,
--   tabel `password_resets` (alur email lama), maupun
--   baris/flow self-managed yang sudah ada.
-- - Baris OTP.ID menyimpan provider_otp_id (transaction
--   ID dari OTP.ID). Kode OTP tidak pernah disimpan
--   di database ini dalam bentuk apa pun.
-- =====================================================

ALTER TABLE password_reset_otps
  ADD COLUMN provider VARCHAR(16) NOT NULL DEFAULT 'local'
    AFTER channel,
  ADD COLUMN provider_otp_id VARCHAR(32) NULL DEFAULT NULL
    AFTER otp_hash,
  MODIFY COLUMN otp_hash CHAR(64) NULL DEFAULT NULL;

CREATE INDEX idx_pro_provider_otp
  ON password_reset_otps (provider_otp_id);
