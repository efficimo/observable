import { getByPath, isDeepEqual, setByPath } from "./_utils";
import type { SetFunction } from "./isSetFunction";
import type { Subscriber } from "./Observable";
import { ObservableValue, type ObservableValueInterface } from "./ObservableValue";
import type { SubscriptionInterface } from "./Subscription";
import type { ObjectPart, ObjectPaths } from "./types";

type PartsMap = Record<string, ObservableValueInterface<unknown> | undefined>;

const isObservableValueInterface = <Value>(
  potentialObservable: Value | ObservableValueInterface<Value>,
): potentialObservable is ObservableValueInterface<Value> => {
  return (
    typeof potentialObservable === "object" &&
    potentialObservable !== null &&
    "next" in potentialObservable &&
    typeof potentialObservable.next === "function" &&
    "getValue" in potentialObservable &&
    typeof potentialObservable.getValue === "function" &&
    "subscribe" in potentialObservable &&
    typeof potentialObservable.subscribe === "function"
  );
};

export class ObjectObservableValue<Value extends object | undefined | null>
  implements ObservableValueInterface<Value>
{
  private readonly partsObservables: {
    [path in ObjectPaths<Value>]?: ObservableValueInterface<ObjectPart<Value, path>>;
  } = {};

  private readonly observable: ObservableValueInterface<Value>;
  private syncingPaths = new Set<string>();

  constructor(value: Value | ObservableValueInterface<Value>) {
    this.observable = isObservableValueInterface(value) ? value : new ObservableValue(value);
  }

  subscribe = (subscriber: Subscriber<Value>): SubscriptionInterface => {
    return this.observable.subscribe(subscriber);
  };

  next = (value: Value | SetFunction<Value>): void => {
    this.observable.next(value);
  };

  getValue = (): Value => {
    return this.observable.getValue();
  };

  private pathToPartIndex = (path: ObjectPaths<Value> | string[] | string): string => {
    if (typeof path === "string") {
      return path;
    }

    return path.join(".");
  };

  getPartObservable = (
    path: ObjectPaths<Value> | string[],
    defaultValue?: ObjectPart<Value, typeof path>,
  ): ObservableValueInterface<ObjectPart<Value, typeof path>> => {
    const partObservableIndex = this.pathToPartIndex(path);
    const parts = this.partsObservables as PartsMap;

    if (parts[partObservableIndex] !== undefined) {
      return parts[partObservableIndex] as ObservableValueInterface<ObjectPart<Value, typeof path>>;
    }

    const initialValue = getByPath(this.getValue(), path);
    const partObservable = new ObservableValue(
      initialValue !== undefined ? initialValue : defaultValue,
    ) as unknown as ObservableValueInterface<ObjectPart<Value, typeof path>>;

    this.subscribe((newValue) => {
      if (this.syncingPaths.has(partObservableIndex)) return;
      const pathValue = getByPath(newValue, path);
      partObservable.next(
        (pathValue !== undefined ? pathValue : defaultValue) as ObjectPart<Value, typeof path>,
      );
    });

    partObservable.subscribe((newPartValue) => {
      if (this.syncingPaths.has(partObservableIndex)) return;
      if (isDeepEqual(getByPath(this.getValue(), path), newPartValue)) return;
      this.syncingPaths.add(partObservableIndex);
      this.next((currentValue) => {
        const newValue = structuredClone(currentValue ?? {}) as Exclude<Value, null | undefined>;

        setByPath(newValue, path, newPartValue);

        return newValue;
      });
      this.syncingPaths.delete(partObservableIndex);
    });

    parts[partObservableIndex] = partObservable as ObservableValueInterface<unknown>;

    return partObservable;
  };
}
