import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';
import { SkillsLibrary } from './SkillsLibrary';
import { SkillCreator } from './SkillCreator';
import { SkillEditor } from './SkillEditor';
import { SkillUploader } from './SkillUploader';
import { SkillGithubImporter } from './SkillGithubImporter';
import { Button } from '~/components/ui/Button';
import type { Skill } from '~/lib/stores/skills';

type SkillsTab = 'library' | 'creator' | 'editor' | 'uploader' | 'github_importer';

interface SkillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SkillsDialog: React.FC<SkillsDialogProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState<SkillsTab>('library');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
    setActiveTab('editor');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'editor':
        if (!selectedSkill) return null;
        return (
          <SkillEditor
            skill={selectedSkill}
            onBack={() => {
              setSelectedSkill(null);
              setActiveTab('library');
            }}
          />
        );
      case 'creator':
        return (
          <SkillCreator
            onBack={() => setActiveTab('library')}
            onSkillCreated={() => setActiveTab('library')}
          />
        );
      case 'uploader':
        return (
          <SkillUploader
            onBack={() => setActiveTab('library')}
            onSkillCreated={() => setActiveTab('library')}
          />
        );
      case 'github_importer':
        return (
          <SkillGithubImporter
            onBack={() => setActiveTab('library')}
            onSkillCreated={() => setActiveTab('library')}
          />
        );
      case 'library':
      default:
        return <SkillsLibrary onSkillClick={handleSkillClick} />;
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <Dialog className="!max-w-5xl !w-[90vw] h-[80vh] flex flex-col p-0 overflow-hidden bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor shadow-2xl">
        {activeTab === 'library' && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-falbor-elements-borderColor">
            <DialogTitle className="text-xl font-bold text-falbor-elements-textPrimary m-0">
              Added skills
            </DialogTitle>
            <div className="flex items-center gap-3 mr-5">
              <div className="relative">
                <Button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-falbor-elements-background-depth-3 hover:bg-falbor-elements-background-depth-4 text-falbor-elements-textPrimary border border-falbor-elements-borderColor flex items-center gap-2"
                >
                  Create <span className="i-ph:caret-down text-sm" />
                </Button>
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary rounded-md border border-falbor-elements-borderColor shadow-lg z-[9999] flex flex-col py-1 w-48">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setActiveTab('uploader');
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-falbor-elements-background-depth-3 transition-colors"
                      >
                        <div className="i-ph:upload-simple text-lg text-falbor-elements-textSecondary" />
                        <span>Upload Skill</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setActiveTab('creator');
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-falbor-elements-background-depth-3 transition-colors"
                      >
                        <div className="i-ph:magic-wand text-lg text-falbor-elements-textSecondary" />
                        <span>Generate with AI</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setActiveTab('github_importer');
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-falbor-elements-background-depth-3 transition-colors"
                      >
                        <div className="i-ph:github-logo text-lg text-falbor-elements-textSecondary" />
                        <span>Import from GitHub</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
        </div>
      </Dialog>
    </DialogRoot>
  );
};
