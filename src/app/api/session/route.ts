import { verifyMessage, isAddress, type Address, type Hex } from "viem";
import { serverClient } from "@/lib/server/rpc";
import { ALL_CHAINS } from "@/lib/chains";
import { isRecord } from "@/lib/workspace-model";
import { db, secret, digest, sameOrigin, session, jsonBody, limit, HttpError, apiError } from "@/lib/server/store";
import { linkWallet, accountOf, walletsOf, roleOf } from "@/lib/server/roles";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { const address = session(request); const account = accountOf(address); return Response.json({ address, account, wallets: walletsOf(account), role: roleOf(address) }, { headers: { "cache-control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    limit("auth-global", 120);
    const body = await jsonBody(request, 8000);
    if (!isRecord(body)) throw new HttpError(400, "Invalid request.");
    const cookie = `Path=/; HttpOnly; SameSite=Strict${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
    if (body.action === "logout") {
      const token = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith("siro_session="))?.slice(13);
      if (token) db().prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
      return Response.json({ ok: true }, { headers: { "set-cookie": `siro_session=; Max-Age=0; ${cookie}` } });
    }
    if (body.action === "challenge") {
      if (typeof body.address !== "string" || !isAddress(body.address) || typeof body.chainId !== "number" || !ALL_CHAINS[body.chainId]) throw new HttpError(400, "A supported chain and wallet address are required.");
      limit(`challenge:${body.address.toLowerCase()}`, 10);
      const id = secret(), now = Date.now(), expires = now + 5 * 60_000;
      db().prepare("DELETE FROM challenges WHERE expires<?").run(now);
      db().prepare("DELETE FROM sessions WHERE expires<?").run(now);
      const origin = new URL(request.url);
      const message = `${origin.host} wants you to sign in with your Ethereum account:\n${body.address}\n\nSign in to Siro. This signature does not authorize transactions or token approvals.\n\nURI: ${origin.origin}\nVersion: 1\nChain ID: ${body.chainId}\nNonce: ${id}\nIssued At: ${new Date(now).toISOString()}\nExpiration Time: ${new Date(expires).toISOString()}`;
      db().prepare("INSERT INTO challenges(id,address,message,expires) VALUES(?,?,?,?)").run(id, body.address.toLowerCase(), message, expires);
      return Response.json({ id, message });
    }
    if (body.action === "link") {
      // Phase 13: a second wallet joins the signed-in account by signing its own challenge.
      const current = session(request);
      if (typeof body.id !== "string" || typeof body.signature !== "string" || !/^0x[0-9a-f]+$/i.test(body.signature) || body.signature.length > 2048) throw new HttpError(400, "Invalid link request.");
      const pending = db().prepare("SELECT address,message FROM challenges WHERE id=? AND expires>?").get(body.id, Date.now()) as { address: Address; message: string } | undefined;
      if (!pending) throw new HttpError(401, "Link challenge expired or already used.");
      limit(`link:${pending.address}`, 10);
      if (!await validSignature(pending.address, pending.message, body.signature as Hex)) throw new HttpError(401, "Wallet signature is invalid.");
      if (db().prepare("DELETE FROM challenges WHERE id=?").run(body.id).changes !== 1) throw new HttpError(401, "Challenge already used.");
      return Response.json({ wallets: linkWallet(current, pending.address) }, { headers: { "cache-control": "no-store" } });
    }
    if (body.action !== "verify" || typeof body.id !== "string" || typeof body.signature !== "string" || !/^0x[0-9a-f]+$/i.test(body.signature) || body.signature.length > 2048) throw new HttpError(400, "Invalid signature request.");
    const challenge = db().prepare("SELECT address,message FROM challenges WHERE id=? AND expires>?").get(body.id, Date.now()) as { address: Address; message: string } | undefined;
    if (!challenge) throw new HttpError(401, "Sign-in challenge expired or already used.");
    limit(`verify:${challenge.address}`, 10);
    if (!await validSignature(challenge.address, challenge.message, body.signature as Hex)) throw new HttpError(401, "Wallet signature is invalid.");
    if (db().prepare("DELETE FROM challenges WHERE id=?").run(body.id).changes !== 1) throw new HttpError(401, "Challenge already used.");
    const token = secret();
    db().prepare("INSERT INTO sessions(token,address,expires) VALUES(?,?,?)").run(digest(token), challenge.address, Date.now() + 7 * 86400_000);
    return Response.json({ address: challenge.address }, { headers: { "set-cookie": `siro_session=${token}; Max-Age=604800; ${cookie}`, "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}

/** EOA signatures are checked offline; anything else (ERC-1271 / ERC-6492 smart wallets) is checked
 *  against the chain named in the signed message. Malformed signatures are invalid, never a 500. */
async function validSignature(address: Address, message: string, signature: Hex): Promise<boolean> {
  try { if (await verifyMessage({ address, message, signature })) return true; } catch { /* not a plain EOA signature */ }
  const chainId = Number(/\nChain ID: (\d+)\n/.exec(message)?.[1]);
  if (!ALL_CHAINS[chainId]) return false;
  try { return await serverClient(chainId).verifyMessage({ address, message, signature }); }
  catch { return false; }
}
