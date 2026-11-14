import { notFound, redirect } from "next/navigation";
export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; if (!/^[1-9][0-9]*$/.test(slug)) notFound(); redirect(`/strategies/${slug}`); }
