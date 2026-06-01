CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  card_number varchar(32) NOT NULL,
  restaurant_code varchar(32) NOT NULL,
  transaction_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS outbox_messages (
  id uuid PRIMARY KEY,
  event_type varchar(100) NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NULL,
  attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tx_outbox_unpublished
  ON outbox_messages (created_at) WHERE published_at IS NULL;
