'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function WelcomeHeader() {
  const router = useRouter();

  return (
    <header className="absolute top-0 left-0 w-full z-20 flex h-20 items-center justify-between px-8 md:px-16 border-b">
      {}
      <Link href={'/'}>
        <div className="flex gap-2">
          <img src={"/hacking/logo-light-styled.png"} alt="logo" className="w-[130px] inline-block dark:hidden" />
          <img src={"/hacking/logo-dark-styled.png"} alt="logo" className="w-[130px] hidden dark:block" />
        </div>
      </Link>

      {}
      <div className="flex gap-6">
        <button
          onClick={() => router.push('/docs/chat')}
          className="text-[14px] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          Website Builder Docs
        </button>
        <button
          onClick={() => router.push('/docs/stayup')}
          className="text-[14px] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          Organization Docs
        </button>
      </div>
    </header>
  );
}
