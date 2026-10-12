'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';
import { Switch } from '~/components/ui/Switch';
import { SetupButton } from '~/components/ui/setup/SetupButton';
import { getMarketerProfileData } from '~/lib/actions/get-marketer-profile';

interface Props {
  userId: string;
}

const SPECIALTIES = [
  'SEO & Content', 'Paid Ads', 'Social Media', 'Email Marketing',
  'Influencer Marketing', 'Brand Strategy', 'Analytics & Data', 'Copywriting',
];

export function MarketerProfileForm({ userId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    photoUrl: '',
    bio: '',
    yearsOfExperience: '',
    age: '',
    phone: '',
    showEmail: false,
    location: '',
    specialties: [] as string[],
    linkedinUrl: '',
    twitterUrl: '',
    instagramUrl: '',
  });

  useEffect(() => {
    getMarketerProfileData(userId).then((data) => {
      if (data) {
        setForm({
          fullName: data.fullName || '',
          photoUrl: data.photoUrl || '',
          bio: data.bio || '',
          yearsOfExperience: data.yearsOfExperience || '',
          age: data.age || '',
          phone: data.phone || '',
          showEmail: Boolean(data.showEmail),
          location: data.location || '',
          specialties: data.specialties || [],
          linkedinUrl: data.linkedinUrl || '',
          twitterUrl: data.twitterUrl || '',
          instagramUrl: data.instagramUrl || '',
        });
      }
    });
  }, [userId]);

  const set = (key: keyof typeof form, value: string | boolean | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSpecialty = (s: string) => {
    set(
      'specialties',
      form.specialties.includes(s)
        ? form.specialties.filter((x) => x !== s)
        : [...form.specialties, s],
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.fullName.trim()) { setError('Full name is required'); return; }
    if (!form.bio.trim()) { setError('Bio is required'); return; }
    if (!form.yearsOfExperience) { setError('Years of experience is required'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/marketer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save profile');
        return;
      }
      router.push(`/b2b/${data.profileId}`);
    } catch {
      setError('Network error, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
              }`}>
                {step > s ? <span className="i-ph:check w-3.5 h-3.5" /> : s}
              </div>
              {s < 3 && <div className={`h-px w-12 transition-colors ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Step {step} of 3 — {step === 1 ? 'Personal Info' : step === 2 ? 'Experience & Skills' : 'Contact & Socials'}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                {form.photoUrl
                  ? <img src={form.photoUrl} alt="Profile" className="h-full w-full object-cover" />
                  : <span className="i-ph:user text-gray-400 w-10 h-10" />
                }
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo URL</label>
              <Input
                placeholder="https://..."
                value={form.photoUrl}
                onChange={(e) => set('photoUrl', e.target.value)}
              />
              <p className="text-xs text-gray-400">Paste a link to your photo (Gravatar, LinkedIn, etc.)</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name <span className="text-red-500">*</span></label>
              <Input
                placeholder="Jane Smith"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <Input
                placeholder="New York, USA"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio <span className="text-red-500">*</span></label>
            <textarea
              placeholder="Tell businesses about yourself, your background, and what makes you stand out..."
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <SetupButton onClick={() => { if (!form.fullName.trim()) { setError('Full name is required'); return; } setError(''); setStep(2); }}>
              Continue
            </SetupButton>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Years of Experience <span className="text-red-500">*</span></label>
              <Input
                type="number"
                min="0"
                max="50"
                placeholder="e.g. 5"
                value={form.yearsOfExperience}
                onChange={(e) => set('yearsOfExperience', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Age</label>
              <Input
                type="number"
                min="18"
                max="100"
                placeholder="e.g. 32"
                value={form.age}
                onChange={(e) => set('age', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Specialties</label>
            <p className="text-xs text-gray-400">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.specialties.includes(s)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <SetupButton variant="secondary" onClick={() => { setError(''); setStep(1); }}>
              Back
            </SetupButton>
            <SetupButton onClick={() => { if (!form.yearsOfExperience) { setError('Years of experience is required'); return; } setError(''); setStep(3); }}>
              Continue
            </SetupButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
            <Input
              type="tel"
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Show email on profile</p>
              <p className="text-xs text-gray-400 mt-0.5">When enabled, businesses can see your email address directly on your public profile.</p>
            </div>
            <Switch
              checked={form.showEmail}
              onCheckedChange={(v) => set('showEmail', v)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Social Links</label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="i-ph:linkedin-logo text-blue-600 w-5 h-5 flex-shrink-0" />
                <Input
                  placeholder="https://linkedin.com/in/yourname"
                  value={form.linkedinUrl}
                  onChange={(e) => set('linkedinUrl', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="i-ph:twitter-logo text-sky-500 w-5 h-5 flex-shrink-0" />
                <Input
                  placeholder="https://twitter.com/yourhandle"
                  value={form.twitterUrl}
                  onChange={(e) => set('twitterUrl', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="i-ph:instagram-logo text-pink-500 w-5 h-5 flex-shrink-0" />
                <Input
                  placeholder="https://instagram.com/yourhandle"
                  value={form.instagramUrl}
                  onChange={(e) => set('instagramUrl', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <SetupButton variant="secondary" onClick={() => { setError(''); setStep(2); }}>
              Back
            </SetupButton>
            <SetupButton
              onClick={handleSubmit}
              isLoading={submitting}
              icon={<span className="i-ph:check w-4 h-4" />}
            >
              Complete Profile
            </SetupButton>
          </div>
        </div>
      )}
    </div>
  );
}
