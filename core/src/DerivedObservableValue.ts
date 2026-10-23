import { isDeepEqual } from "./_utils.ts";
import { isSetFunction, type SetFunction } from "./isSetFunction.ts";
import { ObservableValue, type ObservableValueInterface } from "./ObservableValue.ts";
import type { SubscriptionInterface } from "./Subscription.ts";

type From<Value, DerivedValue> = (derivedValue: DerivedValue) => Value;
type To<Value, DerivedValue> = (value: Value) => DerivedValue;

/**
 * Bidirectional view over `source`, which holds the state: the derived value is recomputed from
 * the source and memoized, so `getValue()` stays exact — and stable by reference — whether or not
 * this observable has subscribers. The subscription to the source only lives as long as this
 * observable is itself subscribed to, so a derived value that nobody observes anymore does not
 * keep its source awake. The `value` field inherited from `ObservableValue` is never read.
 */
export class DerivedObservableValue<Value, DerivedValue> extends ObservableValue<Value> {
  #source: ObservableValueInterface<DerivedValue>;
  #from: From<Value, DerivedValue>;
  #to: To<Value, DerivedValue>;
  #defaultValue: Value | undefined;
  #sourceValue: DerivedValue;
  #derivedValue: Value;
  #sourceSubscription: SubscriptionInterface | null = null;

  constructor(
    source: ObservableValueInterface<DerivedValue>,
    from: From<Value, DerivedValue>,
    to: To<Value, DerivedValue>,
    defaultValue?: Value,
  ) {
    const sourceValue = source.getValue();
    const derivedValue = from(sourceValue) ?? (defaultValue as Value);

    super(derivedValue);
    this.#source = source;
    this.#from = from;
    this.#to = to;
    this.#defaultValue = defaultValue;
    this.#sourceValue = sourceValue;
    this.#derivedValue = derivedValue;
  }

  /** Recomputes only on a new source value, and keeps the previous reference when the result is unchanged. */
  #derive = (sourceValue: DerivedValue): Value => {
    if (Object.is(sourceValue, this.#sourceValue)) {
      return this.#derivedValue;
    }
    this.#sourceValue = sourceValue;

    const derivedValue = this.#from(sourceValue) ?? (this.#defaultValue as Value);
    if (!isDeepEqual(derivedValue, this.#derivedValue)) {
      this.#derivedValue = derivedValue;
    }

    return this.#derivedValue;
  };

  getValue = (): Value => {
    return this.#derive(this.#source.getValue());
  };

  next = (value: Value | SetFunction<Value>): void => {
    const currentValue = this.getValue();
    const newValue = isSetFunction(value) ? value(currentValue) : value;

    if (isDeepEqual(currentValue, newValue)) {
      return;
    }

    // Writing to the source is enough: while subscribed, the value comes back through
    // #sourceSubscription, which notifies our own subscribers.
    this.#source.next(this.#to(newValue));
  };

  protected onFirstSubscriber(): void {
    this.#sourceSubscription = this.#source.subscribe((sourceValue) => {
      const previousValue = this.#derivedValue;
      const derivedValue = this.#derive(sourceValue);

      if (!Object.is(derivedValue, previousValue)) {
        this.notify(derivedValue);
      }
    });
  }

  protected onLastUnsubscribe(): void {
    this.#sourceSubscription?.unsubscribe();
    this.#sourceSubscription = null;
  }
}
