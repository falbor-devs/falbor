import React, { useState } from 'react';
import { classNames } from '~/utils/classNames';
import type { DeploymentInfo } from '~/lib/stores/deployments';
import { toast } from 'react-toastify';

interface DeploymentCardProps {
  deployment: DeploymentInfo;
  onEditSave: (newSubdomain: string) => Promise<void>;
}

export function DeploymentCard({ deployment, onEditSave }: DeploymentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(deployment.subdomain || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleCopy = () => {
    
    let fullUrl = deployment.url;
    if (fullUrl.startsWith('/')) {
      fullUrl = `${window.location.origin}${fullUrl}`;
    }
    navigator.clipboard.writeText(fullUrl);
    toast.success('URL copied to clipboard!');
  };

  const handleSave = async () => {
    if (!editValue || editValue.trim() === '') {
      toast.error('Subdomain cannot be empty');
      return;
    }
    if (editValue === deployment.subdomain) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onEditSave(editValue);
      setIsEditing(false);
      toast.success('Site URL updated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update URL');
    } finally {
      setIsSaving(false);
    }
  };

  
  let displayUrl = deployment.url;
  if (displayUrl.startsWith('/')) {
    displayUrl = `${window.location.host}${displayUrl}`;
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-falbor-elements-background-depth-3 rounded-md border border-falbor-elements-borderColor mb-2">
      <div className="text-xs text-falbor-elements-textSecondary mb-1 font-semibold">
        Current Deployment ({deployment.provider})
      </div>
      
      <div className="flex items-center gap-2">
        {isEditing && deployment.provider === 'falbor' ? (
          <div className="flex-1 flex items-center bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded px-2 py-1 focus-within:border-accent-500">
            <span className="text-falbor-elements-textSecondary text-xs">/site/</span>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-xs text-falbor-elements-textPrimary"
              autoFocus
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            {isSaving && <div className="i-svg-spinners:90-ring-with-bg text-accent-500 w-3 h-3 ml-1" />}
          </div>
        ) : (
          <a 
            href={deployment.url} 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 text-xs text-accent-500 hover:underline truncate"
            title={displayUrl}
          >
            {displayUrl}
          </a>
        )}

        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={handleCopy}
              className="p-1.5 hover:bg-falbor-elements-item-backgroundActive rounded-md text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary transition-colors"
              title="Copy URL"
            >
              <div className="w-3.5 h-3.5" style={{ WebkitMaskImage: 'url(/icons/copy.svg)', maskImage: 'url(/icons/copy.svg)', WebkitMaskSize: 'cover', maskSize: 'cover', backgroundColor: 'currentColor' }} />
            </button>
            {deployment.provider === 'falbor' && (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 hover:bg-falbor-elements-item-backgroundActive rounded-md text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary transition-colors"
                title="Edit URL"
              >
                <div className="w-3.5 h-3.5" style={{ WebkitMaskImage: 'url(/icons/pencil-fill.svg)', maskImage: 'url(/icons/pencil-fill.svg)', WebkitMaskSize: 'cover', maskSize: 'cover', backgroundColor: 'currentColor' }} />
              </button>
            )}
          </div>
        )}
        
        {isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-2 py-1 text-xs bg-accent-500 text-white rounded hover:bg-accent-600 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="px-2 py-1 text-xs bg-transparent border border-falbor-elements-borderColor text-falbor-elements-textPrimary rounded hover:bg-falbor-elements-background-depth-1 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
