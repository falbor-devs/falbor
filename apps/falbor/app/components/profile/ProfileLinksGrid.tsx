interface CustomLink {
  title: string;
  url: string;
  description?: string;
}

interface ProfileLinksGridProps {
  links?: CustomLink[];
}

export function ProfileLinksGrid({ links }: ProfileLinksGridProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className="mb-10">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
        Featured Links
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col p-5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500/50 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                <div className="i-ph:link-simple-bold text-xl" />
              </div>
              <div className="i-ph:arrow-up-right w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {link.title}
            </h4>
            {link.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {link.description}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
