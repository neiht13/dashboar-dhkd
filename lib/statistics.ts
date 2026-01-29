/**
 * Statistical functions for chart data analysis and forecasting
 */

export interface DataPoint {
    x: number | string;
    y: number;
    [key: string]: unknown;
}

export interface ForecastResult {
    predictions: DataPoint[];
    trend: "up" | "down" | "stable";
    confidence: number;
    method: string;
}

export interface RegressionResult {
    slope: number;
    intercept: number;
    rSquared: number;
    predict: (x: number) => number;
}

/**
 * Calculate mean of an array of numbers
 */
export function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(mean(squareDiffs));
}

/**
 * Calculate variance
 */
export function variance(values: number[]): number {
    const std = standardDeviation(values);
    return std * std;
}

/**
 * Calculate median
 */
export function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate percentile
 */
export function percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Calculate IQR (Interquartile Range)
 */
export function interquartileRange(values: number[]): { q1: number; q3: number; iqr: number } {
    const q1 = percentile(values, 25);
    const q3 = percentile(values, 75);
    return { q1, q3, iqr: q3 - q1 };
}

/**
 * Linear regression
 */
export function linearRegression(xValues: number[], yValues: number[]): RegressionResult {
    if (xValues.length !== yValues.length || xValues.length < 2) {
        return {
            slope: 0,
            intercept: mean(yValues),
            rSquared: 0,
            predict: (x: number) => mean(yValues),
        };
    }

    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) {
        return {
            slope: 0,
            intercept: mean(yValues),
            rSquared: 0,
            predict: (x: number) => mean(yValues),
        };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = mean(yValues);
    const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = yValues.reduce((sum, y, i) => {
        const predicted = slope * xValues[i] + intercept;
        return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = ssTotal === 0 ? 1 : 1 - ssResidual / ssTotal;

    return {
        slope,
        intercept,
        rSquared: Math.max(0, Math.min(1, rSquared)),
        predict: (x: number) => slope * x + intercept,
    };
}

/**
 * Simple Moving Average
 */
export function movingAverage(values: number[], window: number): number[] {
    if (values.length < window) return values;

    const result: number[] = [];
    for (let i = window - 1; i < values.length; i++) {
        const windowValues = values.slice(i - window + 1, i + 1);
        result.push(mean(windowValues));
    }
    return result;
}

/**
 * Exponential Moving Average
 */
export function exponentialMovingAverage(values: number[], alpha: number = 0.3): number[] {
    if (values.length === 0) return [];

    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
        result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
}

/**
 * Simple Exponential Smoothing forecast
 */
export function exponentialSmoothingForecast(
    values: number[],
    periods: number,
    alpha: number = 0.3
): number[] {
    if (values.length === 0) return [];

    const ema = exponentialMovingAverage(values, alpha);
    const lastValue = ema[ema.length - 1];

    // Simple forecast: use the last smoothed value
    return Array(periods).fill(lastValue);
}

/**
 * Linear regression forecast
 */
export function linearForecast(
    data: DataPoint[],
    periods: number
): ForecastResult {
    const yValues = data.map(d => d.y);
    const xValues = data.map((_, i) => i);

    const regression = linearRegression(xValues, yValues);
    const lastX = xValues.length - 1;

    const predictions: DataPoint[] = [];
    for (let i = 1; i <= periods; i++) {
        const futureX = lastX + i;
        const predictedY = regression.predict(futureX);
        predictions.push({
            x: `Forecast ${i}`,
            y: predictedY,
            isForecast: true,
        });
    }

    // Determine trend
    let trend: "up" | "down" | "stable" = "stable";
    if (regression.slope > 0.01) trend = "up";
    else if (regression.slope < -0.01) trend = "down";

    return {
        predictions,
        trend,
        confidence: regression.rSquared,
        method: "linear",
    };
}

/**
 * Moving Average forecast
 */
export function movingAverageForecast(
    data: DataPoint[],
    periods: number,
    window: number = 3
): ForecastResult {
    const yValues = data.map(d => d.y);
    const ma = movingAverage(yValues, Math.min(window, yValues.length));
    const lastMA = ma.length > 0 ? ma[ma.length - 1] : mean(yValues);

    const predictions: DataPoint[] = [];
    for (let i = 1; i <= periods; i++) {
        predictions.push({
            x: `Forecast ${i}`,
            y: lastMA,
            isForecast: true,
        });
    }

    // Determine trend from recent values
    const recentValues = yValues.slice(-Math.min(5, yValues.length));
    const recentMean = mean(recentValues);
    const previousMean = mean(yValues.slice(0, -Math.min(5, yValues.length)));

    let trend: "up" | "down" | "stable" = "stable";
    const diff = recentMean - previousMean;
    if (diff > recentMean * 0.05) trend = "up";
    else if (diff < -recentMean * 0.05) trend = "down";

    return {
        predictions,
        trend,
        confidence: 0.5, // Moving average has moderate confidence
        method: "moving_average",
    };
}

/**
 * Exponential Smoothing forecast
 */
export function exponentialForecast(
    data: DataPoint[],
    periods: number,
    alpha: number = 0.3
): ForecastResult {
    const yValues = data.map(d => d.y);
    const forecasted = exponentialSmoothingForecast(yValues, periods, alpha);

    const predictions: DataPoint[] = forecasted.map((y, i) => ({
        x: `Forecast ${i + 1}`,
        y,
        isForecast: true,
    }));

    // Calculate confidence based on recent error
    const ema = exponentialMovingAverage(yValues, alpha);
    const errors = yValues.slice(1).map((y, i) => Math.abs(y - ema[i]));
    const avgError = mean(errors);
    const avgValue = mean(yValues);
    const confidence = avgValue > 0 ? Math.max(0, 1 - avgError / avgValue) : 0.5;

    // Determine trend
    const lastValues = ema.slice(-3);
    let trend: "up" | "down" | "stable" = "stable";
    if (lastValues.length >= 2) {
        const diff = lastValues[lastValues.length - 1] - lastValues[0];
        if (diff > lastValues[0] * 0.02) trend = "up";
        else if (diff < -lastValues[0] * 0.02) trend = "down";
    }

    return {
        predictions,
        trend,
        confidence,
        method: "exponential",
    };
}

/**
 * Generate forecast based on method
 */
export function forecast(
    data: DataPoint[],
    options: {
        periods: number;
        method: "linear" | "exponential" | "moving_average";
        window?: number;
        alpha?: number;
    }
): ForecastResult {
    const { periods, method, window = 3, alpha = 0.3 } = options;

    switch (method) {
        case "linear":
            return linearForecast(data, periods);
        case "moving_average":
            return movingAverageForecast(data, periods, window);
        case "exponential":
            return exponentialForecast(data, periods, alpha);
        default:
            return linearForecast(data, periods);
    }
}

/**
 * Calculate confidence interval for forecast
 */
export function calculateConfidenceInterval(
    data: DataPoint[],
    predictions: DataPoint[],
    confidenceLevel: number = 0.95
): Array<{ lower: number; upper: number }> {
    const yValues = data.map(d => d.y);
    const std = standardDeviation(yValues);

    // Z-score for confidence level (1.96 for 95%)
    const zScore = confidenceLevel === 0.95 ? 1.96 :
        confidenceLevel === 0.99 ? 2.576 :
            confidenceLevel === 0.90 ? 1.645 : 1.96;

    return predictions.map((p, i) => {
        // Widen interval for further predictions
        const widthFactor = 1 + i * 0.1;
        const margin = zScore * std * widthFactor;
        return {
            lower: p.y - margin,
            upper: p.y + margin,
        };
    });
}
