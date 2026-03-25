-- Kolejka zatwierdzeń leadów (HITL Telegram) + audyt.
-- Uruchom na tej samej bazie Postgres co n8n (Render) lub osobnej bazie — ustaw credential w node Postgres.
-- Bezpieczeństwo: aplikacja n8n powinna używać użytkownika DB z prawem tylko do tych tabel.

CREATE TABLE IF NOT EXISTS lead_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  source          TEXT NOT NULL DEFAULT 'mail',
  payload_json    JSONB NOT NULL DEFAULT '{}',
  ai_json         JSONB,
  telegram_message_id BIGINT,
  telegram_chat_id    BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at      TIMESTAMPTZ,
  decided_by_chat_id BIGINT,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_queue_status_created
  ON lead_queue (status, created_at DESC);

COMMENT ON TABLE lead_queue IS 'n8n HITL: rekord po analizie AI, zatwierdzenie w Telegramie';

CREATE TABLE IF NOT EXISTS lead_events (
  id           BIGSERIAL PRIMARY KEY,
  lead_id      UUID NOT NULL REFERENCES lead_queue (id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  detail_json  JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events (lead_id);
