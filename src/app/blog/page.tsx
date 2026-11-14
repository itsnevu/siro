import Link from "next/link";
import "@/styles/siro.css";
import "@/styles/prose.css";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { allPosts, formatDate } from "@/lib/posts";

export const metadata = {
  title: "Blog  Siro",
  description:
    "Writing from Siro on verifiable trading agents, onchain risk limits and tokenized stocks on Robinhood Chain.",
};

export default function Page() {
  const posts = allPosts();
  return (
    <>
      <div className="rusd-shell p2p-app-shell editorial-site">
        <Header />
        <main className="rusd-frame rusd-main siro-doc" data-tone="light" id="main-content">
          <header className="blog-index-heading">
            <p className="siro-doc-eyebrow">Writing</p>
            <h1>Blog</h1>
            <p className="siro-doc-lede">
              Writing about how Siro works and where it can fail.
            </p>
          </header>

          {posts.length === 0 && <p>No articles are published yet.</p>}
          <div className="blog-archive">
            {posts.map((p) => (
              <article key={p.slug}>
                <time dateTime={p.date}>{formatDate(p.date)}</time>
                <div>
                  <h2>
                    <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                  </h2>
                  <p>{p.excerpt.slice(0, 220).trimEnd()}…</p>
                </div>
              </article>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}

