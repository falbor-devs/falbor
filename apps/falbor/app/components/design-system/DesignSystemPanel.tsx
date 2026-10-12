import React, { useState, useEffect } from 'react';
import type { ElementInfo } from '~/components/workbench/Inspector';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/Tabs';
import { webcontainer } from '~/lib/webcontainer';
import { TypographyTab } from './tabs/TypographyTab';
import { LayoutTab } from './tabs/LayoutTab';
import { DesignTab } from './tabs/DesignTab';
import { ImageTab } from './tabs/ImageTab';
import { Button, IconButton } from '../ui';
import { classNames } from '~/utils/classNames';

interface DesignSystemPanelProps {
  selectedElement: ElementInfo;
  onClear: () => void;
  onSave: (changes: Record<string, string>) => void;
  onLiveUpdate?: (changes: Record<string, string>) => void;
}

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
        const wc = await webcontainer;
        const uploadDir = 'public/uploads';

        try { await wc.fs.mkdir('public'); } catch (e) { }
        try { await wc.fs.mkdir(uploadDir); } catch (e) { }

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
    <div className="flex mb-2 flex-col h-[75.3vh]
     w-full bg-falbor-elements-background-depth-1 
     dark:bg-[#1E1E21] text-falbor-elements-textPrimary 
     rounded-lg overflow-hidden border border-[#BDBDBD] 
     dark:border-[#353538]">
      <div className="flex items-center justify-between 
      p-4 border-b border-falbor-elements-borderColor">
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
              <TypographyTab styles={styles} handleChange={handleChange} />
            </TabsContent>
          )}

          <TabsContent value="layout">
            <LayoutTab styles={styles} handleChange={handleChange} />
          </TabsContent>

          <TabsContent value="design">
            <DesignTab styles={styles} handleChange={handleChange} />
          </TabsContent>

          {isImage && (
            <TabsContent value="image">
              <ImageTab
                src={src}
                isUploading={isUploading}
                styles={styles}
                handleSrcChange={handleSrcChange}
                handleImageUpload={handleImageUpload}
                handleChange={handleChange}
              />
            </TabsContent>
          )}

        </Tabs>
      </div>

      <div className="p-4 border-t border-falbor-elements-borderColor flex justify-end gap-3 bg-falbor-elements-background-depth-2">
        <IconButton
          onClick={onClear}
          className={classNames(
            'px-3 text-sm bg-falbor-elements-item-backgroundDefault text-falbor-elements-item-contentDefault',
          )}
        >
          Cancel
        </IconButton>
        <IconButton
          className={classNames(
            'px-3 text-sm !bg-falbor-elements-item-backgroundAccent !text-falbor-elements-item-contentAccent',
          )}
          onClick={handleSave}
        >
          Save Changes
        </IconButton>
      </div>
    </div>
  );
};
