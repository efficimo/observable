# @efficimo/observable-react

[![npm version](https://img.shields.io/npm/v/@efficimo/observable-react)](https://www.npmjs.com/package/@efficimo/observable-react)
[![license](https://img.shields.io/npm/l/@efficimo/observable-react)](./LICENSE)
[![types](https://img.shields.io/npm/types/@efficimo/observable-react)](https://www.npmjs.com/package/@efficimo/observable-react)

> React bindings for [`@efficimo/observable`](https://www.npmjs.com/package/@efficimo/observable): subscribe components to observable state with no context and no provider.

## Installation

```bash
npm install @efficimo/observable @efficimo/observable-react
```

Both `@efficimo/observable` and `react` (>=18) are peer dependencies.

## `useObservableValueState`

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

## `useObservableSync`

Read-only counterpart: subscribes to an observable and returns its current value, without a setter. Built on `useSyncExternalStore`, so it is concurrent-safe and re-renders only when the value actually changes.

```typescript
import { useObservableSync } from '@efficimo/observable-react';

function Display() {
  const value = useObservableSync(count);

  return <span>{value}</span>;
}
```

Use it when a component only reads the observable — `useObservableValueState` is `useObservableSync` plus a `setState`-style setter.

## Core primitives

`ObservableValue`, `DerivedObservableValue`, `ObjectObservableValue` and `JsonSerializeObservableValue` are documented in the [main README](https://github.com/efficimo/observable#readme).

## License

MIT
