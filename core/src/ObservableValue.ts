import { isDeepEqual } from "./_utils";
import { isSetFunction, type SetFunction } from "./isSetFunction";
import { Observable, type ObservableInterface, type Subscriber } from "./Observable";

export interface ObservableValueInterface<Value> extends ObservableInterface<Value> {
  getValue: () => Value;
  next: (value: Value | SetFunction<Value>) => Promise<void>;
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

  subscribe = (subscriber: Subscriber<Value>) => {
    subscriber(this.value);
    return super.subscribe(subscriber);
  };

  next = async (value: Value | SetFunction<Value>) => {
    const newValue = isSetFunction(value) ? await value(this.value) : value;

    if (isDeepEqual(this.value, newValue)) {
      return;
    }

    this.value = newValue;
    super.next(newValue);
  };

  getValue = () => {
    return this.value;
  };
}
