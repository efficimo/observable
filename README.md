# @efficimo/observable

[![npm version](https://img.shields.io/npm/v/@efficimo/observable)](https://www.npmjs.com/package/@efficimo/observable)
[![npm version](https://img.shields.io/npm/v/@efficimo/observable-react?label=%40efficimo%2Fobservable-react)](https://www.npmjs.com/package/@efficimo/observable-react)
[![license](https://img.shields.io/npm/l/@efficimo/observable)](./LICENSE)
[![types](https://img.shields.io/npm/types/@efficimo/observable)](https://www.npmjs.com/package/@efficimo/observable)

> Lightweight observable state primitives for TypeScript: stateful values, bidirectional derived values, object path subscriptions, schema-validated JSON serialization, and a React hook. Zero runtime dependencies.

## Packages

| Package | Description |
|---|---|
| [`@efficimo/observable`](./core) | Core primitives — framework-agnostic |
| [`@efficimo/observable-react`](./react) | React bindings — `useObservableValueState` hook |

## Why

The observer pattern is everywhere: event emitters, stores, reactive forms, URL state sync. But most implementations are either too heavy (RxJS), too tied to a specific framework, or offer no stateful "current value" semantics.

`@efficimo/observable` provides a minimal, composable set of primitives:

- **`Observable`** — push notifications, no state
- **`ObservableValue`** — holds a current value, emits immediately on subscribe, supports functional setters, skips duplicate values via deep equality
- **`DerivedObservableValue`** — bidirectional derived value: changes in the source propagate forward, changes in the derived propagate back
- **`ObjectObservableValue`** — observe an object as a whole or any nested path independently, fully bidirectional
- **`JsonSerializeObservableValue`** — bridge between a `string | null` observable (e.g. localStorage, URL params) and a typed value, validated by any schema exposing `safeParse` (Zod, Valibot…)

## Installation

```bash
# core only
npm install @efficimo/observable

# with React hook
npm install @efficimo/observable @efficimo/observable-react
```

## Quick start

```typescript
import { ObservableValue } from '@efficimo/observable';

const count = new ObservableValue(0);

// subscribes and receives current value immediately
count.subscribe(v => console.log('count:', v)); // count: 0

count.next(1);  // count: 1

// functional setter (like React's setState)
count.next(prev => prev + 1);  // count: 2

// deep-equal check — no notification emitted
count.next(2);  // (silence)
```

---

## API

### `Observable<Value>`

Base class. Stateless push channel.

```typescript
new Observable<Value>()
```

| Member | Description |
|---|---|
| `subscribe(fn)` | Register a subscriber. Returns a `Subscription` with `unsubscribe()`. |
| `next(value)` | Notify all current subscribers. |

---

### `ObservableValue<Value>`

Extends `Observable<Value>`. Holds a current value.

```typescript
new ObservableValue<Value>(initialValue)
```

| Member | Description |
|---|---|
| `getValue()` | Returns the current value. |
| `subscribe(fn)` | Registers subscriber and **immediately calls it** with the current value. |
| `next(value \| setter)` | Updates the value. Supports a setter function `(prev) => newValue`. No-op if deep-equal to current. |

```typescript
const obs = new ObservableValue({ count: 0 });

obs.subscribe(v => console.log(v)); // { count: 0 }

obs.next({ count: 1 });       // { count: 1 }
obs.next(prev => ({ ...prev, count: prev.count + 1 })); // { count: 2 }
```

---

### `DerivedObservableValue<Value, DerivedValue>`

Extends `ObservableValue<Value>`. Bidirectional link between two observables via `from`/`to` converters.

```typescript
new DerivedObservableValue(source, from, to, defaultValue?)
```

| Parameter | Description |
|---|---|
| `source` | The upstream `ObservableValueInterface<DerivedValue>` |
| `from` | `(derivedValue: DerivedValue) => Value` — convert source → derived |
| `to` | `(value: Value) => DerivedValue` — convert derived → source |

```typescript
const source = new ObservableValue(42);
const asString = new DerivedObservableValue(
  source,
  n => String(n),
  s => Number(s),
);

source.next(100);
console.log(asString.getValue()); // "100"

asString.next("200");
console.log(source.getValue());   // 200
```

---

### `ObjectObservableValue<Value>`

Wraps an object observable with typed path-based subscriptions.

```typescript
new ObjectObservableValue<Value>(valueOrObservable)
```

| Member | Description |
|---|---|
| `getValue()` | Current object value. |
| `subscribe(fn)` | Subscribe to the full object. |
| `next(value \| setter)` | Update the full object. |
| `getPartObservable(path)` | Returns an `ObservableValue` for a nested path. Bidirectional. |

```typescript
type State = { user: { name: string; age: number } };

const state = new ObjectObservableValue<State>({ user: { name: 'Alice', age: 30 } });

const nameObs = state.getPartObservable('user.name');
nameObs.subscribe(name => console.log('name:', name)); // name: Alice

nameObs.next('Bob');
console.log(state.getValue().user.name); // Bob
```

---

### `JsonSerializeObservableValue<Value>`

Extends `DerivedObservableValue`. Serializes/deserializes JSON with schema validation. Useful for URL params, localStorage, or any string-based store.

Works with any validation library exposing a `safeParse` method (Zod, Valibot, etc.) via the structural `SafeParseSchema<Value>` interface — no direct dependency.

```typescript
new JsonSerializeObservableValue(source, schema, defaultValue?)
```

```typescript
import { z } from 'zod';
import { ObservableValue, JsonSerializeObservableValue } from '@efficimo/observable';

const raw = new ObservableValue<string | null>(null);
const filters = new JsonSerializeObservableValue(raw, z.object({ page: z.number() }));

raw.next('{"page":2}');
console.log(filters.getValue()); // { page: 2 }

filters.next({ page: 3 });
console.log(raw.getValue()); // '{"page":3}'
```

---

### `Subscription`

Returned by `subscribe()`.

| Member | Description |
|---|---|
| `unsubscribe()` | Removes the subscriber. |

---

### `isDeepEqual(a, b)`

The structural comparison used internally by `next()` to skip redundant notifications, exported for reuse.

```typescript
import { isDeepEqual } from '@efficimo/observable';

isDeepEqual({ a: [1, 2] }, { a: [1, 2] }); // true
isDeepEqual({ a: 1 }, { a: '1' });         // false
```

Recurses through plain objects and arrays, compares everything else by identity (`===`).

---

## React bindings — `@efficimo/observable-react`

```bash
npm install @efficimo/observable @efficimo/observable-react
```

### `useObservableValueState`

Drop-in replacement for `useState`, backed by an `ObservableValue`.

```typescript
import { ObservableValue } from '@efficimo/observable';
import { useObservableValueState } from '@efficimo/observable-react';

const count = new ObservableValue(0);

function Counter() {
  const [value, setValue] = useObservableValueState(count);

  return (
    <button onClick={() => setValue(prev => prev + 1)}>
      Count: {value}
    </button>
  );
}
```

Multiple components subscribing to the same `ObservableValue` stay in sync automatically. The observable lives outside React — no context, no provider, no boilerplate.

### `useObservableSync`

Read-only counterpart: subscribes to an observable and returns its current value, without a setter. Built on `useSyncExternalStore`, so it is concurrent-safe and re-renders only when the value actually changes.

```typescript
import { useObservableSync } from '@efficimo/observable-react';

function Display() {
  const value = useObservableSync(count);

  return <span>{value}</span>;
}
```

Use it when a component only reads the observable — `useObservableValueState` is `useObservableSync` plus a `setState`-style setter.

---

## Local development

This is an npm workspace: install once from the repository root, then drive each package with `-w`.

```bash
# install every workspace at once
npm ci

# core: typecheck, test, build
npm -w core run typecheck
npm -w core run test
npm -w core run build

# react bindings (build core first — they resolve it from ./core)
npm -w react run typecheck
npm -w react run build

# lint and format the whole repo
npm run lint
npm run format
```

## Publishing

Pushing a `v*` tag triggers both publish workflows; each syncs its version from the tag name.

| Tag | Publishes |
|---|---|
| `v1.2.3` | `@efficimo/observable@1.2.3` and `@efficimo/observable-react@1.2.3` |

## License

MIT
