import React, { useState, useEffect } from 'react';
import type { ElementInfo } from '~/components/workbench/Inspector';
import { Input } from '~/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/Tabs';
import { webcontainer } from '~/lib/webcontainer';

interface DesignSystemPanelProps {
  selectedElement: ElementInfo;
  onClear: () => void;
  onSave: (changes: Record<string, string>) => void;
  onLiveUpdate?: (changes: Record<string, string>) => void;
}

const FONTS = ['Inter', 'Roboto', 'Outfit', 'Playfair Display', 'Montserrat', 'Open Sans', 'Lato'];

const FormGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className="text-xs font-medium text-falbor-elements-textSecondary">{label}</label>
    {children}
  </div>
);

export const DesignSystemPanel: React.FC<DesignSystemPanelProps> = ({
  selectedElement,
  onClear,
  onSave,
  onLiveUpdate,
}) => {
  const [styles, setStyles] = useState<Record<string, string>>({
    color: selectedElement.styles?.color || '',
    backgroundColor: selectedElement.styles?.['background-color'] || selectedElement.styles?.backgroundColor || '',
    fontSize: selectedElement.styles?.['font-size'] || '',
    fontWeight: selectedElement.styles?.['font-weight'] || '',
    fontFamily: selectedElement.styles?.['font-family'] || '',
    textAlign: selectedElement.styles?.['text-align'] || '',
    borderRadius: selectedElement.styles?.['border-radius'] || '',
    padding: selectedElement.styles?.padding || '',
    margin: selectedElement.styles?.margin || '',
    border: selectedElement.styles?.border || '',
    objectFit: selectedElement.styles?.['object-fit'] || '',
  });

  const [src, setSrc] = useState(selectedElement.styles?.src || '');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setStyles({
      color: selectedElement.styles?.color || '',
      backgroundColor: selectedElement.styles?.['background-color'] || selectedElement.styles?.backgroundColor || '',
      fontSize: selectedElement.styles?.['font-size'] || '',
      fontWeight: selectedElement.styles?.['font-weight'] || '',
      fontFamily: selectedElement.styles?.['font-family'] || '',
      textAlign: selectedElement.styles?.['text-align'] || '',
      borderRadius: selectedElement.styles?.['border-radius'] || '',
      padding: selectedElement.styles?.padding || '',
      margin: selectedElement.styles?.margin || '',
      border: selectedElement.styles?.border || '',
      objectFit: selectedElement.styles?.['object-fit'] || '',
    });
    setSrc(selectedElement.styles?.src || '');
  }, [selectedElement]);

  const tagName = selectedElement.tagName.toLowerCase();
  const isImage = tagName === 'img';
  const isTypography = ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'label', 'strong', 'em'].includes(tagName);

  const handleChange = (key: string, value: string) => {
    setStyles((prev) => {
      const next = { ...prev, [key]: value };
      onLiveUpdate?.(next);
      return next;
    });
  };

  const handleSrcChange = (value: string) => {
    setSrc(value);
    onLiveUpdate?.({ ...styles, src: value });
  };

  const handleSave = () => {
    const changes: Record<string, string> = { ...styles };
    if (isImage && src) {
      changes.src = src;
    }
    onSave(changes);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        
        
        const wc = await webcontainer;
        const uploadDir = 'public/uploads';
        
        try {
          await wc.fs.mkdir('public');
        } catch (e) {} 
        try {
          await wc.fs.mkdir(uploadDir);
        } catch (e) {}

        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
        const filePath = `${uploadDir}/${fileName}`;
        
        
        
        const arrayBuffer = await file.arrayBuffer();
        await wc.fs.writeFile(filePath, new Uint8Array(arrayBuffer));
        
        const publicPath = `/uploads/${fileName}`;
        handleSrcChange(publicPath);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      setIsUploading(false);
    }
  };



  return (
    <div className="flex flex-col h-full w-full bg-falbor-elements-background-depth-1 dark:bg-[#1E1E21] text-falbor-elements-textPrimary rounded-lg overflow-hidden border border-[#BDBDBD] dark:border-[#353538] shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-falbor-elements-borderColor">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Design System Editor</h2>
          <code className="bg-accent-500 rounded px-2 py-0.5 text-white text-xs lowercase">
            &lt;{selectedElement.tagName}&gt;
          </code>
        </div>
        <button 
          onClick={onClear}
          className="p-2 hover:bg-falbor-elements-background-depth-3 rounded-full transition-colors"
        >
          <div className="i-ph:x text-xl" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue={isImage ? "image" : isTypography ? "typography" : "layout"} className="w-full max-w-2xl mx-auto">
          <TabsList className="mb-6 w-full flex">
            {isTypography && <TabsTrigger value="typography" className="flex-1">Typography</TabsTrigger>}
            <TabsTrigger value="layout" className="flex-1">Layout</TabsTrigger>
            <TabsTrigger value="design" className="flex-1">Design</TabsTrigger>
            {isImage && <TabsTrigger value="image" className="flex-1">Image</TabsTrigger>}
          </TabsList>

          {isTypography && (
            <TabsContent value="typography">
              <div className="grid grid-cols-2 gap-6">
                <FormGroup label="Font Family">
                  <select 
                    value={styles.fontFamily}
                    onChange={(e) => handleChange('fontFamily', e.target.value)}
                    className="w-full bg-transparent border border-falbor-elements-borderColor rounded-md p-2 text-sm"
                  >
                    <option value="">Default</option>
                    {FONTS.map(font => (
                      <option key={font} value={`'${font}', sans-serif`}>{font}</option>
                    ))}
                  </select>
                </FormGroup>
                
                <FormGroup label="Font Size">
                  <div className="flex items-center gap-2">
                    <Input 
                      value={styles.fontSize.replace('px', '').replace('rem', '')} 
                      onChange={(e) => handleChange('fontSize', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="e.g. 16"
                      type="number"
                    />
                    <span className="text-sm text-falbor-elements-textSecondary">px</span>
                  </div>
                </FormGroup>

                <FormGroup label="Font Weight">
                  <div className="flex bg-falbor-elements-background-depth-2 rounded-lg p-1 border border-falbor-elements-borderColor">
                    {['normal', '500', 'bold', '900'].map(weight => (
                      <button
                        key={weight}
                        onClick={() => handleChange('fontWeight', weight)}
                        className={`flex-1 py-1 text-sm rounded-md transition-colors ${styles.fontWeight === weight ? 'bg-accent-500 text-white shadow-sm' : 'hover:bg-falbor-elements-background-depth-3'}`}
                      >
                        {weight === '500' ? 'Medium' : weight === '900' ? 'Black' : weight.charAt(0).toUpperCase() + weight.slice(1)}
                      </button>
                    ))}
                  </div>
                </FormGroup>

                <FormGroup label="Text Align">
                  <div className="flex gap-2 bg-falbor-elements-background-depth-2 rounded-lg p-1 border border-falbor-elements-borderColor w-fit">
                    {['left', 'center', 'right', 'justify'].map(align => (
                      <button
                        key={align}
                        onClick={() => handleChange('textAlign', align)}
                        className={`p-2 rounded-md transition-colors ${styles.textAlign === align ? 'bg-accent-500 text-white shadow-sm' : 'hover:bg-falbor-elements-background-depth-3'}`}
                      >
                        <div className={`i-ph:text-align-${align} text-lg`} />
                      </button>
                    ))}
                  </div>
                </FormGroup>
              </div>
            </TabsContent>
          )}

          <TabsContent value="layout">
            <div className="grid grid-cols-2 gap-6">
              <FormGroup label="Padding">
                <Input 
                  value={styles.padding} 
                  onChange={(e) => handleChange('padding', e.target.value)}
                  placeholder="e.g. 1rem 2rem or 16px"
                />
              </FormGroup>
              
              <FormGroup label="Margin">
                <Input 
                  value={styles.margin} 
                  onChange={(e) => handleChange('margin', e.target.value)}
                  placeholder="e.g. 0 auto or 16px"
                />
              </FormGroup>
            </div>
          </TabsContent>

          <TabsContent value="design">
            <div className="grid grid-cols-2 gap-6">
              <FormGroup label="Background Color">
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={styles.backgroundColor || '#ffffff'} 
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <Input 
                    value={styles.backgroundColor} 
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    placeholder="#ffffff or transparent"
                  />
                </div>
              </FormGroup>

              <FormGroup label="Text Color">
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={styles.color || '#000000'} 
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <Input 
                    value={styles.color} 
                    onChange={(e) => handleChange('color', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </FormGroup>

              <FormGroup label="Border Radius">
                <div className="flex items-center gap-2">
                  <Input 
                    value={styles.borderRadius.replace('px', '').replace('rem', '')} 
                    onChange={(e) => handleChange('borderRadius', e.target.value ? `${e.target.value}px` : '')}
                    placeholder="e.g. 8"
                    type="number"
                  />
                  <span className="text-sm text-falbor-elements-textSecondary">px</span>
                </div>
              </FormGroup>

              <FormGroup label="Border">
                <Input 
                  value={styles.border} 
                  onChange={(e) => handleChange('border', e.target.value)}
                  placeholder="e.g. 1px solid #000"
                />
              </FormGroup>
            </div>
          </TabsContent>

          {isImage && (
            <TabsContent value="image">
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
            </TabsContent>
          )}

        </Tabs>
      </div>

      <div className="p-4 border-t border-falbor-elements-borderColor flex justify-end gap-3 bg-falbor-elements-background-depth-2">
        <button
          onClick={onClear}
          className="px-6 py-2 rounded-lg font-medium text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-3 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 rounded-lg font-medium bg-accent-500 text-white hover:bg-accent-600 transition-colors shadow-lg shadow-accent-500/20"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};
