'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogDescription, DialogRoot } from './Dialog';
import { IconButton } from './IconButton';
import type { DesignScheme } from '~/types/design-scheme';
import { defaultDesignScheme, designFeatures, designFonts, paletteRoles, colorTemplates } from '~/types/design-scheme';

export interface ColorSchemeDialogProps {
  designScheme?: DesignScheme;
  setDesignScheme?: (scheme: DesignScheme) => void;
  asMenuItem?: boolean;
}

export const ColorSchemeDialog: React.FC<ColorSchemeDialogProps> = ({ setDesignScheme, designScheme, asMenuItem }) => {
  const [palette, setPalette] = useState<{ [key: string]: string }>(() => {
    if (designScheme?.palette) {
      return { ...defaultDesignScheme.palette, ...designScheme.palette };
    }
    return defaultDesignScheme.palette;
  });

  const [features, setFeatures] = useState<string[]>(designScheme?.features || defaultDesignScheme.features);
  const [font, setFont] = useState<string[]>(designScheme?.font || defaultDesignScheme.font);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'templates' | 'colors' | 'typography' | 'features'>('templates');

  useEffect(() => {
    if (designScheme) {
      setPalette(() => ({ ...defaultDesignScheme.palette, ...designScheme.palette }));
      setFeatures(designScheme.features || defaultDesignScheme.features);
      setFont(designScheme.font || defaultDesignScheme.font);
    } else {
      setPalette(defaultDesignScheme.palette);
      setFeatures(defaultDesignScheme.features);
      setFont(defaultDesignScheme.font);
    }
  }, [designScheme]);

  const handleColorChange = (role: string, value: string) => {
    const newPalette = { ...palette, [role]: value };
    setPalette(newPalette);
    setDesignScheme?.({ palette: newPalette, features, font });
  };

  const handleFeatureToggle = (key: string) => {
    const newFeatures = features.includes(key) ? features.filter((f) => f !== key) : [...features, key];
    setFeatures(newFeatures);
    setDesignScheme?.({ palette, features: newFeatures, font });
  };

  const handleFontToggle = (key: string) => {
    const newFont = font.includes(key) ? font.filter((f) => f !== key) : [...font, key];
    setFont(newFont);
    setDesignScheme?.({ palette, features, font: newFont });
  };

  const handleTemplateApply = (templatePalette: any) => {
    setPalette(templatePalette);
    setDesignScheme?.({ palette: templatePalette, features, font });
  };

  const renderTemplatesSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#D97A55]"></div>
        Color Templates
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {colorTemplates.map((template) => (
          <button
            key={template.key}
            onClick={() => handleTemplateApply(template.palette)}
            className="flex flex-col text-left gap-2 p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 transition-all duration-200 shadow-sm hover:shadow"
          >
            <div className="font-semibold text-zinc-900">{template.label}</div>
            <div className="text-sm text-zinc-500 line-clamp-2">{template.description}</div>
            <div className="flex gap-2 mt-2">
              {['primary', 'secondary', 'accent', 'background', 'surface'].map(role => (
                <div 
                  key={role}
                  className="w-6 h-6 rounded-full border border-black/10 shadow-sm" 
                  style={{ backgroundColor: template.palette[role as keyof typeof template.palette] }} 
                  title={role}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderColorSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#D97A55]"></div>
        Custom Colors
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {paletteRoles.map((role) => (
          <div
            key={role.key}
            className="group flex items-center gap-4 p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 transition-all duration-200 shadow-sm"
          >
            <div className="relative flex-shrink-0">
              <div
                className="w-12 h-12 rounded-xl shadow-md cursor-pointer transition-all duration-200 hover:scale-110 ring-2 ring-transparent hover:ring-[#D97A55]"
                style={{ backgroundColor: palette[role.key] }}
                onClick={() => document.getElementById(`color-input-${role.key}`)?.click()}
                role="button"
                tabIndex={0}
                aria-label={`Change ${role.label} color`}
              />
              <input
                id={`color-input-${role.key}`}
                type="color"
                value={palette[role.key]}
                onChange={(e) => handleColorChange(role.key, e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                tabIndex={-1}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-200">
                <span className="i-ph:pencil-simple text-xs text-zinc-500" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-zinc-900 transition-colors">{role.label}</div>
              <div className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">
                {role.description}
              </div>
              <div className="text-xs text-zinc-600 font-mono mt-1 px-2 py-1 bg-white border border-zinc-200 rounded-md inline-block shadow-sm">
                {palette[role.key]}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTypographySection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#D97A55]"></div>
        Typography
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {designFonts.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => handleFontToggle(f.key)}
            className={`group p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none shadow-sm ${
              font.includes(f.key)
                ? 'bg-orange-50 border-[#D97A55] text-zinc-900'
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 text-zinc-700'
            }`}
          >
            <div className="text-center space-y-2">
              <div
                className={`text-2xl font-medium transition-colors ${
                  font.includes(f.key) ? 'text-[#D97A55]' : 'text-zinc-900'
                }`}
                style={{ fontFamily: f.key }}
              >
                {f.preview}
              </div>
              <div
                className={`text-sm font-medium transition-colors ${
                  font.includes(f.key) ? 'text-[#D97A55]' : 'text-zinc-500'
                }`}
              >
                {f.label}
              </div>
              {font.includes(f.key) && (
                <div className="w-6 h-6 mx-auto bg-[#D97A55] rounded-full flex items-center justify-center">
                  <span className="i-ph:check text-white text-sm" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderFeaturesSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#D97A55]"></div>
        Design Features
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {designFeatures.map((f) => {
          const isSelected = features.includes(f.key);

          return (
            <div key={f.key} className="feature-card-container p-2">
              <button
                type="button"
                onClick={() => handleFeatureToggle(f.key)}
                className={`group relative w-full p-6 text-sm font-medium transition-all duration-200 ${
                  f.key === 'rounded'
                    ? isSelected
                      ? 'rounded-3xl'
                      : 'rounded-xl'
                    : f.key === 'border'
                      ? 'rounded-lg'
                      : 'rounded-xl'
                } ${
                  f.key === 'border'
                    ? isSelected
                      ? 'border-3 border-[#D97A55] bg-orange-50 text-[#D97A55]'
                      : 'border-2 border-zinc-200 hover:border-zinc-300 text-zinc-500 bg-zinc-50'
                    : isSelected
                      ? 'bg-orange-50 text-[#D97A55] shadow-lg border border-[#D97A55]/30'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 border border-zinc-200'
                } ${f.key === 'shadow' ? (isSelected ? 'shadow-xl' : 'shadow-sm hover:shadow-md') : 'shadow-sm'}`}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm border border-black/5">
                    {f.key === 'rounded' && (
                      <div
                        className={`w-6 h-6 bg-current transition-all duration-200 ${
                          isSelected ? 'rounded-full' : 'rounded'
                        } opacity-80`}
                      />
                    )}
                    {f.key === 'border' && (
                      <div
                        className={`w-6 h-6 rounded-lg transition-all duration-200 ${
                          isSelected ? 'border-3 border-current opacity-90' : 'border-2 border-current opacity-70'
                        }`}
                      />
                    )}
                    {f.key === 'gradient' && (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#D97A55] to-orange-400 opacity-90" />
                    )}
                    {f.key === 'shadow' && (
                      <div className="relative">
                        <div
                          className={`w-6 h-6 bg-current rounded-lg transition-all duration-200 ${
                            isSelected ? 'opacity-90' : 'opacity-70'
                          }`}
                        />
                        <div
                          className={`absolute top-1 left-1 w-6 h-6 bg-current rounded-lg transition-all duration-200 ${
                            isSelected ? 'opacity-40' : 'opacity-30'
                          }`}
                        />
                      </div>
                    )}
                    {f.key === 'frosted-glass' && (
                      <div className="relative">
                        <div
                          className={`w-6 h-6 rounded-lg transition-all duration-200 backdrop-blur-sm bg-black/5 border border-black/10 ${
                            isSelected ? 'opacity-90' : 'opacity-70'
                          }`}
                        />
                      </div>
                    )}
                    {f.key === 'neumorphism' && (
                      <div
                        className={`w-6 h-6 rounded-lg transition-all duration-200 bg-zinc-100 ${
                          isSelected ? 'shadow-[inner_2px_2px_4px_rgba(0,0,0,0.1),_inner_-2px_-2px_4px_rgba(255,255,255,1)]' : 'shadow-md'
                        }`}
                      />
                    )}
                    {f.key === 'flat' && (
                      <div className={`w-6 h-6 bg-current transition-all duration-200 opacity-80`} />
                    )}
                    {f.key === 'brutalism' && (
                      <div className={`w-6 h-6 bg-current border-2 border-black transition-all duration-200 opacity-80`} />
                    )}
                    {f.key === 'high-contrast' && (
                      <div className={`w-6 h-6 bg-black border-2 border-white transition-all duration-200`} />
                    )}
                    {f.key === 'animations' && (
                      <div className={`w-6 h-6 bg-current transition-all duration-200 rounded opacity-80 ${isSelected ? 'animate-pulse' : ''}`} />
                    )}
                  </div>

                  <div className="text-center">
                    <div className="font-semibold">{f.label}</div>
                    {isSelected && <div className="mt-2 w-8 h-1 bg-[#D97A55] rounded-full mx-auto opacity-60" />}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {asMenuItem ? (
        <button
          title="Design Palette"
          className="flex items-center gap-2 w-full text-left transition-colors text-falbor-elements-textPrimary outline-none"
          onClick={(e) => { e.preventDefault(); setIsDialogOpen(true); }}
        >
          <div className="i-ph:palette text-xl text-falbor-elements-textSecondary"></div>
          <span>Design</span>
        </button>
      ) : (
        <IconButton title="Design Palette" className="transition-all" onClick={() => setIsDialogOpen(!isDialogOpen)}>
          <div className="i-ph:palette text-xl"></div>
        </IconButton>
      )}

      <DialogRoot open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog>
          <div className="py-6 px-6 min-w-[500px] max-w-[90vw] max-h-[85vh] flex flex-col gap-6 overflow-hidden bg-white text-zinc-900 rounded-2xl shadow-xl border border-zinc-200">
            <div>
              <DialogTitle className="text-2xl font-bold text-zinc-900">
                Design & Theme
              </DialogTitle>
              <DialogDescription className="text-zinc-500 leading-relaxed mt-1">
                Customize your color palette, typography, and design features. Changes apply instantly.
              </DialogDescription>
            </div>

            {}
            <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
              {[
                { key: 'templates', label: 'Templates', icon: 'i-ph:swatches' },
                { key: 'colors', label: 'Colors', icon: 'i-ph:palette' },
                { key: 'typography', label: 'Typography', icon: 'i-ph:text-aa' },
                { key: 'features', label: 'Features', icon: 'i-ph:magic-wand' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeSection === tab.key
                      ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50'
                      : 'bg-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
                  }`}
                >
                  <span className={`${tab.icon} text-lg`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {}
            <div className="min-h-92 overflow-y-auto">
              {activeSection === 'templates' && renderTemplatesSection()}
              {activeSection === 'colors' && renderColorSection()}
              {activeSection === 'typography' && renderTypographySection()}
              {activeSection === 'features' && renderFeaturesSection()}
            </div>
            
            {}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
              <div className="text-sm text-zinc-500 flex items-center gap-2">
                <span className="i-ph:check-circle text-green-500" />
                Changes apply instantly
              </div>
              <button
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors text-sm"
                onClick={() => setIsDialogOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </Dialog>
      </DialogRoot>

      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #d4d4d8 transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #d4d4d8;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #a1a1aa;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .feature-card-container {
          min-height: 140px;
          display: flex;
          align-items: stretch;
        }
        .feature-card-container button {
          flex: 1;
        }
      `}</style>
    </>
  );
};
