'use client';

import FeaturesHero from '~/components/landing/FeaturesHero';
import GrowthJourneySection from '~/components/landing/GrowthJourneySection';
import IntegrationsSection from '~/components/landing/IntegrationsSection';
import Footer from '~/components/landing/Footer';
import DefaultDemo from '~/components/landing/Navbar';
import { ThemeHandler } from '~/components/landing/ThemeHandler';
import { LandingScrollHandler } from '~/components/landing/landing-scroll-handler';

export default function LandingPageView() {
  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-200">
      <ThemeHandler />
      <LandingScrollHandler />
      <div className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-16px)] md:w-[calc(100%-48px)] max-w-5xl pointer-events-auto">
        <div className="w-full rounded-xl border border-zinc-200 dark:border-white/10" style={{ backdropFilter: 'blur(20px)' }}>
          <DefaultDemo />
        </div>
      </div>
      <div className="relative w-full flex flex-col items-center z-20">
        <div className="relative w-full flex items-center bg-white dark:bg-black z-0">
          <FeaturesHero />
        </div>
        <GrowthJourneySection />
      </div>
      <IntegrationsSection />
      <Footer />
    </div>
  );
}
