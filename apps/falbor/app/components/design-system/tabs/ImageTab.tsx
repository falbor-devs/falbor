import React from 'react';
import { Input } from '~/components/ui/Input';
import { FormGroup } from '../FormGroup';

interface ImageTabProps {
  src: string;
  isUploading: boolean;
  styles: Record<string, string>;
  handleSrcChange: (value: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleChange: (key: string, value: string) => void;
}

export const ImageTab: React.FC<ImageTabProps> = ({
  src,
  isUploading,
  styles,
  handleSrcChange,
  handleImageUpload,
  handleChange
}) => {
  return (
    <div className="grid grid-cols-1 gap-6">
      <FormGroup label="Image Source (Upload or URL)">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input 
              value={src} 
              onChange={(e) => handleSrcChange(e.target.value)}
              placeholder="https://..."
              className="flex-1"
            />
            <label className="flex items-center justify-center px-4 py-2 bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor rounded-lg cursor-pointer hover:bg-falbor-elements-background-depth-4 transition-colors">
              <span className="text-sm font-medium">{isUploading ? 'Uploading...' : 'Upload File'}</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
                disabled={isUploading}
              />
            </label>
          </div>
          {src && (
            <div className="mt-4 p-2 border border-falbor-elements-borderColor rounded-lg bg-falbor-elements-background-depth-2 flex justify-center">
              {}
              <img src={src} alt="Preview" className="max-h-64 object-contain rounded" />
            </div>
          )}
        </div>
      </FormGroup>

      <FormGroup label="Object Fit">
        <div className="flex bg-falbor-elements-background-depth-2 rounded-lg p-1 border border-falbor-elements-borderColor w-fit">
          {['fill', 'contain', 'cover', 'none', 'scale-down'].map(fit => (
            <button
              key={fit}
              onClick={() => handleChange('objectFit', fit)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${styles.objectFit === fit ? 'bg-accent-500 text-white shadow-sm' : 'hover:bg-falbor-elements-background-depth-3'}`}
            >
              {fit.charAt(0).toUpperCase() + fit.slice(1)}
            </button>
          ))}
        </div>
      </FormGroup>
    </div>
  );
};
