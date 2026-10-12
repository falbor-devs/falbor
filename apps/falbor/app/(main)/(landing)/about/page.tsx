'use client';
import { ThemeHandler } from "~/components/landing/ThemeHandler";
import { LandingScrollHandler } from "~/components/landing/landing-scroll-handler";
import DefaultDemo from "~/components/landing/Navbar";
import AboutFalborSection from "~/components/landing/AboutFalborSection";
import Footer from "~/components/landing/Footer";

export default function AboutPage() {
  return (
    <div className="dark absolute inset-0 overflow-y-auto overflow-x-hidden bg-black text-white">
      <ThemeHandler force="dark" />
      <LandingScrollHandler />

      {}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-48px)] max-w-5xl pointer-events-auto">
        <div
          className="w-full rounded-xl overflow-hidden shadow-2xl border border-white/10 [&_.backdrop-blur-md]:bg-transparent [&_.border-b]:border-white/10 [&_.text-black]:text-white [&_.text-black\/80]:text-white/80 [&_.hover\\:text-black\/70]:hover:text-white/70 [&_.border-zinc-200]:border-white/10"
          style={{ backdropFilter: 'blur(20px)', background: 'rgba(10,10,10,0.8)' }}
        >
          <DefaultDemo />
        </div>
      </div>

      <div className="relative w-full flex flex-col items-center z-20">
        <div className="flex-grow w-full flex flex-col items-center justify-center">
          <AboutFalborSection />
        </div>
      </div>
      <Footer />
    </div>
  );
}
