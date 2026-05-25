import type { ObservableValueInterface } from "@efficimo/observable";
import { useCallback, useSyncExternalStore } from "react";

export const useObservableSync = <Value>(observable: ObservableValueInterface<Value>): Value => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let initialized = false;
      const subscription = observable.subscribe(() => {
        if (!initialized) {
          initialized = true;
          return;
        }
        onStoreChange();
      });
      return () => subscription.unsubscribe();
    },
    [observable],
  );
  const getSnapshot = useCallback(() => observable.getValue(), [observable]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
