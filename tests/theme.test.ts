import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { themeInitScript } from "../lib/theme-init";
for (const [saved, osDark, expected] of [[null,true,"dark"],[null,false,"light"],["light",true,"light"],["dark",false,"dark"],["system",true,"dark"],["invalid",false,"light"]] as const) {
  test(`initial appearance: saved ${saved}, OS dark ${osDark}`, () => {
    const root = { dataset: {} as Record<string,string>, style: {} as Record<string,string> };
    runInNewContext(themeInitScript, { localStorage:{getItem:()=>saved},matchMedia:()=>({matches:osDark}),document:{documentElement:root} });
    assert.equal(root.dataset.theme,expected);assert.equal(root.style.colorScheme,expected);
    assert.equal(root.dataset.themePreference,saved === "light" || saved === "dark" ? saved : "system");
  });
}
test("blocked storage still respects system appearance before paint", () => {
  const root = {dataset:{} as Record<string,string>,style:{}};
  runInNewContext(themeInitScript,{localStorage:{getItem:()=>{throw Error("blocked")}},matchMedia:()=>({matches:false}),document:{documentElement:root}});
  assert.equal(root.dataset.theme,"light");
});
