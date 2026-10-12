'use client';

import React from 'react';
import { Dialog, DialogRoot, DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { Input, Button } from '~/components/ui';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSpecialties: string[];
  name: string;
  setName: (v: string) => void;
  service: string;
  setService: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  hasDiscount: boolean;
  setHasDiscount: (v: boolean) => void;
  originalPrice: string;
  setOriginalPrice: (v: string) => void;
  imageFiles: string[];
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: (index: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function CreateProductModal({
  isOpen,
  onClose,
  userSpecialties,
  name,
  setName,
  service,
  setService,
  price,
  setPrice,
  hasDiscount,
  setHasDiscount,
  originalPrice,
  setOriginalPrice,
  imageFiles,
  handleImageUpload,
  handleRemoveImage,
  handleSubmit,
  isSubmitting,
}: CreateProductModalProps) {
  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog className="max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-lg font-bold mb-1">Add Marketing Product / Service</DialogTitle>
        <DialogDescription className="text-xs text-zinc-400 mb-4">
          Define your service and pricing. Do not upload inappropriate content. Up to 3 products allowed.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">Product / Service Name *</label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Social Media Growth Package"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Service Category *</label>
            {userSpecialties.length > 0 ? (
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
              >
                {userSpecialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type="text"
                required
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. Social Media Marketing, Google Ads"
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium">Price ($USD) *</label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDiscount}
                  onChange={(e) => setHasDiscount(e.target.checked)}
                  className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                />
                Add Discount Price
              </label>
            </div>

            {hasDiscount ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Original Price ($)</label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="399"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Discounted Price ($)</label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="299"
                  />
                </div>
              </div>
            ) : (
              <Input
                type="number"
                required
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="299"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Portfolio Proof Images (Up to 3)</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {imageFiles.map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              {imageFiles.length < 3 && (
                <label className="aspect-video rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-purple-500 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <span className="i-ph:image-duotone text-xl text-zinc-400" />
                  <span className="text-[10px] text-zinc-400 mt-1">Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0099ff]/20 text-[#0099ff]">
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </form>
      </Dialog>
    </DialogRoot>
  );
}
