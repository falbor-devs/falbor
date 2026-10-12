import React from 'react';
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import type { Skill } from '~/lib/stores/skills';

interface SkillCardProps {
  skill: Skill;
  onClick: (skill: Skill) => void;
  onToggle: (id: string, active: boolean) => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({ skill, onClick, onToggle }) => {
  return (
    <div
      onClick={() => onClick(skill)}
      className="group flex flex-col gap-2 p-4 rounded-xl bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor hover:border-falbor-elements-borderColorActive transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor">
            <div className="i-ph:puzzle-piece text-xl text-falbor-elements-textSecondary group-hover:text-falbor-elements-textPrimary transition-colors" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-falbor-elements-textPrimary">
                {skill.name}
              </h3>
              <div className="i-ph:shield-check text-falbor-elements-textSecondary text-xs" />
            </div>
            <p className="text-xs text-falbor-elements-textSecondary mt-0.5 line-clamp-2 leading-relaxed">
              {skill.description}
            </p>
          </div>
        </div>
        
        <div className="ml-4" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={skill.isActive}
            onCheckedChange={(checked) => onToggle(skill.id, checked)}
          />
        </div>
      </div>
    </div>
  );
};
