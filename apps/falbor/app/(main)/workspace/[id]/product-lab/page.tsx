import { redirect } from "next/navigation";
import { ProductLabPageShell } from "~/components/workspace/product-lab/ProductLabPageShell";
import { getWorkspaceById } from "~/lib/actions/workspaces";
import {
  getOrCreateProductLabProject,
  getProductLabSimulationDetails,
  listProductLabSimulations,
} from "~/lib/actions/productLab";

export default async function ProductLabPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { simulation?: string };
}) {
  const workspace = await getWorkspaceById(params.id);
  if (!workspace) redirect("/");
  const project = await getOrCreateProductLabProject(params.id);
  const simulations = await listProductLabSimulations(params.id);
  const details = await getProductLabSimulationDetails(
    params.id,
    searchParams?.simulation,
  );
  return (
    <ProductLabPageShell
      workspaceId={params.id}
      initialProject={project}
      initialSimulations={simulations as any}
      initialAgents={details.agents as any}
      initialRelationships={details.relationships as any}
      initialInteractions={details.interactions as any}
      initialSimulationId={details.simulation?.id || null}
      initialReport={(details.report?.report as any) || null}
    />
  );
}
