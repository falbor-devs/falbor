import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

export const ExportChatButton = ({ exportChat }: { exportChat?: () => void }) => {
  return (
    <div className="flex rounded-md overflow-hidden">
      <Dropdown
        trigger={
          <button className="rounded-md bg-white dark:bg-[#252525] text-gray-900 dark:text-white border border-gray-200 dark:border-transparent items-center justify-center [&:is(:disabled,.disabled)]:cursor-not-allowed [&:is(:disabled,.disabled)]:opacity-60 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-[#333333] !outline-none appearance-none flex items-center gap-1.5 shadow-sm">
            Export
            <span className={classNames('i-ph:caret-down transition-transform')} />
          </button>
        }
      >
        <DropdownItem onSelect={() => workbenchStore.downloadZip()}>
          <div className="i-ph:code size-4.5"></div>
          <span>Download Code</span>
        </DropdownItem>
        <DropdownItem onSelect={() => exportChat?.()}>
          <div className="i-ph:chat size-4.5"></div>
          <span>Export Chat</span>
        </DropdownItem>
      </Dropdown>
    </div>
  );
};