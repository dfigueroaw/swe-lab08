import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const valid = {
    REWARDS_DATABASE_URL: 'postgres://user:password@localhost:5433/rewards',
    RABBITMQ_URL: 'amqp://user:password@localhost:5672/%2F',
  };

  it('applies non-sensitive defaults', () => {
    expect(validateEnvironment(valid)).toEqual(
      expect.objectContaining({
        REWARDS_PORT: 3001,
        RABBITMQ_EXCHANGE: 'rewards.exchange',
        TRANSACTION_QUEUE: 'transaction.created.queue',
        DB_SYNCHRONIZE: 'false',
      }),
    );
  });

  it.each(['REWARDS_DATABASE_URL', 'RABBITMQ_URL'])('requires %s', (name) => {
    const environment = { ...valid };
    delete environment[name as keyof typeof environment];
    expect(() => validateEnvironment(environment)).toThrow(
      `${name} is required`,
    );
  });

  it('rejects invalid protocols', () => {
    expect(() =>
      validateEnvironment({ ...valid, RABBITMQ_URL: 'https://localhost' }),
    ).toThrow('RABBITMQ_URL has an invalid protocol');
  });

  it('rejects invalid ports and booleans', () => {
    expect(() =>
      validateEnvironment({ ...valid, REWARDS_PORT: 70000 }),
    ).toThrow('REWARDS_PORT must be a valid port');
    expect(() =>
      validateEnvironment({ ...valid, DB_SYNCHRONIZE: 'yes' }),
    ).toThrow('DB_SYNCHRONIZE must be true or false');
    expect(() =>
      validateEnvironment({ ...valid, DB_SYNCHRONIZE: true }),
    ).toThrow(TypeError);
  });
});
