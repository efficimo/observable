// Prevents prototype pollution attacks on path-based setters
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;

  const isArrayA = Array.isArray(a);
  const isArrayB = Array.isArray(b);
  if (isArrayA !== isArrayB) return false;

  if (isArrayA && isArrayB) {
    if (a.length !== b.length) return false;
    return (a as unknown[]).every((item, i) => isDeepEqual(item, (b as unknown[])[i]));
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) =>
    isDeepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

export function getByPath(obj: unknown, path: string | string[]): unknown {
  const keys = Array.isArray(path) ? path : path.split(".");
  return keys.reduce<unknown>(
    (acc, key) => (acc != null ? (acc as Record<string, unknown>)[key] : undefined),
    obj,
  );
}

export function setByPath(obj: unknown, path: string | string[], value: unknown): void {
  const keys = Array.isArray(path) ? path : path.split(".");
  if (keys.some((k) => UNSAFE_KEYS.has(k))) return;

  const last = keys[keys.length - 1];
  const parent = keys.slice(0, -1).reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);

  if (parent != null && typeof parent === "object" && last !== undefined) {
    (parent as Record<string, unknown>)[last] = value;
  }
}
