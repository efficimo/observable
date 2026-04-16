export type ObjectPaths<T> =
  T extends Array<infer U>
    ? `${ObjectPaths<U>}`
    : T extends object
      ? {
          [K in keyof T & (string | number)]: K extends string
            ? `${K}` | `${K}.${ObjectPaths<T[K]>}`
            : never;
        }[keyof T & (string | number)]
      : never;

type ObjectPartByPartArray<T, PartArray extends string[]> = PartArray extends [
  infer First,
  ...infer Rest,
]
  ? First extends keyof Exclude<T, undefined | null>
    ? Rest extends string[]
      ?
          | ObjectPartByPartArray<Exclude<T, undefined | null>[First], Rest>
          | (T extends undefined | null ? undefined : never)
      : never
    : undefined
  : T;

type StringToObjectKeyPart<Path extends string> = Path extends `${infer First}.${infer Rest}`
  ? [First, ...StringToObjectKeyPart<Rest>]
  : [Path];

export type ObjectPart<T, Path extends ObjectPaths<T> | string[]> = Path extends string[]
  ? ObjectPartByPartArray<T, Path>
  : Path extends string
    ? StringToObjectKeyPart<Path> extends string[]
      ? ObjectPartByPartArray<T, StringToObjectKeyPart<Path>>
      : never
    : never;
