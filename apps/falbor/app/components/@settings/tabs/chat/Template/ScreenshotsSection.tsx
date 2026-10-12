import React from 'react';
import { toast } from 'react-toastify';
import { Label, Button } from '~/components/ui';

interface ScreenshotsSectionProps {
  mainImage: string;
  setMainImage: React.Dispatch<React.SetStateAction<string>>;
  screenshots: string[];
  setScreenshots: React.Dispatch<React.SetStateAction<string[]>>;
}

export function ScreenshotsSection({ mainImage, setMainImage, screenshots, setScreenshots }: ScreenshotsSectionProps) {
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isMain: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (isMain) {
          setMainImage(base64);
        } else {
          setScreenshots(prev => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-4 bg-[#F3F0F5] dark:bg-[#111] p-4 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Media & Screenshots</h3>
      
      <div className="flex flex-col gap-2">
        <Label>Main Cover Image</Label>
        <div className="flex items-center gap-4">
          {mainImage ? (
            <div className="relative w-32 h-20 rounded border overflow-hidden">
              <img src={mainImage} className="w-full h-full object-cover" alt="Main cover" />
              <button 
                onClick={() => setMainImage('')}
                className="absolute top-1 right-1 bg-black/50 text-white rounded p-0.5 hover:bg-black/70 transition-colors"
              >
                <div className="i-ph:x text-xs" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-32 h-20 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded cursor-pointer hover:border-[#FF5800] hover:bg-[#FF5800]/5 transition-colors">
              <div className="flex flex-col items-center text-gray-500">
                <div className="i-ph:upload-simple text-xl mb-1" />
                <span className="text-[10px]">Upload Cover</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, true)} />
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <Label>Additional Screenshots</Label>
        <div className="flex flex-wrap gap-4">
          {screenshots.map((img, i) => (
            <div key={i} className="relative w-24 h-24 rounded border overflow-hidden">
              <img src={img} className="w-full h-full object-cover" alt={`Screenshot ${i + 1}`} />
              <button 
                onClick={() => removeScreenshot(i)}
                className="absolute top-1 right-1 bg-black/50 text-white rounded p-0.5 hover:bg-black/70 transition-colors"
              >
                <div className="i-ph:x text-xs" />
              </button>
            </div>
          ))}
          <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded cursor-pointer hover:border-[#FF5800] hover:bg-[#FF5800]/5 transition-colors">
            <div className="flex flex-col items-center text-gray-500">
              <div className="i-ph:plus text-xl mb-1" />
              <span className="text-[10px]">Add Image</span>
            </div>
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageUpload(e, false)} />
          </label>
        </div>
      </div>
    </div>
  );
}
