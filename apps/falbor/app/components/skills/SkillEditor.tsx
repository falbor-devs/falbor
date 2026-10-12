import React, { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import type { Skill } from '~/lib/stores/skills';
import { updateSkill, deleteSkill } from '~/lib/stores/skills';
import { Button } from '~/components/ui/Button';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';
import { CodeMirrorEditor } from '~/components/editor/codemirror/CodeMirrorEditor';

interface SkillEditorProps {
  skill: Skill;
  onBack: () => void;
}

export const SkillEditor: React.FC<SkillEditorProps> = ({ skill, onBack }) => {
  const [content, setContent] = useState(skill.content);
  const [name, setName] = useState(skill.name);
  const [description, setDescription] = useState(skill.description);
  const theme = useStore(themeStore);

  useEffect(() => {
    setContent(skill.content);
    setName(skill.name);
    setDescription(skill.description);
  }, [skill]);

  const handleSave = () => {
    updateSkill(skill.id, { name, description, content });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this skill?')) {
      deleteSkill(skill.id);
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full bg-falbor-elements-background-depth-2">
      <div className="flex items-center justify-between px-6 py-4 border-b border-falbor-elements-borderColor bg-falbor-elements-background-depth-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary transition-colors"
          >
            <div className="i-ph:arrow-left text-lg" />
          </button>
          <div className="font-semibold text-falbor-elements-textPrimary">Edit Skill</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
            Delete
          </Button>
          <Button variant="ghost" onClick={handleSave} className="bg-falbor-elements-button-primary-background hover:bg-falbor-elements-button-primary-backgroundHover text-falbor-elements-button-primary-text">
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-falbor-elements-textSecondary mb-2">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-falbor-elements-focus"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-falbor-elements-textSecondary mb-2">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-falbor-elements-focus"
          />
        </div>
        <div className="flex-1 flex flex-col min-h-[400px]">
          <label className="block text-sm font-medium text-falbor-elements-textSecondary mb-2">Prompt Content (Markdown)</label>
          <div className="flex-1 border border-falbor-elements-borderColor rounded-lg overflow-hidden bg-falbor-elements-background-depth-3 relative">
            <div className="absolute inset-0 overflow-hidden">
              <CodeMirrorEditor
                theme={theme === 'dark' ? 'dark' : 'light'}
                editable={true}
                doc={{ value: content, filePath: `${name || 'skill'}.md`, isBinary: false }}
                onChange={(update) => setContent(update.content)}
                settings={{ tabSize: 2 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
