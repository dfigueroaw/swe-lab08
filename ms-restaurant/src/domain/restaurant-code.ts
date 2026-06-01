export class RestaurantCode {
  constructor(readonly value: string) {
    if (!/^[A-Z0-9_-]{3,32}$/.test(value)) {
      throw new Error('Restaurant code must be 3 to 32 uppercase characters');
    }
  }
}
