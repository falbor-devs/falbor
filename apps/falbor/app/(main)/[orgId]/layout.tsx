import React from 'react';
import { Header } from '~/components/header/Header';
import { ClientSidebar } from '~/components/sidebar/ClientSidebar';

export default async function StayUpLayout({ children, params }: { children: React.ReactNode, params: { orgId: string } }) {
  return (
    <div className="flex flex-row h-[100dvh] w-full overflow-hidden bg-[#FFFFFF] dark:bg-[#09090b]">
      <ClientSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full w-full relative">
        <Header />
        <main className="flex-1 overflow-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
