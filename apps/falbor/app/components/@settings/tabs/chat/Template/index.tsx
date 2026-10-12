import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { Button } from '~/components/ui';
import { BasicInfoSection } from './BasicInfoSection';
import { ScreenshotsSection } from './ScreenshotsSection';
import { TermsSection } from './TermsSection';
import { toast } from 'react-toastify';
import { chatId as chatIdStore } from '~/lib/persistence';
import { useAuth } from '~/hooks/useAuth';
import { deploymentStore } from '~/lib/stores/deployments';
import { DeployButton } from '~/components/deploy/DeployButton';

export default function TemplateTab() {
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<string>('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const chatId = useStore(chatIdStore);
  const { user } = useAuth();
  const deploymentState = useStore(deploymentStore);
  const hasDeployment = !!deploymentState.current;

  useEffect(() => {
    if (!user || !chatId) {
      setIsLoading(false);
      return;
    }

    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/templates?userId=${user.id}`);
        if (res.ok) {
          const json = await res.json();
          const existing = (json.data || []).find((t: any) => t.chatId === chatId);
          if (existing) {
            setIsUpdate(true);
            setName(existing.name || '');
            setShortDescription(existing.shortDescription || '');
            setDescription(existing.description || '');
            try {
              setCategories(typeof existing.categories === 'string' ? JSON.parse(existing.categories) : (existing.categories || []));
            } catch (e) {
              setCategories([]);
            }
            setMainImage(existing.mainImage || '');
            try {
              setScreenshots(typeof existing.images === 'string' ? JSON.parse(existing.images) : (existing.images || []));
            } catch (e) {
              setScreenshots([]);
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch template:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [user, chatId]);

  const handlePublish = async () => {
    if (!name || !shortDescription || !termsAccepted) {
      toast.error('Please fill all required fields and accept the terms.');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to publish a template.');
      return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          chatId,
          name,
          shortDescription,
          description,
          categories,
          mainImage,
          images: screenshots,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to publish template');
      }

      toast.success(isUpdate ? 'Template updated successfully!' : 'Template published successfully!');
      setIsUpdate(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to publish template.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 gap-6">
      <div className="flex flex-col space-y-1.5">
        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Publish Template</DialogTitle>
        <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2">
          Configure how your chat app will appear in the templates gallery.
        </DialogDescription>
      </div>

      {hasDeployment ? (
        <div className="flex flex-col gap-6">
          <BasicInfoSection 
            name={name} setName={setName}
            shortDescription={shortDescription} setShortDescription={setShortDescription}
            description={description} setDescription={setDescription}
            categories={categories} setCategories={setCategories}
          />
          
          <ScreenshotsSection 
            mainImage={mainImage} setMainImage={setMainImage}
            screenshots={screenshots} setScreenshots={setScreenshots}
          />
          
          <TermsSection termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted} />

          <div className="flex justify-end pt-4">
            <Button
              onClick={handlePublish}
              disabled={isPublishing || isLoading || !termsAccepted || !name || !shortDescription}
              className="bg-[#FF5800] hover:bg-[#FF5800]/90 text-white font-medium"
            >
              {isPublishing ? (isUpdate ? 'Updating...' : 'Publishing...') : (isUpdate ? 'Update Template' : 'Publish Template')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#090b12]/50">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            <span className="i-ph:rocket-launch text-xl"></span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white text-center">
            Publish the site to use this feature
          </h3>
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            You need to publish this site using one of the available layout options before you can share it as a template.
          </p>
          <DeployButton />
        </div>
      )}
    </div>
  );
}
