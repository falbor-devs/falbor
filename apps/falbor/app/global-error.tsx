"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 border border-zinc-800 p-8 rounded-2xl bg-zinc-900/50 backdrop-blur-md">
          <h2 className="text-2xl font-bold">Critical Application Error</h2>
          <p className="text-sm text-zinc-400">
            A critical error occurred. Please refresh the page or return home.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => reset()}
              className="px-4 py-2 text-sm bg-accent-500 hover:bg-accent-600 rounded-lg font-medium transition-colors"
            >
              Try again
            </button>
            <a
              href="/"
              className="px-4 py-2 text-sm border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
