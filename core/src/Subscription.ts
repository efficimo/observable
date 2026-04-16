export interface SubscriptionInterface {
  unsubscribe: () => void;
}

export class Subscription implements SubscriptionInterface {
  unsubscribe: () => void;
  constructor(unsubscribe: () => void) {
    this.unsubscribe = unsubscribe;
  }
}
