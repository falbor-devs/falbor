import type { MyProspect, ProspectStatus } from "~/lib/actions/myProspects";

export type ContactFilter = "all" | ProspectStatus;

export type ImportSource = "contacts" | "gmail" | "calendar";

export interface ProspectListProps {
  prospects: MyProspect[];
  sendingId: string | null;
  onStatusChange: (id: string, status: ProspectStatus) => void;
  onDelete: (id: string) => void;
  onSendToAi: (prospect: MyProspect) => void;
}

export interface AddProspectFormProps {
  workspaceId: string;
  onClose: () => void;
  onAdded: () => void;
}

export interface ImportCandidatesProps {
  candidates: any[];
  selectedIds: Set<string>;
  onToggleAll: () => void;
  onToggle: (id: string) => void;
}
