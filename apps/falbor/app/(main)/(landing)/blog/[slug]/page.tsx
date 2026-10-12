import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import { getAllPosts, getPostBySlug } from "~/lib/blog";
import DefaultDemo from "~/components/landing/Navbar";
import Footer from "~/components/landing/Footer";
import { ThemeHandler } from "~/components/landing/ThemeHandler";

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

import { getPublicBlogById } from "~/lib/actions/blogContent";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (post) {
    return {
      title: `${post.title} — Falbor Blog`,
      description: post.description,
    };
  }
  const dbBlog = await getPublicBlogById(params.slug);
  if (dbBlog) {
    return {
      title: `${dbBlog.title} | Blog`,
      description: dbBlog.content.replace(/<[^>]*>/g, '').slice(0, 160),
    };
  }
  return {};
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  let dbBlog: any = null;
  if (!post) {
    dbBlog = await getPublicBlogById(params.slug);
    if (!dbBlog) notFound();
  }

  let content = "";
  if (post) {
    let filePath = path.join(process.cwd(), post.mdPath);
    if (!fs.existsSync(filePath)) {
      // Try resolving case-insensitively for docs folder
      filePath = path.join(process.cwd(), post.mdPath.replace('/Docs/', '/docs/'));
    }
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      content = matter(raw).content;
    }
  }

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-200">
      <ThemeHandler />
      <div className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-16px)] md:w-[calc(100%-48px)] max-w-5xl pointer-events-auto">
        <div className="w-full rounded-xl border border-zinc-200 dark:border-white/10" style={{ backdropFilter: "blur(20px)" }}>
          <DefaultDemo />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 pt-40 pb-24">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <time className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              {new Date(post ? post.date : dbBlog.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{post ? post.author : "Official Blog"}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white leading-snug">
            {post ? post.title : dbBlog.title}
          </h1>
          {post && (
            <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {post.description}
            </p>
          )}
        </div>

        {dbBlog ? (
          <div
            className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 leading-7 space-y-4"
            dangerouslySetInnerHTML={{ __html: dbBlog.content }}
          />
        ) : (
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mt-10 mb-4 tracking-tight">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mt-10 mb-4 tracking-tight">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8 mb-3">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-zinc-600 dark:text-zinc-400 leading-7 mb-5">{children}</p>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-zinc-900 dark:text-white underline underline-offset-4 hover:opacity-70 transition-opacity">{children}</a>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-5 text-zinc-600 dark:text-zinc-400 space-y-1.5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-5 text-zinc-600 dark:text-zinc-400 space-y-1.5">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="leading-7">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-4 my-6 text-zinc-500 dark:text-zinc-400 italic">{children}</blockquote>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <code className="block bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 overflow-x-auto mb-5 font-mono leading-6">{children}</code>
                  );
                }
                return (
                  <code className="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="mb-5">{children}</pre>
              ),
              hr: () => (
                <hr className="border-zinc-200 dark:border-zinc-800 my-10" />
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="border-b border-zinc-200 dark:border-zinc-800">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-white">{children}</th>
              ),
              td: ({ children }) => (
                <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-900">{children}</td>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-900 dark:text-white">{children}</strong>
              ),
              img: ({ src, alt }) => (
                <img src={src} alt={alt} className="rounded-lg w-full object-cover my-6 border border-zinc-200 dark:border-zinc-800" />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </main>

      <Footer />
    </div>
  );
}
