import assert from "node:assert/strict";
import test from "node:test";
import { getByPath, isDeepEqual, setByPath } from "../src/_utils.ts";

// isDeepEqual
test("isDeepEqual — primitives égaux", () => {
  assert.ok(isDeepEqual(1, 1));
  assert.ok(isDeepEqual("a", "a"));
  assert.ok(isDeepEqual(null, null));
  assert.ok(isDeepEqual(undefined, undefined));
  assert.ok(isDeepEqual(true, false) === false);
  assert.ok(isDeepEqual(1, 2) === false);
});

test("isDeepEqual — objets profonds", () => {
  assert.ok(isDeepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }));
  assert.ok(!isDeepEqual({ a: 1 }, { a: 2 }));
  assert.ok(!isDeepEqual({ a: 1 }, { a: 1, b: 2 }));
});

test("isDeepEqual — tableaux", () => {
  assert.ok(isDeepEqual([1, 2, 3], [1, 2, 3]));
  assert.ok(!isDeepEqual([1, 2], [1, 2, 3]));
  assert.ok(!isDeepEqual([1], [2]));
});

test("isDeepEqual — null vs objet", () => {
  assert.ok(!isDeepEqual(null, {}));
  assert.ok(!isDeepEqual({}, null));
});

// getByPath
test("getByPath — clé simple", () => {
  assert.equal(getByPath({ a: 1 }, "a"), 1);
});

test("getByPath — chemin imbriqué", () => {
  assert.equal(getByPath({ a: { b: { c: 42 } } }, "a.b.c"), 42);
});

test("getByPath — chemin en tableau", () => {
  assert.equal(getByPath({ a: { b: 7 } }, ["a", "b"]), 7);
});

test("getByPath — chemin inexistant", () => {
  assert.equal(getByPath({ a: 1 }, "b.c"), undefined);
});

// setByPath
test("setByPath — clé simple", () => {
  const obj = { a: 1 };
  setByPath(obj, "a", 99);
  assert.equal(obj.a, 99);
});

test("setByPath — chemin imbriqué", () => {
  const obj = { a: { b: 1 } };
  setByPath(obj, "a.b", 42);
  assert.equal((obj.a as { b: number }).b, 42);
});

test("setByPath — chemin en tableau", () => {
  const obj = { x: { y: 0 } };
  setByPath(obj, ["x", "y"], 5);
  assert.equal((obj.x as { y: number }).y, 5);
});

test("setByPath — bloque __proto__", () => {
  const obj = {};
  setByPath(obj, "__proto__.polluted", true);
  assert.equal((obj as Record<string, unknown>).polluted, undefined);
});

test("setByPath — bloque constructor", () => {
  const obj = {};
  setByPath(obj, "constructor.polluted", true);
  assert.equal((obj as Record<string, unknown>).polluted, undefined);
});
