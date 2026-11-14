import { createPublicClient, http, parseAbi, toFunctionSelector } from "viem";
process.loadEnvFile(".env.local");
const client = createPublicClient({ transport: http(process.env.ALCHEMY_RPC_URL_4663, { timeout: 10_000, retryCount: 0 }) });
const address = "0xcaf681a66d020601342297493863e78c959e5cb2";
const code = await client.getCode({ address });
for (const fn of ["factoryV3", "factory", "factoryV2", "WETH9"]) {
  const signature = `${fn}()`;
  try { const value = await client.readContract({ address, abi: parseAbi([`function ${fn}() view returns (address)`]), functionName: fn }); console.log({ getter: signature, selectorInCode: code.includes(toFunctionSelector(signature).slice(2)), value }); }
  catch { console.log({ getter: signature, selectorInCode: code.includes(toFunctionSelector(signature).slice(2)), unavailable: true }); }
}
