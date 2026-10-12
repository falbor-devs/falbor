'use client';
import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { profileStore, updateProfile, saveProfileToServer } from '~/lib/stores/profile';
import type { Profile } from '~/lib/stores/profile';
import { toast } from 'react-toastify';
import { debounce } from '~/utils/debounce';
import { useTranslation } from '~/lib/i18n/useTranslation';
import { Input } from '~/components/ui/Input';

export default function ProfileTab() {
  const { t } = useTranslation();
  const profile = useStore(profileStore);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isEditingTimezone, setIsEditingTimezone] = useState(false);

  
  const allTimezones = typeof Intl !== 'undefined' && Intl.supportedValuesOf
    ? Intl.supportedValuesOf('timeZone')
    : [profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone];

  const saveToServer = useCallback(
    debounce((p: Partial<Profile>) => {
      saveProfileToServer({ ...profileStore.get(), ...p });
      toast.success(`${Object.keys(p).join(', ')} updated`);
    }, 1000),
    [],
  );

  
  const debouncedUpdate = useCallback(
    debounce((field: keyof Profile, value: any) => {
      updateProfile({ [field]: value });
      saveToServer({ [field]: value });
    }, 1000),
    [],
  );

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'avatar' | 'cover',
    setUploading: (val: boolean) => void
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);

      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfile({ [field]: base64String });
        saveProfileToServer({ ...profileStore.get(), [field]: base64String });
        setUploading(false);
        toast.success(`${field === 'avatar' ? 'Profile picture' : 'Cover picture'} updated`);
      };

      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        setUploading(false);
        toast.error(`Failed to update ${field === 'avatar' ? 'profile' : 'cover'} picture`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(`Error uploading ${field}:`, error);
      setUploading(false);
      toast.error(`Failed to update ${field === 'avatar' ? 'profile' : 'cover'} picture`);
    }
  };

  const handleProfileUpdate = (field: keyof Profile, value: any) => {
    updateProfile({ [field]: value });
    debouncedUpdate(field, value);
  };

  const handleAddCustomLink = () => {
    const newLinks = [...(profile.customLinks || []), { title: '', url: '' }];
    handleProfileUpdate('customLinks', newLinks);
  };

  const handleUpdateCustomLink = (index: number, field: 'title' | 'url' | 'description', value: string) => {
    const newLinks = [...(profile.customLinks || [])];
    newLinks[index] = { ...newLinks[index], [field]: value };
    handleProfileUpdate('customLinks', newLinks);
  };

  const handleDeleteCustomLink = (index: number) => {
    const newLinks = (profile.customLinks || []).filter((_, i) => i !== index);
    handleProfileUpdate('customLinks', newLinks);
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="space-y-8">
        
        {}
        <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800/50 group border border-gray-200 dark:border-gray-700/50">
          {profile.cover ? (
            <img src={profile.cover} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="i-ph:image w-10 h-10 opacity-50" />
            </div>
          )}
          
          <label
            className={classNames(
              'absolute inset-0',
              'flex flex-col items-center justify-center gap-2',
              'bg-black/0 group-hover:bg-black/40',
              'cursor-pointer transition-all duration-300 ease-out',
              isUploadingCover ? 'cursor-wait' : ''
            )}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, 'cover', setIsUploadingCover)}
              disabled={isUploadingCover}
            />
            {isUploadingCover ? (
              <div className="i-ph:spinner-gap w-8 h-8 text-white animate-spin" />
            ) : (
              <>
                <div className="i-ph:camera-plus w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform group-hover:scale-110" />
                <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300">{t('upload_cover')}</span>
              </>
            )}
          </label>
        </div>

        {}
        <div className="flex items-start gap-6 relative -mt-16 ml-6">
          <div
            className={classNames(
              'w-28 h-28 rounded-full overflow-hidden',
              'bg-white dark:bg-gray-900',
              'flex items-center justify-center',
              'ring-4 ring-white dark:ring-gray-900',
              'relative group',
              'transition-all duration-300 ease-out',
              'shadow-xl'
            )}
          >
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt="Profile"
                className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-90"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <div className="i-ph:user-circle-fill w-16 h-16 text-gray-400 dark:text-gray-500 transition-colors group-hover:text-purple-500/70" />
              </div>
            )}

            <label
              className={classNames(
                'absolute inset-0',
                'flex flex-col items-center justify-center',
                'bg-black/0 group-hover:bg-black/40',
                'cursor-pointer transition-all duration-300 ease-out',
                isUploading ? 'cursor-wait' : '',
              )}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'avatar', setIsUploading)}
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="i-ph:spinner-gap w-6 h-6 text-white animate-spin" />
              ) : (
                <div className="i-ph:camera-plus w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110" />
              )}
            </label>
          </div>
          
          <div className="mt-16 flex flex-col items-start">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {profile.username || t('your_profile')}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {isEditingTimezone ? (
                <div className="flex items-center gap-2">
                  <select
                    value={profile.timezone}
                    onChange={(e) => {
                      handleProfileUpdate('timezone', e.target.value);
                      setIsEditingTimezone(false);
                    }}
                    onBlur={() => setIsEditingTimezone(false)}
                    className="text-sm rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-1 pl-2 pr-8 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    autoFocus
                  >
                    {allTimezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="i-ph:map-pin-fill w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {profile.timezone || t('set_timezone')}
                  </span>
                  <button 
                    onClick={() => setIsEditingTimezone(true)}
                    className="text-gray-400 hover:text-purple-500 transition-colors ml-1"
                    title="Edit Timezone"
                  >
                    <div className="i-ph:pencil-simple-fill w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('update_photo_details')}</p>
          </div>
        </div>

        <div className="space-y-6">
          {}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('display_account_email')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('show_email_public')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={profile.displayEmail || false}
                onChange={(e) => handleProfileUpdate('displayEmail', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="w-full">
            {}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('username')}</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                  <div className="i-ph:user-circle-fill w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <Input
                  type="text"
                  value={profile.username || ''}
                  onChange={(e) => handleProfileUpdate('username', e.target.value)}
                  className="pl-11"
                  placeholder={t('enter_username')}
                />
              </div>
            </div>
          </div>

          {}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('bio')}</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-3">
                <div className="i-ph:text-aa w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <Input
                value={profile.bio || ''}
                onChange={(e) => handleProfileUpdate('bio', e.target.value)}
                className="pl-11 h-28 py-3"
                placeholder={t('tell_us_about_yourself')}
              />
            </div>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Location</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <div className="i-ph:map-pin w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <Input
                type="text"
                value={profile.location || ''}
                onChange={(e) => handleProfileUpdate('location', e.target.value)}
                className="pl-11"
                placeholder="e.g. San Francisco, CA"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Status Message</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <div className="i-ph:chat-teardrop-text w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <Input
                type="text"
                value={profile.statusMessage || ''}
                onChange={(e) => handleProfileUpdate('statusMessage', e.target.value)}
                className="pl-11"
                placeholder="e.g. Building a new CRM template"
              />
            </div>
          </div>
        </div>

        {}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Skills & Tech Stack</h3>
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <div className="i-ph:code w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <Input
                type="text"
                placeholder="Type a skill and press Enter..."
                className="pl-11"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    e.preventDefault();
                    const newSkill = e.currentTarget.value.trim();
                    const currentSkills = profile.skills || [];
                    if (!currentSkills.includes(newSkill)) {
                      handleProfileUpdate('skills', [...currentSkills, newSkill]);
                    }
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(profile.skills || []).map((skill, index) => (
                <div key={index} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                  <span>{skill}</span>
                  <button
                    onClick={() => {
                      const newSkills = (profile.skills || []).filter((_, i) => i !== index);
                      handleProfileUpdate('skills', newSkills);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <div className="i-ph:x-bold w-3 h-3" />
                  </button>
                </div>
              ))}
              {(!profile.skills || profile.skills.length === 0) && (
                <span className="text-sm text-gray-500 dark:text-gray-400">No skills added yet.</span>
              )}
            </div>
          </div>
        </div>

        {}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('social_links')}</h3>
          <div className="space-y-4">
            
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <div className="i-ph:instagram-logo w-5 h-5 text-pink-500 transition-transform group-focus-within:scale-110" />
              </div>
              <Input
                type="text"
                value={profile.instagram || ''}
                onChange={(e) => handleProfileUpdate('instagram', e.target.value)}
                className="pl-11"
                placeholder={t('instagram_url')}
              />
            </div>

            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <div className="i-ph:linkedin-logo w-5 h-5 text-blue-600 transition-transform group-focus-within:scale-110" />
              </div>
              <Input
                type="text"
                value={profile.linkedin || ''}
                onChange={(e) => handleProfileUpdate('linkedin', e.target.value)}
                className="pl-11"
                placeholder={t('linkedin_url')}
              />
            </div>

            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <div className="i-ph:twitter-logo w-5 h-5 text-sky-500 transition-transform group-focus-within:scale-110" />
              </div>
              <Input
                type="text"
                value={profile.twitter || ''}
                onChange={(e) => handleProfileUpdate('twitter', e.target.value)}
                className="pl-11"
                placeholder={t('twitter_url')}
              />
            </div>
            
          </div>
        </div>

        {}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('custom_links')}</h3>
            <button
              onClick={handleAddCustomLink}
              className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
            >
              <div className="i-ph:plus-bold w-4 h-4" />
              {t('add_custom_link')}
            </button>
          </div>
          
          <div className="space-y-4">
            {profile.customLinks?.map((link, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <div className="i-ph:text-t w-4 h-4 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      value={link.title}
                      onChange={(e) => handleUpdateCustomLink(index, 'title', e.target.value)}
                      className="pl-9"
                      placeholder={t('link_title_example')}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <div className="i-ph:link w-4 h-4 text-gray-400" />
                    </div>
                    <Input
                      type="url"
                      value={link.url}
                      onChange={(e) => handleUpdateCustomLink(index, 'url', e.target.value)}
                      className="pl-9"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="relative md:col-span-2">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <div className="i-ph:text-align-left w-4 h-4 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      value={link.description || ''}
                      onChange={(e) => handleUpdateCustomLink(index, 'description', e.target.value)}
                      className="pl-9"
                      placeholder="Short description (optional)"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCustomLink(index)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <div className="i-ph:trash w-5 h-5" />
                </button>
              </div>
            ))}
            
            {(!profile.customLinks || profile.customLinks.length === 0) && (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700/50 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('no_custom_links')}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
