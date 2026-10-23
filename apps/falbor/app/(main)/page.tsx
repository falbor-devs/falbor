'use client';
import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

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
import { getLastUsedWorkspace } from '~/lib/actions/workspaces';

// The landing page is only shown to logged-out visitors; loading it lazily
// keeps the (much heavier) workspace routes out of its compilation graph.
const LandingPageView = dynamic(() => import('~/components/landing/LandingPageView'));

import { Suspense } from 'react';
import { chatStore } from '~/lib/stores/chat';

function PageContent() {
  const { started } = useStore(chatStore);
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAiSidebarOpen = useStore(aiSidebarStore.isOpen);

  const containerRef = useRef<HTMLDivElement>(null);

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

  const isChatIdPage = pathname.startsWith('/chat/') || pathname.includes('/new/');
  const isWorkspacePage = pathname.startsWith('/workspace/');
  const isAgentRoute = /^\/workspace\/[^/]+\/agent(?:\/|$)/.test(pathname);
  const isDarkBgPage = isChatIdPage || isWorkspacePage;

  useEffect(() => {
    if (isAgentRoute && aiSidebarStore.isOpen.get()) aiSidebarStore.close();
  }, [isAgentRoute]);

  if (loading || (user && pathname === '/')) {
    return (
      <div className={`flex flex-col h-full w-full relative ${isDarkBgPage ? 'bg-[#F7FAFB] dark:bg-[#080808]' : ''}`}>
        {!isDarkBgPage && <BackgroundRays key={pathname} />}
        <Header />
      </div>
    );
  }

  if (!user) {
    return <LandingPageView />;
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
          style={{ width: !isAgentRoute && isAiSidebarOpen ? `calc(${100 - sidebarWidthPercent}% - 5px)` : '100%' }}
          className={`h-full min-w-0 bg-[#f7f7f8] dark:bg-[#1A1A1A] overflow-hidden ${isDragging ? 'transition-none' : 'transition-[width] duration-200'
            }`}
        >
          <div className={`flex flex-col h-full w-full relative overflow-hidden ${isDarkBgPage ? 'bg-white dark:bg-[#212121]' : 'bg-white dark:bg-[#080808]'}`}>
            {!isDarkBgPage && !started && <BackgroundRays key={pathname} />}
            {!isWorkspacePage && <Header />}
            <ClientOnly fallback={<BaseChat />}>
              {() => <Chat />}
            </ClientOnly>
          </div>
        </div>

        {!isAgentRoute && isAiSidebarOpen && (
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

        {!isAgentRoute && (
          <AISidebar
            isDragging={isDragging}
            style={{
              width: isAiSidebarOpen ? `calc(${sidebarWidthPercent}% - 5px)` : 0,
              minWidth: isAiSidebarOpen ? '240px' : 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
export default function Page() { return <Suspense fallback={null}><PageContent /></Suspense>; }