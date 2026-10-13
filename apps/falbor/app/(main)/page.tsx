'use client';
import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { BaseChat } from '~/components/chat/core/BaseChat';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { Menu } from '~/components/sidebar/Menu.client';
import { Chat } from '~/components/chat/core/Chat.client';
import { AISidebar } from '~/components/ai-side/AISidebar';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { useAuth } from '~/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { LandingScrollHandler } from "~/components/landing/landing-scroll-handler";
import { ThemeHandler } from "~/components/landing/ThemeHandler";
import { getLastUsedWorkspace } from '~/lib/actions/workspaces';
import FeaturesHero from "~/components/landing/FeaturesHero";
import GrowthJourneySection from "~/components/landing/GrowthJourneySection";
import BuilderJourneySection from "~/components/landing/BuilderJourneySection";
import IdeaToMVPSection from "~/components/landing/IdeaToMVPSection";
import Footer from "~/components/landing/Footer";
import FeatureCard from '~/components/landing/FeatureCard';
import { featuresData } from '~/components/landing/FeatureData';
import DefaultDemo from "~/components/landing/Navbar";
import TestimonialsSection from "~/components/landing/TestimonialsSection";
import AgentPaceSection from "~/components/landing/AgentPaceSection";
import FalborRoadSection from "~/components/landing/FalborRoadSection";
import HowItWorksSection from "~/components/landing/HowItWorksSection";
import IntegrationsSection from "~/components/landing/IntegrationsSection";
import PricingSection from "~/components/landing/PricingSection";
import StartFreeSection from "~/components/landing/StartFreeSection";
import AgentFeaturesSection from "~/components/landing/AgentFeaturesSection";

const SECTIONS = ["Builder", "Database", "Organizations", "Workflow", "Darknet"];
const TOTAL = SECTIONS.length;
const SECTION_SPAN = 1 / TOTAL;
const FADE_SPAN = 0.08;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function getOpacity(progress: number, sectionIndex: number): number {


  const start = sectionIndex * SECTION_SPAN;
  const end = start + FADE_SPAN;
  return lerp(0, 1, (progress - start) / FADE_SPAN);
}

function getBlur(progress: number, sectionIndex: number): string {
  const start = sectionIndex * SECTION_SPAN;
  const end = start + FADE_SPAN;
  const t = Math.max(0, Math.min(1, (progress - start) / FADE_SPAN));
  const blur = lerp(16, 0, t);
  return `blur(${blur.toFixed(1)}px)`;
}

import { Suspense } from 'react';
import { chatStore } from '~/lib/stores/chat';
import { TabsWithSlider } from '~/components/ui';

function PageContent() {
  const { started } = useStore(chatStore);
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAiSidebarOpen = useStore(aiSidebarStore.isOpen);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card4Ref = useRef<HTMLDivElement>(null);
  const card5Ref = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [activeSection, setActiveSection] = useState(0);
  const [sidebarWidthPercent, setSidebarWidthPercent] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('falbor_ai_sidebar_width');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 50) return parsed;
      }
    }
    return 20;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('falbor_ai_sidebar_width', String(sidebarWidthPercent));
    }
  }, [sidebarWidthPercent]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left;
      const newPercent = Math.max(12, Math.min(50, ((containerRect.width - relativeX) / containerRect.width) * 100));
      setSidebarWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (user && pathname === '/' && !loading) {
      if (user.role === "marketer") {
        router.push("/b2b");
        return;
      }
      getLastUsedWorkspace().then(workspace => {
        if (workspace) {
          router.push(`/workspace/${workspace.id}`);
        } else {
          router.push(`/workspace/welcome`);
        }
      });
      return;
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    if (pathname.startsWith('/workspace/')) {
      const parts = pathname.split('/');
      const workspaceId = parts[2];
      if (workspaceId && workspaceId !== 'new' && workspaceId !== aiSidebarStore.currentWorkspaceId.get()) {
        aiSidebarStore.setWorkspace(workspaceId, [], null, 'Onboarding');
      }
    }
  }, [pathname]);

  const scrollToSection = (i: number) => {
    const container = scrollContainerRef.current;
    const track = bookContainerRef.current;
    if (!container || !track) return;
    const trackTop = track.offsetTop;
    const trackHeight = track.offsetHeight;
    const containerH = container.clientHeight;
    const fraction = (i * SECTION_SPAN) + 0.01;
    container.scrollTo({
      top: trackTop + fraction * (trackHeight - containerH),
      behavior: 'smooth',
    });
  };

  const isChatIdPage = pathname.startsWith('/chat/') || pathname.includes('/new/');
  const isWorkspacePage = pathname.startsWith('/workspace/');
  const isDarkBgPage = isChatIdPage || isWorkspacePage;
  const landingTabs = [
    { id: "business", label: "For Businesses" },
    { id: "marketers", label: "For Marketers" },
  ];

  const handleTabChange = (tabId: string) => {
    if (tabId === "marketers") {
      router.push("/marketers");
    }
  };
  if (loading || (user && pathname === '/')) {
    return (
      <div className={`flex flex-col h-full w-full relative ${isDarkBgPage ? 'bg-[#F7FAFB] dark:bg-[#080808]' : ''}`}>
        {!isDarkBgPage && <BackgroundRays key={pathname} />}
        <Header />
      </div>
    );
  }

  if (!user) {
    return (
      <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-200">
        <ThemeHandler />
        <LandingScrollHandler />
        <div className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-16px)] md:w-[calc(100%-48px)] max-w-5xl pointer-events-auto">
          <div className="w-full rounded-xl border border-zinc-200 dark:border-white/10" style={{ backdropFilter: 'blur(20px)' }}>
            <DefaultDemo />
          </div>
          <div className="w-full flex items-center justify-center">
            <TabsWithSlider
              tabs={landingTabs}
              activeTab="marketers"
              onChange={handleTabChange}
              className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 w-fit flex items-center justify-center"
              sliderClassName="bg-white dark:bg-zinc-800 shadow-sm rounded-lg"
              activeTabClassName="text-zinc-900 dark:text-white"
              tabClassName="text-zinc-500 dark:text-zinc-400 border-0 bg-transparent dark:bg-transparent"
            />
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

  const isNewWorkspaceChat = pathname.includes('/workspace/') && pathname.includes('/new/');
  const isHideSidebar = pathname.startsWith('/chat/') || isNewWorkspaceChat;

  return (
    <div className="flex flex-row h-[100dvh] w-full overflow-hidden bg-[#f7f7f8] dark:bg-[#1A1A1A]">
      <div className='py-1'>
        {!isHideSidebar && <ClientOnly>{() => <Menu />}</ClientOnly>}
      </div>
      <div ref={containerRef} className="flex flex-row w-full h-full overflow-hidden relative">
        <div
          style={{ width: isAiSidebarOpen ? `calc(${100 - sidebarWidthPercent}% - 5px)` : '100%' }}
          className={`h-full min-w-0 bg-[#f7f7f8] dark:bg-[#1A1A1A] overflow-hidden ${isDragging ? 'transition-none' : 'transition-[width] duration-200'
            }`}
        >
          <div className={`flex flex-col h-full w-full relative border border-gray-300 dark:border-gray-700 border-t-0 border-b-0 overflow-hidden ${isDarkBgPage ? 'bg-white dark:bg-[#212121]' : 'bg-white dark:bg-[#080808]'}`}>
            {!isDarkBgPage && !started && <BackgroundRays key={pathname} />}
            {!isWorkspacePage && <Header />}
            <ClientOnly fallback={<BaseChat />}>
              {() => <Chat />}
            </ClientOnly>
          </div>
        </div>

        {isAiSidebarOpen && (
          <div
            className="w-[10px] cursor-col-resize z-[100] flex justify-center items-center select-none shrink-0 relative"
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div
              className={`h-full w-full transition-colors ${isDragging || isHovered ? 'bg-[#8882]' : 'bg-transparent'
                }`}
            />
          </div>
        )}

        <AISidebar
          isDragging={isDragging}
          style={{
            width: isAiSidebarOpen ? `calc(${sidebarWidthPercent}% - 5px)` : 0,
            minWidth: isAiSidebarOpen ? '240px' : 0,
          }}
        />
      </div>
    </div>
  );
}
export default function Page() { return <Suspense fallback={null}><PageContent /></Suspense>; }