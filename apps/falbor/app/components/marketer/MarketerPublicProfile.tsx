'use client';

interface Profile {
  id: string;
  fullName: string;
  photoUrl: string | null;
  bio: string;
  yearsOfExperience: number;
  age: number | null;
  phone: string | null;
  showEmail: boolean;
  location: string | null;
  specialties: unknown;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
}

interface Props {
  profile: Profile;
  email?: string;
}

export function MarketerPublicProfile({ profile, email }: Props) {
  const specialties = Array.isArray(profile.specialties) ? profile.specialties as string[] : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="h-24 w-24 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md">
          {profile.photoUrl
            ? <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center i-ph:user text-gray-400" style={{ fontSize: 40 }} />
          }
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{profile.fullName}</h1>
          {profile.location && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 sm:justify-start justify-center">
              <span className="i-ph:map-pin h-4 w-4" />
              {profile.location}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 sm:justify-start justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              <span className="i-ph:briefcase h-3.5 w-3.5" />
              {profile.yearsOfExperience} year{profile.yearsOfExperience !== 1 ? 's' : ''} experience
            </span>
            {profile.age && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                {profile.age} years old
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">About</h2>
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{profile.bio}</p>
      </div>

      {specialties.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span key={s} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-3">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Contact</h2>
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <span className="i-ph:envelope h-4 w-4 text-zinc-400" />
            {email}
          </a>
        )}
        {profile.phone && (
          <a href={`tel:${profile.phone}`} className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <span className="i-ph:phone h-4 w-4 text-zinc-400" />
            {profile.phone}
          </a>
        )}
        {profile.linkedinUrl && (
          <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <span className="i-ph:linkedin-logo h-4 w-4 text-zinc-400" />
            LinkedIn Profile
          </a>
        )}
        {profile.twitterUrl && (
          <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <span className="i-ph:twitter-logo h-4 w-4 text-zinc-400" />
            Twitter / X
          </a>
        )}
        {profile.instagramUrl && (
          <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <span className="i-ph:instagram-logo h-4 w-4 text-zinc-400" />
            Instagram
          </a>
        )}
        {!email && !profile.phone && !profile.linkedinUrl && !profile.twitterUrl && !profile.instagramUrl && (
          <p className="text-sm text-zinc-400">No contact details shared publicly.</p>
        )}
      </div>
    </div>
  );
}
