import { isDeepEqual } from "./_utils.ts";
import { isSetFunction, type SetFunction } from "./isSetFunction.ts";
import { Observable, type ObservableInterface, type Subscriber } from "./Observable.ts";
import type { SubscriptionInterface } from "./Subscription.ts";

export interface ObservableValueInterface<Value> extends ObservableInterface<Value> {
  getValue: () => Value;
  next: (value: Value | SetFunction<Value>) => void;
}

export class ObservableValue<Value>
  extends Observable<Value>
  implements ObservableValueInterface<Value>
{
  private value: Value;

  constructor(value: Value) {
    super();
    this.value = value;
  }

  subscribe = (subscriber: Subscriber<Value>): SubscriptionInterface => {
    // Registers first: a subclass may resynchronize itself on its first subscriber, and the
    // initial emission has to carry the value that resynchronization settled on.
    const subscription = super.subscribe(subscriber);
    subscriber(this.getValue());

    return subscription;
  };

  next = (value: Value | SetFunction<Value>): void => {
    const newValue = isSetFunction(value) ? value(this.value) : value;

    if (isDeepEqual(this.value, newValue)) {
      return;
    }

    this.value = newValue;
    super.next(newValue);
  };

  getValue = (): Value => {
    return this.value;
  };
}
