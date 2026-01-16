import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDataSource {
    table: string;
    xAxis: string;
    yAxis: string[];
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    filters?: Record<string, unknown>[];
    groupBy?: string;
    orderBy?: string;
    limit?: number;
}

export interface IChartStyle {
    colors: string[];
    showLegend: boolean;
    legendPosition?: 'top' | 'bottom' | 'left' | 'right';
    showGrid: boolean;
    showTooltip: boolean;
    showDataLabels?: boolean;
    dataLabelPosition?: 'inside' | 'outside' | 'center';
    title?: string;
    titleFontSize?: number;
    titleColor?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    stacked?: boolean;
    horizontal?: boolean;
    innerRadius?: number;
    animation?: boolean;
    gradientFill?: boolean;
    borderRadius?: number;
}

export interface IChart extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    type: 'line' | 'bar' | 'area' | 'pie' | 'radar' | 'scatter' | 'heatmap' | 'donut' | 'stackedBar' | 'horizontalBar' | 'composed' | 'funnel';
    dataSource: IDataSource;
    style: IChartStyle;
    ownerId: mongoose.Types.ObjectId;
    isTemplate: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const DataSourceSchema = new Schema({
    table: { type: String, required: true },
    xAxis: { type: String, required: true },
    yAxis: [{ type: String, required: true }],
    aggregation: {
        type: String,
        enum: ['sum', 'avg', 'count', 'min', 'max'],
        default: 'sum'
    },
    filters: [{ type: Schema.Types.Mixed }],
    groupBy: { type: String },
    orderBy: { type: String },
    limit: { type: Number, default: 50 },
}, { _id: false });

const ChartStyleSchema = new Schema({
    colors: [{ type: String }],
    showLegend: { type: Boolean, default: true },
    legendPosition: { type: String, enum: ['top', 'bottom', 'left', 'right'] },
    showGrid: { type: Boolean, default: true },
    showTooltip: { type: Boolean, default: true },
    showDataLabels: { type: Boolean },
    dataLabelPosition: { type: String, enum: ['inside', 'outside', 'center'] },
    title: { type: String },
    titleFontSize: { type: Number },
    titleColor: { type: String },
    xAxisLabel: { type: String },
    yAxisLabel: { type: String },
    stacked: { type: Boolean },
    horizontal: { type: Boolean },
    innerRadius: { type: Number },
    animation: { type: Boolean, default: true },
    gradientFill: { type: Boolean },
    borderRadius: { type: Number },
}, { _id: false });

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
            enum: ['line', 'bar', 'area', 'pie', 'radar', 'scatter', 'heatmap', 'donut', 'stackedBar', 'horizontalBar', 'composed', 'funnel'],
            required: true,
        },
        dataSource: {
            type: DataSourceSchema,
            required: true,
        },
        style: {
            type: ChartStyleSchema,
            required: true,
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
    }
);

ChartSchema.index({ ownerId: 1, createdAt: -1 });
ChartSchema.index({ name: 'text' });

const Chart: Model<IChart> = mongoose.models.Chart || mongoose.model<IChart>('Chart', ChartSchema);

export default Chart;
