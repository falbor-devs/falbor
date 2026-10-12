import { getWorkspaceById } from '~/lib/actions/workspaces';
import Page from '../../../page';

export default async function WorkspaceMentionsPage({ params }: { params: { id: string } }) {
  await getWorkspaceById(params.id);
  return <Page />;
}
