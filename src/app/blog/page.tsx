import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";
import { allPosts, formatDate } from "@/lib/posts";

export const metadata = {
  title: "Blog | Siro",
  description: "Writing from Siro on verifiable trading agents, onchain risk limits and tokenized stocks on Robinhood Chain.",
};

export default function Page() {
  const posts = allPosts();
  return (
    <ProsePage eyebrow="Writing" title="Blog" lede="Writing about how Siro works and where it can fail.">
      {posts.length === 0 ? (
        <p>No articles are published yet.</p>
      ) : (
        posts.map((p) => (
          <article key={p.slug}>
            <h2><Link href={`/blog/${p.slug}`}>{p.title}</Link></h2>
            <p><time dateTime={p.date}>{formatDate(p.date)}</time></p>
            <p>{p.excerpt.slice(0, 220).trimEnd()}…</p>
          </article>
        ))
      )}
    </ProsePage>
  );
}
