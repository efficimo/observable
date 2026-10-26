import assert from "node:assert/strict";
import test from "node:test";
import {
  DerivedObservableValue,
  ObjectObservableValue,
  ObservableValue,
  type Subscriber,
  Subscription,
  type SubscriptionInterface,
} from "../src/index.ts";

test("ObjectObservableValue — getValue/subscribe/next sur l'objet entier", () => {
  const obs = new ObjectObservableValue({ a: 1, b: 2 });
  const received: object[] = [];

  obs.subscribe((v) => received.push(v));
  obs.next({ a: 10, b: 2 });

  assert.equal(received.length, 2);
  assert.deepEqual(received[1], { a: 10, b: 2 });
});

test("ObjectObservableValue — getPartObservable émet la valeur initiale", () => {
  const obs = new ObjectObservableValue({ user: { name: "Alice" } });
  const received: string[] = [];

  obs.getPartObservable("user.name")?.subscribe((v) => received.push(v as string));

  assert.deepEqual(received, ["Alice"]);
});

test("ObjectObservableValue — mise à jour de l'objet entier propage aux parts", () => {
  const obs = new ObjectObservableValue({ x: 1, y: 2 });
  const xValues: number[] = [];

  obs.getPartObservable("x")?.subscribe((v) => xValues.push(v as number));
  obs.next({ x: 99, y: 2 });

  assert.deepEqual(xValues, [1, 99]);
});

test("ObjectObservableValue — mise à jour d'une part propage à l'objet entier", () => {
  const obs = new ObjectObservableValue({ x: 1, y: 2 });
  const fullValues: object[] = [];

  obs.subscribe((v) => fullValues.push({ ...(v ?? {}) }));
  obs.getPartObservable("x")?.next(42);

  assert.equal((fullValues[fullValues.length - 1] as Record<string, number>).x, 42);
});

test("ObjectObservableValue — accepte un ObservableValue existant", () => {
  const inner = new ObservableValue({ count: 0 });
  const obs = new ObjectObservableValue(inner);

  inner.next({ count: 5 });
  assert.deepEqual(obs.getValue(), { count: 5 });
});

test("ObjectObservableValue — getPartObservable utilise la valeur par défaut si le chemin est absent", () => {
  const obs = new ObjectObservableValue<{ x?: number }>({});
  const received: number[] = [];

  obs.getPartObservable("x", 99)?.subscribe((v) => received.push(v as number));

  assert.deepEqual(received, [99]);
});

test("ObjectObservableValue — getPartObservable avec defaultValue non-null, next(null) conserve null", () => {
  const obs = new ObjectObservableValue<{ x?: number | null }>({});
  const received: (number | null)[] = [];

  const part = obs.getPartObservable("x", 99);
  part?.subscribe((v) => received.push(v as number | null));
  part?.next(null);

  assert.deepEqual(received, [99, null]);
});

test("ObjectObservableValue — getPartObservable avec defaultValue non-null, next global avec clef à null conserve null", () => {
  const obs = new ObjectObservableValue<{ x?: number | null }>({});
  const received: (number | null)[] = [];

  obs.getPartObservable("x", 99)?.subscribe((v) => received.push(v as number | null));
  obs.next({ x: null });

  assert.deepEqual(received, [99, null]);
});

test("ObjectObservableValue — getPartObservable avec defaultValue null conserve null", () => {
  const obs = new ObjectObservableValue<{ x?: number | null }>({});
  const received: (number | null)[] = [];

  obs.getPartObservable("x", null)?.subscribe((v) => received.push(v as number | null));

  assert.deepEqual(received, [null]);
});

test("ObjectObservableValue — deux parts indépendantes", () => {
  const obs = new ObjectObservableValue({ a: 1, b: 10 });
  const aValues: number[] = [];
  const bValues: number[] = [];

  obs.getPartObservable("a")?.subscribe((v) => aValues.push(v as number));
  obs.getPartObservable("b")?.subscribe((v) => bValues.push(v as number));

  obs.getPartObservable("a")?.next(99);

  assert.deepEqual(aValues, [1, 99]);
  assert.deepEqual(bValues, [10]);
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

test("ObjectObservableValue — une part ne s'abonne à l'observable enveloppé que tant qu'elle a des abonnés", () => {
  const source = spySource({ a: 1 });
  const obs = new ObjectObservableValue(source);
  const part = obs.getPartObservable(["a"]);

  assert.equal(source.subscriptionCount, 0);

  const first = part?.subscribe(() => {});
  assert.equal(source.subscriptionCount, 1);

  const second = part?.subscribe(() => {});
  assert.equal(source.subscriptionCount, 1);

  first?.unsubscribe();
  assert.equal(source.subscriptionCount, 1);

  second?.unsubscribe();
  assert.equal(source.subscriptionCount, 0);
});

test("ObjectObservableValue — une part sans abonné lit et écrit sans jamais s'abonner", () => {
  const source = spySource({ a: 1 });
  const obs = new ObjectObservableValue(source);
  const part = obs.getPartObservable(["a"]);

  assert.equal(source.subscriptionCount, 0);
  assert.equal(part?.getValue(), 1);

  // La lecture reste exacte quand la source change sous une part non observée.
  source.next({ a: 2 });
  assert.equal(part?.getValue(), 2);

  // L'écriture atteint l'objet parent sans passer par un abonnement.
  part?.next(3);
  assert.deepEqual(source.getValue(), { a: 3 });
  assert.equal(source.subscriptionCount, 0);
});

test("ObjectObservableValue — écrire dans une part notifie l'autre part, et l'autrice une seule fois", () => {
  const obs = new ObjectObservableValue({ a: 1, b: 10 });
  const aValues: number[] = [];
  const bValues: number[] = [];

  const partA = obs.getPartObservable("a");
  const partB = obs.getPartObservable("b");
  partA?.subscribe((v) => aValues.push(v as number));
  partB?.subscribe((v) => bValues.push(v as number));

  partA?.next(99);

  assert.deepEqual(aValues, [1, 99]);
  assert.deepEqual(bValues, [10]);
  assert.deepEqual(obs.getValue(), { a: 99, b: 10 });
});

test("ObjectObservableValue — une part relâche la source dérivée qu'elle enveloppe", () => {
  const source = spySource({ a: 1 });
  const derived = new DerivedObservableValue<{ a: number }, { a: number }>(
    source,
    (value) => value,
    (value) => value,
  );
  const obs = new ObjectObservableValue(derived);
  const part = obs.getPartObservable(["a"]);

  const subscription = part?.subscribe(() => {});
  assert.equal(source.subscriptionCount, 1);

  subscription?.unsubscribe();
  assert.equal(source.subscriptionCount, 0);
});

test("ObjectObservableValue — des consommateurs successifs ne laissent aucun abonnement derrière eux", () => {
  const source = spySource({ a: 1 });

  for (let consumer = 0; consumer < 5; consumer++) {
    const derived = new DerivedObservableValue<{ a: number }, { a: number }>(
      source,
      (value) => value,
      (value) => value,
    );
    const obs = new ObjectObservableValue(derived);
    const part = obs.getPartObservable(["a"]);

    part?.subscribe(() => {}).unsubscribe();
  }

  assert.equal(source.subscriptionCount, 0);
});

test("ObjectObservableValue — une part se réabonne après un détachement complet", () => {
  const source = spySource({ a: 1 });
  const obs = new ObjectObservableValue(source);
  const part = obs.getPartObservable(["a"]);
  part?.subscribe(() => {}).unsubscribe();

  const received: number[] = [];
  part?.subscribe((v) => received.push(v as number));
  source.next({ a: 2 });

  assert.equal(source.subscriptionCount, 1);
  assert.deepEqual(received, [1, 2]);
});

test("ObjectObservableValue — getValue() d'une part garde la même référence tant que la part ne change pas", () => {
  const obs = new ObjectObservableValue({ a: { x: 1 }, b: 2 });
  const partA = obs.getPartObservable(["a"]);
  const partB = obs.getPartObservable(["b"]);
  const notified: unknown[] = [];

  partA?.subscribe((v) => notified.push(v));
  const before = partA?.getValue();

  // Écrire dans une autre part reconstruit l'objet parent, donc remplace la référence
  // de `a` par une copie deep-equal : la part A n'a pas changé pour autant.
  partB?.next(3);

  assert.ok(Object.is(partA?.getValue(), before));
  assert.equal(notified.length, 1);
});

test("ObjectObservableValue — getValue() d'une part suit le parent sans abonné et reste stable", () => {
  const source = spySource({ a: { x: 1 } });
  const obs = new ObjectObservableValue(source);
  const part = obs.getPartObservable(["a"]);

  const before = part?.getValue();
  assert.deepEqual(before, { x: 1 });

  // Une valeur deep-equal ne doit pas changer la référence rendue…
  source.next({ a: { x: 1 }, extra: true } as unknown as { a: { x: number } });
  assert.ok(Object.is(part?.getValue(), before));

  // …mais un vrai changement doit être visible.
  source.next({ a: { x: 2 } });
  assert.deepEqual(part?.getValue(), { x: 2 });
  assert.equal(source.subscriptionCount, 0);
});
