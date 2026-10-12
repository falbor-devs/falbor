'use client';
import Link from 'next/link';
import { Badge } from '../ui';

export default function Footer() {
  return (
    <div className='p-4 px-5'>
      <footer className="rounded-lg border border-zinc-200 dark:border-white/5 w-full bg-zinc-50 dark:bg-black pt-16 pb-8 px-6 text-zinc-500 dark:text-white/60 relative z-20 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">

          { }
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo-light-styled.png" alt="Falbor Logo" className="w-40 object-contain inline-block dark:hidden" />
              <img src="/logo-dark-styled.png" alt="Falbor Logo" className="w-40 object-contain hidden dark:block" />
            </div>
            <p className="text-sm max-w-md text-zinc-500 dark:text-white/60">
              What happens when you finish building?<br />
              We help you all the way to make your business successful.
            </p>
          </div>

          { }
          <div className="flex flex-col md:flex-row gap-8 md:gap-16">
            <div className="flex flex-col gap-3">
              <h4 className="text-zinc-900 dark:text-white font-medium mb-1">Product</h4>
              <Link href="/" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">Marketing</Link>
              <Link href="/builder" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">Website Builder</Link>
              <Link href="/enterprise" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">Enterprise</Link>
              <Link href="/pricing" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">Pricing</Link>
              {/*status.falbor.xyz*/}<Link href="/" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">Status <Badge variant="secondary">Soon</Badge></Link>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-zinc-900 dark:text-white font-medium mb-1">Company</h4>
              <Link href="/about" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">About</Link>
              { }
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-zinc-900 dark:text-white font-medium mb-1">Resources</h4>
              <Link href="/blog" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">Blog</Link>
              <Link href="https://discord.gg/QNjRTTqjQd" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">Discord</Link>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-zinc-900 dark:text-white font-medium mb-1">Legal</h4>
              <Link href="/privacy" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-sm hover:text-zinc-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-zinc-200 dark:border-white/5">
          <p className="text-sm">© {new Date().getFullYear()} Falbor. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://x.com/WrRbybw84381" target="_blank" className="hover:scale-110 transition-transform">
              <img src="/landing/social/X.png" alt="X" className="w-6 h-6 object-contain dark:invert-0 invert" />
            </a>
            <a href="https://www.instagram.com/falbor.xyz" target="_blank" className="hover:scale-110 transition-transform">
              <img src="/landing/social/instagram.png" alt="Instagram" className="w-6 h-6 object-contain" />
            </a>
            <a href="https://www.linkedin.com/company/falbor-xyz" target="_blank" className="hover:scale-110 transition-transform">
              <img src="/landing/social/linkdin.png" alt="LinkedIn" className="w-6 h-6 object-contain" />
            </a>
            <a href="https://www.tiktok.com/@falbor.xyz" target="_blank" className="hover:scale-110 transition-transform">
              <img src="/landing/social/tiktok.png" alt="TikTok" className="w-6 h-6 object-contain" />
            </a>
          </div>
          <a href="https://ufind.best/products/falbor" target="_blank" rel="noopener"><img src="https://ufind.best/badges/ufind-best-badge-light.svg" alt="Featured on ufind.best" width="150" className="dark:invert-0" /></a>
        </div>
      </footer>
    </div>
  );
}
