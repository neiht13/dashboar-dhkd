import { create } from 'zustand';

// =============================================
// TYPES
// =============================================

export interface DatasetColumn {
    name: string;
    type: string;
    nullable?: boolean;
    isPrimaryKey?: boolean;
}

export interface Dataset {
    id: string;
    _id?: string;
    name: string;
    description?: string;
    sourceType: 'table' | 'query' | 'import' | 'storedProcedure';
    table?: string;
    schema?: string;
    customQuery?: string;
    storedProcedureName?: string;
    storedProcedureParams?: Record<string, unknown>;
    importedFileName?: string;
    connectionId?: string;
    columns: DatasetColumn[];
    rowCount?: number;
    lastRefreshed?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DatasetPreview {
    rows: Record<string, unknown>[];
    totalRows: number;
    columns: { name: string; type: string }[];
}

interface DatasetState {
    // Data
    datasets: Dataset[];
    isLoading: boolean;
    error: string | null;

    // UI
    selectedDatasetId: string | null;
    previewData: DatasetPreview | null;
    isPreviewLoading: boolean;
    showCreateDialog: boolean;
    editingDataset: Dataset | null;

    // Actions
    fetchDatasets: () => Promise<void>;
    createDataset: (data: Partial<Dataset> & { importedData?: Record<string, unknown>[] }) => Promise<Dataset | null>;
    updateDataset: (id: string, data: Partial<Dataset>) => Promise<Dataset | null>;
    deleteDataset: (id: string) => Promise<boolean>;
    previewDataset: (id: string, limit?: number) => Promise<DatasetPreview | null>;
    refreshColumns: (id: string) => Promise<void>;

    // UI Actions
    setSelectedDatasetId: (id: string | null) => void;
    setShowCreateDialog: (show: boolean) => void;
    setEditingDataset: (dataset: Dataset | null) => void;
    clearError: () => void;
}

export const useDatasetStore = create<DatasetState>()((set, get) => ({
    // Initial state
    datasets: [],
    isLoading: false,
    error: null,
    selectedDatasetId: null,
    previewData: null,
    isPreviewLoading: false,
    showCreateDialog: false,
    editingDataset: null,

    // Fetch all datasets
    fetchDatasets: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch('/api/datasets');
            const result = await res.json();
            if (result.success && result.data) {
                set({
                    datasets: result.data,
                    isLoading: false,
                });
            } else {
                set({ error: result.error || 'Lỗi tải bộ dữ liệu', isLoading: false });
            }
        } catch {
            set({ error: 'Lỗi kết nối', isLoading: false });
        }
    },

    // Create dataset
    createDataset: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch('/api/datasets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (result.success && result.data) {
                const newDataset = result.data;
                set((state) => ({
                    datasets: [newDataset, ...state.datasets],
                    isLoading: false,
                    showCreateDialog: false,
                    editingDataset: null,
                }));
                return newDataset;
            } else {
                set({ error: result.error || 'Lỗi tạo bộ dữ liệu', isLoading: false });
                return null;
            }
        } catch {
            set({ error: 'Lỗi kết nối', isLoading: false });
            return null;
        }
    },

    // Update dataset
    updateDataset: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`/api/datasets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (result.success && result.data) {
                const updated = result.data;
                set((state) => ({
                    datasets: state.datasets.map((d) => d.id === id ? updated : d),
                    isLoading: false,
                    editingDataset: null,
                }));
                return updated;
            } else {
                set({ error: result.error || 'Lỗi cập nhật', isLoading: false });
                return null;
            }
        } catch {
            set({ error: 'Lỗi kết nối', isLoading: false });
            return null;
        }
    },

    // Delete dataset
    deleteDataset: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`/api/datasets/${id}`, {
                method: 'DELETE',
            });
            const result = await res.json();
            if (result.success) {
                set((state) => ({
                    datasets: state.datasets.filter((d) => d.id !== id),
                    isLoading: false,
                    selectedDatasetId: state.selectedDatasetId === id ? null : state.selectedDatasetId,
                    previewData: state.selectedDatasetId === id ? null : state.previewData,
                }));
                return true;
            } else {
                set({ error: result.error || 'Lỗi xóa', isLoading: false });
                return false;
            }
        } catch {
            set({ error: 'Lỗi kết nối', isLoading: false });
            return false;
        }
    },

    // Preview dataset data
    previewDataset: async (id, limit = 50) => {
        set({ isPreviewLoading: true });
        try {
            const res = await fetch(`/api/datasets/${id}/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit }),
            });
            const result = await res.json();
            if (result.success && result.data) {
                set({ previewData: result.data, isPreviewLoading: false });
                return result.data;
            } else {
                set({ isPreviewLoading: false });
                return null;
            }
        } catch {
            set({ isPreviewLoading: false });
            return null;
        }
    },

    // Refresh columns for a dataset (re-detect from source)
    refreshColumns: async (id) => {
        const dataset = get().datasets.find((d) => d.id === id);
        if (!dataset) return;

        // Re-create with same data to re-detect columns
        const res = await fetch(`/api/datasets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastRefreshed: new Date().toISOString() }),
        });
        const result = await res.json();
        if (result.success && result.data) {
            set((state) => ({
                datasets: state.datasets.map((d) => d.id === id ? result.data : d),
            }));
        }
    },

    // UI Actions
    setSelectedDatasetId: (id) => set({ selectedDatasetId: id, previewData: null }),
    setShowCreateDialog: (show) => set({ showCreateDialog: show, editingDataset: show ? null : get().editingDataset }),
    setEditingDataset: (dataset) => set({ editingDataset: dataset, showCreateDialog: !!dataset }),
    clearError: () => set({ error: null }),
}));
