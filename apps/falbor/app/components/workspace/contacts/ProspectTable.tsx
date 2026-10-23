import type { MyProspect } from "~/lib/actions/myProspects";
import { ProspectStatusMenu } from "./ProspectStatusMenu";
import type { ProspectListProps } from "./types";

export function ProspectTable({
  prospects,
  sendingId,
  onStatusChange,
  onDelete,
  onSendToAi,
}: ProspectListProps) {
  return (
    <table className="w-full text-left border-collapse">
      <thead className="sticky top-0 border-b border-gray-300 dark:border-gray-800 text-xs text-falbor-elements-textSecondary">
        <tr>
          <th className="px-6 py-3.5">Name</th>
          <th className="px-6 py-3.5">Company &amp; Title</th>
          <th className="px-6 py-3.5">Contact Info</th>
          <th className="px-6 py-3.5">Source</th>
          <th className="px-6 py-3.5">Status</th>
          <th className="px-6 py-3.5">Date Added</th>
          <th className="px-6 py-3.5 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
        {prospects.map((prospect) => (
          <ProspectRow
            key={prospect.id}
            prospect={prospect}
            sending={sendingId === prospect.id}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onSendToAi={onSendToAi}
          />
        ))}
      </tbody>
    </table>
  );
}

interface ProspectRowProps {
  prospect: MyProspect;
  sending: boolean;
  onStatusChange: ProspectListProps["onStatusChange"];
  onDelete: ProspectListProps["onDelete"];
  onSendToAi: ProspectListProps["onSendToAi"];
}

function ProspectRow({
  prospect,
  sending,
  onStatusChange,
  onDelete,
  onSendToAi,
}: ProspectRowProps) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
      <td className="px-6 py-4 font-medium text-falbor-elements-textPrimary whitespace-nowrap">
        {prospect.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-falbor-elements-textPrimary font-medium">
            {prospect.company || "—"}
          </span>
          <span className="text-xs text-falbor-elements-textSecondary">
            {prospect.jobTitle || "—"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-falbor-elements-textPrimary">
            {prospect.email || "—"}
          </span>
          <span className="text-xs text-falbor-elements-textSecondary">
            {prospect.phone || "—"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          {prospect.source || "Manual"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <ProspectStatusMenu
          status={prospect.status}
          onChange={(status) => onStatusChange(prospect.id, status)}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-xs text-falbor-elements-textSecondary">
        {new Date(prospect.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onSendToAi(prospect)}
            disabled={sending}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 border border-purple-200 dark:border-purple-800 transition-colors"
            title="Send prospect to AI for research and outreach"
          >
            <span className="i-ph:sparkle w-3.5 h-3.5" />
            {sending ? "Sending..." : "Send to AI"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(prospect.id)}
            className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors"
            title="Delete prospect"
          >
            <span className="i-ph:trash w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
