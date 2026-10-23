import { Subscription, type SubscriptionInterface } from "./Subscription.ts";

export type Subscriber<Value> = (nextValue: Value) => void;

export interface ObservableInterface<Value> {
  subscribe: (subscriber: Subscriber<Value>) => SubscriptionInterface;
  next: (value: Value) => void;
}

export class Observable<Value> implements ObservableInterface<Value> {
  #subscriptions = [] as Subscriber<Value>[];

  /** Called when the observable goes from zero to one subscriber, before that subscriber is registered. */
  protected onFirstSubscriber(): void {}

  /** Called when the last subscriber leaves. */
  protected onLastUnsubscribe(): void {}

  /** Notifies the current subscribers. Subclasses call it instead of `super.next()`, which instance fields hide. */
  protected notify(value: Value): void {
    for (const subscriber of this.#subscriptions) {
      subscriber(value);
    }
  }

  subscribe(subscriber: Subscriber<Value>): SubscriptionInterface {
    if (this.#subscriptions.length === 0) {
      this.onFirstSubscriber();
    }

    this.#subscriptions.push(subscriber);

    let unsubscribed = false;

    return new Subscription(() => {
      if (unsubscribed) {
        return;
      }
      unsubscribed = true;

      // Removes this subscription only — the same function may be subscribed more than once.
      // Replacing the array leaves an in-flight notification untouched.
      const index = this.#subscriptions.indexOf(subscriber);
      this.#subscriptions = this.#subscriptions.filter((_, position) => position !== index);

      if (this.#subscriptions.length === 0) {
        this.onLastUnsubscribe();
      }
    });
  }

  next(value: Value): void {
    this.notify(value);
  }
}
