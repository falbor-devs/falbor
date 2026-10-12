import React, { useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { skillsStore, toggleSkillActive, type Skill } from '~/lib/stores/skills';
import { SkillCard } from './SkillCard';
import { classNames } from '~/utils/classNames';

interface SkillsLibraryProps {
  onSkillClick: (skill: Skill) => void;
}

export const SkillsLibrary: React.FC<SkillsLibraryProps> = ({ onSkillClick }) => {
  const skills = useStore(skillsStore);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkills = useMemo(() => {
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [skills, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 flex items-center gap-4 border-b border-falbor-elements-borderColor">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="i-ph:magnifying-glass text-falbor-elements-textSecondary" />
          </div>
          <input
            type="text"
            className={classNames(
              'block w-full pl-10 pr-3 py-2 border border-falbor-elements-borderColor rounded-lg leading-5 bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary placeholder-falbor-elements-textTertiary focus:outline-none focus:ring-1 focus:ring-falbor-elements-focus focus:border-falbor-elements-focus sm:text-sm transition-colors'
            )}
            placeholder="Search skills"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-falbor-elements-textSecondary py-10">
            <div className="w-16 h-16 rounded-full bg-falbor-elements-background-depth-3 flex items-center justify-center mb-4">
              <div className="i-ph:puzzle-piece text-3xl" />
            </div>
            <p className="text-lg font-medium mb-1">No skills added yet</p>
            <p className="text-sm">Create your first skill to extend the AI's capabilities.</p>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center text-falbor-elements-textSecondary py-10">
            No skills match your search.
          </div>
        ) : (
          <div>
            <h4 className="text-sm text-falbor-elements-textSecondary mb-4">Official</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onClick={onSkillClick}
                  onToggle={toggleSkillActive}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: var(--falbor-elements-textTertiary) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--falbor-elements-textTertiary);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--falbor-elements-textSecondary);
        }
      `}</style>
    </div>
  );
};
