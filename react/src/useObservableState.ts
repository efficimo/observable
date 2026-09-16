import {
  isSetFunction,
  type ObservableValueInterface,
  type SetFunction,
} from "@efficimo/observable";
import { useMemo } from "react";
import { useObservableSync } from "./useObservableSync.ts";

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
  const state = useObservableSync(observable);

  return useMemo(() => [state, ObservableSetterFactory(observable)], [state, observable]);
};
