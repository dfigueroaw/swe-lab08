const AMQP_PROTOCOLS = ['amqp:', 'amqps:'];
const POSTGRES_PROTOCOLS = ['postgres:', 'postgresql:'];

function requireUrl(
  environment: Record<string, unknown>,
  name: string,
  protocols: string[],
) {
  const value = environment[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  const url = new URL(value);
  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} has an invalid protocol`);
  }
  return value;
}

function parsePort(
  environment: Record<string, unknown>,
  name: string,
  fallback: number,
) {
  const port = Number(environment[name] ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid port`);
  }
  return port;
}

function parseBoolean(environment: Record<string, unknown>, name: string) {
  const value = environment[name] ?? 'false';
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be true or false`);
  }
  if (!['true', 'false'].includes(value)) {
    throw new Error(`${name} must be true or false`);
  }
  return value;
}

export function validateEnvironment(environment: Record<string, unknown>) {
  return {
    ...environment,
    REWARDS_PORT: parsePort(environment, 'REWARDS_PORT', 3001),
    REWARDS_DATABASE_URL: requireUrl(
      environment,
      'REWARDS_DATABASE_URL',
      POSTGRES_PROTOCOLS,
    ),
    RABBITMQ_URL: requireUrl(environment, 'RABBITMQ_URL', AMQP_PROTOCOLS),
    RABBITMQ_EXCHANGE: environment.RABBITMQ_EXCHANGE ?? 'rewards.exchange',
    TRANSACTION_QUEUE:
      environment.TRANSACTION_QUEUE ?? 'transaction.created.queue',
    DB_SYNCHRONIZE: parseBoolean(environment, 'DB_SYNCHRONIZE'),
  };
}
