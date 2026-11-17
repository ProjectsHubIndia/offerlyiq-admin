import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const compile = (path) => ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const benefits = { exports: {} };
vm.runInNewContext(compile("src/lib/plan-benefits.ts"), benefits);
const compiled = compile("src/app/plans/page.tsx");
function harness(role = "superadmin", units = null, validity = null, prices = []) {
  const plan = { id: "fixture-plan", code: "launch", name: "Launch", credits_granted: 120, application_units: units, application_validity_days: validity, status: "draft", prices, credit_validity_days: 30 };
  const slots = [], calls = [], priceCalls = [], errors = [];
  let plansUnavailable = false;
  let cursor = 0, effects = [], tree;
  const exports = {};
  const jsx = (type, props) => typeof type === "function" ? type(props) : { type, props };
  vm.runInNewContext(compiled, { exports, console: { error() {} }, require(name) {
    if (name === "react") return {
      useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => slots[i] = typeof value === "function" ? value(slots[i]) : value]; },
      useEffect(fn) { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(fn); } },
    };
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "@/components/layout/admin-session-provider") return { useAdminSession: () => ({ user: { role } }) };
    if (name === "@/lib/auth") return { getAccessToken: () => "fixture-token" };
    if (name === "@/lib/plan-benefits") return benefits.exports;
    if (name === "@/lib/utils") return { getApiErrorDetail: error => error.message, getApiErrorStatus: () => undefined };
    if (name === "sonner") return { toast: { error: message => errors.push(message), success() {} } };
    if (name === "@/lib/api") return { admin: {
      getPlans: async () => { if (plansUnavailable) throw new Error("Synthetic service unavailable"); return [plan]; }, getFeatures: async () => [], getBillingCosts: async () => [],
      updatePlan: async (...args) => calls.push(args),
      updatePlanPrices: async (...args) => priceCalls.push(args), publishPlan: async () => {},
    } };
    return new Proxy({}, { get: (_, key) => key });
  } });
  const render = () => { cursor = 0; effects = []; tree = exports.default(); effects.forEach(fn => fn()); return tree; };
  return { calls, priceCalls, errors, render, failPlanLoad: value => plansUnavailable = value, tree: () => tree, settle: async () => { await new Promise(resolve => setImmediate(resolve)); return render(); } };
}
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : !node || typeof node !== "object" ? [] : [node, ...nodes(node.props?.children)];
const text = node => Array.isArray(node) ? node.map(text).join("") : node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : text(node.props?.children);
const button = (h, label) => nodes(h.tree()).find(node => node.type === "Button" && text(node).trim() === label);
const field = (h, id) => nodes(h.tree()).find(node => node.props?.id === id);

test("ordinary admin cannot edit benefits or publish plans", async () => {
  const h = harness("admin"); h.render(); await h.settle();
  for (const label of ["Create Plan", "Benefits", "Publish", "Prices", "Features"]) assert.equal(button(h, label).props.disabled, true, label);
  button(h, "Benefits").props.onClick(); h.render();
  assert.equal(field(h, "edit-benefits-units"), undefined);
});

test("Super Admin saves explicit application benefits without changing credits", async () => {
  const h = harness(); h.render(); await h.settle();
  button(h, "Benefits").props.onClick(); h.render();
  assert.equal(field(h, "edit-benefits-units").props.value, "");
  assert.match(text(h.tree()), /Blank means no expiry/);
  field(h, "edit-benefits-units").props.onChange({ target: { value: "12" } }); h.render();
  field(h, "edit-benefits-days").props.onChange({ target: { value: "30" } }); h.render();
  await button(h, "Save Changes").props.onClick(); await h.settle();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][1].application_units, 12);
  assert.equal(h.calls[0][1].application_validity_days, 30);
  assert.equal(h.calls[0][1].credits_granted, 120);
});

test("invalid application input is reported without sending a plan mutation", async () => {
  const h = harness(); h.render(); await h.settle();
  button(h, "Benefits").props.onClick(); h.render();
  field(h, "edit-benefits-units").props.onChange({ target: { value: "1.5" } }); h.render();
  await button(h, "Save Changes").props.onClick();
  assert.equal(h.calls.length, 0);
  assert.match(h.errors[0], /whole number/);
});

test("failed plan reads show an actionable error and recover without an empty catalog claim", async () => {
  const h = harness(); h.failPlanLoad(true); h.render(); await h.settle();
  assert.match(text(h.tree()), /Unable to load plans/);
  assert.doesNotMatch(text(h.tree()), /No plans found/);
  h.failPlanLoad(false); await button(h, "Retry plans").props.onClick(); await h.settle();
  assert.match(text(h.tree()), /Launch/);
  assert.doesNotMatch(text(h.tree()), /Unable to load plans/);
});

for (const [currency, country] of [["CLP", "CL"], ["VND", "VN"]]) {
  test(`${currency} price editor preserves whole-unit amounts and saves their exact minor units`, async () => {
    const h = harness("superadmin", null, null, [
      { currency_code: "USD", amount_minor: 999, country_codes: [] },
      { currency_code: currency, amount_minor: 10000, compare_at_amount_minor: 15000, country_codes: [country] },
    ]);
    h.render(); await h.settle(); button(h, "Prices").props.onClick(); h.render();
    const inputs = nodes(h.tree()).filter(node => node.type === "input" && node.props.type === "number");
    assert.equal(inputs[2].props.value, "10000");
    assert.equal(inputs[3].props.value, "15000");
    assert.equal(inputs[2].props.step, "1");
    inputs[2].props.onChange({ target: { value: "12000" } }); h.render();
    await button(h, "Save & Publish").props.onClick(); await h.settle();
    assert.deepEqual(h.errors, []);
    assert.equal(h.priceCalls[0][1][1].amount_minor, 12000);
    assert.equal(h.priceCalls[0][1][1].compare_at_amount_minor, 15000);
  });
}

test("Eurozone shortcut includes Bulgaria and keeps existing countries unique", async () => {
  const h = harness("superadmin", null, null, [
    { currency_code: "USD", amount_minor: 999, country_codes: [] },
    { currency_code: "EUR", amount_minor: 999, country_codes: ["DE"] },
  ]);
  h.render(); await h.settle(); button(h, "Prices").props.onClick(); h.render();
  const shortcut = nodes(h.tree()).find(node => node.type === "button" && text(node).includes("Eurozone"));
  assert.match(text(shortcut), /21/);
  shortcut.props.onClick(); h.render();
  await button(h, "Save & Publish").props.onClick(); await h.settle();
  assert.deepEqual(h.errors, []);
  const countries = h.priceCalls[0][1][1].country_codes;
  assert.equal(countries.includes("BG"), true);
  assert.equal(countries.length, 21);
  assert.equal(new Set(countries).size, 21);
});
