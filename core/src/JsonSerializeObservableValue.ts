import { DerivedObservableValue } from "./DerivedObservableValue.ts";
import type { ObservableValueInterface } from "./ObservableValue.ts";

/** Structural interface compatible with Zod, Valibot, and any library exposing safeParse. */
export interface SafeParseSchema<Value> {
  safeParse(data: unknown): { data?: Value };
}

export class JsonSerializeObservableValue<Value> extends DerivedObservableValue<
  Value | null,
  string | null
> {
  constructor(
    source: ObservableValueInterface<string | null>,
    schema: SafeParseSchema<Value>,
    defaultValue?: Value,
  ) {
    super(
      source,
      (derivedValue: string | null) =>
        derivedValue === null ? null : (schema.safeParse(JSON.parse(derivedValue)).data ?? null),
      (value) => (value == null ? null : JSON.stringify(value)),
      defaultValue ?? null,
    );
  }
}
