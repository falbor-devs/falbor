'use client';

import React, { useState } from 'react';
import { DialogRoot, Dialog, DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/Button';
import { autoSetupVisualEditorWorkspace, getUserLatestSubaccount } from '~/lib/actions/workspace-setup';
import AgencyDetails from '~/components/visual-editor/forms/agency-details';
import SubAccountDetails from '~/components/visual-editor/forms/subaccount-details';
import { useToast } from '~/components/ui/use-toast';

interface VisualEditorExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (subAccountId: string) => void;
}

export const VisualEditorExportModal: React.FC<VisualEditorExportModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'selection' | 'manual_agency' | 'manual_subaccount'>('selection');
  const [createdAgencyId, setCreatedAgencyId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAutoSetup = async () => {
    setLoading(true);
    try {
      const { subAccountId } = await autoSetupVisualEditorWorkspace();
      toast('Workspace automatically created!', { type: 'success' });
      onSuccess(subAccountId);
      onOpenChange(false);
    } catch (error: any) {
      toast(error.message || 'Could not auto-setup workspace.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAgencyCreated = (agencyId: string) => {
    setCreatedAgencyId(agencyId);
    setMode('selection');
  };

  const renderContent = () => {
    if (mode === 'manual_agency') {
      return (
        <div className="flex flex-col gap-4">
          <Button variant="outline" onClick={() => setMode('selection')}>Back</Button>
          <div className="max-h-[60vh] overflow-y-auto">
            {}
            <AgencyDetails data={{}} />
          </div>
          <Button onClick={() => handleAgencyCreated('manual-created')}>I have finished creating the Agency</Button>
        </div>
      );
    }

    if (mode === 'manual_subaccount') {
      return (
        <div className="flex flex-col gap-4">
          <Button variant="outline" onClick={() => setMode('selection')}>Back</Button>
          <div className="max-h-[60vh] overflow-y-auto">
            <SubAccountDetails
              agencyDetails={{ id: createdAgencyId || '' } as any}
              userId=""
              userName=""
            />
          </div>
          {}
          <Button onClick={async () => {
            try {
              const subId = await getUserLatestSubaccount();
              onSuccess(subId);
              onOpenChange(false);
            } catch (err) {
              toast('Could not find subaccount.', { type: 'error' });
            }
          }}>I have finished creating the Subaccount</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 mt-4">
        <div className="p-4 border rounded-md border-falbor-elements-borderColor bg-falbor-elements-background-depth-2">
          <h3 className="font-semibold text-lg mb-2">Option 1: Quick Setup</h3>
          <p className="text-sm text-falbor-elements-textSecondary mb-4">
            Automatically create an Agency and Subaccount with your account details to immediately publish your site.
          </p>
          <Button
            onClick={handleAutoSetup}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Setting up...' : 'Auto Setup Workspace'}
          </Button>
        </div>

        <div className="p-4 border rounded-md border-falbor-elements-borderColor bg-falbor-elements-background-depth-2">
          <h3 className="font-semibold text-lg mb-2">Option 2: Manual Setup</h3>
          <p className="text-sm text-falbor-elements-textSecondary mb-4">
            Create your Agency and Subaccount manually with custom details.
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={() => setMode('manual_agency')}>
              Edit Agency
            </Button>
            <Button
              variant="outline"
              disabled={!createdAgencyId}
              onClick={() => setMode('manual_subaccount')}
            >
              Edit Subaccount
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <Dialog onClose={() => onOpenChange(false)} className="w-[600px] max-w-[90vw]">
        <DialogTitle>Connect to Visual Editor</DialogTitle>
        <DialogDescription>
          Choose how you want to set up your Visual Editor workspace to publish this AI site.
        </DialogDescription>

        {renderContent()}
      </Dialog>
    </DialogRoot>
  );
};
