import '@unocss/reset/tailwind.css';
import './_styles/globals.css';
import './styles/index.scss';
import { AuthProvider } from './hooks/useAuth';
import { StorageSync } from './lib/auth/StorageSync';
import { ThemeSync } from './components/ui/ThemeSync.client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { StayUpInit } from './components/stayup/StayUpInit.client';
import { Montserrat } from 'next/font/google';
import { inter } from './_styles/fonts/inter/inter';
import { season } from './_styles/fonts/season/season';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const AIOperator = dynamic(
  () => import('./components/operator/AIOperator').then((mod) => mod.AIOperator),
  { ssr: false }
);

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata = {
  title: 'Falbor',
  description: 'Talk with Falbor, an AI assistant',
};

export default function FalborLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  let theme = localStorage.getItem('falbor_theme');
                  if (!theme) {
                    theme = 'light';
                    localStorage.setItem('falbor_theme', theme);
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
                
                function isWasmErr(msg) {
                  const s = String(msg || '');
                  return s.indexOf('DataCloneError') !== -1 || s.indexOf('WebAssembly.Memory') !== -1 || s.indexOf('staticblitz') !== -1;
                }
                window.addEventListener('error', function(e) {
                  if (isWasmErr(e.message) || isWasmErr(e.error)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  if (isWasmErr(e.reason)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className={`${season.variable} ${inter.variable} ${montserrat.className} ${montserrat.variable}`}>
        <ThemeSync />
        <StayUpInit />
        <Toaster position="bottom-right" toastOptions={{ className: 'dark:bg-zinc-800 dark:text-white' }} />
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ""}>
          <AuthProvider>
            <StorageSync />
            {children}
            {/* <AIOperator /> */}
          </AuthProvider>
        </GoogleOAuthProvider>
        <Analytics />
      </body>
    </html>
  );
}