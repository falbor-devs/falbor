import { Dialog, DialogRoot } from "~/components/ui/Dialog";
import { AddProspectForm } from "./AddProspectForm";
import type { AddProspectFormProps } from "./types";

export function AddProspectModal({
  workspaceId,
  onClose,
  onAdded,
}: AddProspectFormProps) {
  return (
    <DialogRoot
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog
        className="w-[480px] max-w-[90vw] p-6"
        showCloseButton={true}
        onClose={onClose}
      >
        <AddProspectForm
          workspaceId={workspaceId}
          onClose={onClose}
          onAdded={onAdded}
        />
      </Dialog>
    </DialogRoot>
  );
}
