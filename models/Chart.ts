import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFilter {
    field: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in';
    value: string | number | string[] | number[];
}

export interface IDataSource {
    table: string;
    xAxis?: string;
    yAxis: string[];
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    filters?: IFilter[];
    groupBy?: string | string[];
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
    // Query mode
    queryMode?: 'simple' | 'custom' | 'import';
    customQuery?: string;
    // Date columns
    dateColumn?: string;
    startDateColumn?: string;
    endDateColumn?: string;
    // Import mode data
    importedData?: Record<string, unknown>[];
    importedFileName?: string;
    // Drill-down
    drillDownLabelField?: string;
    // Connection
    connectionId?: string;
    // Resolution for time-based
    resolution?: 'year' | 'month' | 'day';
}

export interface IChartStyle {
    colors?: string[];
    showLegend?: boolean;
    legendPosition?: 'top' | 'bottom' | 'left' | 'right';
    showGrid?: boolean;
    showTooltip?: boolean;
    showDataLabels?: boolean;
    dataLabelPosition?: 'inside' | 'outside' | 'center' | 'top' | 'bottom' | 'left' | 'right';
    dataLabelFormat?: 'number' | 'percent' | 'currency' | 'compact';
    dataLabelColor?: string;
    dataLabelFontSize?: number;
    title?: string;
    titleFontSize?: number;
    titleColor?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    xAxisExclude?: string[];
    stacked?: boolean;
    horizontal?: boolean;
    innerRadius?: number;
    animation?: boolean;
    gradientFill?: boolean;
    borderRadius?: number;
    // Tooltip
    tooltipTheme?: 'default' | 'dark' | 'glass' | 'minimal' | 'gradient';
    // Composed chart field types
    composedFieldTypes?: Record<string, 'bar' | 'line' | 'area'>;
    // Field labels and colors
    yAxisFieldLabels?: Record<string, string>;
    yAxisFieldColors?: Record<string, string>;
    // Card specific
    cardFontSize?: number;
    cardColor?: string;
    cardIcon?: string;
    showCardIcon?: boolean;
    cardBackgroundColor?: string;
}

export interface IChart extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    type: 'line' | 'bar' | 'area' | 'pie' | 'radar' | 'scatter' | 'heatmap' | 'donut' | 'stackedBar' | 'horizontalBar' | 'composed' | 'funnel' | 'card' | 'map';
    dataSource: IDataSource;
    style: IChartStyle;
    ownerId: mongoose.Types.ObjectId;
    isTemplate: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const FilterSchema = new Schema({
    field: { type: String, required: true },
    operator: {
        type: String,
        enum: ['=', '!=', '>', '<', '>=', '<=', 'like', 'in'],
        required: true
    },
    value: { type: Schema.Types.Mixed, required: true },
}, { _id: false });

const DataSourceSchema = new Schema({
    table: { type: String, required: true },
    xAxis: { type: String },
    yAxis: [{ type: String, required: true }],
    aggregation: {
        type: String,
        enum: ['sum', 'avg', 'count', 'min', 'max'],
        default: 'sum'
    },
    filters: [FilterSchema],
    groupBy: { type: Schema.Types.Mixed }, // Can be string or array
    orderBy: { type: String },
    orderDirection: { type: String, enum: ['asc', 'desc'] },
    limit: { type: Number, default: 50 },
    // Query mode
    queryMode: { type: String, enum: ['simple', 'custom', 'import'], default: 'simple' },
    customQuery: { type: String },
    // Date columns
    dateColumn: { type: String },
    startDateColumn: { type: String },
    endDateColumn: { type: String },
    // Import mode data
    importedData: [{ type: Schema.Types.Mixed }],
    importedFileName: { type: String },
    // Drill-down
    drillDownLabelField: { type: String },
    // Connection
    connectionId: { type: String },
    // Resolution
    resolution: { type: String, enum: ['year', 'month', 'day'] },
}, { _id: false, strict: false }); // Allow additional fields

const ChartStyleSchema = new Schema({
    colors: [{ type: String }],
    showLegend: { type: Boolean, default: true },
    legendPosition: { type: String, enum: ['top', 'bottom', 'left', 'right'] },
    showGrid: { type: Boolean, default: true },
    showTooltip: { type: Boolean, default: true },
    showDataLabels: { type: Boolean },
    dataLabelPosition: { type: String, enum: ['inside', 'outside', 'center', 'top', 'bottom', 'left', 'right'] },
    dataLabelFormat: { type: String }, // Allow any format string
    dataLabelColor: { type: String },
    dataLabelFontSize: { type: Number },
    title: { type: String },
    titleFontSize: { type: Number },
    titleColor: { type: String },
    textColor: { type: String },
    gridColor: { type: String },
    xAxisLabel: { type: String },
    yAxisLabel: { type: String },
    xAxisExclude: [{ type: String }],
    stacked: { type: Boolean },
    horizontal: { type: Boolean },
    innerRadius: { type: Number },
    animation: { type: Boolean, default: true },
    gradientFill: { type: Boolean },
    borderRadius: { type: Number },
    // Tooltip
    tooltipTheme: { type: String }, // Allow any theme string
    // Composed chart
    composedFieldTypes: { type: Schema.Types.Mixed },
    // Field customization
    yAxisFieldLabels: { type: Schema.Types.Mixed },
    yAxisFieldColors: { type: Schema.Types.Mixed },
    // Card specific
    cardFontSize: { type: Number },
    cardColor: { type: String },
    cardIcon: { type: String },
    showCardIcon: { type: Boolean },
    cardBackgroundColor: { type: String },
    // StatCard KPI specific
    showGauge: { type: Boolean },
    kpiPlanValue: { type: Number },
    kpiThreshold: { type: Number },
    showStatusBadge: { type: Boolean },
    showCornerAccent: { type: Boolean },
    // DataTileGrid specific
    tileGridColumns: { type: Number },
    tileTargetField: { type: String },
    tileActualField: { type: String },
}, { _id: false, strict: false }); // Allow additional fields

const ChartSchema = new Schema<IChart>(
    {
        name: {
            type: String,
            required: [true, 'Chart name is required'],
            trim: true,
            maxlength: [200, 'Name cannot exceed 200 characters'],
        },
        type: {
            type: String,
            enum: ['line', 'bar', 'area', 'pie', 'radar', 'scatter', 'heatmap', 'donut', 'stackedBar', 'horizontalBar', 'composed', 'funnel', 'card', 'map', 'statCard', 'dataTileGrid', 'gauge', 'treemap', 'waterfall', 'semicircleGauge', 'networkMap', 'hexagon'],
            required: true,
        },
        dataSource: {
            type: DataSourceSchema,
            required: true,
        },
        style: {
            type: ChartStyleSchema,
            default: {},
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        isTemplate: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        strict: false, // Allow additional fields at document level
    }
);

ChartSchema.index({ ownerId: 1, createdAt: -1 });
ChartSchema.index({ name: 'text' });

// Force model refresh in development to handle schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.Chart) {
    delete mongoose.models.Chart;
}

const Chart: Model<IChart> = mongoose.models.Chart || mongoose.model<IChart>('Chart', ChartSchema);

export default Chart;
