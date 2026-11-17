import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const context = { exports: {} };
if (fs.existsSync("src/lib/plan-benefits.ts")) {
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/plan-benefits.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
}

test("unconfigured application benefits stay unset; empty validity means no expiry", () => {
  const parse = context.exports.parseApplicationBenefits;
  assert.equal(typeof parse, "function");
  assert.equal(JSON.stringify(parse("", "")), '{"application_units":null,"application_validity_days":null}');
  assert.equal(JSON.stringify(parse("12", "")), '{"application_units":12,"application_validity_days":null}');
  assert.equal(JSON.stringify(parse("12", "30")), '{"application_units":12,"application_validity_days":30}');
});

test("application benefits reject fractional, negative, overflowing and partial numbers", () => {
  const parse = context.exports.parseApplicationBenefits;
  assert.equal(typeof parse, "function");
  for (const input of ["0", "-1", "1.5", "1e2", "12days", "2147483648"]) {
    assert.throws(() => parse(input, "30"));
    assert.throws(() => parse("12", input));
  }
  assert.throws(() => parse("", "30"));
  assert.throws(() => parse("1000001", "30"));
  assert.throws(() => parse("12", "36501"));
});
