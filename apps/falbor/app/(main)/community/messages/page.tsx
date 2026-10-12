import { CommunityMessagesView } from '~/components/community/CommunityMessagesView';

export default function BaseCommunityMessagesPage() {
  return (
    <div className="h-screen w-full flex overflow-hidden">
      <CommunityMessagesView />
    </div>
  );
}
