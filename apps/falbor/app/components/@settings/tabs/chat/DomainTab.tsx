import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import { DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { chatId } from '~/lib/persistence';
import { TextShimmer } from '~/components/ui/text-shimmer';
import { Badge } from '~/components/ui';

interface Deployment {
  chatId: string;
  url: string;
  provider: string;
  subdomain: string;
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: string;
}

export function DomainTab() {
  const currentChatId = useStore(chatId);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subdomain, setSubdomain] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoImage, setSeoImage] = useState('');
  const [isSavingSubdomain, setIsSavingSubdomain] = useState(false);
  const [isSavingSeo, setIsSavingSeo] = useState(false);

  useEffect(() => {
    if (!currentChatId) {
      setIsLoading(false);
      return;
    }

    fetch(`/api/deployments?chatId=${currentChatId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setDeployment(data);
          setSubdomain(data.subdomain || '');
          setSeoTitle(data.seoTitle || '');
          setSeoDescription(data.seoDescription || '');
          setSeoImage(data.seoImage || '');
        }
      })
      .catch((err) => {
        console.error('Error fetching deployment:', err);
        toast.error('Failed to load deployment settings');
      })
      .finally(() => setIsLoading(false));
  }, [currentChatId]);

  const handleSaveSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChatId || !subdomain.trim()) return;

    setIsSavingSubdomain(true);
    try {
      const res = await fetch('/api/deployments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: currentChatId,
          newSubdomain: subdomain.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update subdomain');
      }

      setDeployment(data);
      setSubdomain(data.subdomain || '');
      toast.success('Subdomain updated successfully!');
      if (typeof window !== 'undefined') {
        localStorage.setItem(`deploy-url-${currentChatId}`, data.url);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating subdomain');
    } finally {
      setIsSavingSubdomain(false);
    }
  };

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChatId) return;

    setIsSavingSeo(true);
    try {
      const res = await fetch('/api/deployments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: currentChatId,
          seoTitle: seoTitle.trim(),
          seoDescription: seoDescription.trim(),
          seoImage: seoImage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update SEO settings');
      }

      setDeployment(data);
      setSeoTitle(data.seoTitle || '');
      setSeoDescription(data.seoDescription || '');
      setSeoImage(data.seoImage || '');
      toast.success('SEO settings updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error updating SEO settings');
    } finally {
      setIsSavingSeo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <TextShimmer>Loading settings...</TextShimmer>
      </div>
    );
  }

  if (!deployment || deployment.provider !== 'falbor') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center gap-4">
        <div className="i-ph:globe-simple w-16 h-16 text-gray-400 dark:text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Domain & SEO Settings</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          To configure your custom subdomain and optimize your site for search engines (SEO), please publish your site using the **Falbor** provider first.
        </p>
      </div>
    );
  }

  // Fallback placeholder image for the social preview
  const defaultPreviewImage = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60';

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 gap-6">
      <div className="flex flex-col space-y-1.5">
        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Domain & SEO Settings</DialogTitle>
        <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2">
          Configure your published Falbor site's URL and optimize its representation for Google and social platforms.
        </DialogDescription>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Subdomain settings card */}
          <div className="flex flex-col gap-3 bg-[#F3F0F5] dark:bg-[#111] p-5 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-black dark:text-gray-100">Falbor Subdomain</h4>
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                Falbor Hosted
              </span>
            </div>
            <p className="text-xs text-[#525258] dark:text-gray-400">
              Customize your subdomain to make it easy to remember. Changing this will update your live site URL.
            </p>

            <form onSubmit={handleSaveSubdomain} className="flex flex-col gap-2 mt-1">
              <div className="flex items-center bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                <input
                  type="text"
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="my-cool-site"
                  required
                />
                <span className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700">
                  .falbor.xyz
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Current URL:{' '}
                  <a
                    href={deployment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                  >
                    {deployment.url}
                  </a>
                </span>
                <button
                  type="submit"
                  disabled={isSavingSubdomain || subdomain === deployment.subdomain}
                  className="px-4 py-1.5 text-[#0099ff] text-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 font-medium hover:underline"
                >
                  {isSavingSubdomain ? 'Saving...' : 'Update Domain'}
                </button>
              </div>
            </form>
          </div>

          {/* SEO Settings Card */}
          <div className="flex flex-col gap-4 bg-[#F3F0F5] dark:bg-[#111] p-5 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold text-black dark:text-gray-100">
                Google SEO Optimization <Badge variant="secondary">Beta!</Badge>
              </h4>
              <p className="text-xs text-[#525258] dark:text-gray-400">
                Provide a custom meta title, description, and preview image to optimize how your link looks when shared on Google, WhatsApp, Discord, or Reddit.
              </p>
            </div>

            <form onSubmit={handleSaveSeo} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">SEO Title</label>
                <input
                  type="text"
                  className="bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="e.g. My Awesome Startup | Best Service in Town"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">SEO Description</label>
                <textarea
                  rows={3}
                  className="bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Describe your website to search engine crawlers (150-160 characters recommended)..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Social Share Image URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    value={seoImage}
                    onChange={(e) => setSeoImage(e.target.value)}
                    placeholder="e.g. https://example.com/social-card.jpg"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="seo-image-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setSeoImage(reader.result as string);
                        toast.success('Image loaded successfully! Save settings to apply.');
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="seo-image-upload"
                    className="px-4 py-2 bg-white dark:bg-[#222] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0"
                  >
                    Upload File
                  </label>
                </div>
              </div>

              <div className="flex justify-end mt-1">
                <button
                  type="submit"
                  disabled={
                    isSavingSeo ||
                    (seoTitle === (deployment.seoTitle || '') &&
                      seoDescription === (deployment.seoDescription || '') &&
                      seoImage === (deployment.seoImage || ''))
                  }
                  className="px-4 py-1.5 text-[#0099ff] text-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 font-medium hover:underline"
                >
                  {isSavingSeo ? 'Saving...' : 'Save SEO Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Rich Link Preview */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-black dark:text-gray-100 px-1">Live Social Preview</h4>
          <p className="text-xs text-[#525258] dark:text-gray-400 px-1">
            This is how your link will appear when pasted into message apps and platforms.
          </p>

          <div className="w-fullp-4 rounded-xl border border-white/5 shadow-inner mt-2 flex flex-col gap-2 relative">
            {/* Input simulator line */}
            <div className="flex items-center gap-2 bg-[#0099ff]/10 text-[#0099ff] text-xs px-3 py-2 rounded-lg w-full mb-2">
              <div className="i-ph:smiley-bold w-4 h-4" />
              <div className="truncate">{deployment.url}</div>
            </div>

            {/* Rich link preview card */}
            <div className="flex flex-col w-full rounded-xl overflow-hidden border border-white/10 self-start">
              {/* Preview image */}
              <div className="relative w-full h-44 bg-[#0099ff]/10 flex items-center justify-center overflow-hidden">
                <img
                  src={seoImage.trim() || defaultPreviewImage}
                  alt="Social Card Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to default preview image on load error
                    (e.target as HTMLImageElement).src = defaultPreviewImage;
                  }}
                />
              </div>

              {/* Preview content info */}
              <div className="p-3 flex flex-col gap-1 text-left bg-[#0099ff]/10">
                <h5 className="font-semibold text-sm text-black truncate leading-snug">
                  {seoTitle.trim() || 'Untitled Site'}
                </h5>
                <p className="text-xs text-black line-clamp-3 leading-relaxed">
                  {seoDescription.trim() || 'Generate beautiful web experiences with AI. Empower your online presence instantly with high performance and responsive templates.'}
                </p>
                <span className="text-[10px] text-black mt-1 font-medium select-none truncate">
                  {deployment.url.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
