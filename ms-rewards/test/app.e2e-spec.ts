import { Client } from 'pg';

const describeWithStack =
  process.env.RUN_STACK_E2E === 'true' ? describe : describe.skip;

describeWithStack('Rewards processing (e2e)', () => {
  it('eventually credits a reward account after a restaurant transaction', async () => {
    const cardNumber = `${Date.now()}`;
    const response = await fetch('http://localhost:3000/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        amount: 100,
        cardNumber,
        restaurantCode: 'REST001',
      }),
    });
    expect(response.status).toBe(201);

    const client = new Client({
      connectionString:
        process.env.REWARDS_DATABASE_URL ??
        'postgres://rewards:rewards@localhost:5433/rewards',
    });
    await client.connect();
    try {
      let rows: Array<{ total_points: number; total_cashback: string }> = [];
      for (let attempt = 0; attempt < 20 && rows.length === 0; attempt += 1) {
        ({ rows } = await client.query(
          'SELECT total_points, total_cashback FROM reward_accounts WHERE customer_card_number = $1',
          [cardNumber],
        ));
        if (rows.length === 0)
          await new Promise((resolve) => setTimeout(resolve, 500));
      }
      expect(rows[0]).toEqual({ total_points: 10, total_cashback: '2.00' });
    } finally {
      await client.end();
    }
  }, 15_000);
});
