// The session-key UI writes its ABI by hand. A typo would make "Revoke all session keys" fail
// silently in the wallet. This checks every UI fragment against the compiled contract ABI.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { parseAbi, toFunctionSelector } from "viem";

const compiled = "contracts/out/SessionExecutor.sol/SessionExecutor.json";

test("every SessionKeyControls ABI fragment exists in the compiled SessionExecutor", { skip: !existsSync(compiled) && "run forge build first" }, () => {
  const ui = readFileSync("src/components/app/SessionKeyControls.tsx", "utf8").match(/"function [^"]+"/g).map(s => JSON.parse(s));
  const real = new Set(JSON.parse(readFileSync(compiled, "utf8")).abi.filter(x => x.type === "function").map(f => toFunctionSelector(f)));
  for (const item of parseAbi(ui)) assert.ok(real.has(toFunctionSelector(item)), `UI calls ${item.name} with a signature the contract does not have`);
  assert.ok(ui.some(s => s.startsWith("function revokeAll()")), "UI exposes revokeAll");
});
