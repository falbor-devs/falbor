'use client';

import React, { useEffect, useState } from 'react';
import { getMarketerOnboardingStatus, createMarketerProduct } from '~/lib/actions/marketer-products';
import { getMarketerProfileData } from '~/lib/actions/get-marketer-profile';
import { Dialog, DialogRoot, DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { Input, Button } from '~/components/ui';
import { toast } from 'react-toastify';

export function MarketerOnboardingWidget() {
  const [status, setStatus] = useState<{ profileComplete: boolean; productsCount: number }>({
    profileComplete: false,
    productsCount: 0,
  });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [userSpecialties, setUserSpecialties] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [price, setPrice] = useState('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [originalPrice, setOriginalPrice] = useState('');
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadStatus();
    getMarketerProfileData().then((profile) => {
      const specs = profile?.specialties as string[] | undefined;
      if (specs && Array.isArray(specs) && specs.length > 0) {
        setUserSpecialties(specs);
        setService(specs[0]);
      }
    });
  }, []);

  const loadStatus = async () => {
    const res = await getMarketerOnboardingStatus();
    setStatus(res);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - imageFiles.length;
    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setImageFiles((prev) => [...prev, reader.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !service.trim() || !price) return;

    setIsSubmitting(true);
    const res = await createMarketerProduct({
      name: name.trim(),
      service: service.trim(),
      price: Number(price),
      originalPrice: hasDiscount && originalPrice ? Number(originalPrice) : null,
      portfolioImages: imageFiles,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Product created successfully!");
      setIsProductModalOpen(false);
      setName('');
      setPrice('');
      setHasDiscount(false);
      setOriginalPrice('');
      setImageFiles([]);
      loadStatus();
    }
  };

  const completedSteps = (status.profileComplete ? 1 : 0) + (status.productsCount > 0 ? 1 : 0);

  return (
    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Setup Checklist ({completedSteps}/2)
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={
              status.profileComplete
                ? 'i-ph:check-circle-fill text-emerald-500 text-base'
                : 'i-ph:circle text-zinc-400 text-base'
            }
          />
          <span className={status.profileComplete ? 'line-through text-zinc-400' : 'font-medium'}>
            Complete Profile
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={
                status.productsCount > 0
                  ? 'i-ph:check-circle-fill text-emerald-500 text-base'
                  : 'i-ph:circle text-zinc-400 text-base'
              }
            />
            <span className={status.productsCount > 0 ? 'line-through text-zinc-400' : 'font-medium'}>
              Add Product ({status.productsCount}/3)
            </span>
          </div>

          {status.productsCount < 3 && (
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="text-[11px] font-semibold text-[#0099ff] hover:underline"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      <DialogRoot open={isProductModalOpen} onOpenChange={(open) => !open && setIsProductModalOpen(false)}>
        <Dialog className="max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-lg font-bold mb-1">Add Marketing Product / Service</DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 mb-4">
            Define your service and pricing. Do not upload inappropriate content. Up to 3 products allowed.
          </DialogDescription>

          <form onSubmit={handleCreateProduct} className="space-y-4 text-sm">
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
                <button
                  type="button"
                  onClick={() => setHasDiscount(!hasDiscount)}
                  className="text-xs text-purple-500 hover:text-purple-600 font-medium"
                >
                  {hasDiscount ? 'Remove Discount' : '+ Add Discount'}
                </button>
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
              <Button type="button" onClick={() => setIsProductModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#0099ff]/20 text-[#0099ff]">
                {isSubmitting ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </form>
        </Dialog>
      </DialogRoot>
    </div>
  );
}
