/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const describeWithStack =
  process.env.RUN_STACK_E2E === 'true' ? describe : describe.skip;
interface TransactionResponse {
  transactionId: string;
}

describeWithStack('Transactions API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(() => app.close());

  it('registers a restaurant transaction', async () => {
    await request(app.getHttpServer())
      .post('/transactions')
      .send({ amount: 100, cardNumber: '123456789', restaurantCode: 'REST001' })
      .expect(201)
      .expect(({ body }: { body: TransactionResponse }) =>
        expect(body.transactionId).toMatch(/^[0-9a-f-]{36}$/),
      );
  });
});
