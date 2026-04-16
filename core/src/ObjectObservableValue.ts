import { getByPath, isDeepEqual, setByPath } from "./_utils";
import type { SetFunction } from "./isSetFunction";
import type { Subscriber } from "./Observable";
import { ObservableValue, type ObservableValueInterface } from "./ObservableValue";
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

  subscribe = (subscriber: Subscriber<Value>) => {
    return this.observable.subscribe(subscriber);
  };

  next = async (value: Value | SetFunction<Value>) => {
    return await this.observable.next(value);
  };

  getValue = () => {
    return this.observable.getValue();
  };

  private pathToPartIndex = (path: ObjectPaths<Value> | string[]): string => {
    if (typeof path === "string") {
      return path;
    }

    return path.join(".");
  };

  getPartObservable = (path: ObjectPaths<Value> | string[]) => {
    const partObservableIndex = this.pathToPartIndex(path);
    const parts = this.partsObservables as PartsMap;

    if (parts[partObservableIndex] !== undefined) {
      return parts[partObservableIndex] as ObservableValueInterface<ObjectPart<Value, typeof path>>;
    }

    const partObservable = new ObservableValue(
      getByPath(this.getValue(), path) ?? {},
    ) as unknown as ObservableValueInterface<ObjectPart<Value, typeof path>>;

    this.subscribe((newValue) => {
      if (this.syncingPaths.has(partObservableIndex)) return;
      partObservable.next(getByPath(newValue, path) as ObjectPart<Value, typeof path>);
    });

    partObservable.subscribe(async (newPartValue) => {
      if (this.syncingPaths.has(partObservableIndex)) return;
      if (isDeepEqual(getByPath(this.getValue(), path), newPartValue)) return;
      this.syncingPaths.add(partObservableIndex);
      try {
        await this.next((currentvalue) => {
          const newValue = structuredClone(currentvalue ?? {}) as Exclude<Value, null | undefined>;

          setByPath(newValue, path, newPartValue);

          return newValue;
        });
      } finally {
        this.syncingPaths.delete(partObservableIndex);
      }
    });

    parts[partObservableIndex] = partObservable as ObservableValueInterface<unknown>;

    return partObservable;
  };
}
