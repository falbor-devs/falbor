import { Slider } from "~/components/ui/Slider";
import type { ImportSource } from "./types";

interface ImportSourceTabsProps {
  activeTab: ImportSource;
  onChange: (source: ImportSource) => void;
}

export function ImportSourceTabs({
  activeTab,
  onChange,
}: ImportSourceTabsProps) {
  return (
    <div className="flex justify-start my-1">
      <Slider
        selected={activeTab}
        setSelected={(value) => onChange(value as ImportSource)}
        options={{
          left: {
            value: "contacts",
            text: "Google Contacts",
            icon: "i-ph:address-book",
          },
          middle: { value: "gmail", text: "Gmail", icon: "i-ph:envelope" },
          right: {
            value: "calendar",
            text: "Google Calendar",
            icon: "i-ph:calendar",
          },
        }}
      />
    </div>
  );
}
