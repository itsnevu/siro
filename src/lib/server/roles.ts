// Phase 13: accounts, roles and wallet linking (wallet login only).
//   viewer   anyone; public pages and read APIs need no account
//   operator a signed-in wallet acting on a vault it owns on chain (checked per action)
//   admin    a wallet in SIRO_ADMIN_ADDRESSES; may change risk parameters
// One wallet belongs to exactly one account. A second wallet joins an account only by signing a
// challenge while the account is signed in.
import { db, HttpError } from "./store";

export type Role = "viewer" | "operator" | "admin";

function ensure() {
  db().exec(`CREATE TABLE IF NOT EXISTS account_wallets(wallet TEXT PRIMARY KEY, account TEXT NOT NULL, linked_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, who TEXT NOT NULL, field TEXT NOT NULL, old_value TEXT, new_value TEXT, reason TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS admin_audit_append_only BEFORE UPDATE ON admin_audit BEGIN SELECT RAISE(ABORT, 'admin_audit is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS admin_audit_no_delete BEFORE DELETE ON admin_audit BEGIN SELECT RAISE(ABORT, 'admin_audit is append-only'); END;`);
}

export const admins = (env = process.env.SIRO_ADMIN_ADDRESSES) => new Set((env ?? "").split(",").map(a => a.trim().toLowerCase()).filter(a => /^0x[0-9a-f]{40}$/.test(a)));

/** The account a wallet belongs to: its own address unless it was linked to another account. */
export function accountOf(wallet: string): string {
  ensure();
  const w = wallet.toLowerCase();
  const row = db().prepare("SELECT account FROM account_wallets WHERE wallet=?").get(w) as { account: string } | undefined;
  return row?.account ?? w;
}

export function walletsOf(account: string): string[] {
  ensure();
  const rows = db().prepare("SELECT wallet FROM account_wallets WHERE account=? ORDER BY linked_at").all(account.toLowerCase()) as { wallet: string }[];
  return [account.toLowerCase(), ...rows.map(r => r.wallet).filter(w => w !== account.toLowerCase())];
}

/** Admin if any wallet of the signed-in account is allowlisted; otherwise operator-capable. */
export function roleOf(signedIn: string | null, adminSet = admins()): Role {
  if (!signedIn) return "viewer";
  return walletsOf(accountOf(signedIn)).some(w => adminSet.has(w)) ? "admin" : "operator";
}

export function requireRole(signedIn: string | null, role: Role) {
  const have = roleOf(signedIn);
  const rank: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };
  if (rank[have] < rank[role]) throw new HttpError(403, `This action requires the ${role} role.`);
}

/** Link `wallet` to the signed-in account. The caller must already have verified wallet's signature. */
export function linkWallet(signedIn: string, wallet: string) {
  ensure();
  const account = accountOf(signedIn), w = wallet.toLowerCase();
  if (w === account) throw new HttpError(400, "This wallet is already the account's primary wallet.");
  const existing = db().prepare("SELECT account FROM account_wallets WHERE wallet=?").get(w) as { account: string } | undefined;
  if (existing) throw new HttpError(409, existing.account === account ? "Wallet already linked to this account." : "This wallet belongs to another account. One wallet, one account.");
  if ((db().prepare("SELECT count(*) AS n FROM account_wallets WHERE account=?").get(w) as { n: number }).n > 0) throw new HttpError(409, "This wallet is the primary wallet of another account.");
  db().prepare("INSERT INTO account_wallets(wallet,account,linked_at) VALUES(?,?,?)").run(w, account, Date.now());
  return walletsOf(account);
}

export function audit(who: string, field: string, oldValue: unknown, newValue: unknown, reason: string) {
  ensure();
  if (!reason.trim()) throw new HttpError(400, "A reason is required for every change.");
  db().prepare("INSERT INTO admin_audit(at,who,field,old_value,new_value,reason) VALUES(?,?,?,?,?,?)").run(Date.now(), who.toLowerCase(), field, JSON.stringify(oldValue ?? null), JSON.stringify(newValue ?? null), reason.slice(0, 500));
}
export function auditLog(limitRows = 100) {
  ensure();
  return db().prepare("SELECT at,who,field,old_value,new_value,reason FROM admin_audit ORDER BY id DESC LIMIT ?").all(limitRows);
}
