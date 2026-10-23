import { WorkspacePetButton } from "~/components/workspace/WorkspacePetButton";

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <>
      {children}
      <WorkspacePetButton workspaceId={params.id} />
    </>
  );
}
