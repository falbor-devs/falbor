import Link from "next/link";
import { getAllPosts } from "~/lib/blog";
import DefaultDemo from "~/components/landing/Navbar";
import Footer from "~/components/landing/Footer";
import { ThemeHandler } from "~/components/landing/ThemeHandler";

export const metadata = {
  title: "Blog — Falbor",
  description: "Guides, updates, and deep-dives from the Falbor team.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-200">
      <ThemeHandler />
      <div className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-16px)] md:w-[calc(100%-48px)] max-w-5xl pointer-events-auto">
        <div className="w-full rounded-xl border border-zinc-200 dark:border-white/10" style={{ backdropFilter: "blur(20px)" }}>
          <DefaultDemo />
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 pt-40 pb-24">
        <div className="mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-zinc-400 dark:text-zinc-500">Blog</span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            From the Falbor team
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400 max-w-xl">
            Guides, product updates, and deep-dives on building with AI.
          </p>
        </div>

        <div className="grid gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-white/20 transition-all duration-200 overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <time className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                    {post.author}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors mb-2">
                  {post.title}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  {post.description}
                </p>
                <span className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-zinc-900 dark:text-white">
                  Read article
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
