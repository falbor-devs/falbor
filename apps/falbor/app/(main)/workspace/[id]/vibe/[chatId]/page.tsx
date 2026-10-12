import Page from '../../page';

export default function WorkspaceChatPage({ params }: { params: { id: string; chatId: string } }) {
  return <Page params={params} />;
}
