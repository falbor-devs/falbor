import { create } from 'zustand';
import { OperatorAction } from './actions';

export interface OperatorState {
  isVisible: boolean;
  isThinking: boolean;
  isOpen: boolean;
  hasSeenOnboarding: boolean;
  currentMessage: string;
  isAskingUser: boolean;
  memory: Record<string, any>;
  
  // Actions
  setVisibility: (visible: boolean) => void;
  setThinking: (thinking: boolean) => void;
  setOpen: (open: boolean) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setCurrentMessage: (msg: string) => void;
  setIsAskingUser: (asking: boolean) => void;
  updateMemory: (data: Record<string, any>) => void;
  reset: () => void;
}

export const useOperatorStore = create<OperatorState>((set) => ({
  isVisible: true, // Should be true if logged in, we can manage this via an effect
  isThinking: false,
  isOpen: true,
  hasSeenOnboarding: false,
  currentMessage: 'Welcome to Falbor. What do you want to build today?',
  isAskingUser: true, // Start by asking the user
  memory: {},

  setVisibility: (isVisible) => set({ isVisible }),
  setThinking: (isThinking) => set({ isThinking }),
  setOpen: (isOpen) => set({ isOpen }),
  setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
  setCurrentMessage: (currentMessage) => set({ currentMessage }),
  setIsAskingUser: (isAskingUser) => set({ isAskingUser }),
  updateMemory: (data) => set((state) => ({ memory: { ...state.memory, ...data } })),
  reset: () => set({
    isThinking: false,
    currentMessage: '',
    isAskingUser: false,
  }),
}));
