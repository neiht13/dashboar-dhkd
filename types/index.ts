// Database Types
export interface TableInfo {
  schema: string;
  name: string;
  rowCount: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: string;
  isPrimaryKey?: boolean;
}

export interface DatabaseSchema {
  tables: TableInfo[];
}

// Chart Types - Extended with new chart types
export type ChartType =
  | 'line'
  | 'bar'
  | 'area'
  | 'pie'
  | 'radar'
  | 'scatter'
  | 'heatmap'
  | 'donut'
  | 'stackedBar'
  | 'horizontalBar'
  | 'composed'
  | 'funnel'
  | 'sizedPie' // Legacy: use pie with pieVariant: 'sized' instead
  | 'map'
  | 'card'
  | 'hexagon'
  | 'statCard'
  | 'gauge';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';

export interface Filter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in';
  value: string | number | string[] | number[];
}

export interface DataSource {
  table: string;
  xAxis: string;
  yAxis: string[];
  groupBy?: string[] | string; // Additional columns to group by (can be array or single string)
  aggregation: AggregationType;
  filters?: Filter[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  dateColumn?: string; // Legacy: Column to apply global date filter on
  startDateColumn?: string; // Column for Start Date filtering
  endDateColumn?: string; // Column for End Date filtering
  queryMode?: 'simple' | 'custom' | 'import';
  customQuery?: string;
  connectionId?: string;
  // Drill-down settings
  drillDownLabelField?: string; // Field to use as X-axis label when drilling down to detail
  // Imported data (for queryMode 'import')
  importedData?: Record<string, unknown>[];
  importedFileName?: string;
  metrics?: StatCardMetric[];
}

// Chart Style Preset Types
export type ChartStylePreset = 'default' | 'glowing' | 'hatched' | 'highlighted';

// Data label unit format types
export type DataLabelFormat = 'full' | 'k' | 'tr' | 'ty';

// Extended Chart Style with new customization options
export interface ChartStyle {
  colors?: string[];
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showGrid?: boolean;
  showTooltip?: boolean;
  showDataLabels?: boolean;
  dataLabelPosition?: 'top' | 'center' | 'bottom';
  dataLabelFormat?: DataLabelFormat; // Unit abbreviation: k=1000, tr=1000000, ty=1000000000
  dataLabelColor?: string; // Custom data label color
  dataLabelFontSize?: number; // Custom data label font size
  tooltipTheme?: 'light' | 'dark'; // Tooltip theme
  tooltipStyle?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    fontSize?: number;
    borderRadius?: number;
    shadow?: boolean;
  };
  xAxisExclude?: string[]; // Values to exclude from X-axis
  composedFieldTypes?: Record<string, 'line' | 'bar'>; // For composed chart: which Y-axis fields are lines vs bars
  yAxisFieldLabels?: Record<string, string>; // Custom display names for Y-axis fields
  yAxisFieldColors?: Record<string, string>; // Custom colors for Y-axis fields
  title?: string;
  titleFontSize?: number;
  titleColor?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  stacked?: boolean;
  horizontal?: boolean;
  innerRadius?: number; // for donut chart (0-100 percentage)
  pieVariant?: 'default' | 'sized' | 'donut' | 'gauge'; // Variant for pie chart
  animation?: boolean;
  gradientFill?: boolean;
  borderRadius?: number;
  preset?: ChartStylePreset; // Style preset for quick styling

  // Card Specific Styles
  cardFontSize?: 'sm' | 'md' | 'lg' | 'xl';
  cardColor?: string;
  cardIcon?: string;
  showCardIcon?: boolean;
  cardBackgroundColor?: string;

  // Map Specific Styles
  mapDisplayMode?: 'heatmap' | 'category' | 'value';
  mapColorScheme?: 'default' | 'blues' | 'greens' | 'reds' | 'purples';
}

export interface ChartConfig {
  id?: string;
  name: string;
  type: ChartType;
  dataSource?: DataSource;
  style?: ChartStyle;
  colors?: string[]; // Quick color override
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

export interface GlobalFilterState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  resolution: 'day' | 'month' | 'year';
}

// Dashboard Types
export interface LayoutItem {
  i: string;       // widget id
  x: number;       // 0-11 (12 columns)
  y: number;       // row position
  w: number;       // width in columns (1-12)
  h: number;       // height in rows
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export type WidgetType = 'chart' | 'kpi' | 'table' | 'text' | 'stats' | 'image' | 'iframe';

export interface KPIConfig {
  table: string;
  field: string;
  aggregation: AggregationType;
  title: string;
  format?: 'number' | 'currency' | 'percent';
  compareWithPrevious?: boolean;
  color?: string;
  icon?: string;
}

export interface TableWidgetConfig {
  table: string;
  columns: string[];
  pageSize?: number;
  showPagination?: boolean;
}

export interface TextWidgetConfig {
  content: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
}

export interface Widget {
  id: string;
  type: WidgetType;
  config: ChartConfig | KPIConfig | TableWidgetConfig | TextWidgetConfig;
  layout: LayoutItem;
}

export interface DashboardTab {
  id: string;
  name: string;
  widgets: Widget[];
  layout: LayoutItem[];
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  layout: LayoutItem[];
  tabs?: DashboardTab[];
  activeTabId?: string;
  layoutMode?: 'full' | 'box'; // full = 100% width, box = 85% width with margins
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// User Types
// StatCard Types
export interface StatCardMetric {
  label: string;
  value: string | number;
  type?: 'number' | 'percent' | 'sparkline' | 'donut' | 'gauge';
  chartData?: number[]; // For sparkline
  progress?: number; // For donut/gauge (0-100)
  color?: string;
  // Enhanced design fields
  change?: string; // e.g. "+20%"
  changeValue?: string; // e.g. "($2,423)" or absolute change
  isPositive?: boolean; // For trend color (green/red)
  icon?: string; // Lucide icon name specific to this metric
  description?: string; // Additional text like "vs Last Month"
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'editor' | 'viewer' | 'user';
  createdAt: Date;
}
