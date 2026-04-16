import {
  isDeepEqual,
  isSetFunction,
  type ObservableValueInterface,
  type SetFunction,
} from "@efficimo/observable";
import { useEffect, useMemo, useState } from "react";

const ObservableSetterFactory =
  <Value>(observable: ObservableValueInterface<Value>) =>
  async (valueFromParam: Value | SetFunction<Value>): Promise<void> => {
    const newValue = isSetFunction(valueFromParam)
      ? await valueFromParam(observable.getValue())
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
