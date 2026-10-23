import assert from "node:assert/strict";
import test from "node:test";
import {
  DerivedObservableValue,
  Observable,
  ObservableValue,
  type Subscriber,
  Subscription,
  type SubscriptionInterface,
} from "../src/index.ts";

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

test("ObservableValue — émet les nouvelles valeurs", () => {
  const obs = new ObservableValue(0);
  const received: number[] = [];

  obs.subscribe((v) => received.push(v));
  obs.next(1);
  obs.next(2);

  assert.deepEqual(received, [0, 1, 2]);
});

test("ObservableValue — ignore les mises à jour avec la même valeur (deep equal)", () => {
  const obs = new ObservableValue({ a: 1 });
  const received: object[] = [];

  obs.subscribe((v) => received.push(v));
  obs.next({ a: 1 });

  assert.equal(received.length, 1);
});

test("ObservableValue — supporte les setters fonctionnels", () => {
  const obs = new ObservableValue(10);
  const received: number[] = [];

  obs.subscribe((v) => received.push(v));
  obs.next((prev) => prev + 5);

  assert.deepEqual(received, [10, 15]);
});

test("ObservableValue — unsubscribe stoppe les notifications", () => {
  const obs = new ObservableValue(0);
  const received: number[] = [];

  const sub = obs.subscribe((v) => received.push(v));
  sub.unsubscribe();
  obs.next(1);

  assert.deepEqual(received, [0]);
});

test("DerivedObservableValue — synchronise bidirectionnellement", () => {
  const source = new ObservableValue(42);
  const derived = new DerivedObservableValue<string, number>(
    source,
    (n) => String(n),
    (s) => Number(s),
  );

  assert.equal(derived.getValue(), "42");

  source.next(100);
  assert.equal(derived.getValue(), "100");

  derived.next("200");
  assert.equal(source.getValue(), 200);
});

test("Observable — un subscriber abonné deux fois n'est retiré qu'une fois par unsubscribe", () => {
  const obs = new Observable<number>();
  const received: number[] = [];
  const subscriber = (v: number) => received.push(v);

  const first = obs.subscribe(subscriber);
  obs.subscribe(subscriber);
  first.unsubscribe();
  first.unsubscribe();
  obs.next(1);

  assert.deepEqual(received, [1]);
});

/** Source équivalente à un ObservableValue, qui expose le nombre d'abonnements actifs. */
const spySource = <Value>(initialValue: Value) => {
  const inner = new ObservableValue(initialValue);
  const spy = {
    subscriptionCount: 0,
    getValue: inner.getValue,
    next: inner.next,
    subscribe: (subscriber: Subscriber<Value>): SubscriptionInterface => {
      spy.subscriptionCount += 1;
      const subscription = inner.subscribe(subscriber);

      return new Subscription(() => {
        spy.subscriptionCount -= 1;
        subscription.unsubscribe();
      });
    },
  };

  return spy;
};

const numberToString = (source: ReturnType<typeof spySource<number>>) =>
  new DerivedObservableValue<string, number>(
    source,
    (n) => String(n),
    (s) => Number(s),
  );

test("DerivedObservableValue — ne s'abonne à la source que tant qu'il a des abonnés", () => {
  const source = spySource(1);
  const derived = numberToString(source);

  assert.equal(source.subscriptionCount, 0);

  const first = derived.subscribe(() => {});
  assert.equal(source.subscriptionCount, 1);

  const second = derived.subscribe(() => {});
  assert.equal(source.subscriptionCount, 1);

  first.unsubscribe();
  assert.equal(source.subscriptionCount, 1);

  second.unsubscribe();
  assert.equal(source.subscriptionCount, 0);
});

test("DerivedObservableValue — se réabonne à la source après un détachement complet", () => {
  const source = spySource(1);
  const derived = numberToString(source);
  derived.subscribe(() => {}).unsubscribe();

  const received: string[] = [];
  derived.subscribe((v) => received.push(v));
  source.next(2);

  assert.equal(source.subscriptionCount, 1);
  assert.deepEqual(received, ["1", "2"]);
});

test("DerivedObservableValue — resynchronise au réabonnement sans émettre deux fois", () => {
  const source = spySource(1);
  const derived = numberToString(source);
  derived.subscribe(() => {}).unsubscribe();

  source.next(5);

  const received: string[] = [];
  derived.subscribe((v) => received.push(v));

  assert.deepEqual(received, ["5"]);
});

test("DerivedObservableValue — propage les écritures à la source sans abonné", () => {
  const source = spySource(1);
  const derived = numberToString(source);

  derived.next("7");

  assert.equal(source.getValue(), 7);
  assert.equal(source.subscriptionCount, 0);
});

test("DerivedObservableValue — n'émet pas quand deux valeurs source donnent la même valeur dérivée", () => {
  const source = spySource(1.2);
  const derived = new DerivedObservableValue<number, number>(
    source,
    (n) => Math.floor(n),
    (n) => n,
  );
  const received: number[] = [];

  derived.subscribe((v) => received.push(v));
  source.next(1.8);
  source.next(2.1);

  assert.deepEqual(received, [1, 2]);
});

test("DerivedObservableValue — une chaîne de dérivés se détache en cascade", () => {
  const source = spySource(1);
  const asString = numberToString(source);
  const asLabel = new DerivedObservableValue<string, string>(
    asString,
    (s) => `#${s}`,
    (label) => label.slice(1),
  );
  const received: string[] = [];

  const subscription = asLabel.subscribe((v) => received.push(v));
  source.next(2);
  assert.equal(source.subscriptionCount, 1);

  asLabel.next("#3");
  assert.equal(source.getValue(), 3);

  subscription.unsubscribe();
  assert.equal(source.subscriptionCount, 0);
  assert.deepEqual(received, ["#1", "#2", "#3"]);
});
