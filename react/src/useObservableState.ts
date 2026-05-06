import {
  isDeepEqual,
  isSetFunction,
  type ObservableValueInterface,
  type SetFunction,
} from "@efficimo/observable";
import { useEffect, useMemo, useState } from "react";

const ObservableSetterFactory =
  <Value>(observable: ObservableValueInterface<Value>) =>
  (valueFromParam: Value | SetFunction<Value>): void => {
    const newValue = isSetFunction(valueFromParam)
      ? valueFromParam(observable.getValue())
      : valueFromParam;

    observable.next(newValue);
  };

export const useObservableValueState = <Value>(
  observable: ObservableValueInterface<Value>,
): [Value, ReturnType<typeof ObservableSetterFactory<Value>>] => {
  const [state, setState] = useState<Value>(observable.getValue());

  useEffect(() => {
    const subscription = observable.subscribe((nextValue) => {
      setState((prevState) => (!isDeepEqual(prevState, nextValue) ? nextValue : prevState));
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, [observable]);

  return useMemo(() => [state, ObservableSetterFactory(observable)], [state, observable]);
};
