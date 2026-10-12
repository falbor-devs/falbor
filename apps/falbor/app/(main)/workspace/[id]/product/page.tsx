import Page from '../../../page';
import { getWorkspaceById } from '~/lib/actions/workspaces';

export default async function WorkspaceProductsPage({ params }: { params: { id: string } }) {
  await getWorkspaceById(params.id);

  return <Page />;
}
