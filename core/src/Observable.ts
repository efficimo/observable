import { Subscription, type SubscriptionInterface } from "./Subscription";

export type Subscriber<Value> = (nextValue: Value) => void;

export interface ObservableInterface<Value> {
  subscribe: (subscriber: Subscriber<Value>) => SubscriptionInterface;
  next: (value: Value) => void;
}

export class Observable<Value> implements ObservableInterface<Value> {
  #subscriptions = [] as Subscriber<Value>[];
  subscribe(subscriber: Subscriber<Value>): SubscriptionInterface {
    this.#subscriptions.push(subscriber);

    return new Subscription(() => {
      this.#subscriptions = this.#subscriptions.filter((fn) => fn !== subscriber);
    });
  }

  next(value: Value): void {
    for (const subscriber of this.#subscriptions) {
      subscriber(value);
    }
  }
}
