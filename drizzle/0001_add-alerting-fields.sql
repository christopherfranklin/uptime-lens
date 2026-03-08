ALTER TABLE monitors ADD COLUMN is_up boolean NOT NULL DEFAULT true;
ALTER TABLE monitors ADD COLUMN last_ssl_alert_days integer;
ALTER TABLE users ADD COLUMN last_digest_sent_at timestamptz;
UPDATE monitors SET is_up = true WHERE status = 'active';
