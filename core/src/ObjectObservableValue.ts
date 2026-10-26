import { getByPath, isDeepEqual, setByPath } from "./_utils.ts";
import { isSetFunction, type SetFunction } from "./isSetFunction.ts";
import type { Subscriber } from "./Observable.ts";
import { ObservableValue, type ObservableValueInterface } from "./ObservableValue.ts";
import type { SubscriptionInterface } from "./Subscription.ts";
import type { ObjectPart, ObjectPaths } from "./types.ts";

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

/** Reads `path` out of a parent value, falling back to `defaultValue` only when nothing is there. */
const readPart = <PartValue>(
  parentValue: unknown,
  path: string | string[],
  defaultValue: PartValue | undefined,
): PartValue => {
  const pathValue = getByPath(parentValue, path);

  return (pathValue !== undefined ? pathValue : defaultValue) as PartValue;
};

/**
 * Bidirectional view over one `path` of a parent object observable, which holds the state: the
 * part is read back from the parent and memoized, so `getValue()` stays exact — and stable by
 * reference — whether or not this observable has subscribers. The subscription to the parent
 * only lives as long as this part is itself subscribed to, so a part that nobody observes
 * anymore does not keep the parent — nor, through it, whatever the parent wraps — awake. The
 * `value` field inherited from `ObservableValue` is never read.
 */
class PartObservableValue<
  ParentValue extends object | undefined | null,
  PartValue,
> extends ObservableValue<PartValue> {
  #parent: ObservableValueInterface<ParentValue>;
  #path: string | string[];
  #defaultValue: PartValue | undefined;
  #partValue: PartValue;
  #parentSubscription: SubscriptionInterface | null = null;

  constructor(
    parent: ObservableValueInterface<ParentValue>,
    path: string | string[],
    defaultValue?: PartValue,
  ) {
    const partValue = readPart<PartValue>(parent.getValue(), path, defaultValue);

    super(partValue);
    this.#parent = parent;
    this.#path = path;
    this.#defaultValue = defaultValue;
    this.#partValue = partValue;
  }

  /** Reads through to the parent, and keeps the previous reference when the part is unchanged. */
  #read = (parentValue: ParentValue): PartValue => {
    const partValue = readPart<PartValue>(parentValue, this.#path, this.#defaultValue);

    if (!isDeepEqual(partValue, this.#partValue)) {
      this.#partValue = partValue;
    }

    return this.#partValue;
  };

  getValue = (): PartValue => {
    return this.#read(this.#parent.getValue());
  };

  next = (value: PartValue | SetFunction<PartValue>): void => {
    const currentValue = this.getValue();
    const newPartValue = isSetFunction(value) ? value(currentValue) : value;

    if (isDeepEqual(currentValue, newPartValue)) {
      return;
    }

    // Writing to the parent is enough: while subscribed, the value comes back through
    // #parentSubscription, which notifies our own subscribers.
    this.#parent.next((currentParentValue) => {
      const newParentValue = structuredClone(currentParentValue ?? {}) as Exclude<
        ParentValue,
        null | undefined
      >;

      setByPath(newParentValue, this.#path, newPartValue);

      return newParentValue;
    });
  };

  protected onFirstSubscriber(): void {
    this.#parentSubscription = this.#parent.subscribe((parentValue) => {
      const previousValue = this.#partValue;
      const partValue = this.#read(parentValue);

      if (!Object.is(partValue, previousValue)) {
        this.notify(partValue);
      }
    });
  }

  protected onLastUnsubscribe(): void {
    this.#parentSubscription?.unsubscribe();
    this.#parentSubscription = null;
  }
}

export class ObjectObservableValue<Value extends object | undefined | null>
  implements ObservableValueInterface<Value>
{
  private readonly partsObservables: {
    [path in ObjectPaths<Value>]?: ObservableValueInterface<ObjectPart<Value, path>>;
  } = {};

  private readonly observable: ObservableValueInterface<Value>;

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

    const partObservable = new PartObservableValue(
      this.observable,
      path,
      defaultValue,
    ) as unknown as ObservableValueInterface<ObjectPart<Value, typeof path>>;

    parts[partObservableIndex] = partObservable as ObservableValueInterface<unknown>;

    return partObservable;
  };
}
