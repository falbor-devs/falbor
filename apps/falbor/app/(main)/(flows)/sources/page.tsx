'use client';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { SourcesChat } from '~/components/sources/SourcesChat.client';
import { useAuth } from '~/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function SourcesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
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
        {() => <SourcesChat />}
      </ClientOnly>
    </div>
  );
}
