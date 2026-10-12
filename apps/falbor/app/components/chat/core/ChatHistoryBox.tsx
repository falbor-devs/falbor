'use client';

import React, { useEffect, useState } from 'react';
import { getChatsAndFolders, createFolder, moveChatToFolder } from '~/lib/actions/folders';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import classNames from 'classnames';
import { DialogRoot, Dialog, DialogTitle } from '~/components/ui/Dialog';

type Folder = {
  id: string;
  name: string;
};

type Chat = {
  id: string;
  title: string | null;
  folderId: string | null;
  createdAt: Date;
};

const ITEM_TYPE = 'CHAT';

// --- Folder Component (Droppable) ---
function FolderDropZone({
  folder,
  chats,
  publishedStatus,
  onDropChat,
}: {
  folder: Folder | { id: 'uncategorized'; name: string };
  chats: Chat[];
  publishedStatus: Record<string, boolean>;
  onDropChat: (chatId: string, folderId: string | null) => void;
}) {
  const [{ isOver }, dropRef] = useDrop({
    accept: ITEM_TYPE,
    drop: (item: { id: string }) => {
      onDropChat(item.id, folder.id === 'uncategorized' ? null : folder.id);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div ref={dropRef as any} className="mb-6">
      <div
        className={classNames(
          "flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg transition-colors cursor-pointer",
          isOver ? "bg-gray-100 dark:bg-[#1A1A1E]" : "hover:bg-gray-50 dark:hover:bg-[#111114]"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={classNames("text-gray-400 transition-transform", isExpanded ? "rotate-90" : "")}>
          <i className="i-ph:caret-right text-sm" />
        </div>
        <div className="text-gray-900 dark:text-gray-200 font-medium flex items-center gap-2">
          <i className={folder.id === 'uncategorized' ? "i-ph:tray" : "i-ph:folder"} />
          {folder.name}
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-[#1A1A1E] px-1.5 py-0.5 rounded-full ml-1">{chats.length}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-1">
          {chats.length === 0 ? (
            <div className="text-sm text-gray-500 italic px-8 py-2">No chats here</div>
          ) : (
            chats.map(chat => (
              <DraggableChat
                key={chat.id}
                chat={chat}
                isPublished={!!publishedStatus[chat.id]}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DraggableChat({ chat, isPublished }: { chat: Chat, isPublished: boolean }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: ITEM_TYPE,
    item: { id: chat.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const [expanded, setExpanded] = useState(false);

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    const match = window.location.pathname.match(/\/workspace\/([^\/]+)/);
    const workspaceId = match ? match[1] : 'default';
    window.location.href = `/workspace/${workspaceId}/new/${chat.id}`;
  };

  return (
    <div
      ref={dragRef as any}
      className={classNames(
        "group relative flex flex-col px-4 py-3 bg-transparent hover:bg-gray-50 dark:hover:bg-[#1A1A1E] border-b border-gray-100 dark:border-[#1A1A1E] last:border-0 transition-colors cursor-pointer",
        isDragging ? "opacity-50" : "opacity-100"
      )}
      onClick={handleOpenChat}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-900 dark:text-gray-200 font-medium group-hover:text-blue-500 transition-colors">
            {chat.title || "New Chat"}
            {isPublished && (
              <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-400/10 px-1.5 py-0.5 rounded uppercase">
                Published
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(chat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
        <button
          className="text-gray-500 hover:text-gray-300 p-2 transition-transform duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          title="Show Chat ID info"
        >
          <i className={classNames("i-ph:caret-right", expanded && "rotate-90")} />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pl-2 border-l-2 border-gray-200 dark:border-[#2B2D31] text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="font-semibold text-gray-600 dark:text-gray-500 uppercase tracking-wider">Chat ID:</span>
          <code className="bg-gray-100 dark:bg-[#111114] px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">{chat.id}</code>
          <button
            className="ml-auto text-blue-400 hover:text-blue-300 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(chat.id);
            }}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main Box ---
export function ChatHistoryBox() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [publishedStatus, setPublishedStatus] = useState<Record<string, boolean>>({});

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const loadData = async () => {
    try {
      const data = await getChatsAndFolders();
      setFolders(data.folders);
      setChats(data.chats);
      setPublishedStatus(data.publishedStatus);
    } catch (e) {
      console.error("Failed to load chats/folders", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreatingFolder(false);
      await loadData();
    } catch (e) {
      console.error("Failed to create folder", e);
    }
  };

  const handleDropChat = async (chatId: string, folderId: string | null) => {
    // Optimistic UI update
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, folderId } : c));
    try {
      await moveChatToFolder(chatId, folderId);
    } catch (e) {
      console.error("Failed to move chat", e);
      await loadData(); // Revert on failure
    }
  };

  // Group chats by folder
  const uncategorizedChats = chats.filter(c => !c.folderId);
  const folderGroups = folders.map(f => ({
    folder: f,
    chats: chats.filter(c => c.folderId === f.id)
  }));

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full max-w-chat mx-auto mt-[60px] bg-white dark:bg-[#111114] border border-[#D6D6D6] dark:border-transparent rounded-xl overflow-y-scroll p-6 mb-20 max-h-[600px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <i className="i-ph:projector-screen-camera" />
            Projects
          </h2>

          <button
            onClick={() => setIsCreatingFolder(true)}
            className="text-sm bg-[#0099ff]/10 text-[#0099ff] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <i className="i-ph:folder-plus" />
            Create Folder
          </button>
        </div>

        {/* Create Folder Modal */}
        <DialogRoot open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
          {isCreatingFolder && (
            <Dialog onClose={() => setIsCreatingFolder(false)} onBackdrop={() => setIsCreatingFolder(false)}>
              <div className="p-6">
                <DialogTitle className="text-lg font-semibold text-gray-100 mb-4">Create New Folder</DialogTitle>
                <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Folder Name"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#1C1D21] border border-gray-200 dark:border-transparent text-gray-900 dark:text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setIsCreatingFolder(false)} className="bg-transparent hover:bg-gray-100 dark:hover:bg-[#1C1D21] text-gray-600 dark:text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="bg-[#0099ff]/30 text-[#0099ff] hover:bg-[#0099ff] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </Dialog>
          )}
        </DialogRoot>

        <div className="border border-dashed border-gray-300 dark:border-[#353538] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between mb-8">
          <div>
            <h3 className="text-gray-900 dark:text-gray-200 font-medium mb-1">Organize your workspace</h3>
            <p className="text-gray-500 text-sm">Drag and drop chats into folders to keep things organized.</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#1C1D21] border border-gray-200 dark:border-[#2B2D31] flex items-center justify-center mt-4 sm:mt-0">
            <i className="i-ph:folder-open text-xl text-gray-400" />
          </div>
        </div>
        <div className="flex flex-col">
          {folderGroups.map(group => (
            <FolderDropZone
              key={group.folder.id}
              folder={group.folder}
              chats={group.chats}
              publishedStatus={publishedStatus}
              onDropChat={handleDropChat}
            />
          ))}
          <FolderDropZone
            folder={{ id: 'uncategorized', name: 'Uncategorized' }}
            chats={uncategorizedChats}
            publishedStatus={publishedStatus}
            onDropChat={handleDropChat}
          />
        </div>
      </div>
    </DndProvider>
  );
}
