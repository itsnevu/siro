import { getRobinhoodAssets } from "@/lib/robinhood";

export async function GET() {
  try {
    const assets = await getRobinhoodAssets();
    return Response.json({ source: "https://api.robinhood.com/rhj/assets", chainId: 4663, assets });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load assets" }, { status: 502 });
  }
}
