import { ObservableValue, type ObservableValueInterface } from "./ObservableValue";

type From<Value, DerivedValue> = (derivedValue: DerivedValue) => Value;
type To<Value, DerivedValue> = (value: Value) => DerivedValue;

export class DerivedObservableValue<Value, DerivedValue> extends ObservableValue<Value> {
  #source: ObservableValueInterface<DerivedValue>;
  #from: From<Value, DerivedValue>;
  #to: To<Value, DerivedValue>;
  #isSyncing = false;

  constructor(
    source: ObservableValueInterface<DerivedValue>,
    from: From<Value, DerivedValue>,
    to: To<Value, DerivedValue>,
    defaultValue?: Value,
  ) {
    super(from(source.getValue()) ?? (defaultValue as Value));
    this.#source = source;
    this.#from = from;
    this.#to = to;

    this.#source.subscribe((value) => {
      if (this.#isSyncing) return;
      this.#isSyncing = true;
      this.next(this.#from(value));
      this.#isSyncing = false;
    });

    this.subscribe((value) => {
      if (this.#isSyncing) return;
      this.#isSyncing = true;
      this.#source.next(this.#to(value));
      this.#isSyncing = false;
    });
  }
}
