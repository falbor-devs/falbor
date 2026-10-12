import { classNames } from '~/utils/classNames';

interface ConnectionsTableProps {
  connections: any[];
  isLoading: boolean;
  onAddConnection: () => void;
  onSelectConnection: (conn: any) => void;
}

function formatRelativeTime(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}

export function ConnectionsTable({ connections, isLoading, onAddConnection, onSelectConnection }: ConnectionsTableProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-falbor-elements-textPrimary">Connections</h3>
        <button
          onClick={onAddConnection}
          className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors"
        >
          <div className="i-ph:plus w-4 h-4" />
          Add connection
        </button>
      </div>

      <div className="w-full overflow-hidden border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark rounded-xl bg-[#FAFAFA] dark:bg-[#1A1A1A]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="i-svg-spinners:90-ring-with-bg text-blue-500 w-8 h-8" />
          </div>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-12 h-12 mb-4 rounded-full bg-falbor-elements-background-depth-3 flex items-center justify-center">
              <div className="i-ph:info text-falbor-elements-textSecondary w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-falbor-elements-textPrimary mb-1">No connections found</p>
            <p className="text-sm text-falbor-elements-textSecondary">Click the button above to connect your account.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark">
                <th className="px-6 py-3 text-xs font-semibold text-falbor-elements-textSecondary uppercase tracking-wider w-[50%]">Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-falbor-elements-textSecondary uppercase tracking-wider w-[25%]">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-falbor-elements-textSecondary uppercase tracking-wider w-[25%]">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-falbor-elements-borderColor dark:divide-falbor-elements-borderColor-dark">
              {connections.map((conn) => {
                
                const isApiKey = conn.type === 'api_key';
                const mcpName = conn.config?.authed_user?.name || conn.config?.user?.name || conn.name;
                const mcpEmail = isApiKey
                  ? 'API Key connection'
                  : (conn.config?.authed_user?.email || conn.config?.user?.email || conn.config?.authed_user?.username || conn.config?.authed_user?.name || '(No profile info)');
                const mcpAvatar = conn.config?.authed_user?.avatar || conn.config?.user?.avatar || null;

                return (
                  <tr 
                    key={conn.id} 
                    onClick={() => onSelectConnection(conn)}
                    className="hover:bg-gray-100 dark:hover:bg-[#222222] cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-medium text-falbor-elements-textPrimary group-hover:text-blue-500 transition-colors">
                            {conn.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-200 dark:bg-[#333333] text-gray-700 dark:text-gray-300">
                            Personal
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {mcpAvatar ? (
                            <img src={mcpAvatar} alt="avatar" className="w-4 h-4 rounded-full object-cover" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[8px] font-bold">
                              {isApiKey ? (
                                <div className="i-ph:key w-2.5 h-2.5" />
                              ) : (
                                mcpName?.[0]?.toUpperCase() || '?'
                              )}
                            </div>
                          )}
                          <span className="text-xs text-falbor-elements-textSecondary truncate">
                            {mcpEmail} {isApiKey ? '' : '(connected account)'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 bg-gray-200/50 dark:bg-[#2A2A2A] px-2.5 py-1 rounded-md w-fit">
                        <div className="i-ph:squares-four w-3.5 h-3.5 text-falbor-elements-textSecondary" />
                        <span className="text-xs font-medium text-falbor-elements-textSecondary">App + chat</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-falbor-elements-textPrimary">
                        {formatRelativeTime(conn.updatedAt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
