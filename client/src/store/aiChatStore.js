import { create } from 'zustand';

export const useAiChatStore = create((set) => ({
  isOpen: false,
  initialQuestion: '',
  setIsOpen: (isOpen) => set({ isOpen }),
  openWithQuestion: (question) => set({ isOpen: true, initialQuestion: question }),
  clearInitialQuestion: () => set({ initialQuestion: '' }),
}));
