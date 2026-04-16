export type SetFunction<Value> = (prevValue: Value) => Value | Promise<Value>;

export const isSetFunction = <Value>(
  value: Value | SetFunction<Value>,
): value is SetFunction<Value> => typeof value === "function";
