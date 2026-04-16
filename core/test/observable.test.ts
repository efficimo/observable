import assert from "node:assert/strict";
import test from "node:test";
import { DerivedObservableValue, Observable, ObservableValue } from "../src/index";

test("Observable — notifie les subscribers", () => {
  const obs = new Observable<number>();
  const received: number[] = [];

  const sub = obs.subscribe((v) => received.push(v));
  obs.next(1);
  obs.next(2);
  sub.unsubscribe();
  obs.next(3);

  assert.deepEqual(received, [1, 2]);
});

test("ObservableValue — émet la valeur courante à la subscription", () => {
  const obs = new ObservableValue(42);
  const received: number[] = [];

  obs.subscribe((v) => received.push(v));

  assert.deepEqual(received, [42]);
});

test("ObservableValue — émet les nouvelles valeurs", async () => {
  const obs = new ObservableValue(0);
  const received: number[] = [];

  obs.subscribe((v) => received.push(v));
  await obs.next(1);
  await obs.next(2);

  assert.deepEqual(received, [0, 1, 2]);
});

test("ObservableValue — ignore les mises à jour avec la même valeur (deep equal)", async () => {
  const obs = new ObservableValue({ a: 1 });
  const received: object[] = [];

  obs.subscribe((v) => received.push(v));
  await obs.next({ a: 1 });

  assert.equal(received.length, 1);
});

test("ObservableValue — supporte les setters fonctionnels", async () => {
  const obs = new ObservableValue(10);
  const received: number[] = [];

  obs.subscribe((v) => received.push(v));
  await obs.next((prev) => prev + 5);

  assert.deepEqual(received, [10, 15]);
});

test("ObservableValue — unsubscribe stoppe les notifications", async () => {
  const obs = new ObservableValue(0);
  const received: number[] = [];

  const sub = obs.subscribe((v) => received.push(v));
  sub.unsubscribe();
  await obs.next(1);

  assert.deepEqual(received, [0]);
});

test("DerivedObservableValue — synchronise bidirectionnellement", async () => {
  const source = new ObservableValue(42);
  const derived = new DerivedObservableValue<string, number>(
    source,
    (n) => String(n),
    (s) => Number(s),
  );

  assert.equal(derived.getValue(), "42");

  await source.next(100);
  assert.equal(derived.getValue(), "100");

  await derived.next("200");
  assert.equal(source.getValue(), 200);
});
