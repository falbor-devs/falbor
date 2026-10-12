import React, { useState, useRef } from 'react';
import { classNames } from '~/utils/classNames';
import { addSkill } from '~/lib/stores/skills';
import { Button } from '~/components/ui/Button';

interface SkillUploaderProps {
  onBack: () => void;
  onSkillCreated: () => void;
}

export const SkillUploader: React.FC<SkillUploaderProps> = ({ onBack, onSkillCreated }) => {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    const parsedName = file.name.replace(/\.[^/.]+$/, "");
    setName(parsedName);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!name || !fileContent) return;
    setIsUploading(true);
    
    await addSkill({
      name,
      description: description || 'Imported custom skill.',
      content: fileContent,
    });
    
    setIsUploading(false);
    onSkillCreated();
  };

  return (
    <div className="flex flex-col h-full bg-falbor-elements-background-depth-1">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-falbor-elements-borderColor">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary transition-colors"
        >
          <div className="i-ph:arrow-left text-lg" />
        </button>
        <div className="font-semibold text-falbor-elements-textPrimary">Upload Skill</div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-falbor-elements-background-depth-3 flex items-center justify-center mb-2">
            <div className="i-ph:upload-simple text-3xl text-accent-500" />
          </div>
          <h2 className="text-2xl font-bold text-falbor-elements-textPrimary">Import an .md File</h2>
          <p className="text-falbor-elements-textSecondary max-w-lg">
            Upload a markdown file containing your system prompt instructions.
          </p>
        </div>

        {!fileContent ? (
          <div 
            className="border-2 border-dashed border-falbor-elements-borderColor hover:border-falbor-elements-borderColorActive rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors bg-falbor-elements-background-depth-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".md,.txt,text/markdown,text/plain" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <div className="i-ph:file-arrow-up text-4xl text-falbor-elements-textTertiary mb-4" />
            <p className="text-falbor-elements-textPrimary font-medium">Click to select a file</p>
            <p className="text-sm text-falbor-elements-textSecondary mt-1">Supports .md or .txt</p>
          </div>
        ) : (
          <div className="space-y-6 bg-falbor-elements-background-depth-2 p-6 rounded-xl border border-falbor-elements-borderColor">
            <div className="flex items-center justify-between border-b border-falbor-elements-borderColor pb-4">
              <div className="flex items-center gap-3">
                <div className="i-ph:file-text text-2xl text-accent-500" />
                <span className="font-medium text-falbor-elements-textPrimary">{fileName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFileContent('')}>
                Change File
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-falbor-elements-textSecondary mb-2">Skill Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-falbor-elements-focus"
                  placeholder="e.g. React Expert"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-falbor-elements-textSecondary mb-2">Description (Optional)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-falbor-elements-focus"
                  placeholder="Briefly describe what this skill does"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={!name.trim() || isUploading}
                className="bg-falbor-elements-button-primary-background hover:bg-falbor-elements-button-primary-backgroundHover text-falbor-elements-button-primary-text"
              >
                {isUploading ? 'Saving...' : 'Save Skill'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
