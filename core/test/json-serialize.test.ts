import assert from "node:assert/strict";
import test from "node:test";
import { JsonSerializeObservableValue, ObservableValue } from "../src/index.ts";

/** Mini-schema pour les tests — pas de dépendance zod. */
function schema<T>(parse: (v: unknown) => T | undefined) {
  return {
    safeParse: (data: unknown) => {
      try {
        const result = parse(data);
        return result !== undefined ? { data: result } : {};
      } catch {
        return {};
      }
    },
  };
}

const numberSchema = schema<number>((v) => (typeof v === "number" ? v : undefined));
const objectSchema = schema<{ page: number }>((v) => {
  if (
    v &&
    typeof v === "object" &&
    "page" in v &&
    typeof (v as { page: unknown }).page === "number"
  ) {
    return v as { page: number };
  }
  return undefined;
});

test("JsonSerializeObservableValue — désérialise une string JSON", () => {
  const raw = new ObservableValue<string | null>('{"page":2}');
  const obs = new JsonSerializeObservableValue(raw, objectSchema);

  assert.deepEqual(obs.getValue(), { page: 2 });
});

test("JsonSerializeObservableValue — sérialise une valeur vers string", () => {
  const raw = new ObservableValue<string | null>(null);
  const obs = new JsonSerializeObservableValue(raw, objectSchema);

  obs.next({ page: 5 });
  assert.equal(raw.getValue(), '{"page":5}');
});

test("JsonSerializeObservableValue — null source → null valeur", () => {
  const raw = new ObservableValue<string | null>(null);
  const obs = new JsonSerializeObservableValue(raw, numberSchema);

  assert.equal(obs.getValue(), null);
});

test("JsonSerializeObservableValue — null valeur → null source", () => {
  const raw = new ObservableValue<string | null>("42");
  const obs = new JsonSerializeObservableValue(raw, numberSchema);

  obs.next(null);
  assert.equal(raw.getValue(), null);
});

test("JsonSerializeObservableValue — JSON invalide → null (safeParse échoue)", () => {
  const raw = new ObservableValue<string | null>('"not-a-number"');
  const obs = new JsonSerializeObservableValue(raw, numberSchema);

  assert.equal(obs.getValue(), null);
});

test("JsonSerializeObservableValue — mise à jour de raw propage au dérivé", () => {
  const raw = new ObservableValue<string | null>(null);
  const obs = new JsonSerializeObservableValue(raw, numberSchema);
  const received: (number | null)[] = [];

  obs.subscribe((v) => received.push(v));
  raw.next("7");

  assert.deepEqual(received, [null, 7]);
});
