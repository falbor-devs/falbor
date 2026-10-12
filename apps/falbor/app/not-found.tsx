import Link from "next/link";
import { Button } from "~/components/ui/Button";

export default function NotFound() {
  return (
    <div
      className="dark min-h-[100dvh] w-full flex flex-col justify-center items-center bg-cover bg-center bg-no-repeat p-4"
      style={{ backgroundImage: "url('/background/auth.png')" }}
    >
      <div className="w-full max-w-md bg-black/60 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="flex justify-center">
          <img src="/logo-dark-styled.png" alt="Falbor" className="w-28" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">404</h1>
          <h2 className="text-xl font-semibold text-zinc-200">Page not found</h2>
          <p className="text-sm text-zinc-400">
            Sorry, we couldn&apos;t find the page you are looking for.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/" className="w-full text-white cursor-pointer bg-[#F16602]">
            <Button>
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}