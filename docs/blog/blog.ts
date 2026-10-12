export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  coverImage?: string;
  mdPath: string;
}

const posts: BlogPost[] = [
  {
    slug: "how-to-build-a-website",
    title: "How to Build a Website with Falbor",
    description:
      "A complete guide to going from idea to live website using Falbor's AI-powered builder.",
    date: "2026-09-22",
    author: "Falbor Team",
    coverImage: "/landing/blog/how-to-build-a-website-cover.png",
    mdPath: "Docs/blog/how-to-build-a-website.md",
  },
];

export function getAllPosts(): BlogPost[] {
  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
