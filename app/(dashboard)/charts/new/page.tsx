"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Save,
    ArrowLeft,
    BarChart3,
    BarChart2,
    LineChart,
    PieChart,
    Activity,
    Radar,
    Database,
    CircleDot,
    Layers,
    ArrowRightLeft,
    GitMerge,
    Filter,
    Palette,
    Settings2,
    Search,
    ChevronDown,
    Loader2,
    Map,
    Code,
    Baseline,
    CreditCard,
    Upload,
    FileSpreadsheet,
    X,
    Table2,
    Gauge,
    TreePine,
    GitFork,
    Signal,
    Wifi,
    Grid,
    Target,
} from "lucide-react";
// Dynamic import for xlsx - loaded only when needed
let XLSX: typeof import('xlsx') | null = null;
const loadXLSX = async () => {
    if (!XLSX) {
        XLSX = await import('xlsx');
    }
    return XLSX;
};
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { IconPicker } from "@/components/ui/IconPicker";
import { MetricsEditor } from "@/components/ui/MetricsEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { InteractiveChart } from "@/components/charts/InteractiveChart";
import { useChartStore } from "@/stores/chart-store";
import type { ChartType, ChartConfig, AggregationType, StatCardMetric } from "@/types";
import { generateId, defaultChartColors } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Basic } from "next/font/google";

interface TableInfo {
    schema: string;
    name: string;
    rowCount: number;
}

interface ColumnInfo {
    name: string;
    type: string;
    nullable: string;
    isPrimaryKey: number;
}

const chartTypes: { type: ChartType; label: string; icon: React.ReactNode; category?: string }[] = [
    // Basic charts
    { type: "bar", label: "Cột", icon: <BarChart3 className="h-5 w-5" />, category: "basic" },
    { type: "stackedBar", label: "Cột chồng", icon: <Layers className="h-5 w-5" />, category: "basic" },
    { type: "horizontalBar", label: "Cột ngang", icon: <ArrowRightLeft className="h-5 w-5" />, category: "basic" },
    { type: "line", label: "Đường", icon: <LineChart className="h-5 w-5" />, category: "basic" },
    { type: "area", label: "Vùng", icon: <Activity className="h-5 w-5" />, category: "basic" },
    { type: "pie", label: "Tròn", icon: <PieChart className="h-5 w-5" />, category: "basic" },

    // Advanced charts
    { type: "radar", label: "Radar", icon: <Radar className="h-5 w-5" />, category: "advanced" },
    { type: "composed", label: "Kết hợp", icon: <GitMerge className="h-5 w-5" />, category: "advanced" },
    { type: "funnel", label: "Phễu", icon: <Filter className="h-5 w-5" />, category: "advanced" },
    { type: "treemap", label: "Treemap", icon: <TreePine className="h-5 w-5" />, category: "advanced" },
    { type: "waterfall", label: "Waterfall", icon: <GitFork className="h-5 w-5" />, category: "advanced" },

    // Gauges & KPIs
    { type: "gauge", label: "Gauge", icon: <Gauge className="h-5 w-5" />, category: "kpi" },
    { type: "semicircleGauge", label: "Semi Gauge", icon: <Signal className="h-5 w-5" />, category: "kpi" },
    { type: "card", label: "Thẻ thống kê", icon: <BarChart2 className="h-5 w-5" />, category: "kpi" },
    { type: "statCard", label: "KPI Card", icon: <Target className="h-5 w-5" />, category: "kpi" },
    { type: "dataTileGrid", label: "Tile Grid", icon: <Grid className="h-5 w-5" />, category: "kpi" },

    // Maps
    { type: "map", label: "Bản đồ", icon: <Map className="h-5 w-5" />, category: "map" },
    { type: "networkMap", label: "Network Map", icon: <Wifi className="h-5 w-5" />, category: "map" },
];



// Aggregation Helper
const aggregateData = (data: any[], groupByField: string, valueFields: string[], aggregation: string) => {
    if (!groupByField || valueFields.length === 0 || !data.length) return data;

    const groups: Record<string, any> = {};

    data.forEach(item => {
        const key = item[groupByField];
        if (!groups[key]) {
            groups[key] = {
                [groupByField]: key,
                _count: 0
            };
            valueFields.forEach(field => {
                groups[key][field] = 0;
                // Initialize min/max
                if (aggregation === 'min') groups[key][field] = item[field] || Infinity;
                if (aggregation === 'max') groups[key][field] = item[field] || -Infinity;
            });
        }
        groups[key]._count++;

        valueFields.forEach(field => {
            const val = Number(item[field]) || 0;
            if (aggregation === 'sum' || aggregation === 'avg') {
                groups[key][field] += val;
            } else if (aggregation === 'min') {
                groups[key][field] = Math.min(groups[key][field], val);
            } else if (aggregation === 'max') {
                groups[key][field] = Math.max(groups[key][field], val);
            }
        });
    });

    return Object.values(groups).map((group: any) => {
        const result = { ...group };
        valueFields.forEach(field => {
            if (aggregation === 'avg') {
                result[field] = result[field] / group._count;
            } else if (aggregation === 'count') {
                result[field] = group._count;
            }
        });
        delete result._count;
        return result;
    });
};

// Import shared utilities
import { processChartData as processChartDataUtil, createCompositeLabel } from '@/lib/chart-data-utils';

// Extended function with groupBy array, orderBy, limit support (wrapper for backward compatibility)
// Uses shared utility but adds drillDownLabelField MAX aggregation logic
const processChartData = (
    data: any[],
    xAxis: string,
    yAxis: string[],
    aggregation: string,
    additionalGroupBy: string[] = [],
    orderByField?: string,
    orderDir: 'asc' | 'desc' = 'asc',
    limitNum: number = 0,
    drillDownLabelField?: string
) => {
    if (!xAxis || yAxis.length === 0 || !data.length) return data;

    // Use shared utility for main processing
    let result = processChartDataUtil(data, {
        xAxis,
        yAxis,
        aggregation: aggregation as any,
        groupBy: additionalGroupBy,
        orderBy: orderByField,
        orderDirection: orderDir,
        limit: limitNum,
        drillDownLabelField,
    });

    // Add _drillValue for backward compatibility
    result = result.map(row => ({
        ...row,
        _drillValue: row[xAxis],
    }));

    return result;
};



function ChartBuilderContent() {
    const router = useRouter();
    // const { toast } = useToast(); // Removed
    const searchParams = useSearchParams();
    const editChartId = searchParams.get('edit');
    const {
        charts,
        currentChart,
        updateChartType,
        updateDataSource,
        saveChart,
        setCurrentChart, // Ensure this is destructured
        resetCurrentChart,
    } = useChartStore();



    // Load initial data if editing
    useEffect(() => {
        const loadInitialData = async () => {
            // Fetch connections first
            await fetchConnections();
            // Tables will be fetched when connection is selected

            if (editChartId) {
                const existingChart = charts.find(c => c.id === editChartId);
                if (existingChart) {
                    setChartName(existingChart.name);
                    setCurrentChart(existingChart);

                    if (existingChart.dataSource) {
                        setSelectedTable(existingChart.dataSource.table);

                        // First fetch columns for the table
                        // We do NOT want to rely on the side-effects of a user-triggered table change
                        // so we might need a modified fetchColumns or just set state after.
                        await fetchColumns(existingChart.dataSource.table, true); // Pass true to skip resetting

                        // SET STATE AFTER FETCHING COLUMNS
                        setSelectedXAxis(existingChart.dataSource.xAxis);
                        setSelectedYAxis(existingChart.dataSource.yAxis);
                        setAggregation(existingChart.dataSource.aggregation || 'sum');
                        setOrderBy(existingChart.dataSource.orderBy || '');
                        setOrderDirection(existingChart.dataSource.orderDirection || 'asc');
                        setLimit(existingChart.dataSource.limit || 0);

                        // Restore Query Mode (simple, custom, import, or storedProcedure)
                        if (existingChart.dataSource.queryMode === 'custom') {
                            setQueryMode('custom');
                            setCustomSql(existingChart.dataSource.customQuery || '');
                            setCustomSqlXAxis(existingChart.dataSource.xAxis || '');
                            setCustomSqlYAxis(existingChart.dataSource.yAxis || []);
                        } else if (existingChart.dataSource.queryMode === 'import') {
                            setQueryMode('import');
                            setImportedData(existingChart.dataSource.importedData || []);
                            setImportedFileName(existingChart.dataSource.importedFileName || '');
                            setImportXAxis(existingChart.dataSource.xAxis || '');
                            setImportYAxis(existingChart.dataSource.yAxis || []);
                            // Set columns from imported data
                            if (existingChart.dataSource.importedData && existingChart.dataSource.importedData.length > 0) {
                                setImportedColumns(Object.keys(existingChart.dataSource.importedData[0]));
                                setChartData(existingChart.dataSource.importedData);
                            }

                        } else {
                            setQueryMode('simple');
                        }

                        // Handle Date Columns
                        setSelectedDateColumn(existingChart.dataSource.dateColumn || '');
                        setStartDateColumn(existingChart.dataSource.startDateColumn || existingChart.dataSource.dateColumn || '');
                        setEndDateColumn(existingChart.dataSource.endDateColumn || existingChart.dataSource.dateColumn || '');

                        // Handle Drill-down Label Field
                        setDrillDownLabelField(existingChart.dataSource.drillDownLabelField || '');

                        // Restore filters
                        if (existingChart.dataSource.filters) {
                            const fromFilter = existingChart.dataSource.filters.find(f => f.operator === '>=' || f.operator === '>');
                            const toFilter = existingChart.dataSource.filters.find(f => f.operator === '<=' || f.operator === '<');

                            if (fromFilter) setFilterFromDate(fromFilter.value as string);
                            if (toFilter) setFilterToDate(toFilter.value as string);
                        }
                    }

                    // Restore style fields
                    if (existingChart.style) {
                        setShowLegend(existingChart.style.showLegend ?? true);
                        setLegendPosition(existingChart.style.legendPosition || 'bottom');
                        setShowGrid(existingChart.style.showGrid ?? true);
                        setShowDataLabels(existingChart.style.showDataLabels ?? false);
                        setDataLabelPosition(existingChart.style.dataLabelPosition || 'top');
                        setDataLabelFormat(existingChart.style.dataLabelFormat || 'full');
                        setDataLabelColor(existingChart.style.dataLabelColor || '#1E293B');
                        setDataLabelFontSize(existingChart.style.dataLabelFontSize || 10);
                        setTooltipTheme(existingChart.style.tooltipTheme || 'light');
                        setXAxisLabel(existingChart.style.xAxisLabel || '');
                        setYAxisLabel(existingChart.style.yAxisLabel || '');
                        setXAxisExclude(existingChart.style.xAxisExclude || []);
                        setTitleFontSize(existingChart.style.titleFontSize || 14);

                        // Pie variant (also handle legacy donut type conversion)
                        if (existingChart.style.pieVariant) {
                            setPieVariant(existingChart.style.pieVariant);
                        } else if (existingChart.type === 'donut') {
                            setPieVariant('donut');
                        } else if (existingChart.type === 'sizedPie') {
                            setPieVariant('sized');
                        }

                        // Y-axis field customizations
                        if (existingChart.style.yAxisFieldLabels) {
                            setYAxisFieldLabels(existingChart.style.yAxisFieldLabels);
                        }
                        if (existingChart.style.yAxisFieldColors) {
                            setYAxisFieldColors(existingChart.style.yAxisFieldColors);
                        }
                        if (existingChart.style.composedFieldTypes) {
                            setComposedFieldTypes(existingChart.style.composedFieldTypes);
                        }

                        // Card specific styles
                        if (existingChart.style.cardFontSize) setCardFontSize(existingChart.style.cardFontSize);
                        if (existingChart.style.cardColor) setCardColor(existingChart.style.cardColor);
                        if (existingChart.style.cardIcon) setCardIcon(existingChart.style.cardIcon);
                        if (existingChart.style.showCardIcon !== undefined) setShowCardIcon(existingChart.style.showCardIcon);
                        if (existingChart.dataSource?.metrics) setStatCardMetrics(existingChart.dataSource.metrics as StatCardMetric[]);
                        if (existingChart.style.cardBackgroundColor) setCardBackgroundColor(existingChart.style.cardBackgroundColor);

                        // StatCard KPI restoration
                        if (existingChart.style.showGauge !== undefined) setShowGauge(existingChart.style.showGauge);
                        if (existingChart.style.kpiPlanValue !== undefined) setKpiPlanValue(existingChart.style.kpiPlanValue);
                        if (existingChart.style.kpiThreshold !== undefined) setKpiThreshold(existingChart.style.kpiThreshold);
                        if (existingChart.style.showStatusBadge !== undefined) setShowStatusBadge(existingChart.style.showStatusBadge);
                        if (existingChart.style.showCornerAccent !== undefined) setShowCornerAccent(existingChart.style.showCornerAccent);

                        // DataTileGrid restoration
                        if (existingChart.style.tileGridColumns !== undefined) setTileGridColumns(existingChart.style.tileGridColumns as any);
                        if (existingChart.style.tileTargetField !== undefined) setTileTargetField(existingChart.style.tileTargetField);
                        if (existingChart.style.tileActualField !== undefined) setTileActualField(existingChart.style.tileActualField);

                        // General style restoration
                        if (existingChart.style.textColor) setTextColor(existingChart.style.textColor);
                        if (existingChart.style.gridColor) setGridColor(existingChart.style.gridColor);
                    }
                }
            }
        };
        loadInitialData();
    }, [editChartId, charts, setCurrentChart]);


    const handleDateColumnChange = (column: string | null) => {
        const val = column ?? "";
        setSelectedDateColumn(val);
        updateDataSource({ dateColumn: val });
    };

    const handleSaveChart = async () => {
        // DEBUG: Log values used for filter construction
        console.log('[handleSaveChart] startDateColumn:', startDateColumn);
        console.log('[handleSaveChart] endDateColumn:', endDateColumn);
        console.log('[handleSaveChart] selectedDateColumn:', selectedDateColumn);
        console.log('[handleSaveChart] filterFromDate:', filterFromDate);
        console.log('[handleSaveChart] filterToDate:', filterToDate);

        // Determine values based on queryMode
        const getXAxis = () => {
            if (queryMode === 'custom') return customSqlXAxis;
            if (queryMode === 'import') return importXAxis;

            return selectedXAxis;
        };
        const getYAxis = () => {
            if (queryMode === 'custom') return customSqlYAxis;
            if (queryMode === 'import') return importYAxis;

            return selectedYAxis;
        };
        const getTable = () => {
            if (queryMode === 'custom') return selectedTable || 'custom_query';
            if (queryMode === 'import') return 'imported_data';

            return selectedTable;
        };

        const chartConfig: ChartConfig = {
            id: editChartId || generateId(), // ID will be overwritten by DB if new
            name: chartName || "Biểu đồ chưa đặt tên",
            type: currentChart.type || "bar",
            dataSource: {
                queryMode,
                customQuery: queryMode === 'custom' ? customSql : undefined,
                table: getTable(),
                xAxis: getXAxis(),
                yAxis: getYAxis(),
                aggregation: queryMode === 'import' ? 'sum' : aggregation, // Default for import
                groupBy: groupBy.length > 0 ? groupBy : undefined,
                orderBy: orderBy || undefined,
                orderDirection: orderBy ? orderDirection : undefined,
                limit: limit > 0 ? limit : undefined,
                connectionId: selectedConnectionId || undefined,
                // Removed duplicate properties
                dateColumn: startDateColumn || selectedDateColumn, // Fallback to legacy
                startDateColumn,
                endDateColumn,
                // Drill-down settings
                drillDownLabelField: drillDownLabelField || undefined,
                // Import-specific data
                importedData: queryMode === 'import' ? importedData : undefined,
                importedFileName: queryMode === 'import' ? importedFileName : undefined,
                // Stored Procedure-specific data

                // StatCard metrics
                metrics: currentChart.type === 'statCard' ? statCardMetrics : undefined,
                filters: [
                    ...((startDateColumn || selectedDateColumn) && filterFromDate ? [{
                        field: startDateColumn || selectedDateColumn,
                        operator: '>=' as const,
                        value: filterFromDate
                    }] : []),
                    ...((endDateColumn || selectedDateColumn) && filterToDate ? [{
                        field: endDateColumn || selectedDateColumn,
                        operator: '<=' as const,
                        value: filterToDate
                    }] : [])
                ],
            },
            style: {
                colors: defaultChartColors,
                // ... (copying existing style logic)
                showLegend,
                legendPosition,
                showGrid,
                showTooltip: true,
                showDataLabels,
                dataLabelPosition,
                dataLabelFormat,
                dataLabelColor,
                dataLabelFontSize,
                tooltipTheme,
                xAxisLabel,
                yAxisLabel,
                xAxisExclude,
                composedFieldTypes: currentChart.type === 'composed' ? composedFieldTypes : undefined,
                yAxisFieldLabels: Object.keys(yAxisFieldLabels).length > 0 ? yAxisFieldLabels : undefined,
                yAxisFieldColors: Object.keys(yAxisFieldColors).length > 0 ? yAxisFieldColors : undefined,
                title: chartName,
                titleFontSize,
                animation: true,
                // Card specific
                cardFontSize: currentChart.type === 'card' ? cardFontSize : undefined,
                cardColor: currentChart.type === 'card' ? cardColor : undefined,
                cardIcon: currentChart.type === 'card' ? cardIcon : undefined,
                showCardIcon: currentChart.type === 'card' ? showCardIcon : undefined,
                cardBackgroundColor: currentChart.type === 'card' ? cardBackgroundColor : undefined,
                // Map specific
                mapDisplayMode: currentChart.type === 'map' ? mapDisplayMode : undefined,
                mapColorScheme: currentChart.type === 'map' ? mapColorScheme : undefined,

                // StatCard KPI specific
                showGauge: currentChart.type === 'statCard' ? showGauge : undefined,
                kpiPlanValue: currentChart.type === 'statCard' ? kpiPlanValue : undefined,
                kpiThreshold: currentChart.type === 'statCard' ? kpiThreshold : undefined,
                showStatusBadge: currentChart.type === 'statCard' ? showStatusBadge : undefined,
                showCornerAccent: currentChart.type === 'statCard' ? showCornerAccent : undefined,

                // DataTileGrid specific
                tileGridColumns: currentChart.type === 'dataTileGrid' ? tileGridColumns : undefined,
                tileTargetField: currentChart.type === 'dataTileGrid' ? tileTargetField : undefined,
                tileActualField: currentChart.type === 'dataTileGrid' ? tileActualField : undefined,

                // General Styling
                textColor: textColor || undefined,
                gridColor: gridColor || undefined,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        try {
            // Optimistically update local store? No, better wait for server.
            // But for now, we follow existing pattern but ADD network call.

            const method = editChartId ? 'PUT' : 'POST';
            const url = editChartId ? `/api/charts/${editChartId}` : '/api/charts';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chartConfig),
            });

            const result = await response.json();

            if (result.success && result.data) {
                // Use the returned data (which includes the real DB ID)
                saveChart(result.data);
                toast.success(editChartId ? "Đã cập nhật biểu đồ" : "Đã lưu biểu đồ mới");
                router.push("/charts");
            } else {
                toast.error(result.error || "Lỗi khi lưu biểu đồ");
            }

        } catch (error) {
            console.error("Save error:", error);
            toast.error("Lỗi kết nối server");
            // Fallback to local save if server fails? Maybe not in production.
            // But to prevent data loss for user:
            saveChart(chartConfig);
        }
    };

    const [chartName, setChartName] = useState("");

    // Database connections
    interface DatabaseConnection {
        _id: string;
        name: string;
        host: string;
        database: string;
        isDefault: boolean;
    }
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
    const [isLoadingConnections, setIsLoadingConnections] = useState(true);

    // Database tables
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [isLoadingTables, setIsLoadingTables] = useState(true);
    const [tableSearchQuery, setTableSearchQuery] = useState("");
    const [showTableDropdown, setShowTableDropdown] = useState(false);
    const [selectedTable, setSelectedTable] = useState("");
    const tableDropdownRef = useRef<HTMLDivElement>(null);

    // Columns
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [isLoadingColumns, setIsLoadingColumns] = useState(false);
    const [selectedXAxis, setSelectedXAxis] = useState("");
    const [selectedYAxis, setSelectedYAxis] = useState<string[]>([]);
    const [aggregation, setAggregation] = useState<AggregationType>("sum");
    const [orderBy, setOrderBy] = useState("");
    const [orderDirection, setOrderDirection] = useState<"asc" | "desc">("asc");
    const [limit, setLimit] = useState<number>(0); // 0 = unlimited (all)
    const [groupBy, setGroupBy] = useState<string[]>([]); // Additional groupBy columns
    const [selectedDateColumn, setSelectedDateColumn] = useState<string>(""); // Legacy/Global
    const [startDateColumn, setStartDateColumn] = useState<string>("");
    const [endDateColumn, setEndDateColumn] = useState<string>("");
    const [drillDownLabelField, setDrillDownLabelField] = useState<string>(""); // Field for drill-down labels

    // Filter values
    const [filterFromDate, setFilterFromDate] = useState<string>("");
    const [filterToDate, setFilterToDate] = useState<string>("");

    // Chart data
    const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
    const [isLoadingChartData, setIsLoadingChartData] = useState(false);
    const [chartDataError, setChartDataError] = useState<string | null>(null);

    // Query Mode (simple, custom SQL, import, or storedProcedure)
    const [queryMode, setQueryMode] = useState<"simple" | "custom" | "import">("simple");
    const [customSql, setCustomSql] = useState<string>("");
    const [customSqlXAxis, setCustomSqlXAxis] = useState<string>("");
    const [customSqlYAxis, setCustomSqlYAxis] = useState<string[]>([]);
    const [customSqlColumns, setCustomSqlColumns] = useState<string[]>([]);


    // Import Mode
    const [importedData, setImportedData] = useState<Record<string, unknown>[]>([]);
    const [importedFileName, setImportedFileName] = useState<string>("");
    const [importedColumns, setImportedColumns] = useState<string[]>([]);
    const [importXAxis, setImportXAxis] = useState<string>("");
    const [importYAxis, setImportYAxis] = useState<string[]>([]);
    const [isParsingFile, setIsParsingFile] = useState(false);

    // Style options
    const [showLegend, setShowLegend] = useState(true);
    const [legendPosition, setLegendPosition] = useState<"top" | "bottom" | "left" | "right">("bottom");
    const [showGrid, setShowGrid] = useState(true);
    const [showDataLabels, setShowDataLabels] = useState(false);
    const [dataLabelPosition, setDataLabelPosition] = useState<"top" | "center" | "bottom">("top");
    const [dataLabelFormat, setDataLabelFormat] = useState<"full" | "k" | "tr" | "ty">("full");
    const [dataLabelColor, setDataLabelColor] = useState("#1E293B");
    const [dataLabelFontSize, setDataLabelFontSize] = useState(10);
    const [tooltipTheme, setTooltipTheme] = useState<"light" | "dark">("light");
    const [xAxisLabel, setXAxisLabel] = useState("");
    const [yAxisLabel, setYAxisLabel] = useState("");
    const [xAxisExclude, setXAxisExclude] = useState<string[]>([]);
    const [composedFieldTypes, setComposedFieldTypes] = useState<Record<string, "line" | "bar">>({});
    const [yAxisFieldLabels, setYAxisFieldLabels] = useState<Record<string, string>>({}); // Custom labels for Y-axis fields
    const [yAxisFieldColors, setYAxisFieldColors] = useState<Record<string, string>>({}); // Custom colors for Y-axis fields
    const [titleFontSize, setTitleFontSize] = useState(14);
    const [pieVariant, setPieVariant] = useState<"default" | "sized" | "donut" | "gauge" | "semicircle">("default");

    // Card styling state
    const [cardFontSize, setCardFontSize] = useState<"sm" | "md" | "lg" | "xl">("lg");
    const [cardColor, setCardColor] = useState<string>(""); // Empty for gradient default
    const [cardIcon, setCardIcon] = useState<string>("");
    const [showCardIcon, setShowCardIcon] = useState(true);
    const [statCardMetrics, setStatCardMetrics] = useState<StatCardMetric[]>([]);
    const [mapDisplayMode, setMapDisplayMode] = useState<"heatmap" | "category" | "value" | "coverage">("value");
    const [mapColorScheme, setMapColorScheme] = useState<"default" | "blues" | "greens" | "reds" | "purples" | "signal">("default");
    const [cardBackgroundColor, setCardBackgroundColor] = useState<string>("");

    // General Style State
    const [textColor, setTextColor] = useState<string>("");
    const [gridColor, setGridColor] = useState<string>("");

    // StatCard KPI specific state (from example.tsx design)
    const [showGauge, setShowGauge] = useState(true);
    const [kpiPlanValue, setKpiPlanValue] = useState<number>(0);
    const [kpiThreshold, setKpiThreshold] = useState<number>(100);
    const [showStatusBadge, setShowStatusBadge] = useState(true);
    const [showCornerAccent, setShowCornerAccent] = useState(true);

    // DataTileGrid specific state
    const [tileGridColumns, setTileGridColumns] = useState<2 | 4 | 6 | 8>(4);
    const [tileTargetField, setTileTargetField] = useState<string>("");
    const [tileActualField, setTileActualField] = useState<string>("");

    const [activeTab, setActiveTab] = useState<"data" | "style">("data");




    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tableDropdownRef.current && !tableDropdownRef.current.contains(event.target as Node)) {
                setShowTableDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch chart data when configuration changes
    useEffect(() => {
        if (queryMode === 'simple') {
            const isCard = currentChart.type === 'card';
            // For card type, we don't need X axis
            if (selectedTable && (isCard || selectedXAxis) && selectedYAxis.length > 0) {
                fetchChartData();
            }
        } else if (queryMode === 'import') {
            // For import mode, process imported data directly
            if (importedData.length > 0 && importXAxis && importYAxis.length > 0) {
                // Use imported data directly - it's already in the right format
                setChartData(importedData);
            }
        }
    }, [queryMode, selectedTable, selectedXAxis, selectedYAxis, aggregation, groupBy, orderBy, orderDirection, filterFromDate, filterToDate, startDateColumn, endDateColumn, currentChart.type, importedData, importXAxis, importYAxis]);

    // Fetch tables when connection changes (initial load or manual change)
    useEffect(() => {
        if (selectedConnectionId) {
            fetchTables(selectedConnectionId);
        }
    }, [selectedConnectionId]);

    const fetchConnections = async () => {
        setIsLoadingConnections(true);
        try {
            const response = await fetch("/api/connections");
            const result = await response.json();
            if (result.success && result.data) {
                setConnections(result.data);
                const defaultConn = result.data.find((c: DatabaseConnection) => c.isDefault);
                if (defaultConn) {
                    setSelectedConnectionId(defaultConn._id);
                } else if (result.data.length > 0) {
                    setSelectedConnectionId(result.data[0]._id);
                }
            }
        } catch (error) {
            console.error("Error fetching connections:", error);
        } finally {
            setIsLoadingConnections(false);
        }
    };

    const fetchTables = async (connectionId?: string) => {
        setIsLoadingTables(true);
        try {
            const connId = connectionId || selectedConnectionId;
            const url = connId
                ? `/api/database/tables?connectionId=${connId}`
                : "/api/database/tables";
            const response = await fetch(url);
            const result = await response.json();
            if (result.success && result.data?.tables) {
                setTables(result.data.tables);
            }
        } catch (error) {
            console.error("Error fetching tables:", error);
        } finally {
            setIsLoadingTables(false);
        }
    };

    const handleConnectionChange = (connectionId: string | null) => {
        if (connectionId) {
            setSelectedConnectionId(connectionId);
            setSelectedTable("");
            setTableSearchQuery("");
            setColumns([]);
            setSelectedXAxis("");
            setSelectedYAxis([]);
            fetchTables(connectionId);
        }
    };

    const fetchColumns = async (tableName: string, keepSelection = false) => {
        setIsLoadingColumns(true);

        if (!keepSelection) {
            setColumns([]);
            setSelectedXAxis("");
            setSelectedYAxis([]);
            setOrderBy("");
            setSelectedDateColumn("");
            setStartDateColumn("");
            setEndDateColumn("");
        }

        try {
            const url = selectedConnectionId
                ? `/api/database/schema/${encodeURIComponent(tableName)}?connectionId=${selectedConnectionId}`
                : `/api/database/schema/${encodeURIComponent(tableName)}`;
            const response = await fetch(url);
            const result = await response.json();
            if (result.success && result.data?.columns) {
                setColumns(result.data.columns);
            }
        } catch (error) {
            console.error("Error fetching columns:", error);
        } finally {
            setIsLoadingColumns(false);
        }
    };

    const fetchChartData = async () => {
        if (queryMode === 'custom') return;

        const isCard = currentChart.type === 'card';
        if (!selectedTable || (!isCard && !selectedXAxis) || selectedYAxis.length === 0) {
            return;
        }

        setIsLoadingChartData(true);
        setChartDataError(null);

        try {
            const response = await fetch('/api/database/chart-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: selectedTable,
                    xAxis: isCard ? undefined : selectedXAxis,
                    yAxis: selectedYAxis,
                    aggregation: aggregation,
                    groupBy: groupBy.length > 0 ? groupBy : undefined, // Send groupBy to API
                    orderBy,
                    orderDirection,
                    limit: limit > 0 ? limit : undefined,
                    connectionId: selectedConnectionId || undefined,
                    filters: [
                        // Use startDateColumn for From Date if available, else fallback to selectedDateColumn
                        ...((startDateColumn || selectedDateColumn) && filterFromDate ? [{
                            field: startDateColumn || selectedDateColumn,
                            operator: '>=',
                            value: filterFromDate
                        }] : []),
                        // Use endDateColumn for To Date if available, else fallback to selectedDateColumn
                        ...((endDateColumn || selectedDateColumn) && filterToDate ? [{
                            field: endDateColumn || selectedDateColumn,
                            operator: '<=',
                            value: filterToDate
                        }] : [])
                    ]
                }),
            });

            const result = await response.json();
            if (result.success && result.data) {
                let chartDataResult = result.data;

                // Create composite x-axis labels if groupBy exists using shared utility
                if (selectedXAxis && groupBy.length > 0) {
                    chartDataResult = chartDataResult.map((row: Record<string, unknown>) => {
                        const compositeLabel = createCompositeLabel(row, selectedXAxis, groupBy);
                        return {
                            ...row,
                            [selectedXAxis]: compositeLabel,
                        };
                    });
                }

                setChartData(chartDataResult);
                console.log('Chart data loaded:', chartDataResult.length, 'rows');
            } else {
                setChartDataError(result.error || 'Không thể tải dữ liệu biểu đồ');
                setChartData([]);
            }
        } catch (error) {
            console.error('Error fetching chart data:', error);
            setChartDataError('Lỗi kết nối khi tải dữ liệu');
            setChartData([]);
        } finally {
            setIsLoadingChartData(false);
        }
    };

    const handleTableSelect = (tableName: string) => {
        setSelectedTable(tableName);
        setTableSearchQuery(tableName);
        setShowTableDropdown(false);
        updateDataSource({ table: tableName });
        fetchColumns(tableName);
    };

    const handleXAxisChange = (xAxis: string) => {
        setSelectedXAxis(xAxis);
        setXAxisLabel(xAxis);
        // Default orderBy to xAxis
        if (!orderBy) setOrderBy(xAxis);
        updateDataSource({ xAxis });
    };



    const handleYAxisToggle = (field: string) => {
        const newYAxis = selectedYAxis.includes(field)
            ? selectedYAxis.filter((f) => f !== field)
            : [...selectedYAxis, field];
        setSelectedYAxis(newYAxis);
        setYAxisLabel(newYAxis.join(', '));
        updateDataSource({ yAxis: newYAxis });
    };



    // Filter tables for dropdown
    const filteredTables = tables.filter(
        (table) =>
            table.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
            table.schema.toLowerCase().includes(tableSearchQuery.toLowerCase())
    );

    // Numeric columns for Y axis
    const numericColumns = columns.filter((col) =>
        ["int", "bigint", "decimal", "numeric", "float", "real", "money", "smallmoney", "smallint", "tinyint"].includes(
            col.type.toLowerCase()
        )
    );

    // --- Aggregation Logic for Custom SQL and Import ---
    const aggregatedChartData = React.useMemo(() => {
        // Custom SQL mode - apply client-side aggregation using processChartData (same as Import mode)
        if (queryMode === 'custom' && customSqlXAxis && customSqlYAxis.length > 0 && chartData.length > 0) {
            return processChartData(
                chartData,
                customSqlXAxis,
                customSqlYAxis,
                aggregation,
                groupBy,
                orderBy || undefined,
                orderDirection,
                limit,
                drillDownLabelField
            );
        }
        // Import mode - process with groupBy, orderBy, limit (aggregate locally)
        if (queryMode === 'import' && importXAxis && importYAxis.length > 0 && importedData.length > 0) {
            return processChartData(
                importedData,
                importXAxis,
                importYAxis,
                aggregation,
                groupBy,
                orderBy || undefined,
                orderDirection,
                limit,
                drillDownLabelField
            );
        }
        return chartData;
    }, [chartData, queryMode, customSqlXAxis, customSqlYAxis, aggregation, importXAxis, importYAxis, importedData, groupBy, orderBy, orderDirection, limit, drillDownLabelField]);

    // --- Drill Down Handler for Preview ---
    const handlePreviewDrillDown = async (drillFilters: Array<{ field: string; operator: string; value: string | number }>) => {
        console.log("Preview Drill Down:", drillFilters);

        // 1. Import Mode
        if (queryMode === 'import' && importedData.length > 0) {
            const xAxis = importXAxis;
            // Aggregate filtered data by labelField
            const groups: Record<string, any> = {};
            const labelField = drillDownLabelField || xAxis;
            const agg = aggregation || 'sum'; // Use current aggregation setting

            // Filter data first
            let filteredData = [...importedData];
            drillFilters.forEach(f => {
                filteredData = filteredData.filter(row => {
                    const rowValue = row[f.field];
                    return String(rowValue) === String(f.value);
                });
            });

            filteredData.forEach(row => {
                const key = String(row[labelField] || row[xAxis] || 'Unknown');
                if (!groups[key]) {
                    groups[key] = { _count: 0 };
                    if (labelField) groups[key][labelField] = key;
                    if (xAxis) groups[key][xAxis] = key;
                    importYAxis.forEach(y => {
                        groups[key][y] = agg === 'min' ? Infinity : (agg === 'max' ? -Infinity : 0);
                    });
                }
                groups[key]._count++;

                importYAxis.forEach(y => {
                    const val = Number(row[y]) || 0;
                    if (agg === 'sum' || agg === 'avg') {
                        groups[key][y] += val;
                    } else if (agg === 'min') {
                        groups[key][y] = Math.min(groups[key][y], val);
                    } else if (agg === 'max') {
                        groups[key][y] = Math.max(groups[key][y], val);
                    }
                });
            });

            return Object.values(groups).map((g: any, index) => {
                const row: any = { ...g };
                if (agg === 'avg') {
                    importYAxis.forEach(y => {
                        row[y] = row[y] / g._count;
                    });
                } else if (agg === 'count') {
                    importYAxis.forEach(y => {
                        row[y] = g._count;
                    });
                }
                delete row._count;
                return {
                    ...row,
                    _row_id: index + 1,
                    _label: row[labelField] || row[xAxis] || `#${index + 1}`,
                    name: row[labelField] || row[xAxis] || `#${index + 1}`,
                };
            });
        }

        // 2. Custom SQL Mode
        if (queryMode === 'custom' && customSql) {
            try {
                const xAxis = customSqlXAxis;
                const yAxis = customSqlYAxis;
                const groupByArr = groupBy;

                // Modify custom query to add WHERE conditions
                let query = customSql;
                const whereConditions: string[] = [];

                drillFilters.forEach(f => {
                    const value = typeof f.value === 'string' ? `N'${f.value}'` : f.value;
                    whereConditions.push(`[${f.field}] = ${value}`);
                });

                if (whereConditions.length > 0) {
                    query = `SELECT * FROM (${query}) AS _drill_sub WHERE ${whereConditions.join(' AND ')}`;
                }

                const response = await fetch("/api/database/chart-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customQuery: query.trim(),
                        connectionId: selectedConnectionId || undefined,
                    }),
                });

                const result = await response.json();
                if (result.success && result.data) {
                    // Client-side aggregation for preview (same as aggregatedChartData logic)
                    if (xAxis && yAxis.length > 0) {
                        // Use drillDownLabelField for grouping if available (Dimension Switching)
                        const drillLabelField = drillDownLabelField || xAxis;

                        return processChartData(
                            result.data,
                            drillLabelField, // Force grouping by label field
                            yAxis,
                            aggregation,
                            groupByArr,
                            undefined, // orderBy
                            'asc',
                            0 // limit
                        ).map((row: any, index: number) => ({
                            ...row,
                            name: row[drillLabelField] || `#${index + 1}`
                        }));
                    }
                    return result.data;
                }
            } catch (error) {
                console.error("Preview drill error:", error);
            }
            return [];
        }

        // 3. Simple Mode
        if (queryMode === 'simple' && selectedTable) {
            try {
                const table = selectedTable;
                const xAxis = selectedXAxis;
                const yAxis = selectedYAxis;
                const groupByArr = groupBy;

                // Dimension Switching: Use drillDownLabelField if configured
                const effectiveXAxis = drillDownLabelField || xAxis;

                // Build WHERE
                const whereConditions: string[] = [];
                drillFilters.forEach(f => {
                    const field = f.field.replace(/[^\w]/g, '');
                    const value = typeof f.value === 'string' ? `N'${f.value}'` : f.value;
                    whereConditions.push(`[${field}] = ${value}`);
                });

                const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

                // Build Aggregated Query
                const yAxisSelect = yAxis.map(f => {
                    const field = `[${f.replace(/[^\w]/g, '')}]`;
                    switch (aggregation) {
                        case 'avg': return `AVG(${field}) as [${f}]`;
                        case 'min': return `MIN(${field}) as [${f}]`;
                        case 'max': return `MAX(${field}) as [${f}]`;
                        case 'count': return `COUNT(${field}) as [${f}]`;
                        case 'sum':
                        default: return `SUM(${field}) as [${f}]`;
                    }
                }).join(', ');

                // Group by effectiveXAxis (Label) and additional groups
                const groupCols = [effectiveXAxis, ...groupByArr].filter(Boolean).map(f => `[${f.replace(/[^\w]/g, '')}]`);

                const drillQuery = `
                    SELECT 
                        ${groupCols.join(', ')},
                        ${yAxisSelect}
                    FROM [dbo].[${table}]
                    ${whereClause}
                    GROUP BY ${groupCols.join(', ')}
                `;

                const response = await fetch("/api/database/chart-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customQuery: drillQuery.trim(),
                        connectionId: selectedConnectionId || undefined,
                    }),
                });

                const result = await response.json();
                if (result.success && result.data) {
                    return result.data.map((row: any, index: number) => {
                        // Composite label logic using shared utility
                        if (groupByArr.length > 0 && effectiveXAxis) {
                            const compositeLabel = createCompositeLabel(row, effectiveXAxis, groupByArr);
                            return {
                                ...row,
                                [effectiveXAxis]: compositeLabel,
                                name: compositeLabel
                            };
                        }
                        return {
                            ...row,
                            name: row[effectiveXAxis] || `#${index + 1}`
                        };
                    });
                }

            } catch (error) {
                console.error("Preview drill simple error:", error);
            }
            return [];
        }

        return [];
    };

    // Build preview config - handle all query modes
    const getPreviewXAxis = () => {
        if (queryMode === 'custom') return customSqlXAxis;
        if (queryMode === 'import') return importXAxis;

        return selectedXAxis || "thang";
    };
    const getPreviewYAxis = () => {
        if (queryMode === 'custom') return customSqlYAxis;
        if (queryMode === 'import') return importYAxis;

        return selectedYAxis.length > 0 ? selectedYAxis : ["ptm"];
    };

    const previewConfig: ChartConfig = {
        id: "preview",
        name: chartName || "Xem trước",
        type: currentChart.type || "bar",
        dataSource: {
            queryMode,
            customQuery: queryMode === 'custom' ? customSql : undefined,
            connectionId: selectedConnectionId || undefined,
            table: queryMode === 'import' ? 'imported_data' : (selectedTable || ''),
            xAxis: getPreviewXAxis(),
            yAxis: getPreviewYAxis(),
            aggregation: queryMode === 'import' ? 'sum' : aggregation,
            groupBy: groupBy.length > 0 ? groupBy : undefined,
            orderBy: orderBy || undefined,
            orderDirection: orderBy ? orderDirection : undefined,
            limit: limit > 0 ? limit : undefined,
            drillDownLabelField: drillDownLabelField || undefined,
            startDateColumn: startDateColumn || undefined,
            endDateColumn: endDateColumn || undefined,
            importedData: queryMode === 'import' ? importedData : undefined,
            importedFileName: queryMode === 'import' ? importedFileName : undefined,

        },
        style: {
            colors: defaultChartColors,
            showLegend,
            legendPosition,
            showGrid,
            showTooltip: true,
            showDataLabels,
            dataLabelPosition,
            dataLabelFormat,
            dataLabelColor,
            dataLabelFontSize,
            tooltipTheme,
            xAxisLabel,
            yAxisLabel,
            xAxisExclude,
            composedFieldTypes: currentChart.type === 'composed' ? composedFieldTypes : undefined,
            yAxisFieldLabels: Object.keys(yAxisFieldLabels).length > 0 ? yAxisFieldLabels : undefined,
            yAxisFieldColors: Object.keys(yAxisFieldColors).length > 0 ? yAxisFieldColors : undefined,
            title: chartName || undefined,
            titleFontSize,
            animation: true,
            pieVariant: currentChart.type === 'pie' && pieVariant !== 'default' ? pieVariant : undefined,
            cardFontSize,
            cardColor,
            cardIcon,
            showCardIcon,
            cardBackgroundColor,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    return (
        <>
            <Header
                title="Thiết kế biểu đồ"
                subtitle="Tạo biểu đồ mới"
                showDatePicker={false}
                showSearch={false}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/charts")}
                            className="gap-2 rounded-none font-bold"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Quay lại
                        </Button>
                        <Button size="sm" onClick={handleSaveChart} className="gap-2 rounded-none font-bold">
                            <Save className="h-4 w-4" />
                            Lưu biểu đồ
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Configuration */}
                <div className="w-125 flex-shrink-0 bg-white border-r border-[#E2E8F0] overflow-y-auto">
                    {/* Tabs - Angular Style */}
                    <div className="flex bg-slate-100 p-1">
                        <button
                            onClick={() => setActiveTab("data")}
                            className={cn(
                                "flex-1 px-4 py-2.5 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all",
                                activeTab === "data"
                                    ? "bg-white text-blue-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Database className="h-4 w-4" />
                            Dữ liệu
                        </button>
                        <button
                            onClick={() => setActiveTab("style")}
                            className={cn(
                                "flex-1 px-4 py-2.5 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all",
                                activeTab === "style"
                                    ? "bg-white text-blue-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Palette className="h-4 w-4" />
                            Kiểu dáng
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {activeTab === "data" && (
                            <>
                                {/* Chart Name */}
                                <div>
                                    <label className="text-sm font-semibold text-[#0F172A] mb-2 block">
                                        Tên biểu đồ
                                    </label>
                                    <Input
                                        placeholder="VD: Doanh thu theo tháng"
                                        value={chartName}
                                        onChange={(e) => setChartName(e.target.value)}
                                    />
                                </div>

                                {/* Chart Type */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">
                                        Loại biểu đồ
                                    </label>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {chartTypes.map(({ type, label, icon }) => (
                                            <button
                                                key={type}
                                                onClick={() => updateChartType(type)}
                                                title={label}
                                                className={cn(
                                                    "flex flex-col items-center gap-1 p-2 border-2 transition-all hover:-translate-y-0.5",
                                                    currentChart.type === type
                                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                                        : "border-slate-100 hover:border-blue-300 text-slate-500"
                                                )}
                                            >
                                                {icon}
                                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Data Source */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Database className="h-4 w-4 text-[#64748B]" />
                                            <label className="text-sm font-semibold text-[#0F172A]">
                                                Nguồn dữ liệu
                                            </label>
                                        </div>
                                    </div>

                                    {/* Query Mode Toggle - Angular Style */}
                                    <div className="flex bg-slate-100 p-1 mb-4">
                                        <button
                                            onClick={() => setQueryMode("simple")}
                                            className={cn(
                                                "flex-1 py-2 px-3 text-xs font-bold transition-all flex items-center justify-center",
                                                queryMode === "simple"
                                                    ? "bg-white text-blue-700 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <Database className="h-3 w-3 mr-1" /> Đơn giản
                                        </button>
                                        <button
                                            onClick={() => setQueryMode("custom")}
                                            className={cn(
                                                "flex-1 py-2 px-3 text-xs font-bold transition-all flex items-center justify-center",
                                                queryMode === "custom"
                                                    ? "bg-white text-blue-700 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <Code className="h-3 w-3 mr-1" /> SQL
                                        </button>
                                        <button
                                            onClick={() => setQueryMode("import")}
                                            className={cn(
                                                "flex-1 py-2 px-3 text-xs font-bold transition-all flex items-center justify-center",
                                                queryMode === "import"
                                                    ? "bg-white text-blue-700 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <Upload className="h-3 w-3 mr-1" /> Import
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Database Connection Selector - shown in simple and custom modes */}
                                        {(queryMode === "simple" || queryMode === "custom") && (
                                            <div>
                                                <label className="text-xs text-[#64748B] mb-1 block">Chọn Database</label>
                                                <Select
                                                    value={selectedConnectionId}
                                                    onValueChange={handleConnectionChange}
                                                    disabled={isLoadingConnections || connections.length === 0}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue>
                                                            {isLoadingConnections
                                                                ? "Đang tải..."
                                                                : connections.find(c => c._id === selectedConnectionId)?.name || "Chọn database"}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {connections.map((conn) => (
                                                            <SelectItem key={conn._id} value={conn._id}>
                                                                <div className="flex flex-col">
                                                                    <span>{conn.name}</span>
                                                                    <span className="text-xs text-[#94A3B8]">{conn.host} / {conn.database}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {/* ============ IMPORT MODE ============ */}
                                        {queryMode === "import" && (
                                            <>
                                                {/* File Upload Area */}
                                                <div className="border-2 border-dashed border-[#E2E8F0]  p-6 text-center hover:border-[#0052CC] transition-colors">
                                                    <input
                                                        type="file"
                                                        id="file-upload"
                                                        accept=".xlsx,.xls,.csv"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;

                                                            setIsParsingFile(true);
                                                            setImportedFileName(file.name);

                                                            try {
                                                                const data = await file.arrayBuffer();
                                                                const xlsxLib = await loadXLSX();
                                                                const workbook = xlsxLib.read(data, { type: 'array' });
                                                                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                                                                const jsonData = xlsxLib.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];

                                                                if (jsonData.length === 0) {
                                                                    toast.error("File không có dữ liệu");
                                                                    return;
                                                                }

                                                                // Get columns from first row
                                                                const cols = Object.keys(jsonData[0]);
                                                                setImportedColumns(cols);
                                                                setImportedData(jsonData);
                                                                setChartData(jsonData);

                                                                // Auto-select first column as X-axis
                                                                if (cols.length > 0) {
                                                                    setImportXAxis(cols[0]);
                                                                    setXAxisLabel(cols[0]);
                                                                }
                                                                // Auto-select numeric columns as Y-axis
                                                                const numericCols = cols.filter(col =>
                                                                    typeof jsonData[0][col] === 'number'
                                                                );
                                                                if (numericCols.length > 0) {
                                                                    setImportYAxis([numericCols[0]]);
                                                                    setYAxisLabel(numericCols[0]);
                                                                }

                                                                toast.success(`Đã import ${jsonData.length} dòng từ "${file.name}"`);
                                                            } catch (error) {
                                                                console.error('Parse error:', error);
                                                                toast.error("Không thể đọc file. Vui lòng kiểm tra định dạng.");
                                                            } finally {
                                                                setIsParsingFile(false);
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor="file-upload" className="cursor-pointer">
                                                        {isParsingFile ? (
                                                            <div className="flex flex-col items-center">
                                                                <Loader2 className="h-10 w-10 text-[#0052CC] animate-spin mb-2" />
                                                                <p className="text-sm text-[#64748B]">Đang xử lý...</p>
                                                            </div>
                                                        ) : importedFileName ? (
                                                            <div className="flex flex-col items-center">
                                                                <FileSpreadsheet className="h-10 w-10 text-green-500 mb-2" />
                                                                <p className="text-sm font-medium text-[#0F172A]">{importedFileName}</p>
                                                                <p className="text-xs text-[#64748B]">{importedData.length} dòng • {importedColumns.length} cột</p>
                                                                <p className="text-xs text-[#0052CC] mt-2">Click để chọn file khác</p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <Upload className="h-10 w-10 text-[#94A3B8] mb-2" />
                                                                <p className="text-sm font-medium text-[#0F172A]">Chọn file Excel hoặc CSV</p>
                                                                <p className="text-xs text-[#64748B]">Hỗ trợ .xlsx, .xls, .csv</p>
                                                            </div>
                                                        )}
                                                    </label>
                                                </div>

                                                {/* Column Selection for Import */}
                                                {importedColumns.length > 0 && (
                                                    <>
                                                        {/* X-Axis Selection */}
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Trục X (Labels)</label>
                                                            <Select value={importXAxis} onValueChange={(v) => { setImportXAxis(v); setXAxisLabel(v); }}>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {importedColumns.map(col => (
                                                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Y-Axis Selection */}
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Trục Y (Values)</label>
                                                            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                                                                {importedColumns.map(col => (
                                                                    <label key={col} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                                        <Checkbox
                                                                            checked={importYAxis.includes(col)}
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) {
                                                                                    const newY = [...importYAxis, col];
                                                                                    setImportYAxis(newY);
                                                                                    setYAxisLabel(newY.join(', '));
                                                                                } else {
                                                                                    const newY = importYAxis.filter(c => c !== col);
                                                                                    setImportYAxis(newY);
                                                                                    setYAxisLabel(newY.join(', '));
                                                                                }
                                                                            }}
                                                                        />
                                                                        <span>{col}</span>
                                                                        {typeof importedData[0]?.[col] === 'number' && (
                                                                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">số</span>
                                                                        )}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Drill-down Label Field for Import */}
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Trường nhãn Drill-down</label>
                                                            <Select
                                                                value={drillDownLabelField}
                                                                onValueChange={setDrillDownLabelField}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="">-- Mặc định --</SelectItem>
                                                                    {importedColumns.map(col => (
                                                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <p className="text-[10px] text-[#94A3B8] mt-1">Trường hiển thị khi xem chi tiết</p>
                                                        </div>

                                                        {/* Group By for Import */}
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Nhóm thêm theo (tuỳ chọn)</label>
                                                            <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2">
                                                                {importedColumns.filter(c => c !== importXAxis && !importYAxis.includes(c)).map((col) => (
                                                                    <label key={col} className="flex items-center gap-2 text-xs">
                                                                        <Checkbox
                                                                            checked={groupBy.includes(col)}
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) {
                                                                                    setGroupBy([...groupBy, col]);
                                                                                } else {
                                                                                    setGroupBy(groupBy.filter(g => g !== col));
                                                                                }
                                                                            }}
                                                                        />
                                                                        {col}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Order By for Import */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs text-[#64748B] mb-1 block">Sắp xếp theo</label>
                                                                <Select value={orderBy || "_none"} onValueChange={(v) => setOrderBy(v === "_none" ? "" : v)}>
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="_none">Không sắp xếp</SelectItem>
                                                                        {importedColumns.map(col => (
                                                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-[#64748B] mb-1 block">Thứ tự</label>
                                                                <Select value={orderDirection} onValueChange={(v) => setOrderDirection(v as "asc" | "desc")} disabled={!orderBy}>
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="asc">Tăng dần</SelectItem>
                                                                        <SelectItem value="desc">Giảm dần</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>

                                                        {/* Limit for Import */}
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Giới hạn (TOP)</label>
                                                            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="0">Tất cả</SelectItem>
                                                                    <SelectItem value="10">10</SelectItem>
                                                                    <SelectItem value="20">20</SelectItem>
                                                                    <SelectItem value="50">50</SelectItem>
                                                                    <SelectItem value="100">100</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Preview Data Table */}
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 flex items-center gap-1">
                                                                <Table2 className="h-3 w-3" /> Xem trước dữ liệu (5 dòng đầu)
                                                            </label>
                                                            <div className="border rounded-md overflow-x-auto max-h-40">
                                                                <table className="w-full text-xs">
                                                                    <thead className="bg-slate-50 sticky top-0">
                                                                        <tr>
                                                                            {importedColumns.slice(0, 6).map(col => (
                                                                                <th key={col} className="px-2 py-1 text-left font-medium text-[#64748B] border-b">
                                                                                    {col}
                                                                                </th>
                                                                            ))}
                                                                            {importedColumns.length > 6 && (
                                                                                <th className="px-2 py-1 text-left font-medium text-[#64748B] border-b">...</th>
                                                                            )}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {importedData.slice(0, 5).map((row, i) => (
                                                                            <tr key={i} className="border-b last:border-0">
                                                                                {importedColumns.slice(0, 6).map(col => (
                                                                                    <td key={col} className="px-2 py-1 text-[#0F172A] truncate max-w-[100px]">
                                                                                        {String(row[col] ?? '')}
                                                                                    </td>
                                                                                ))}
                                                                                {importedColumns.length > 6 && (
                                                                                    <td className="px-2 py-1 text-[#94A3B8]">...</td>
                                                                                )}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        {/* Clear Import */}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => {
                                                                setImportedData([]);
                                                                setImportedFileName("");
                                                                setImportedColumns([]);
                                                                setImportXAxis("");
                                                                setImportYAxis([]);
                                                                setChartData([]);
                                                            }}
                                                        >
                                                            <X className="h-3 w-3 mr-1" /> Xóa dữ liệu import
                                                        </Button>
                                                    </>
                                                )}
                                            </>
                                        )}



                                        {/* ============ CUSTOM SQL MODE ============ */}
                                        {queryMode === "custom" && (
                                            <>
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Câu lệnh SQL</label>
                                                    <textarea
                                                        value={customSql}
                                                        onChange={(e) => setCustomSql(e.target.value)}
                                                        placeholder={`-- Nhập câu lệnh SQL của bạn
SELECT 
    THANG, NAM, Ma_DV, 
    SUM(PTM) AS PTM, 
    SUM(KP) AS KHOIPHUC
FROM REPORTSERVICE.DBO.GiamSat_PTM
GROUP BY THANG, NAM, Ma_DV`}
                                                        className="w-full h-40 p-3 text-xs font-mono bg-[#1E293B] text-green-400 rounded-md border border-[#334155] focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                                                    />
                                                    <p className="text-[10px] text-[#94A3B8] mt-1">
                                                        ⚠ Chỉ hỗ trợ SELECT. Không được dùng DROP, DELETE, UPDATE, INSERT...
                                                    </p>
                                                </div>

                                                <Button
                                                    onClick={async () => {
                                                        if (!customSql.trim()) {
                                                            toast.error("Vui lòng nhập câu lệnh SQL");
                                                            return;
                                                        }
                                                        setIsLoadingChartData(true);
                                                        setChartDataError(null);
                                                        try {
                                                            const response = await fetch('/api/database/chart-data', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    customQuery: customSql,
                                                                    connectionId: selectedConnectionId || undefined,
                                                                }),
                                                            });
                                                            const result = await response.json();
                                                            if (result.success && result.data) {
                                                                setChartData(result.data);
                                                                setCustomSqlColumns(result.columns || []);
                                                                toast.success(`Query thành công: ${result.data.length} dòng`);
                                                                // Auto-detect xAxis and yAxis if not set
                                                                if (result.columns && result.columns.length > 0) {
                                                                    if (!customSqlXAxis) {
                                                                        setCustomSqlXAxis(result.columns[0]);
                                                                        setXAxisLabel(result.columns[0]);
                                                                    }
                                                                    if (customSqlYAxis.length === 0 && result.columns.length > 1) {
                                                                        const autoY = result.columns.slice(1).filter((c: string) =>
                                                                            !['THANG', 'NAM', 'thang', 'nam', 'Ma_DV', 'ma_dv', 'loaitb_id'].some(skip => c.toLowerCase().includes(skip.toLowerCase()))
                                                                        );
                                                                        setCustomSqlYAxis(autoY);
                                                                        setYAxisLabel(autoY.join(', '));
                                                                    }
                                                                }
                                                            } else {
                                                                setChartDataError(result.error || 'Lỗi thực thi SQL');
                                                                toast.error(result.error || 'Lỗi thực thi SQL');
                                                            }
                                                        } catch (error) {
                                                            console.error(error);
                                                            toast.error('Lỗi kết nối');
                                                        } finally {
                                                            setIsLoadingChartData(false);
                                                        }
                                                    }}
                                                    disabled={isLoadingChartData || !customSql.trim()}
                                                    className="w-full"
                                                >
                                                    {isLoadingChartData ? (
                                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang chạy...</>
                                                    ) : (
                                                        <>  Chạy Query</>
                                                    )}
                                                </Button>

                                                {/* Column Selection for Custom SQL */}
                                                {customSqlColumns.length > 0 && (
                                                    <>
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Cột X (trục ngang)</label>
                                                            <Select
                                                                value={customSqlXAxis}
                                                                onValueChange={(value) => { setCustomSqlXAxis(value || ""); setXAxisLabel(value || ""); }}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue>{customSqlXAxis || "Chọn cột X"}</SelectValue>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {customSqlColumns.map((col) => (
                                                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Cột Y (giá trị)</label>
                                                            <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                                                                {customSqlColumns.filter(c => c !== customSqlXAxis).map((col) => (
                                                                    <label key={col} className="flex items-center gap-2 text-xs">
                                                                        <Checkbox
                                                                            checked={customSqlYAxis.includes(col)}
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) {
                                                                                    const newY = [...customSqlYAxis, col];
                                                                                    setCustomSqlYAxis(newY);
                                                                                    setYAxisLabel(newY.join(', '));
                                                                                } else {
                                                                                    const newY = customSqlYAxis.filter(c => c !== col);
                                                                                    setCustomSqlYAxis(newY);
                                                                                    setYAxisLabel(newY.join(', '));
                                                                                }
                                                                            }}
                                                                        />
                                                                        {col}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Drill-down Label Field for SQL */}
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Trường nhãn Drill-down</label>
                                                            <Select
                                                                value={drillDownLabelField}
                                                                onValueChange={(v) => setDrillDownLabelField(v || "")}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="">-- Mặc định --</SelectItem>
                                                                    {customSqlColumns.map(col => (
                                                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <p className="text-[10px] text-[#94A3B8] mt-1">Trường hiển thị khi xem chi tiết</p>
                                                        </div>

                                                        {/* Group By for SQL */}
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Nhóm thêm theo (tuỳ chọn)</label>
                                                            <div className="space-y-1 max-h-24 overflow-y-auto border rounded-md p-2">
                                                                {customSqlColumns.filter(c => c !== customSqlXAxis && !customSqlYAxis.includes(c)).map((col) => (
                                                                    <label key={col} className="flex items-center gap-2 text-xs">
                                                                        <Checkbox
                                                                            checked={groupBy.includes(col)}
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) {
                                                                                    setGroupBy([...groupBy, col]);
                                                                                } else {
                                                                                    setGroupBy(groupBy.filter(g => g !== col));
                                                                                }
                                                                            }}
                                                                        />
                                                                        {col}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Order By for SQL */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs text-[#64748B] mb-1 block">Sắp xếp theo</label>
                                                                <Select value={orderBy || "_none"} onValueChange={(v) => setOrderBy(v === "_none" ? "" : v)}>
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="_none">Không sắp xếp</SelectItem>
                                                                        {customSqlColumns.map(col => (
                                                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-[#64748B] mb-1 block">Thứ tự</label>
                                                                <Select value={orderDirection} onValueChange={(v) => setOrderDirection(v as "asc" | "desc")} disabled={!orderBy}>
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="asc">Tăng dần</SelectItem>
                                                                        <SelectItem value="desc">Giảm dần</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>

                                                        {/* Limit for SQL */}
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Giới hạn (TOP)</label>
                                                            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="0">Tất cả</SelectItem>
                                                                    <SelectItem value="10">10</SelectItem>
                                                                    <SelectItem value="20">20</SelectItem>
                                                                    <SelectItem value="50">50</SelectItem>
                                                                    <SelectItem value="100">100</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {/* ============ SIMPLE MODE ============ */}
                                        {queryMode === "simple" && (
                                            <>

                                                {/* Searchable Table Selection */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Bảng dữ liệu</label>
                                                    <div className="relative" ref={tableDropdownRef}>
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                                                            <Input
                                                                placeholder="Tìm và chọn bảng..."
                                                                value={tableSearchQuery}
                                                                onChange={(e) => {
                                                                    setTableSearchQuery(e.target.value);
                                                                    setShowTableDropdown(true);
                                                                }}
                                                                onFocus={() => setShowTableDropdown(true)}
                                                                className="pl-9 pr-8"
                                                            />
                                                            {isLoadingTables ? (
                                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] animate-spin" />
                                                            ) : (
                                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                                                            )}
                                                        </div>

                                                        {showTableDropdown && (
                                                            <div className="absolute z-50 w-full mt-1 bg-white border border-[#E2E8F0] rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                                {filteredTables.length === 0 ? (
                                                                    <div className="p-3 text-sm text-[#64748B] text-center">
                                                                        {isLoadingTables ? "Đang tải..." : "Không tìm thấy bảng"}
                                                                    </div>
                                                                ) : (
                                                                    filteredTables.map((table) => (
                                                                        <button
                                                                            key={`${table.schema}.${table.name}`}
                                                                            onClick={() => handleTableSelect(table.name)}
                                                                            className={cn(
                                                                                "w-full text-left px-3 py-2 hover:bg-[#F8FAFC] transition-colors",
                                                                                selectedTable === table.name && "bg-[#0052CC]/5 text-[#0052CC]"
                                                                            )}
                                                                        >
                                                                            <div className="text-sm font-medium">{table.name}</div>
                                                                            <div className="text-xs text-[#94A3B8]">
                                                                                {table.schema} • {table.rowCount?.toLocaleString() || 0} dòng
                                                                            </div>
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {selectedTable && (
                                                        <p className="text-xs text-[#0052CC] mt-1">
                                                            Đã chọn: {selectedTable}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* X-Axis */}
                                                {currentChart.type !== 'card' && (
                                                    <div>
                                                        <label className="text-xs text-[#64748B] mb-1 block">
                                                            Trục X (Danh mục)
                                                        </label>
                                                        <Select
                                                            value={selectedXAxis}
                                                            onValueChange={(v) => v && handleXAxisChange(v)}
                                                            disabled={columns.length === 0}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue>
                                                                    {selectedXAxis || (isLoadingColumns ? "Đang tải..." : "Chọn cột")}
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {columns.map((col) => (
                                                                    <SelectItem key={col.name} value={col.name}>
                                                                        {col.name} ({col.type})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}

                                                {/* Date Filter - Two Columns */}
                                                <div className="pt-2 border-t border-[#E2E8F0] mt-2">
                                                    <label className="text-xs text-[#64748B] mb-2 block font-medium">
                                                        Lọc theo thời gian
                                                    </label>

                                                    <div className="space-y-2">
                                                        {/* Start Date Column */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-[#64748B] w-14 flex-shrink-0">Từ ngày:</span>
                                                            <Select
                                                                value={startDateColumn || ""}
                                                                onValueChange={(val) => setStartDateColumn(val ?? "")}
                                                                disabled={columns.length === 0}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs flex-1">
                                                                    <SelectValue>
                                                                        {startDateColumn || "Chọn cột"}
                                                                    </SelectValue>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="">-- Không chọn --</SelectItem>
                                                                    {columns.map((col) => (
                                                                        <SelectItem key={`start-${col.name}`} value={col.name}>
                                                                            {col.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* End Date Column */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-[#64748B] w-14 flex-shrink-0">Đến ngày:</span>
                                                            <Select
                                                                value={endDateColumn || ""}
                                                                onValueChange={(val) => setEndDateColumn(val ?? "")}
                                                                disabled={columns.length === 0}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs flex-1">
                                                                    <SelectValue>
                                                                        {endDateColumn || "Chọn cột"}
                                                                    </SelectValue>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="">-- Không chọn --</SelectItem>
                                                                    {columns.map((col) => (
                                                                        <SelectItem key={`end-${col.name}`} value={col.name}>
                                                                            {col.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    {/* Date Range Test - Only show if columns selected */}
                                                    {(startDateColumn || endDateColumn) && (
                                                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-dashed border-gray-200">
                                                            <div>
                                                                <label className="text-[10px] text-[#64748B] mb-1 block">Giá trị từ</label>
                                                                <Input
                                                                    type="date"
                                                                    className="h-8 text-xs"
                                                                    value={filterFromDate}
                                                                    onChange={(e) => setFilterFromDate(e.target.value)}
                                                                    disabled={!startDateColumn}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-[#64748B] mb-1 block">Giá trị đến</label>
                                                                <Input
                                                                    type="date"
                                                                    className="h-8 text-xs"
                                                                    value={filterToDate}
                                                                    onChange={(e) => setFilterToDate(e.target.value)}
                                                                    disabled={!endDateColumn}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <p className="text-[10px] text-[#94A3B8] mt-2">
                                                        Dashboard sẽ lọc theo 2 cột này khi có Global Filter.
                                                    </p>
                                                </div>

                                                {/* Drill-down Label Field */}
                                                <div className="pt-2 border-t border-[#E2E8F0] mt-2">
                                                    <label className="text-xs text-[#64748B] mb-2 block font-medium">
                                                        Cột label khi Drill-down
                                                    </label>
                                                    <Select
                                                        value={drillDownLabelField || ""}
                                                        onValueChange={(val) => setDrillDownLabelField(val ?? "")}
                                                        disabled={columns.length === 0}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue>
                                                                {drillDownLabelField || "Chọn cột làm label chi tiết"}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="">-- Mặc định (Trục X) --</SelectItem>
                                                            {columns.map((col) => (
                                                                <SelectItem key={`drill-${col.name}`} value={col.name}>
                                                                    {col.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-[10px] text-[#94A3B8] mt-1">
                                                        Khi click để xem chi tiết, cột này sẽ là label trục X.
                                                    </p>
                                                </div>

                                                {/* Y-Axis (Multiple) */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-2 block">
                                                        Trục Y (Giá trị số) - Chọn nhiều
                                                    </label>
                                                    <div className="max-h-40 overflow-y-auto space-y-1 border border-[#E2E8F0] rounded-md p-2">
                                                        {isLoadingColumns ? (
                                                            <div className="flex items-center justify-center py-4">
                                                                <Loader2 className="h-5 w-5 text-[#0052CC] animate-spin" />
                                                            </div>
                                                        ) : numericColumns.length === 0 ? (
                                                            <p className="text-xs text-[#64748B] text-center py-2">
                                                                {columns.length === 0 ? "Chọn bảng trước" : "Không có cột số"}
                                                            </p>
                                                        ) : (
                                                            numericColumns.map((col) => (
                                                                <label
                                                                    key={col.name}
                                                                    className="flex items-center gap-2 p-2 rounded hover:bg-[#F8FAFC] cursor-pointer"
                                                                >
                                                                    <Checkbox
                                                                        id={`y-axis-${col.name}`}
                                                                        checked={selectedYAxis.includes(col.name)}
                                                                        onCheckedChange={() => handleYAxisToggle(col.name)}
                                                                        className="border-[#E2E8F0] data-[state=checked]:bg-[#0052CC] data-[state=checked]:border-[#0052CC]"
                                                                    />
                                                                    <span className="text-sm text-[#0F172A]">{col.name}</span>
                                                                    <span className="text-xs text-[#94A3B8]">({col.type})</span>
                                                                </label>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Aggregation */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">
                                                        Phép tính
                                                    </label>
                                                    <Select
                                                        value={aggregation}
                                                        onValueChange={(v) => setAggregation(v as any)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue>
                                                                {aggregation === 'sum' && 'SUM (Tổng)'}
                                                                {aggregation === 'avg' && 'AVG (Trung bình)'}
                                                                {aggregation === 'count' && 'COUNT (Đếm)'}
                                                                {aggregation === 'min' && 'MIN (Nhỏ nhất)'}
                                                                {aggregation === 'max' && 'MAX (Lớn nhất)'}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="sum">SUM (Tổng)</SelectItem>
                                                            <SelectItem value="avg">AVG (Trung bình)</SelectItem>
                                                            <SelectItem value="count">COUNT (Đếm)</SelectItem>
                                                            <SelectItem value="min">MIN (Nhỏ nhất)</SelectItem>
                                                            <SelectItem value="max">MAX (Lớn nhất)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* GroupBy (additional columns) */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Nhóm thêm theo (tuỳ chọn)</label>
                                                    <div className="max-h-32 overflow-y-auto space-y-1 border border-[#E2E8F0] rounded-md p-2">
                                                        {columns.filter(c => c.name !== selectedXAxis).map(col => (
                                                            <label key={col.name} className="flex items-center gap-2 p-1.5 rounded hover:bg-[#F8FAFC] cursor-pointer text-sm">
                                                                <Checkbox
                                                                    checked={groupBy.includes(col.name)}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            setGroupBy([...groupBy, col.name]);
                                                                        } else {
                                                                            setGroupBy(groupBy.filter(g => g !== col.name));
                                                                        }
                                                                    }}
                                                                    className="h-3.5 w-3.5"
                                                                />
                                                                <span className="text-[#0F172A]">{col.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-[#94A3B8] mt-1">Thêm các cột để nhóm dữ liệu chi tiết hơn.</p>
                                                </div>

                                                {/* Sorting (optional) */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs text-[#64748B] mb-1 block">Sắp xếp theo (tuỳ chọn)</label>
                                                        <Select value={orderBy || "_none"} onValueChange={(v) => v && setOrderBy(v === "_none" ? "" : v)}>
                                                            <SelectTrigger>
                                                                <SelectValue>
                                                                    {orderBy || "Không sắp xếp"}
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="_none">Không sắp xếp</SelectItem>
                                                                {columns.map(col => (
                                                                    <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-[#64748B] mb-1 block">Thứ tự</label>
                                                        <Select value={orderDirection} onValueChange={(v) => v && setOrderDirection(v as any)} disabled={!orderBy}>
                                                            <SelectTrigger className={!orderBy ? "opacity-50" : ""}>
                                                                <SelectValue>
                                                                    {orderDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="asc">Tăng dần</SelectItem>
                                                                <SelectItem value="desc">Giảm dần</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* TOP/Limit */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Giới hạn (TOP)</label>
                                                    <Select value={limit.toString()} onValueChange={(v) => v && setLimit(parseInt(v))}>
                                                        <SelectTrigger>
                                                            <SelectValue>
                                                                {limit === 0 ? 'Tất cả' : `TOP ${limit}`}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">Tất cả</SelectItem>
                                                            <SelectItem value="5">TOP 5</SelectItem>
                                                            <SelectItem value="10">TOP 10</SelectItem>
                                                            <SelectItem value="20">TOP 20</SelectItem>
                                                            <SelectItem value="50">TOP 50</SelectItem>
                                                            <SelectItem value="100">TOP 100</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </>
                                        )}
                                        {/* End of queryMode conditionals */}
                                    </div>
                                </div>
                            </>
                        )}
                        {activeTab === "style" && (
                            <>
                                {/* Style Options */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Settings2 className="h-4 w-4 text-[#64748B]" />
                                        <label className="text-sm font-semibold text-[#0F172A]">
                                            Tùy chỉnh hiển thị
                                        </label>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Axis Labels */}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-[#64748B] mb-1 block">Nhãn trục X</label>
                                                <Input
                                                    placeholder="VD: Thời gian"
                                                    value={xAxisLabel}
                                                    onChange={(e) => setXAxisLabel(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-[#64748B] mb-1 block">Nhãn trục Y</label>
                                                <Input
                                                    placeholder="VD: Doanh thu (vnđ)"
                                                    value={yAxisLabel}
                                                    onChange={(e) => setYAxisLabel(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* X-Axis Value Exclusion */}
                                        {chartData.length > 0 && selectedXAxis && (
                                            <div>
                                                <label className="text-xs text-[#64748B] mb-1 block">
                                                    Ẩn giá trị trục X (tuỳ chọn)
                                                </label>
                                                <div className="max-h-40 overflow-y-auto space-y-1 border border-[#E2E8F0] rounded-md p-2 bg-white">
                                                    {Array.from(new Set(chartData.map(item => String(item[selectedXAxis])))).map((value) => (
                                                        <label key={value} className="flex items-center gap-2 p-1.5 rounded hover:bg-[#FEF2F2] cursor-pointer text-sm">
                                                            <Checkbox
                                                                checked={xAxisExclude.includes(value)}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setXAxisExclude([...xAxisExclude, value]);
                                                                    } else {
                                                                        setXAxisExclude(xAxisExclude.filter(v => v !== value));
                                                                    }
                                                                }}
                                                                className="h-3.5 w-3.5 border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                                                            />
                                                            <span className={xAxisExclude.includes(value) ? "text-red-500 line-through" : "text-[#0F172A]"}>
                                                                {value}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {xAxisExclude.length > 0 && (
                                                    <div className="mt-2 flex items-center justify-between">
                                                        <p className="text-[10px] text-red-500">
                                                            Đang ẩn {xAxisExclude.length} giá trị
                                                        </p>
                                                        <button
                                                            onClick={() => setXAxisExclude([])}
                                                            className="text-[10px] text-[#0052CC] hover:underline"
                                                        >
                                                            Bỏ ẩn tất cả
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}


                                        {/* Title Font Size */}
                                        <div>
                                            <label className="text-xs text-[#64748B] mb-1 block">
                                                Cỡ chữ tiêu đề
                                            </label>
                                            <Select
                                                value={titleFontSize.toString()}
                                                onValueChange={(v) => v && setTitleFontSize(parseInt(v))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue>
                                                        {titleFontSize}px {titleFontSize === 14 ? '(Mặc định)' : ''}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="12">12px (Nhỏ)</SelectItem>
                                                    <SelectItem value="14">14px (Mặc định)</SelectItem>
                                                    <SelectItem value="16">16px (Vừa)</SelectItem>
                                                    <SelectItem value="18">18px (Lớn)</SelectItem>
                                                    <SelectItem value="20">20px (Rất lớn)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Text Color */}
                                        <div>
                                            <label className="text-xs text-[#64748B] mb-1 block">Màu chữ chung</label>
                                            <div className="flex items-center gap-2">
                                                <ColorPicker value={textColor || '#1E293B'} onChange={setTextColor} />
                                                <span className="text-xs text-[#64748B]">{textColor || 'Mặc định'}</span>
                                            </div>
                                        </div>

                                        {/* Legend Toggle */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-[#0F172A]">Hiển thị chú thích</label>
                                            <button
                                                onClick={() => setShowLegend(!showLegend)}
                                                className={cn(
                                                    "w-10 h-6 rounded-full transition-colors relative",
                                                    showLegend ? "bg-[#0052CC]" : "bg-[#E2E8F0]"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                                                        showLegend ? "right-1" : "left-1"
                                                    )}
                                                />
                                            </button>
                                        </div>

                                        {/* Legend Position */}
                                        {showLegend && (
                                            <div>
                                                <label className="text-xs text-[#64748B] mb-1 block">
                                                    Vị trí chú thích
                                                </label>
                                                <Select
                                                    value={legendPosition}
                                                    onValueChange={(v) => setLegendPosition(v as "top" | "bottom" | "left" | "right")}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue> {legendPosition === "top" ? "Trên" : legendPosition === "bottom" ? "Dưới" : legendPosition === "left" ? "Trái" : "Phải"}</SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="top">Trên</SelectItem>
                                                        <SelectItem value="bottom">Dưới</SelectItem>
                                                        <SelectItem value="left">Trái</SelectItem>
                                                        <SelectItem value="right">Phải</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {/* Pie Variant Selector - only for pie charts */}
                                        {currentChart.type === 'pie' && (
                                            <div>
                                                <label className="text-xs text-[#64748B] mb-1 block">
                                                    Kiểu biểu đồ tròn
                                                </label>
                                                <Select
                                                    value={pieVariant}
                                                    onValueChange={(v) => setPieVariant(v as "default" | "sized" | "donut")}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue>
                                                            {pieVariant === 'default' ? 'Mặc định' : pieVariant === 'sized' ? 'Theo kích thước' : 'Donut'}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="default">Mặc định</SelectItem>
                                                        <SelectItem value="sized">Theo kích thước (Sized)</SelectItem>
                                                        <SelectItem value="donut">Donut</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {/* Grid Toggle */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-[#0F172A]">Hiển thị lưới</label>
                                            <button
                                                onClick={() => setShowGrid(!showGrid)}
                                                className={cn(
                                                    "w-10 h-6 rounded-full transition-colors relative",
                                                    showGrid ? "bg-[#0052CC]" : "bg-[#E2E8F0]"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                                                    )}
                                                />
                                            </button>
                                        </div>

                                        {/* Grid Color */}
                                        {showGrid && (
                                            <div className="pl-2 border-l-2 border-slate-100">
                                                <label className="text-xs text-[#64748B] mb-1 block">Màu lưới</label>
                                                <div className="flex items-center gap-2">
                                                    <ColorPicker value={gridColor || '#E2E8F0'} onChange={setGridColor} />
                                                    <span className="text-xs text-[#64748B]">{gridColor || 'Mặc định'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tooltip Theme Toggle */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-[#0F172A]">Tooltip sáng</label>
                                            <button
                                                onClick={() => setTooltipTheme(tooltipTheme === 'light' ? 'dark' : 'light')}
                                                className={cn(
                                                    "w-10 h-6 rounded-full transition-colors relative",
                                                    tooltipTheme === 'light' ? "bg-[#0052CC]" : "bg-[#E2E8F0]"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                                                        tooltipTheme === 'light' ? "right-1" : "left-1"
                                                    )}
                                                />
                                            </button>
                                        </div>

                                        {/* Composed Chart Field Types - only for composed charts */}
                                        {/* Composed & General Y-Axis Customization */}
                                        {['line', 'bar', 'area', 'stackedBar', 'composed', 'radar', 'horizontalBar'].includes(currentChart.type || '') && selectedYAxis.length > 0 && (
                                            <div>
                                                <label className="text-xs text-[#64748B] mb-2 block">
                                                    Tùy chỉnh trục Y
                                                </label>
                                                <div className="space-y-3">
                                                    {selectedYAxis.map((field, index) => (
                                                        <div key={field} className="p-3 bg-[#F8FAFC] rounded space-y-2">
                                                            {/* Field name and type toggle */}
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-[#64748B]">{field}</span>

                                                                {/* Only show type toggle for composed charts */}
                                                                {currentChart.type === 'composed' && (
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => setComposedFieldTypes(prev => ({ ...prev, [field]: 'bar' }))}
                                                                            className={cn(
                                                                                "px-2 py-1 text-xs rounded",
                                                                                (composedFieldTypes[field] || 'bar') === 'bar'
                                                                                    ? "bg-[#0052CC] text-white"
                                                                                    : "bg-white text-[#64748B] border border-[#E2E8F0]"
                                                                            )}
                                                                        >
                                                                            Cột
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setComposedFieldTypes(prev => ({ ...prev, [field]: 'line' }))}
                                                                            className={cn(
                                                                                "px-2 py-1 text-xs rounded",
                                                                                composedFieldTypes[field] === 'line'
                                                                                    ? "bg-[#0052CC] text-white"
                                                                                    : "bg-white text-[#64748B] border border-[#E2E8F0]"
                                                                            )}
                                                                        >
                                                                            Đường
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Custom label */}
                                                            <Input
                                                                placeholder="Tên hiển thị"
                                                                value={yAxisFieldLabels[field] || ''}
                                                                onChange={(e) => setYAxisFieldLabels(prev => ({ ...prev, [field]: e.target.value }))}
                                                                className="h-8 text-sm"
                                                            />
                                                            {/* Color picker */}
                                                            <div className="flex items-center gap-2">
                                                                <ColorPicker
                                                                    value={yAxisFieldColors[field] || defaultChartColors[index % defaultChartColors.length]}
                                                                    onChange={(color) => setYAxisFieldColors(prev => ({ ...prev, [field]: color }))}
                                                                />
                                                                <span className="text-xs text-[#64748B]">Màu</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Card Customization */}
                                        {currentChart.type === 'card' && (
                                            <div className="space-y-4 pt-2 border-t border-[#E2E8F0] mt-2">
                                                <label className="text-sm font-semibold text-[#0F172A]">
                                                    Tùy chỉnh thẻ thống kê
                                                </label>

                                                {/* Basic Card Settings */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs text-[#64748B] mb-1 block">Tiêu đề thẻ</label>
                                                        <Input
                                                            value={chartName}
                                                            onChange={(e) => setChartName(e.target.value)}
                                                            placeholder="VD: Thống kê bán hàng"
                                                            className="h-8"
                                                        />
                                                    </div>

                                                    {/* Icon */}
                                                    <div>
                                                        <label className="text-xs text-[#64748B] mb-1 block">Icon</label>
                                                        <IconPicker
                                                            value={cardIcon}
                                                            onChange={setCardIcon}
                                                            placeholder="Chọn icon..."
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>

                                                    {/* Colors */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Màu nền</label>
                                                            <div className="flex items-center gap-2">
                                                                <ColorPicker value={cardBackgroundColor || '#FFFFFF'} onChange={setCardBackgroundColor} />
                                                                <span className="text-xs text-[#64748B]">{cardBackgroundColor || 'Trắng'}</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Màu chính</label>
                                                            <div className="flex items-center gap-2">
                                                                <ColorPicker value={cardColor || '#0066FF'} onChange={setCardColor} />
                                                                <span className="text-xs text-[#64748B]">{cardColor || 'Xanh'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Metrics Configuration */}
                                                <div className="pt-4 border-t border-[#E2E8F0]">
                                                    <MetricsEditor
                                                        metrics={statCardMetrics}
                                                        onChange={setStatCardMetrics}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* StatCard Customization */}
                                        {currentChart.type === 'statCard' && (
                                            <div className="space-y-4 pt-2 border-t border-[#E2E8F0] mt-2">
                                                <label className="text-sm font-semibold text-[#0F172A]">
                                                    Cấu hình KPI Card
                                                </label>

                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs text-[#64748B]">Hiển thị Gauge</label>
                                                    <Checkbox
                                                        checked={showGauge}
                                                        onCheckedChange={(checked) => setShowGauge(checked as boolean)}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Giá trị Kế hoạch (KH)</label>
                                                    <Input
                                                        type="number"
                                                        value={kpiPlanValue}
                                                        onChange={(e) => setKpiPlanValue(Number(e.target.value))}
                                                        placeholder="VD: 1000"
                                                        className="h-8 text-sm"
                                                    />
                                                    <p className="text-[10px] text-[#94A3B8] mt-1">
                                                        Dùng để tính % hoàn thành nếu không có cột Target trong data.
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Ngưỡng đạt (%)</label>
                                                    <Input
                                                        type="number"
                                                        value={kpiThreshold}
                                                        onChange={(e) => setKpiThreshold(Number(e.target.value))}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs text-[#64748B]">Hiển thị Status Badge</label>
                                                    <Checkbox
                                                        checked={showStatusBadge}
                                                        onCheckedChange={(checked) => setShowStatusBadge(checked as boolean)}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs text-[#64748B]">Hiển thị Góc trang trí</label>
                                                    <Checkbox
                                                        checked={showCornerAccent}
                                                        onCheckedChange={(checked) => setShowCornerAccent(checked as boolean)}
                                                    />
                                                </div>

                                                <div className="pt-2 border-t border-[#E2E8F0]">
                                                    <label className="text-xs text-[#64748B] mb-1 block font-medium">Metrics (Labels)</label>
                                                    <MetricsEditor
                                                        metrics={statCardMetrics}
                                                        onChange={setStatCardMetrics}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* DataTileGrid Customization */}
                                        {currentChart.type === 'dataTileGrid' && (
                                            <div className="space-y-4 pt-2 border-t border-[#E2E8F0] mt-2">
                                                <label className="text-sm font-semibold text-[#0F172A]">
                                                    Cấu hình Tile Grid
                                                </label>

                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Số cột hiển thị</label>
                                                    <Select
                                                        value={tileGridColumns.toString()}
                                                        onValueChange={(v) => setTileGridColumns(parseInt(v) as any)}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="2">2 Cột</SelectItem>
                                                            <SelectItem value="4">4 Cột</SelectItem>
                                                            <SelectItem value="6">6 Cột</SelectItem>
                                                            <SelectItem value="8">8 Cột</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Cột Target (Kế hoạch)</label>
                                                    <Select
                                                        value={tileTargetField}
                                                        onValueChange={setTileTargetField}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue placeholder="Chọn cột KH..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="_avg_target">Giá trị trung bình (Mock)</SelectItem>
                                                            {columns.map(col => (
                                                                <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Cột Actual (Thực hiện)</label>
                                                    <Select
                                                        value={tileActualField}
                                                        onValueChange={setTileActualField}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue placeholder="Chọn cột TH..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {columns.map(col => (
                                                                <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}

                                        {/* Map Chart Customization */}
                                        {currentChart.type === 'map' && (
                                            <div className="space-y-4 pt-2 border-t border-[#E2E8F0] mt-2">
                                                <label className="text-sm font-semibold text-[#0F172A]">
                                                    Tùy chỉnh bản đồ
                                                </label>

                                                {/* Map Filter Configuration */}
                                                <div className="space-y-4">
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3  border border-blue-200 dark:border-blue-800">
                                                        <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                                                            Lọc theo dữ liệu đã cấu hình:
                                                        </div>
                                                        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                                            <div>Trục X: <span className="font-medium">{selectedXAxis || "Chưa chọn"}</span> (đơn vị TTVT - chú thích)</div>
                                                            <div>Trục Y: <span className="font-medium">{selectedYAxis.join(", ") || "Chưa chọn"}</span> (các lớp - loại hình thuê bao)</div>
                                                        </div>
                                                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                                            Chú thích hiển thị các đơn vị TTVT từ trục X. Hover/click để xem chi tiết các loại hình thuê bao từ trục Y.
                                                        </div>
                                                    </div>

                                                    {/* Map Styling Options */}
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Chế độ hiển thị</label>
                                                            <Select
                                                                value={mapDisplayMode}
                                                                onValueChange={(value) => setMapDisplayMode(value as "heatmap" | "category" | "value" | "coverage")}
                                                            >
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="value">Theo giá trị</SelectItem>
                                                                    <SelectItem value="category">Theo danh mục</SelectItem>
                                                                    <SelectItem value="heatmap">Heatmap (Nhiệt độ)</SelectItem>
                                                                    <SelectItem value="coverage">Vùng phủ</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div>
                                                            <label className="text-xs text-[#64748B] mb-1 block">Màu sắc chủ đề</label>
                                                            <Select
                                                                value={mapColorScheme}
                                                                onValueChange={(value) => setMapColorScheme(value as "default" | "blues" | "greens" | "reds" | "purples" | "signal")}
                                                            >
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="default">Mặc định</SelectItem>
                                                                    <SelectItem value="blues">Xanh dương</SelectItem>
                                                                    <SelectItem value="greens">Xanh lá</SelectItem>
                                                                    <SelectItem value="reds">Đỏ</SelectItem>
                                                                    <SelectItem value="purples">Tím</SelectItem>
                                                                    <SelectItem value="signal">Tín hiệu</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Data Labels Toggle */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-[#0F172A]">Hiển thị nhãn dữ liệu</label>
                                            <button
                                                onClick={() => setShowDataLabels(!showDataLabels)}
                                                className={cn(
                                                    "w-10 h-6 rounded-full transition-colors relative",
                                                    showDataLabels ? "bg-[#0052CC]" : "bg-[#E2E8F0]"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                                                        showDataLabels ? "right-1" : "left-1"
                                                    )}
                                                />
                                            </button>
                                        </div>

                                        {/* Data Label Options - shown when enabled */}
                                        {showDataLabels && (
                                            <div className="pl-4 border-l-2 border-[#0052CC]/20 space-y-4">
                                                {/* Label Position */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">
                                                        Vị trí nhãn
                                                    </label>
                                                    <Select
                                                        value={dataLabelPosition}
                                                        onValueChange={(v) => v && setDataLabelPosition(v as "top" | "center" | "bottom")}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue>
                                                                {dataLabelPosition === 'top' && 'Trên (Top)'}
                                                                {dataLabelPosition === 'center' && 'Giữa (Center)'}
                                                                {dataLabelPosition === 'bottom' && 'Dưới (Bottom)'}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="top">Trên (Top)</SelectItem>
                                                            <SelectItem value="center">Giữa (Center)</SelectItem>
                                                            <SelectItem value="bottom">Dưới (Bottom)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Unit Format */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">
                                                        Rút gọn đơn vị
                                                    </label>
                                                    <Select
                                                        value={dataLabelFormat}
                                                        onValueChange={(v) => v && setDataLabelFormat(v as "full" | "k" | "tr" | "ty")}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue>
                                                                {dataLabelFormat === 'full' && 'Đầy đủ'}
                                                                {dataLabelFormat === 'k' && 'K - Nghìn'}
                                                                {dataLabelFormat === 'tr' && 'Tr - Triệu'}
                                                                {dataLabelFormat === 'ty' && 'Tỷ'}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="full">Đầy đủ (1,000,000)</SelectItem>
                                                            <SelectItem value="k">K - Nghìn (1k)</SelectItem>
                                                            <SelectItem value="tr">Tr - Triệu (1tr)</SelectItem>
                                                            <SelectItem value="ty">Tỷ (1tỷ)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Data Label Color */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">
                                                        Màu nhãn
                                                    </label>
                                                    <div className="flex gap-2 items-center">
                                                        <ColorPicker
                                                            value={dataLabelColor}
                                                            onChange={setDataLabelColor}
                                                        />
                                                        <Input
                                                            value={dataLabelColor}
                                                            onChange={(e) => setDataLabelColor(e.target.value)}
                                                            className="flex-1"
                                                            placeholder="#1E293B"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Data Label Font Size */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">
                                                        Cỡ chữ nhãn
                                                    </label>
                                                    <Select
                                                        value={dataLabelFontSize.toString()}
                                                        onValueChange={(v) => v && setDataLabelFontSize(parseInt(v))}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue>
                                                                {dataLabelFontSize === 8 ? "8px (Rất nhỏ)" : dataLabelFontSize === 10 ? "10px (Mặc định)" : dataLabelFontSize === 12 ? "12px (Vừa)" : dataLabelFontSize === 14 ? "14px (Lớn)" : dataLabelFontSize === 16 ? "16px (Rất lớn)" : ""}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="8">8px (Rất nhỏ)</SelectItem>
                                                            <SelectItem value="10">10px (Mặc định)</SelectItem>
                                                            <SelectItem value="12">12px (Vừa)</SelectItem>
                                                            <SelectItem value="14">14px (Lớn)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Color Palette Preview */}
                                <div>
                                    <label className="text-sm font-semibold text-[#0F172A] mb-3 block">
                                        Bảng màu
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                        {defaultChartColors.map((color, index) => (
                                            <div
                                                key={index}
                                                className="w-8 h-8  border border-[#E2E8F0]"
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Panel - Preview */}
                <div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC]">
                    <Card className="h-full mx-auto flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {chartName || "Xem trước biểu đồ"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <div className="w-full h-[500px]">
                                {isLoadingChartData ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 text-[#0052CC] animate-spin" />
                                        <span className="ml-2 text-[#64748B]">Đang tải dữ liệu...</span>
                                    </div>
                                ) : chartDataError ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <p className="text-red-500 mb-2">{chartDataError}</p>
                                        <Button variant="outline" size="sm" onClick={fetchChartData}>
                                            Thử lại
                                        </Button>
                                    </div>
                                ) : aggregatedChartData.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-[#64748B]">
                                        <Database className="h-12 w-12 mb-4 text-[#94A3B8]" />
                                        <p>
                                            {queryMode === 'import'
                                                ? 'Upload file và chọn trục X, Y để xem biểu đồ'
                                                : 'Chọn bảng, trục X và trục Y để xem biểu đồ'}
                                        </p>
                                    </div>
                                ) : (
                                    <InteractiveChart
                                        config={previewConfig}
                                        data={aggregatedChartData}
                                        chartId="preview-chart"
                                        onDrillDown={handlePreviewDrillDown}
                                    />
                                )}
                            </div>

                            {/* Selected Configuration Summary - pushed to bottom */}
                            <div className="mt-auto p-4 bg-[#F8FAFC]  border border-[#E2E8F0]">
                                <h4 className="text-sm font-semibold text-[#0F172A] mb-3">
                                    Cấu hình đã chọn
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-[#64748B]">Nguồn:</span>{" "}
                                        <span className="font-medium text-[#0F172A]">
                                            {queryMode === 'import'
                                                ? (importedFileName || "(chưa upload)")
                                                : (queryMode === 'custom' ? 'Custom SQL' : (selectedTable || "(chưa chọn)"))}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[#64748B]">Loại:</span>{" "}
                                        <span className="font-medium text-[#0F172A] capitalize">
                                            {currentChart.type || "bar"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[#64748B]">Trục X:</span>{" "}
                                        <span className="font-medium text-[#0F172A]">
                                            {queryMode === 'import'
                                                ? (importXAxis || "(chưa chọn)")
                                                : (queryMode === 'custom' ? (customSqlXAxis || "(chưa chọn)") : (selectedXAxis || "(chưa chọn)"))}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[#64748B]">Trục Y:</span>{" "}
                                        <span className="font-medium text-[#0F172A]">
                                            {queryMode === 'import'
                                                ? (importYAxis.length > 0 ? importYAxis.join(", ") : "(chưa chọn)")
                                                : (queryMode === 'custom' ? (customSqlYAxis.length > 0 ? customSqlYAxis.join(", ") : "(chưa chọn)") : (selectedYAxis.length > 0 ? selectedYAxis.join(", ") : "(chưa chọn)"))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}


export default function ChartDesignerPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="h-8 w-8 text-[#0052CC] animate-spin" />
            </div>
        }>
            <ChartBuilderContent />
        </Suspense>
    );
}
