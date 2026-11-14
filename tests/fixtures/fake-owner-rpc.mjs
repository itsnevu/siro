// Test fixture: JSON-RPC server answering eth_call (owner()) with the address in the file given as
// argv[2]; an absent file means "RPC error". Prints its port on stdout.
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";

const ownerFile = process.argv[2];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", d => { body += d; });
  req.on("end", () => {
    const { id } = JSON.parse(body);
    const owner = existsSync(ownerFile) ? readFileSync(ownerFile, "utf8").trim() : "";
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(owner
      ? { jsonrpc: "2.0", id, result: "0x" + "0".repeat(24) + owner.slice(2) }
      : { jsonrpc: "2.0", id, error: { code: -32000, message: "unavailable" } }));
  });
});
server.listen(0, "127.0.0.1", () => process.stdout.write(`${server.address().port}\n`));
