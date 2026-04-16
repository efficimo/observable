import assert from "node:assert/strict";
import test from "node:test";
import { ObjectObservableValue, ObservableValue } from "../src/index";

test("ObjectObservableValue — getValue/subscribe/next sur l'objet entier", async () => {
  const obs = new ObjectObservableValue({ a: 1, b: 2 });
  const received: object[] = [];

  obs.subscribe((v) => received.push(v));
  await obs.next({ a: 10, b: 2 });

  assert.equal(received.length, 2);
  assert.deepEqual(received[1], { a: 10, b: 2 });
});

test("ObjectObservableValue — getPartObservable émet la valeur initiale", () => {
  const obs = new ObjectObservableValue({ user: { name: "Alice" } });
  const received: string[] = [];

  obs.getPartObservable("user.name")?.subscribe((v) => received.push(v as string));

  assert.deepEqual(received, ["Alice"]);
});

test("ObjectObservableValue — mise à jour de l'objet entier propage aux parts", async () => {
  const obs = new ObjectObservableValue({ x: 1, y: 2 });
  const xValues: number[] = [];

  obs.getPartObservable("x")?.subscribe((v) => xValues.push(v as number));
  await obs.next({ x: 99, y: 2 });

  assert.deepEqual(xValues, [1, 99]);
});

test("ObjectObservableValue — mise à jour d'une part propage à l'objet entier", async () => {
  const obs = new ObjectObservableValue({ x: 1, y: 2 });
  const fullValues: object[] = [];

  obs.subscribe((v) => fullValues.push({ ...(v ?? {}) }));
  await obs.getPartObservable("x")?.next(42);

  assert.equal((fullValues[fullValues.length - 1] as Record<string, number>).x, 42);
});

test("ObjectObservableValue — accepte un ObservableValue existant", async () => {
  const inner = new ObservableValue({ count: 0 });
  const obs = new ObjectObservableValue(inner);

  await inner.next({ count: 5 });
  assert.deepEqual(obs.getValue(), { count: 5 });
});

test("ObjectObservableValue — deux parts indépendantes", async () => {
  const obs = new ObjectObservableValue({ a: 1, b: 10 });
  const aValues: number[] = [];
  const bValues: number[] = [];

  obs.getPartObservable("a")?.subscribe((v) => aValues.push(v as number));
  obs.getPartObservable("b")?.subscribe((v) => bValues.push(v as number));

  await obs.getPartObservable("a")?.next(99);

  assert.deepEqual(aValues, [1, 99]);
  assert.deepEqual(bValues, [10]);
});
