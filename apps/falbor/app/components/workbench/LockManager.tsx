'use client';
import { useState, useEffect } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { Checkbox } from '~/components/ui/Checkbox';
import { toast } from '~/components/ui/use-toast';

interface LockedItem {
  path: string;
  type: 'file' | 'folder';
}

export function LockManager() {
  const [lockedItems, setLockedItems] = useState<LockedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'files' | 'folders'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  
  useEffect(() => {
    const loadLockedItems = () => {
      
      const items: LockedItem[] = [];

      
      const allFiles = workbenchStore.files.get();

      
      Object.entries(allFiles).forEach(([path, item]) => {
        if (!item) {
          return;
        }

        if (item.type === 'file' && item.isLocked) {
          items.push({
            path,
            type: 'file',
          });
        } else if (item.type === 'folder' && item.isLocked) {
          items.push({
            path,
            type: 'folder',
          });
        }
      });

      setLockedItems(items);
    };

    loadLockedItems();

    
    const intervalId = setInterval(loadLockedItems, 5000);

    return () => clearInterval(intervalId);
  }, []);

  
  const filteredAndSortedItems = lockedItems
    .filter((item) => {
      
      if (filter === 'files' && item.type !== 'file') {
        return false;
      }

      if (filter === 'folders' && item.type !== 'folder') {
        return false;
      }

      
      if (searchTerm && !item.path.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      return a.path.localeCompare(b.path);
    });

  
  const handleSelectItem = (path: string) => {
    const newSelectedItems = new Set(selectedItems);

    if (newSelectedItems.has(path)) {
      newSelectedItems.delete(path);
    } else {
      newSelectedItems.add(path);
    }

    setSelectedItems(newSelectedItems);
  };

  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      
      const allVisiblePaths = new Set(filteredAndSortedItems.map((item) => item.path));
      setSelectedItems(allVisiblePaths);
    } else {
      
      setSelectedItems(new Set());
    }
  };

  
  const handleUnlockSelected = () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected to unlock.');
      return;
    }

    let unlockedCount = 0;
    selectedItems.forEach((path) => {
      const item = lockedItems.find((i) => i.path === path);

      if (item) {
        if (item.type === 'file') {
          workbenchStore.unlockFile(path);
        } else {
          workbenchStore.unlockFolder(path);
        }

        unlockedCount++;
      }
    });

    if (unlockedCount > 0) {
      toast.success(`Unlocked ${unlockedCount} selected item(s).`);
      setSelectedItems(new Set()); 
    }
  };

  
  const isAllSelected = filteredAndSortedItems.length > 0 && selectedItems.size === filteredAndSortedItems.length;
  const isSomeSelected = selectedItems.size > 0 && selectedItems.size < filteredAndSortedItems.length;
  const selectAllCheckedState: boolean | 'indeterminate' = isAllSelected
    ? true
    : isSomeSelected
      ? 'indeterminate'
      : false;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-falbor-elements-borderColor">
        {}
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-falbor-elements-textTertiary i-ph:magnifying-glass text-xs pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full text-xs pl-6 pr-2 py-0.5 h-6 bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary rounded border border-falbor-elements-borderColor focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: 0 }}
          />
        </div>
        {}
        <select
          className="text-xs px-1 py-0.5 h-6 bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary rounded border border-falbor-elements-borderColor focus:outline-none"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">All</option>
          <option value="files">Files</option>
          <option value="folders">Folders</option>
        </select>
      </div>

      {}
      <div className="flex items-center justify-between px-2 py-1 text-xs text-falbor-elements-textSecondary">
        <div>
          <Checkbox
            checked={selectAllCheckedState}
            onCheckedChange={handleSelectAll}
            className="w-3 h-3 rounded border-falbor-elements-borderColor mr-2"
            aria-label="Select all items"
            disabled={filteredAndSortedItems.length === 0} 
          />
          <span>All</span>
        </div>
        {selectedItems.size > 0 && (
          <button
            className="ml-auto px-2 py-0.5 rounded bg-falbor-elements-button-secondary-background hover:bg-falbor-elements-button-secondary-backgroundHover text-falbor-elements-button-secondary-text text-xs flex items-center gap-1"
            onClick={handleUnlockSelected}
            title="Unlock all selected items"
          >
            Unlock all
          </button>
        )}
        <div></div>
      </div>

      {}
      <div className="flex-1 overflow-auto modern-scrollbar px-1 py-1">
        {filteredAndSortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-falbor-elements-textTertiary text-xs gap-2">
            <span className="i-ph:lock-open-duotone text-lg opacity-50" />
            <span>No locked items found</span>
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredAndSortedItems.map((item) => (
              <li
                key={item.path}
                className={classNames(
                  'text-falbor-elements-textTertiary flex items-center gap-2 px-2 py-1 rounded hover:bg-falbor-elements-background-depth-2 transition-colors group',
                  selectedItems.has(item.path) ? 'bg-falbor-elements-background-depth-2' : '',
                )}
              >
                <Checkbox
                  checked={selectedItems.has(item.path)}
                  onCheckedChange={() => handleSelectItem(item.path)}
                  className="w-3 h-3 rounded border-falbor-elements-borderColor"
                  aria-labelledby={`item-label-${item.path}`} 
                />
                <span
                  className={classNames(
                    'shrink-0 text-falbor-elements-textTertiary text-xs',
                    item.type === 'file' ? 'i-ph:file-text-duotone' : 'i-ph:folder-duotone',
                  )}
                />
                <span id={`item-label-${item.path}`} className="truncate flex-1 text-xs" title={item.path}>
                  {item.path.replace('/home/project/', '')}
                </span>
                {}
                <span
                  className={classNames(
                    'inline-flex items-center px-1 rounded-sm text-xs',
                    'bg-red-500/10 text-red-500',
                  )}
                ></span>
                <button
                  className="flex items-center px-1 py-0.5 text-xs rounded bg-transparent hover:bg-falbor-elements-background-depth-3"
                  onClick={() => {
                    if (item.type === 'file') {
                      workbenchStore.unlockFile(item.path);
                    } else {
                      workbenchStore.unlockFolder(item.path);
                    }

                    toast.success(`${item.path.replace('/home/project/', '')} unlocked`);
                  }}
                  title="Unlock"
                >
                  <span className="i-ph:lock-open text-xs" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {}
      <div className="px-2 py-1 border-t border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-xs text-falbor-elements-textTertiary flex justify-between items-center">
        <div>
          {filteredAndSortedItems.length} item(s) • {selectedItems.size} selected
        </div>
      </div>
    </div>
  );
}
