import test from "node:test";
import assert from "node:assert/strict";
import { assertConfirmedReceipt } from "../services/execution/receipt.mjs";
const hash="0x"+"ab".repeat(32),receipt={status:"success",blockHash:hash,blockNumber:10n},block={hash};
test("confirmed receipt passes; reorg cannot produce an accepted fill",()=>{assert.equal(assertConfirmedReceipt(receipt,block,11n,2),true);assert.throws(()=>assertConfirmedReceipt(receipt,{hash:"0x"+"cd".repeat(32)},11n,2));});
test("missing RPC receipt, revert and insufficient confirmation fail closed",()=>{assert.throws(()=>assertConfirmedReceipt(null,block,11n,2));assert.throws(()=>assertConfirmedReceipt({...receipt,status:"reverted"},block,11n,2));assert.throws(()=>assertConfirmedReceipt(receipt,block,10n,2));});
