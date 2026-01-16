import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Dashboard, Widget, LayoutItem, GlobalFilterState } from '@/types';
import { generateId } from '@/lib/utils';

interface DashboardState {
    // Data
    dashboards: Dashboard[];
    currentDashboard: Dashboard | null;
    isEditing: boolean;
    isSaving: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    setDashboards: (dashboards: Dashboard[]) => void;
    setCurrentDashboard: (dashboard: Dashboard | null) => void;
    createDashboard: (name: string, description?: string) => Promise<Dashboard | null>;
    updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
    deleteDashboard: (id: string) => Promise<boolean>;

    // Layout Actions
    updateLayout: (layout: LayoutItem[]) => void;
    addWidget: (widget: Widget) => void;
    updateWidget: (widgetId: string, updates: Partial<Widget>) => void;
    removeWidget: (widgetId: string) => void;

    // MongoDB Sync
    fetchDashboards: () => Promise<void>;
    fetchDashboard: (id: string) => Promise<Dashboard | null>;
    saveDashboardToServer: (dashboard?: Dashboard | null) => Promise<boolean>;
    createShareLink: (dashboardId: string, options?: { permission?: 'view' | 'edit'; expiresIn?: string; maxViews?: number }) => Promise<{ publicUrl: string; token: string } | null>;

    // UI State
    toggleEditing: () => void;
    setIsSaving: (isSaving: boolean) => void;
    setError: (error: string | null) => void;

    // Global Filters
    globalFilters: GlobalFilterState;
    setGlobalFilters: (filters: Partial<GlobalFilterState>) => void;
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            // Initial State
            dashboards: [],
            currentDashboard: null,
            isEditing: false,
            isSaving: false,
            isLoading: false,
            error: null,

            globalFilters: {
                dateRange: {
                    from: new Date(new Date().setDate(new Date().getDate() - 30)),
                    to: new Date()
                },
                resolution: 'day'
            },

            // Actions
            setDashboards: (dashboards) => set({ dashboards }),

            setGlobalFilters: (updates) => set((state) => ({
                globalFilters: { ...state.globalFilters, ...updates }
            })),

            setCurrentDashboard: (dashboard) => set({ currentDashboard: dashboard }),

            createDashboard: async (name, description) => {
                set({ isSaving: true, error: null });
                try {
                    const response = await fetch('/api/dashboards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, description }),
                    });

                    const result = await response.json();

                    if (result.success && result.data) {
                        const newDashboard = {
                            ...result.data,
                            id: result.data._id || result.data.id,
                        };
                        set((state) => ({
                            dashboards: [...state.dashboards, newDashboard],
                            currentDashboard: newDashboard,
                            isSaving: false,
                        }));
                        return newDashboard;
                    } else {
                        set({ error: result.error || 'Failed to create dashboard', isSaving: false });
                        return null;
                    }
                } catch (error) {
                    console.error('Error creating dashboard:', error);
                    set({ error: 'Network error', isSaving: false });
                    return null;
                }
            },

            updateDashboard: (id, updates) => {
                set((state) => ({
                    dashboards: state.dashboards.map((d) =>
                        d.id === id ? { ...d, ...updates, updatedAt: new Date() } : d
                    ),
                    currentDashboard:
                        state.currentDashboard?.id === id
                            ? { ...state.currentDashboard, ...updates, updatedAt: new Date() }
                            : state.currentDashboard,
                }));
            },

            deleteDashboard: async (id) => {
                set({ isSaving: true, error: null });
                try {
                    const response = await fetch(`/api/dashboards/${id}`, {
                        method: 'DELETE',
                    });

                    const result = await response.json();

                    if (result.success) {
                        set((state) => ({
                            dashboards: state.dashboards.filter((d) => d.id !== id),
                            currentDashboard:
                                state.currentDashboard?.id === id ? null : state.currentDashboard,
                            isSaving: false,
                        }));
                        return true;
                    } else {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }
                } catch {
                    set({ error: 'Network error', isSaving: false });
                    return false;
                }
            },

            // Layout Actions
            updateLayout: (layout) => {
                const { currentDashboard } = get();
                if (!currentDashboard) return;

                const updatedWidgets = currentDashboard.widgets.map((widget) => {
                    const layoutItem = layout.find((l) => l.i === widget.id);
                    if (layoutItem) {
                        return { ...widget, layout: layoutItem };
                    }
                    return widget;
                });

                set((state) => ({
                    currentDashboard: state.currentDashboard
                        ? { ...state.currentDashboard, widgets: updatedWidgets, layout }
                        : null,
                }));
            },

            addWidget: (widget) => {
                set((state) => {
                    if (!state.currentDashboard) return state;
                    return {
                        currentDashboard: {
                            ...state.currentDashboard,
                            widgets: [...state.currentDashboard.widgets, widget],
                            layout: [...state.currentDashboard.layout, widget.layout],
                        },
                    };
                });
            },

            updateWidget: (widgetId, updates) => {
                set((state) => {
                    if (!state.currentDashboard) return state;
                    return {
                        currentDashboard: {
                            ...state.currentDashboard,
                            widgets: state.currentDashboard.widgets.map((w) =>
                                w.id === widgetId ? { ...w, ...updates } : w
                            ),
                        },
                    };
                });
            },

            removeWidget: (widgetId) => {
                set((state) => {
                    if (!state.currentDashboard) return state;
                    return {
                        currentDashboard: {
                            ...state.currentDashboard,
                            widgets: state.currentDashboard.widgets.filter((w) => w.id !== widgetId),
                            layout: state.currentDashboard.layout.filter((l) => l.i !== widgetId),
                        },
                    };
                });
            },

            // MongoDB Sync
            fetchDashboards: async () => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch('/api/dashboards');
                    const result = await response.json();

                    if (result.success && result.data) {
                        const dashboards = result.data.map((d: Dashboard & { _id?: string }) => ({
                            ...d,
                            id: d._id || d.id,
                        }));
                        set({ dashboards, isLoading: false });
                    } else {
                        set({ error: result.error, isLoading: false });
                    }
                } catch {
                    set({ error: 'Failed to fetch dashboards', isLoading: false });
                }
            },

            fetchDashboard: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch(`/api/dashboards/${id}`);
                    const result = await response.json();

                    if (result.success && result.data) {
                        const dashboard = {
                            ...result.data,
                            id: result.data._id || result.data.id,
                        };
                        set({ currentDashboard: dashboard, isLoading: false });
                        return dashboard;
                    } else {
                        set({ error: result.error, isLoading: false });
                        return null;
                    }
                } catch {
                    set({ error: 'Failed to fetch dashboard', isLoading: false });
                    return null;
                }
            },

            saveDashboardToServer: async (dashboard) => {
                const toSave = dashboard || get().currentDashboard;
                if (!toSave) return false;

                set({ isSaving: true, error: null });
                try {
                    const id = toSave.id || (toSave as Dashboard & { _id?: string })._id;
                    const response = await fetch(`/api/dashboards/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: toSave.name,
                            description: toSave.description,
                            widgets: toSave.widgets,
                            layout: toSave.layout,
                            tabs: toSave.tabs,
                            activeTabId: toSave.activeTabId,
                        }),
                    });

                    const result = await response.json();

                    if (result.success) {
                        set({ isSaving: false });
                        return true;
                    } else {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }
                } catch {
                    set({ error: 'Failed to save dashboard', isSaving: false });
                    return false;
                }
            },

            createShareLink: async (dashboardId, options = {}) => {
                try {
                    const response = await fetch(`/api/dashboards/${dashboardId}/share`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(options),
                    });

                    const result = await response.json();

                    if (result.success && result.data) {
                        return {
                            publicUrl: result.data.publicUrl,
                            token: result.data.token,
                        };
                    }
                    return null;
                } catch {
                    return null;
                }
            },

            // UI State
            toggleEditing: () => set((state) => ({ isEditing: !state.isEditing })),
            setIsSaving: (isSaving) => set({ isSaving }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'dashboard-storage',
            partialize: (state) => ({
                dashboards: state.dashboards,
                currentDashboard: state.currentDashboard,
            }),
        }
    )
);
