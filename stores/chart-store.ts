import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChartConfig, ChartType, DataSource, ChartStyle, TableInfo, ColumnInfo } from '@/types';
import { generateId, defaultChartColors } from '@/lib/utils';

interface ChartState {
    // Saved Charts
    charts: ChartConfig[];

    // Chart Designer State
    currentChart: Partial<ChartConfig>;
    previewData: Record<string, unknown>[];
    isLoadingPreview: boolean;

    // Database State
    tables: TableInfo[];
    selectedTable: string | null;
    tableColumns: ColumnInfo[];
    isLoadingTables: boolean;
    isLoadingColumns: boolean;

    // Actions
    setCharts: (charts: ChartConfig[]) => void;
    saveChart: (chart: ChartConfig) => void;
    deleteChart: (id: string) => Promise<boolean>;
    getChart: (id: string) => ChartConfig | undefined;

    // Designer Actions
    setCurrentChart: (chart: Partial<ChartConfig>) => void;
    updateChartType: (type: ChartType) => void;
    updateDataSource: (dataSource: Partial<DataSource>) => void;
    updateStyle: (style: Partial<ChartStyle>) => void;
    resetCurrentChart: () => void;

    // Database Actions
    setTables: (tables: TableInfo[]) => void;
    setSelectedTable: (table: string | null) => void;
    setTableColumns: (columns: ColumnInfo[]) => void;
    setPreviewData: (data: Record<string, unknown>[]) => void;
    setIsLoadingTables: (loading: boolean) => void;
    setIsLoadingColumns: (loading: boolean) => void;
    setIsLoadingPreview: (loading: boolean) => void;
}

const defaultChartStyle: ChartStyle = {
    colors: defaultChartColors,
    showLegend: true,
    showGrid: true,
    showTooltip: true,
};

const defaultDataSource: DataSource = {
    table: '',
    xAxis: '',
    yAxis: [],
    aggregation: 'sum',
};

export const useChartStore = create<ChartState>()(
    persist(
        (set, get) => ({
            // Initial State
            charts: [],
            currentChart: {
                type: 'bar',
                dataSource: defaultDataSource,
                style: defaultChartStyle,
            },
            previewData: [],
            isLoadingPreview: false,
            tables: [],
            selectedTable: null,
            tableColumns: [],
            isLoadingTables: false,
            isLoadingColumns: false,

            // Actions
            setCharts: (charts) => set({ charts }),

            saveChart: (chart) => {
                const { charts } = get();
                const exists = charts.find((c) => c.id === chart.id);
                if (exists) {
                    set({
                        charts: charts.map((c) =>
                            c.id === chart.id ? { ...chart, updatedAt: new Date() } : c
                        ),
                    });
                } else {
                    set({ charts: [...charts, { ...chart, createdAt: new Date(), updatedAt: new Date() }] });
                }
            },

            deleteChart: async (id) => {
                try {
                    const response = await fetch(`/api/charts/${id}`, {
                        method: 'DELETE',
                    });
                    const result = await response.json();

                    if (result.success) {
                        set((state) => ({
                            charts: state.charts.filter((c) => c.id !== id),
                        }));
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error("Error deleting chart:", error);
                    return false;
                }
            },

            getChart: (id) => {
                return get().charts.find((c) => c.id === id);
            },

            // Designer Actions
            setCurrentChart: (chart) => set({ currentChart: chart }),

            updateChartType: (type) => {
                set((state) => ({
                    currentChart: { ...state.currentChart, type },
                }));
            },

            updateDataSource: (dataSource) => {
                set((state) => ({
                    currentChart: {
                        ...state.currentChart,
                        dataSource: { ...state.currentChart.dataSource, ...dataSource } as DataSource,
                    },
                }));
            },

            updateStyle: (style) => {
                set((state) => ({
                    currentChart: {
                        ...state.currentChart,
                        style: { ...state.currentChart.style, ...style } as ChartStyle,
                    },
                }));
            },

            resetCurrentChart: () => {
                set({
                    currentChart: {
                        id: generateId(),
                        name: '',
                        type: 'bar',
                        dataSource: defaultDataSource,
                        style: defaultChartStyle,
                    },
                    previewData: [],
                    selectedTable: null,
                    tableColumns: [],
                });
            },

            // Database Actions
            setTables: (tables) => set({ tables }),
            setSelectedTable: (table) => set({ selectedTable: table }),
            setTableColumns: (columns) => set({ tableColumns: columns }),
            setPreviewData: (data) => set({ previewData: data }),
            setIsLoadingTables: (loading) => set({ isLoadingTables: loading }),
            setIsLoadingColumns: (loading) => set({ isLoadingColumns: loading }),
            setIsLoadingPreview: (loading) => set({ isLoadingPreview: loading }),
        }),
        {
            name: 'chart-storage',
            partialize: (state) => ({
                charts: state.charts,
            }),
        }
    )
);
