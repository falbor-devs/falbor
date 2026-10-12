interface ProfileSkillsProps {
  skills?: string[];
}

export function ProfileSkills({ skills }: ProfileSkillsProps) {
  if (!skills || skills.length === 0) return null;

  return (
    <div className="mb-10">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
        Skills & Tech Stack
      </h3>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100/80 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50 shadow-sm"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}
