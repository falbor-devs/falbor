'use client';

import { useEffect, useState } from 'react';
import { PawPrint, Eye, EyeOff, Check } from 'lucide-react';
import { Switch } from '~/components/ui/Switch';
import { classNames } from '~/utils/classNames';

const VISIBILITY_KEY = 'falbor-pet-visible';
const MODE_KEY = 'falbor-pet-mode';

type PetMode = 'images' | 'red' | 'blue' | 'green';

const options: Array<{ id: PetMode; title: string; description: string; image?: string; video?: string }> = [
  { id: 'images', title: 'Image character', description: 'Cycle through the four character images.', image: '/icons/pets/Image1.png' },
  { id: 'red', title: 'Red agent', description: 'Use the animated red agent pet.', video: '/icons/pets/red_AgentPet.mp4' },
  { id: 'blue', title: 'Blue agent', description: 'Use the animated blue agent pet.', video: '/icons/pets/blue_AgentPet.mp4' },
  { id: 'green', title: 'Green agent', description: 'Use the animated green agent pet.', video: '/icons/pets/green_AgentPet.mp4' },
];

export default function PetsTab() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<PetMode>('images');

  useEffect(() => {
    setVisible(window.localStorage.getItem(VISIBILITY_KEY) === 'true');
    const savedMode = window.localStorage.getItem(MODE_KEY);
    if (savedMode === 'images' || savedMode === 'red' || savedMode === 'blue' || savedMode === 'green') setMode(savedMode);
  }, []);

  const updateVisibility = (next: boolean) => {
    setVisible(next);
    window.localStorage.setItem(VISIBILITY_KEY, String(next));
    window.dispatchEvent(new CustomEvent('falbor-pet-settings-changed'));
  };

  const updateMode = (next: PetMode) => {
    setMode(next);
    window.localStorage.setItem(MODE_KEY, next);
    window.dispatchEvent(new CustomEvent('falbor-pet-settings-changed'));
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto p-4 md:p-6 text-falbor-elements-textPrimary">
      <div>
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><PawPrint className="h-5 w-5 text-purple-500" /> Pets</h2>
        <p className="text-sm text-falbor-elements-textSecondary">Choose a workspace companion and decide whether it appears while you work.</p>
      </div>

      <section className="rounded-xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-6">
          <div>
            <h3 className="font-medium">Show pet in workspace</h3>
            <p className="mt-1 text-sm text-falbor-elements-textSecondary">Your pet is hidden by default and can be shown at any time.</p>
          </div>
          <Switch checked={visible} onCheckedChange={updateVisibility} />
        </div>
        <div className="border-t border-falbor-elements-borderColor px-5 py-3 text-xs text-falbor-elements-textSecondary flex items-center gap-2">
          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {visible ? 'Visible on workspace pages' : 'Hidden on workspace pages'}
        </div>
      </section>

      <section>
        <h3 className="font-medium mb-3">Choose a pet</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {options.map((option) => (
            <button key={option.id} type="button" onClick={() => updateMode(option.id)} className={classNames('text-left rounded-xl border p-3 transition-colors', mode === option.id ? 'border-purple-500 bg-purple-500/10' : 'border-falbor-elements-borderColor hover:bg-falbor-elements-background-depth-2')}>
              <div className="h-32 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                {option.video ? <video src={option.video} autoPlay loop muted playsInline className="h-full w-full object-contain" /> : <img src={option.image} alt="" className="h-full w-full object-contain" />}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2"><span className="font-medium text-sm">{option.title}</span>{mode === option.id && <Check className="h-4 w-4 text-purple-500" />}</div>
              <p className="mt-1 text-xs text-falbor-elements-textSecondary">{option.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
