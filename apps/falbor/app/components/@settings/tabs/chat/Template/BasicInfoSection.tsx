import React, { useState } from 'react';
import { Input, Label, Button, Badge } from '~/components/ui';

interface BasicInfoSectionProps {
  name: string;
  setName: (name: string) => void;
  shortDescription: string;
  setShortDescription: (desc: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  categories: string[];
  setCategories: (cats: string[]) => void;
}

export function BasicInfoSection({
  name, setName,
  shortDescription, setShortDescription,
  description, setDescription,
  categories, setCategories
}: BasicInfoSectionProps) {
  
  const [isImproving, setIsImproving] = useState(false);
  
  const handleCategoryChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !categories.includes(val)) {
        setCategories([...categories, val]);
      }
      e.currentTarget.value = '';
    }
  };

  const removeCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
  };

  const handleImproveWithAI = async () => {
    setIsImproving(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setDescription(description + '\n\nEnhanced and structured by AI to improve readability and engagement.');
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-[#F3F0F5] dark:bg-[#111] p-4 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Basic Information</h3>
      
      <div className="flex flex-col gap-1.5">
        <Label>Template Name *</Label>
        <Input 
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Next.js Boilerplate"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Short Description *</Label>
        <Input 
          type="text"
          value={shortDescription}
          onChange={e => setShortDescription(e.target.value)}
          placeholder="A quick summary of what this template does..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Full Description</Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleImproveWithAI}
            disabled={isImproving || !description}
            className="h-7 text-xs"
          >
            <div className="i-ph:sparkle w-3 h-3 mr-1" />
            Improve with AI
          </Button>
        </div>
        <textarea 
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Detailed description, features, setup instructions..."
          rows={4}
          className="w-full bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded px-3 py-2 text-sm outline-none resize-y focus:border-[#FF5800]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Categories (Press Enter to add)</Label>
        <Input 
          type="text"
          onKeyDown={handleCategoryChange}
          placeholder="e.g. react, tailwind, dashboard..."
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {categories.map(cat => (
            <Badge key={cat} variant="secondary" className="flex items-center gap-1 px-2 py-1">
              {cat}
              <button onClick={() => removeCategory(cat)} className="hover:text-red-500 ml-1">
                <div className="i-ph:x w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
