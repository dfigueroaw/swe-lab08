CREATE TABLE IF NOT EXISTS reward_accounts (
  id uuid PRIMARY KEY,
  customer_card_number varchar(32) NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  total_cashback numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_cashback >= 0),
  version integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY,
  transaction_id uuid NOT NULL UNIQUE,
  customer_card_number varchar(32) NOT NULL,
  points integer NOT NULL CHECK (points >= 0),
  cashback numeric(12, 2) NOT NULL CHECK (cashback >= 0),
  reward_date timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS inbox_messages (
  event_id uuid PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS outbox_messages (
  id uuid PRIMARY KEY,
  event_type varchar(100) NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NULL,
  attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reward_outbox_unpublished
  ON outbox_messages (created_at) WHERE published_at IS NULL;
