import { atom } from 'nanostores';
import type { ElementInfo } from '~/components/workbench/Inspector';

export interface CommentMessage {
  id: string;
  sender: 'user' | 'ai';
  authorName: string;
  authorAvatar?: string;
  text: string;
  timestamp: string;
}

export interface ElementComment {
  id: string;
  elementInfo: ElementInfo;
  position: {
    x: number;
    y: number;
    pageTop?: number;
    pageLeft?: number;
  };
  messages: CommentMessage[];
  createdAt: string;
}

export const isCommentModeAtom = atom<boolean>(false);
export const commentsAtom = atom<ElementComment[]>([]);
export const activeCommentIdAtom = atom<string | null>(null);

const fetchServerComments = async () => {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/comments');
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && Array.isArray(data.comments)) {
      commentsAtom.set(data.comments);
    }
  } catch (e) {
    console.error('Failed to fetch server comments', e);
  }
};

const saveServerComment = async (comment: ElementComment) => {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
  } catch (e) {
    console.error('Failed to save comment to server', e);
  }
};

const deleteServerComment = async (commentId: string) => {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`/api/comments?id=${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.error('Failed to delete comment on server', e);
  }
};

// Initialise fetching from server
fetchServerComments();

export const commentStore = {
  isCommentMode: isCommentModeAtom,
  comments: commentsAtom,
  activeCommentId: activeCommentIdAtom,

  fetchComments: fetchServerComments,

  toggleCommentMode: (enabled?: boolean) => {
    const current = isCommentModeAtom.get();
    const next = enabled !== undefined ? enabled : !current;
    isCommentModeAtom.set(next);
    if (!next) {
      commentStore.cleanupDrafts();
      activeCommentIdAtom.set(null);
    }
  },

  cleanupDrafts: () => {
    const activeId = activeCommentIdAtom.get();
    const comments = commentsAtom.get();
    const draftsToRemove = comments.filter((c) => c.messages.length === 0 && c.id !== activeId);
    
    if (draftsToRemove.length > 0) {
      const valid = comments.filter((c) => c.messages.length > 0 || c.id === activeId);
      commentsAtom.set(valid);
      draftsToRemove.forEach((d) => deleteServerComment(d.id));
    }
  },

  addComment: (elementInfo: ElementInfo, position: { x: number; y: number; pageTop?: number; pageLeft?: number }): ElementComment => {
    commentStore.cleanupDrafts();

    const newComment: ElementComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      elementInfo,
      position,
      messages: [],
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextComments = [...commentsAtom.get(), newComment];
    commentsAtom.set(nextComments);
    activeCommentIdAtom.set(newComment.id);
    return newComment;
  },

  addMessage: (commentId: string, message: Omit<CommentMessage, 'id' | 'timestamp'>) => {
    const comments = commentsAtom.get();
    let updatedComment: ElementComment | null = null;
    const updated = comments.map((comment) => {
      if (comment.id === commentId) {
        updatedComment = {
          ...comment,
          messages: [
            ...comment.messages,
            {
              ...message,
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        };
        return updatedComment;
      }
      return comment;
    });
    commentsAtom.set(updated);
    if (updatedComment) {
      saveServerComment(updatedComment);
    }
  },

  deleteComment: (commentId: string) => {
    const comments = commentsAtom.get().filter((c) => c.id !== commentId);
    commentsAtom.set(comments);
    deleteServerComment(commentId);
    if (activeCommentIdAtom.get() === commentId) {
      activeCommentIdAtom.set(null);
    }
  },

  setActiveComment: (commentId: string | null) => {
    const currentActive = activeCommentIdAtom.get();
    if (currentActive && currentActive !== commentId) {
      const activeComment = commentsAtom.get().find((c) => c.id === currentActive);
      if (activeComment && activeComment.messages.length === 0) {
        commentStore.deleteComment(currentActive);
      }
    }
    activeCommentIdAtom.set(commentId);
  },
};
