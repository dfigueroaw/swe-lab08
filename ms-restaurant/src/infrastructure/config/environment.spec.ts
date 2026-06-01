import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const valid = {
    TRANSACTIONS_DATABASE_URL:
      'postgres://user:password@localhost:5432/transactions',
    RABBITMQ_URL: 'amqp://user:password@localhost:5672/%2F',
  };

  it('applies non-sensitive defaults', () => {
    expect(validateEnvironment(valid)).toEqual(
      expect.objectContaining({
        RESTAURANT_PORT: 3000,
        RABBITMQ_EXCHANGE: 'rewards.exchange',
        DB_SYNCHRONIZE: 'false',
      }),
    );
  });

  it.each(['TRANSACTIONS_DATABASE_URL', 'RABBITMQ_URL'])(
    'requires %s',
    (name) => {
      const environment = { ...valid };
      delete environment[name as keyof typeof environment];
      expect(() => validateEnvironment(environment)).toThrow(
        `${name} is required`,
      );
    },
  );

  it('rejects invalid protocols', () => {
    expect(() =>
      validateEnvironment({ ...valid, RABBITMQ_URL: 'https://localhost' }),
    ).toThrow('RABBITMQ_URL has an invalid protocol');
  });

  it('rejects invalid ports and booleans', () => {
    expect(() => validateEnvironment({ ...valid, RESTAURANT_PORT: 0 })).toThrow(
      'RESTAURANT_PORT must be a valid port',
    );
    expect(() =>
      validateEnvironment({ ...valid, DB_SYNCHRONIZE: 'yes' }),
    ).toThrow('DB_SYNCHRONIZE must be true or false');
    expect(() =>
      validateEnvironment({ ...valid, DB_SYNCHRONIZE: true }),
    ).toThrow(TypeError);
  });
});
