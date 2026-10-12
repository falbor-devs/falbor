import React, { useState } from 'react';
import { addSkill } from '~/lib/stores/skills';
import { Button } from '~/components/ui/Button';

interface SkillGithubImporterProps {
  onBack: () => void;
  onSkillCreated: () => void;
}

export const SkillGithubImporter: React.FC<SkillGithubImporterProps> = ({ onBack, onSkillCreated }) => {
  const [url, setUrl] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchFromGithub = async () => {
    setError('');
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    let rawUrl = url.trim();
    
    
    if (!rawUrl.toLowerCase().endsWith('.md')) {
      setError('The URL must point to a Markdown (.md) file');
      return;
    }

    
    
    
    if (rawUrl.includes('github.com') && rawUrl.includes('/blob/')) {
      rawUrl = rawUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    setIsUploading(true);

    try {
      const response = await fetch(rawUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file (Status: ${response.status})`);
      }
      
      const content = await response.text();
      setFileContent(content);
      
      
      const urlParts = rawUrl.split('/');
      const extractedFileName = urlParts[urlParts.length - 1];
      setFileName(extractedFileName);
      
      
      const parsedName = extractedFileName.replace(/\.[^/.]+$/, "");
      setName(parsedName);
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch the file from GitHub. Ensure the URL is public and correct.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !fileContent) return;
    setIsUploading(true);
    
    await addSkill({
      name,
      description: description || 'Imported from GitHub.',
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
        <div className="font-semibold text-falbor-elements-textPrimary">Import from GitHub</div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-falbor-elements-background-depth-3 flex items-center justify-center mb-2">
            <div className="i-ph:github-logo text-3xl text-accent-500" />
          </div>
          <h2 className="text-2xl font-bold text-falbor-elements-textPrimary">Import an .md File from GitHub</h2>
          <p className="text-falbor-elements-textSecondary max-w-lg">
            Paste the URL to a public Markdown (.md) file on GitHub to import it as a skill.
          </p>
        </div>

        {!fileContent ? (
          <div className="space-y-4">
            <div>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-accent-500/50"
                placeholder="https://github.com/user/repo/blob/main/SKILL.md"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchFromGithub();
                  }
                }}
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            
            <div className="flex justify-center">
              <Button 
                onClick={fetchFromGithub} 
                disabled={!url.trim() || isUploading}
                className="bg-falbor-elements-button-primary-background hover:bg-falbor-elements-button-primary-backgroundHover text-falbor-elements-button-primary-text px-8"
              >
                {isUploading ? 'Fetching...' : 'Fetch File'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 bg-falbor-elements-background-depth-2 p-6 rounded-xl border border-falbor-elements-borderColor">
            <div className="flex items-center justify-between border-b border-falbor-elements-borderColor pb-4">
              <div className="flex items-center gap-3">
                <div className="i-ph:file-text text-2xl text-accent-500" />
                <span className="font-medium text-falbor-elements-textPrimary">{fileName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => {
                setFileContent('');
                setError('');
              }}>
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
