export class CustomerCardNumber {
  constructor(readonly value: string) {
    if (!/^\d{9,32}$/.test(value)) {
      throw new Error('Card number must contain between 9 and 32 digits');
    }
  }
}
