"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Save,
    ArrowLeft,
    BarChart3,
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
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
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
import { useChartStore } from "@/stores/chart-store";
import type { ChartType, ChartConfig, AggregationType } from "@/types";
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

const chartTypes: { type: ChartType; label: string; icon: React.ReactNode }[] = [
    { type: "bar", label: "Cột", icon: <BarChart3 className="h-5 w-5" /> },
    { type: "stackedBar", label: "Cột chồng", icon: <Layers className="h-5 w-5" /> },
    { type: "horizontalBar", label: "Cột ngang", icon: <ArrowRightLeft className="h-5 w-5" /> },
    { type: "line", label: "Đường", icon: <LineChart className="h-5 w-5" /> },
    { type: "area", label: "Vùng", icon: <Activity className="h-5 w-5" /> },
    { type: "pie", label: "Tròn", icon: <PieChart className="h-5 w-5" /> },
    { type: "donut", label: "Donut", icon: <CircleDot className="h-5 w-5" /> },
    { type: "sizedPie", label: "Tròn (Size)", icon: <PieChart className="h-5 w-5 scale-75" /> },
    { type: "radar", label: "Radar", icon: <Radar className="h-5 w-5" /> },
    { type: "composed", label: "Kết hợp", icon: <GitMerge className="h-5 w-5" /> },
    { type: "funnel", label: "Phễu", icon: <Filter className="h-5 w-5" /> },
    { type: "map", label: "Bản đồ", icon: <Map className="h-5 w-5" /> },
    { type: "card", label: "Thẻ số", icon: <CreditCard className="h-5 w-5" /> },
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

                        // Restore Custom SQL Mode
                        if (existingChart.dataSource.queryMode === 'custom') {
                            setQueryMode('custom');
                            setCustomSql(existingChart.dataSource.customQuery || '');
                            setCustomSqlXAxis(existingChart.dataSource.xAxis || '');
                            setCustomSqlYAxis(existingChart.dataSource.yAxis || []);
                        } else {
                            setQueryMode('simple');
                        }

                        // Handle Date Columns
                        setSelectedDateColumn(existingChart.dataSource.dateColumn || '');
                        setStartDateColumn(existingChart.dataSource.startDateColumn || existingChart.dataSource.dateColumn || '');
                        setEndDateColumn(existingChart.dataSource.endDateColumn || existingChart.dataSource.dateColumn || '');

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
                        if (existingChart.style.cardBackgroundColor) setCardBackgroundColor(existingChart.style.cardBackgroundColor);
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

    const handleSaveChart = () => {
        // DEBUG: Log values used for filter construction
        console.log('[handleSaveChart] startDateColumn:', startDateColumn);
        console.log('[handleSaveChart] endDateColumn:', endDateColumn);
        console.log('[handleSaveChart] selectedDateColumn:', selectedDateColumn);
        console.log('[handleSaveChart] filterFromDate:', filterFromDate);
        console.log('[handleSaveChart] filterToDate:', filterToDate);

        const chartConfig: ChartConfig = {
            id: editChartId || generateId(), // ID is reused if editing
            name: chartName || "Biểu đồ chưa đặt tên",
            type: currentChart.type || "bar",
            dataSource: {
                queryMode,
                customQuery: queryMode === 'custom' ? customSql : undefined,
                table: queryMode === 'custom' ? (selectedTable || 'custom_query') : selectedTable,
                xAxis: queryMode === 'custom' ? customSqlXAxis : selectedXAxis,
                yAxis: queryMode === 'custom' ? customSqlYAxis : selectedYAxis,
                aggregation,
                groupBy: groupBy.length > 0 ? groupBy : undefined,
                orderBy: orderBy || undefined,
                orderDirection: orderBy ? orderDirection : undefined,
                limit: limit > 0 ? limit : undefined,
                // Removed duplicate properties
                dateColumn: startDateColumn || selectedDateColumn, // Fallback to legacy
                startDateColumn,
                endDateColumn,
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
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // saveChart handles both add and update logic based on ID existence
        saveChart(chartConfig);

        toast.success(editChartId ? "Đã cập nhật biểu đồ" : "Đã lưu biểu đồ mới");

        router.push("/charts");
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

    // Filter values
    const [filterFromDate, setFilterFromDate] = useState<string>("");
    const [filterToDate, setFilterToDate] = useState<string>("");

    // Chart data
    const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
    const [isLoadingChartData, setIsLoadingChartData] = useState(false);
    const [chartDataError, setChartDataError] = useState<string | null>(null);

    // Custom SQL Mode
    const [queryMode, setQueryMode] = useState<"simple" | "custom">("simple");
    const [customSql, setCustomSql] = useState<string>("");
    const [customSqlXAxis, setCustomSqlXAxis] = useState<string>("");
    const [customSqlYAxis, setCustomSqlYAxis] = useState<string[]>([]);
    const [customSqlColumns, setCustomSqlColumns] = useState<string[]>([]);

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

    // Card styling state
    const [cardFontSize, setCardFontSize] = useState<"sm" | "md" | "lg" | "xl">("lg");
    const [cardColor, setCardColor] = useState<string>(""); // Empty for gradient default
    const [cardIcon, setCardIcon] = useState<string>("");
    const [showCardIcon, setShowCardIcon] = useState(true);
    const [cardBackgroundColor, setCardBackgroundColor] = useState<string>("");

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
    // Fetch chart data when configuration changes
    useEffect(() => {
        if (queryMode === 'simple') {
            const isCard = currentChart.type === 'card';
            // For card type, we don't need X axis
            if (selectedTable && (isCard || selectedXAxis) && selectedYAxis.length > 0) {
                fetchChartData();
            }
        }
    }, [queryMode, selectedTable, selectedXAxis, selectedYAxis, aggregation, orderBy, orderDirection, filterFromDate, filterToDate, startDateColumn, endDateColumn, currentChart.type]);

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
                setChartData(result.data);
                console.log('Chart data loaded:', result.data.length, 'rows');
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
        // Default orderBy to xAxis
        if (!orderBy) setOrderBy(xAxis);
        updateDataSource({ xAxis });
    };



    const handleYAxisToggle = (field: string) => {
        const newYAxis = selectedYAxis.includes(field)
            ? selectedYAxis.filter((f) => f !== field)
            : [...selectedYAxis, field];
        setSelectedYAxis(newYAxis);
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

    // --- Aggregation Logic for Custom SQL ---
    const aggregatedChartData = React.useMemo(() => {
        // Only apply if in Custom SQL mode (implied by customSql columns usage) 
        // AND we have X axis and Y axis selected.
        if (queryMode === 'custom' && customSqlXAxis && customSqlYAxis.length > 0 && aggregation) {
            return aggregateData(chartData, customSqlXAxis, customSqlYAxis, aggregation);
        }
        return chartData;
    }, [chartData, queryMode, customSqlXAxis, customSqlYAxis, aggregation]);

    // Build preview config
    const previewConfig: ChartConfig = {
        id: "preview",
        name: chartName || "Xem trước",
        type: currentChart.type || "bar",
        dataSource: {
            queryMode,
            customQuery: queryMode === 'custom' ? customSql : undefined,
            table: selectedTable || '',
            xAxis: queryMode === 'custom' ? customSqlXAxis : (selectedXAxis || "thang"),
            yAxis: queryMode === 'custom' ? customSqlYAxis : (selectedYAxis.length > 0 ? selectedYAxis : ["ptm"]),
            aggregation,
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
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Quay lại
                        </Button>
                        <Button size="sm" onClick={handleSaveChart} className="gap-2">
                            <Save className="h-4 w-4" />
                            Lưu biểu đồ
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Configuration */}
                <div className="w-125 flex-shrink-0 bg-white border-r border-[#E2E8F0] overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex border-b border-[#E2E8F0]">
                        <button
                            onClick={() => setActiveTab("data")}
                            className={cn(
                                "flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                                activeTab === "data"
                                    ? "text-[#0052CC] border-b-2 border-[#0052CC]"
                                    : "text-[#64748B] hover:text-[#0F172A]"
                            )}
                        >
                            <Database className="h-4 w-4" />
                            Dữ liệu
                        </button>
                        <button
                            onClick={() => setActiveTab("style")}
                            className={cn(
                                "flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                                activeTab === "style"
                                    ? "text-[#0052CC] border-b-2 border-[#0052CC]"
                                    : "text-[#64748B] hover:text-[#0F172A]"
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
                                    <label className="text-sm font-semibold text-[#0F172A] mb-3 block">
                                        Loại biểu đồ
                                    </label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {chartTypes.map(({ type, label, icon }) => (
                                            <button
                                                key={type}
                                                onClick={() => updateChartType(type)}
                                                title={label}
                                                className={cn(
                                                    "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                                                    currentChart.type === type
                                                        ? "border-[#0052CC] bg-[#0052CC]/5 text-[#0052CC]"
                                                        : "border-[#E2E8F0] hover:border-[#0052CC]/50 text-[#64748B]"
                                                )}
                                            >
                                                {icon}
                                                <span className="text-[10px] font-medium truncate w-full text-center">{label}</span>
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

                                    {/* Query Mode Toggle */}
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            onClick={() => setQueryMode("simple")}
                                            className={cn(
                                                "flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-all",
                                                queryMode === "simple"
                                                    ? "bg-[#0052CC] text-white border-[#0052CC]"
                                                    : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#0052CC]"
                                            )}
                                        >
                                            <Baseline className="mr-2" /> Chế độ đơn giản
                                        </button>
                                        <button
                                            onClick={() => setQueryMode("custom")}
                                            className={cn(
                                                "flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-all",
                                                queryMode === "custom"
                                                    ? "bg-[#0052CC] text-white border-[#0052CC]"
                                                    : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#0052CC]"
                                            )}
                                        >
                                            <Code className="mr-2" /> SQL tùy chỉnh
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Database Connection Selector - shown in both modes */}
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
                                                                    if (!customSqlXAxis) setCustomSqlXAxis(result.columns[0]);
                                                                    if (customSqlYAxis.length === 0 && result.columns.length > 1) {
                                                                        setCustomSqlYAxis(result.columns.slice(1).filter((c: string) =>
                                                                            !['THANG', 'NAM', 'thang', 'nam', 'Ma_DV', 'ma_dv', 'loaitb_id'].some(skip => c.toLowerCase().includes(skip.toLowerCase()))
                                                                        ));
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
                                                                onValueChange={(value) => setCustomSqlXAxis(value || "")}
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
                                                                                    setCustomSqlYAxis([...customSqlYAxis, col]);
                                                                                } else {
                                                                                    setCustomSqlYAxis(customSqlYAxis.filter(c => c !== col));
                                                                                }
                                                                            }}
                                                                        />
                                                                        {col}
                                                                    </label>
                                                                ))}
                                                            </div>
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
                                                        showGrid ? "right-1" : "left-1"
                                                    )}
                                                />
                                            </button>
                                        </div>

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
                                                    Tùy chỉnh thẻ số
                                                </label>

                                                {/* Font Size */}
                                                <div>
                                                    <label className="text-xs text-[#64748B] mb-1 block">Kích thước chữ</label>
                                                    <Select
                                                        value={cardFontSize}
                                                        onValueChange={(v: any) => setCardFontSize(v)}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue>
                                                                {cardFontSize === 'sm' ? "Nhỏ" :
                                                                    cardFontSize === 'md' ? "Trung bình" :
                                                                        cardFontSize === 'lg' ? "Lớn" :
                                                                            cardFontSize === 'xl' ? "Rất lớn" : "Chọn kích thước"}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="sm">Nhỏ</SelectItem>
                                                            <SelectItem value="md">Trung bình</SelectItem>
                                                            <SelectItem value="lg">Lớn</SelectItem>
                                                            <SelectItem value="xl">Rất lớn</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Colors */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-[#64748B] mb-1 block">Màu chữ</label>
                                                        <div className="flex items-center gap-2">
                                                            <ColorPicker value={cardColor || '#000000'} onChange={setCardColor} />
                                                            <span className="text-xs text-[#64748B]">{cardColor ? cardColor : 'Mặc định'}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-[#64748B] mb-1 block">Màu nền card</label>
                                                        <div className="flex items-center gap-2">
                                                            <ColorPicker value={cardBackgroundColor || '#FFFFFF'} onChange={setCardBackgroundColor} />
                                                            <span className="text-xs text-[#64748B]">{cardBackgroundColor ? cardBackgroundColor : 'Trống'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Icon */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="text-xs text-[#64748B]">Icon (Lucide name)</label>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-[#64748B]">Hiển thị</span>
                                                            <Checkbox
                                                                checked={showCardIcon}
                                                                onCheckedChange={(checked) => setShowCardIcon(checked as boolean)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <Input
                                                        value={cardIcon}
                                                        onChange={(e) => setCardIcon(e.target.value)}
                                                        placeholder="VD: TrendingUp, Users, DollarSign..."
                                                        className="h-8 text-sm"
                                                        disabled={!showCardIcon}
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Nhập tên icon từ thư viện Lucide React
                                                    </p>
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
                                                className="w-8 h-8 rounded-lg border border-[#E2E8F0]"
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
                                ) : chartData.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-[#64748B]">
                                        <Database className="h-12 w-12 mb-4 text-[#94A3B8]" />
                                        <p>Chọn bảng, trục X và trục Y để xem biểu đồ</p>
                                    </div>
                                ) : (
                                    <DynamicChart config={previewConfig} data={aggregatedChartData} />
                                )}
                            </div>

                            {/* Selected Configuration Summary - pushed to bottom */}
                            <div className="mt-auto p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                                <h4 className="text-sm font-semibold text-[#0F172A] mb-3">
                                    Cấu hình đã chọn
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-[#64748B]">Bảng:</span>{" "}
                                        <span className="font-medium text-[#0F172A]">
                                            {selectedTable || "(chưa chọn)"}
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
                                            {selectedXAxis || "(chưa chọn)"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[#64748B]">Trục Y:</span>{" "}
                                        <span className="font-medium text-[#0F172A]">
                                            {selectedYAxis.length > 0 ? selectedYAxis.join(", ") : "(chưa chọn)"}
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
