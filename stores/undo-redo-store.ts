import { create } from 'zustand';
import type { Dashboard, Widget, LayoutItem } from '@/types';

interface DashboardState {
    widgets: Widget[];
    layout: LayoutItem[];
    name?: string;
    description?: string;
}

interface UndoRedoState {
    // History stacks
    past: DashboardState[];
    present: DashboardState | null;
    future: DashboardState[];

    // Config
    maxHistorySize: number;

    // Actions
    initializeState: (state: DashboardState) => void;
    pushState: (state: DashboardState) => void;
    undo: () => DashboardState | null;
    redo: () => DashboardState | null;
    canUndo: () => boolean;
    canRedo: () => boolean;
    clearHistory: () => void;
    getHistoryLength: () => { past: number; future: number };
}

export const useUndoRedoStore = create<UndoRedoState>((set, get) => ({
    past: [],
    present: null,
    future: [],
    maxHistorySize: 50,

    initializeState: (state) => {
        set({
            past: [],
            present: state,
            future: [],
        });
    },

    pushState: (newState) => {
        const { past, present, maxHistorySize } = get();

        if (!present) {
            set({ present: newState });
            return;
        }

        // Check if state actually changed
        const hasChanged = 
            JSON.stringify(present.widgets) !== JSON.stringify(newState.widgets) ||
            JSON.stringify(present.layout) !== JSON.stringify(newState.layout) ||
            present.name !== newState.name ||
            present.description !== newState.description;

        if (!hasChanged) return;

        // Add current to past, limit size
        const newPast = [...past, present];
        if (newPast.length > maxHistorySize) {
            newPast.shift();
        }

        set({
            past: newPast,
            present: newState,
            future: [], // Clear future on new action
        });
    },

    undo: () => {
        const { past, present, future } = get();

        if (past.length === 0 || !present) return null;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);

        set({
            past: newPast,
            present: previous,
            future: [present, ...future],
        });

        return previous;
    },

    redo: () => {
        const { past, present, future } = get();

        if (future.length === 0 || !present) return null;

        const next = future[0];
        const newFuture = future.slice(1);

        set({
            past: [...past, present],
            present: next,
            future: newFuture,
        });

        return next;
    },

    canUndo: () => {
        return get().past.length > 0;
    },

    canRedo: () => {
        return get().future.length > 0;
    },

    clearHistory: () => {
        set({
            past: [],
            future: [],
        });
    },

    getHistoryLength: () => {
        const { past, future } = get();
        return { past: past.length, future: future.length };
    },
}));

// Hook to use undo/redo with dashboard store
export function useDashboardUndoRedo() {
    const {
        pushState,
        undo,
        redo,
        canUndo,
        canRedo,
        initializeState,
        clearHistory,
        getHistoryLength,
    } = useUndoRedoStore();

    return {
        pushState,
        undo,
        redo,
        canUndo: canUndo(),
        canRedo: canRedo(),
        initializeState,
        clearHistory,
        historyLength: getHistoryLength(),
    };
}
