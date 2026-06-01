import { IsNumber, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  @Matches(/^\d{9,32}$/)
  cardNumber!: string;

  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  restaurantCode!: string;
}
