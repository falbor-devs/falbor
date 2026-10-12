import React, { Suspense } from 'react';
import { UpgradeView } from '~/components/billing/UpgradeView';
import { LandingScrollHandler } from '~/components/landing/landing-scroll-handler';
import DefaultDemo from '~/components/landing/Navbar';
import Footer from '~/components/landing/Footer';
import { ThemeHandler } from '~/components/landing/ThemeHandler';

export default function PricingPage() {
    const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

    return (
        <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-200">
            <ThemeHandler />
            <LandingScrollHandler />
            <div className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-16px)] md:w-[calc(100%-48px)] max-w-5xl pointer-events-auto">
                <div className="w-full rounded-xl border border-zinc-200 dark:border-white/10" style={{ backdropFilter: 'blur(20px)' }}>
                    <DefaultDemo />
                </div>
            </div>

            <main className="pt-32 pb-16 px-4 md:px-10 max-w-7xl mx-auto">
                <Suspense fallback={null}>
                    <UpgradeView paypalClientId={paypalClientId} />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}