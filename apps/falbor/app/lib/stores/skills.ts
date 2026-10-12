import { atom } from 'nanostores';

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  isActive: boolean;
  createdAt: number;
}

const isBrowser = typeof window !== 'undefined';
const SKILLS_STORAGE_KEY = 'falbor_skills_library';

const getInitialSkills = (): Skill[] => {
  const defaultSkills: Skill[] = [
    {
      id: 'ai-slop',
      name: 'AI-Slop Detector',
      description: 'Detects poorly written, AI-generated "slop" code and suggests rewrites.',
      content: 'Review the following code and look for common AI-generated anti-patterns, generic naming, or redundant abstraction...',
      isActive: true,
      createdAt: Date.now()
    },
    {
      id: 'design-professionalizer',
      name: 'Design Professionalizer',
      description: 'Enhances basic UI designs into modern, premium, and professional layouts.',
      content: 'Analyze the given component. Identify spacing, typography, and color issues. Suggest a professional redesign using modern standards...',
      isActive: true,
      createdAt: Date.now()
    },
    {
      id: 'ai-script-director',
      name: 'AI Script Director',
      description: 'Instructs the AI to evaluate scripts and suggest improvements for AI-readiness and flow.',
      content: 'Analyze the current UI and UX for scripting flow and user journey...',
      isActive: false,
      createdAt: Date.now()
    },
    {
      id: 'design-analyzer',
      name: 'Design Analyzer',
      description: 'Evaluates the product\'s design and suggests ways to elevate it to a professional standard.',
      content: 'Launch a browser session to evaluate the site. Look for visual hierarchy, contrast, color harmonization, and whitespace utilization...',
      isActive: false,
      createdAt: Date.now()
    }
  ];

  if (!isBrowser) return defaultSkills;
  try {
    const saved = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Skill[];
      if (parsed && Array.isArray(parsed)) {
        // Merge defaults that are missing
        const missingDefaults = defaultSkills.filter(ds => !parsed.some(ps => ps.id === ds.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse skills from local storage:', err);
  }
  return defaultSkills;
};

export const skillsStore = atom<Skill[]>(getInitialSkills());

export const fetchSkillsFromServer = async () => {
  if (!isBrowser) return;
  try {
    const response = await fetch('/api/skills');
    if (response.ok) {
      const data = await response.json();
      if (data.skills) {
        const fetchedSkills: Skill[] = data.skills.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt).getTime(),
        }));
        
        // Merge with defaults so they are never lost
        const defaults = getInitialSkills();
        const missingDefaults = defaults.filter(ds => !fetchedSkills.some(fs => fs.id === ds.id));
        const mergedSkills = [...fetchedSkills, ...missingDefaults];
        
        skillsStore.set(mergedSkills);
        localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(mergedSkills));
      }
    }
  } catch (err) {
    console.error('Failed to fetch skills from server:', err);
  }
};

fetchSkillsFromServer();

export const addSkill = async (skill: Omit<Skill, 'id' | 'createdAt' | 'isActive'>) => {
  const newSkill: Skill = {
    ...skill,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    isActive: false,
  };
  
  const updatedSkills = [...skillsStore.get(), newSkill];
  skillsStore.set(updatedSkills);
  
  if (isBrowser) {
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updatedSkills));
    
    fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSkill),
    }).catch(console.error);
  }
  
  return newSkill;
};

export const updateSkill = async (id: string, updates: Partial<Skill>) => {
  const updatedSkills = skillsStore.get().map(skill => 
    skill.id === id ? { ...skill, ...updates } : skill
  );
  
  skillsStore.set(updatedSkills);
  
  if (isBrowser) {
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updatedSkills));
    
    const updatedSkill = updatedSkills.find(s => s.id === id);
    if (updatedSkill) {
      fetch('/api/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSkill),
      }).catch(console.error);
    }
  }
};

export const toggleSkillActive = (id: string) => {
  const currentSkill = skillsStore.get().find(s => s.id === id);
  if (currentSkill) {
    updateSkill(id, { isActive: !currentSkill.isActive });
  }
};

export const deleteSkill = async (id: string) => {
  const updatedSkills = skillsStore.get().filter(skill => skill.id !== id);
  skillsStore.set(updatedSkills);
  
  if (isBrowser) {
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updatedSkills));
    
    fetch(`/api/skills?id=${id}`, {
      method: 'DELETE',
    }).catch(console.error);
  }
};
