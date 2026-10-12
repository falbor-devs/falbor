import Link from 'next/link';
import './global.css';
import { Navbar } from '@/components/navbar/navbar';
import { Footer } from '@/components/footer/footer';

import { DOCS_CONFIG } from '@/lib/docs-config';

const SIDEBAR_ITEMS = DOCS_CONFIG.filter(
  (item) => item.category === 'Documentation'
);

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] antialiased" suppressHydrationWarning>
        <div className="flex min-h-screen flex-col">
          <Navbar />

          <div className="flex flex-1 w-full max-w-[1400px] mx-auto px-6">
            {/* Docs Sidebar */}
            <aside className="w-60 flex-shrink-0 py-8 pr-6 hidden md:flex flex-col gap-6 sticky top-[100px] h-[calc(100vh-100px)] overflow-y-auto">
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                  Documentation Nav
                </h3>
                <nav className="flex flex-col gap-1 text-sm">
                  {DOCS_CONFIG.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-md px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    >
                      {item.title}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto py-8 px-10 min-w-0">
              {children}
            </main>
          </div>

          <Footer />
        </div>
      </body>
    </html>
  );
}



