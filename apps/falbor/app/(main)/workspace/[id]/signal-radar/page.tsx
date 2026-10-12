import { getWorkspaceById } from '~/lib/actions/workspaces';
import Page from '../../../page';

export default async function WorkspaceSignalRadarPage({ params }: { params: { id: string } }) {
  await getWorkspaceById(params.id);
  return <Page />;
}
