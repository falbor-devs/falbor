'use client';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { SourcesChat } from '~/components/sources/SourcesChat.client';
import { useAuth } from '~/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { InvestigationState } from '~/lib/sources/types';

export default function SourcesDetailsPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [initialData, setInitialData] = useState<InvestigationState | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetch(`/api/sources-investigations/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setInitialData(data.state);
        setIsFetching(false);
      })
      .catch(() => {
        router.push('/sources'); 
      });
  }, [user, params.id, router]);

  if (loading || isFetching) {
    return (
      <div className="flex flex-col h-full w-full bg-falbor-elements-background items-center justify-center">
        <span className="i-ph:circle-notch w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex h-full w-full bg-falbor-elements-background">
      <ClientOnly fallback={
        <div className="flex items-center justify-center h-full w-full">
          <span className="i-ph:circle-notch w-8 h-8 animate-spin text-gray-500" />
        </div>
      }>
        {() => <SourcesChat initialData={initialData} investigationId={params.id} />}
      </ClientOnly>
    </div>
  );
}
