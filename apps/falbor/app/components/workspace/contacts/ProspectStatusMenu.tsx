import { classNames } from "~/utils/classNames";
import { Dropdown, DropdownItem } from "~/components/ui/Dropdown";
import { statusLabels } from "./constants";
import type { ProspectStatus } from "~/lib/actions/myProspects";

interface ProspectStatusMenuProps {
  status: ProspectStatus;
  onChange: (status: ProspectStatus) => void;
}

export function ProspectStatusMenu({
  status,
  onChange,
}: ProspectStatusMenuProps) {
  return (
    <Dropdown
      align="start"
      trigger={
        <button
          type="button"
          className={classNames(
            "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md outline-none cursor-pointer transition-colors",
            status === "new"
              ? "bg-[#0099ff]/20 text-[#0099ff]"
              : status === "contacted"
                ? "text-yellow-600 dark:bg-yellow-950/30 hover:bg-yellow-100"
                : status === "replied"
                  ? "text-purple-600 dark:bg-purple-950/30 hover:bg-purple-100"
                  : status === "qualified"
                    ? "text-indigo-600 dark:bg-indigo-950/30 hover:bg-indigo-100"
                    : "text-green-600 dark:bg-green-950/30 hover:bg-green-100",
          )}
        >
          <span>{statusLabels[status] || status}</span>
          <span className="i-ph:caret-down text-xs opacity-70" />
        </button>
      }
    >
      {(
        [
          "new",
          "contacted",
          "replied",
          "qualified",
          "customer",
        ] as ProspectStatus[]
      ).map((option) => (
        <DropdownItem
          key={option}
          active={status === option}
          onSelect={() => onChange(option)}
          className="cursor-pointer font-medium text-xs justify-between"
        >
          <span>{statusLabels[option]}</span>
          {status === option && <span className="i-ph:check text-xs" />}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
