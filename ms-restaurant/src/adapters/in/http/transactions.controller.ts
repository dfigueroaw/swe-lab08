import { Body, Controller, Post } from '@nestjs/common';
import { CreateTransactionUseCase } from '../../../application/create-transaction.use-case';
import { CreateTransactionDto } from './create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly createTransaction: CreateTransactionUseCase) {}

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.createTransaction.execute(dto);
  }
}
