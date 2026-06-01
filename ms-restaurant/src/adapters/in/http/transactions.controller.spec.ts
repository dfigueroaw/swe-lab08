import { TransactionsController } from './transactions.controller';

describe('TransactionsController', () => {
  it('delegates transaction creation', async () => {
    const execute = jest.fn().mockResolvedValue({ transactionId: 'id' });
    const controller = new TransactionsController({ execute } as never);
    await expect(
      controller.create({
        amount: 100,
        cardNumber: '123456789',
        restaurantCode: 'REST001',
      }),
    ).resolves.toEqual({ transactionId: 'id' });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
