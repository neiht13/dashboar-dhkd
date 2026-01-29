/**
 * Anomaly Detection algorithms for chart data
 */

import { mean, standardDeviation, interquartileRange } from "./statistics";

export interface AnomalyPoint {
    index: number;
    value: number;
    score: number;
    isAnomaly: boolean;
    type: "high" | "low" | "normal";
    reason?: string;
}

export interface AnomalyResult {
    anomalies: AnomalyPoint[];
    method: string;
    threshold: number;
    stats: {
        mean: number;
        std: number;
        anomalyCount: number;
        anomalyRate: number;
    };
}

export type AnomalyMethod = "zscore" | "iqr" | "threshold" | "mad";

/**
 * Z-Score based anomaly detection
 * Points with |z-score| > threshold are considered anomalies
 */
export function detectAnomaliesZScore(
    values: number[],
    threshold: number = 2.5
): AnomalyResult {
    const avg = mean(values);
    const std = standardDeviation(values);

    const anomalies: AnomalyPoint[] = values.map((value, index) => {
        const zScore = std === 0 ? 0 : (value - avg) / std;
        const isAnomaly = Math.abs(zScore) > threshold;

        return {
            index,
            value,
            score: Math.abs(zScore),
            isAnomaly,
            type: zScore > threshold ? "high" : zScore < -threshold ? "low" : "normal",
            reason: isAnomaly
                ? `Z-score: ${zScore.toFixed(2)} (${zScore > 0 ? "cao" : "thấp"} hơn ${threshold}σ)`
                : undefined,
        };
    });

    const anomalyCount = anomalies.filter(a => a.isAnomaly).length;

    return {
        anomalies,
        method: "zscore",
        threshold,
        stats: {
            mean: avg,
            std,
            anomalyCount,
            anomalyRate: values.length > 0 ? anomalyCount / values.length : 0,
        },
    };
}

/**
 * IQR (Interquartile Range) based anomaly detection
 * Points outside [Q1 - k*IQR, Q3 + k*IQR] are considered anomalies
 */
export function detectAnomaliesIQR(
    values: number[],
    k: number = 1.5
): AnomalyResult {
    const { q1, q3, iqr } = interquartileRange(values);
    const lowerBound = q1 - k * iqr;
    const upperBound = q3 + k * iqr;
    const avg = mean(values);
    const std = standardDeviation(values);

    const anomalies: AnomalyPoint[] = values.map((value, index) => {
        const isAnomaly = value < lowerBound || value > upperBound;
        const distance = value < lowerBound
            ? lowerBound - value
            : value > upperBound
                ? value - upperBound
                : 0;
        const score = iqr > 0 ? distance / iqr : 0;

        return {
            index,
            value,
            score,
            isAnomaly,
            type: value > upperBound ? "high" : value < lowerBound ? "low" : "normal",
            reason: isAnomaly
                ? `Ngoài khoảng [${lowerBound.toFixed(1)}, ${upperBound.toFixed(1)}]`
                : undefined,
        };
    });

    const anomalyCount = anomalies.filter(a => a.isAnomaly).length;

    return {
        anomalies,
        method: "iqr",
        threshold: k,
        stats: {
            mean: avg,
            std,
            anomalyCount,
            anomalyRate: values.length > 0 ? anomalyCount / values.length : 0,
        },
    };
}

/**
 * Simple threshold based anomaly detection
 */
export function detectAnomaliesThreshold(
    values: number[],
    lowerThreshold: number,
    upperThreshold: number
): AnomalyResult {
    const avg = mean(values);
    const std = standardDeviation(values);

    const anomalies: AnomalyPoint[] = values.map((value, index) => {
        const isAnomaly = value < lowerThreshold || value > upperThreshold;
        const distance = value < lowerThreshold
            ? lowerThreshold - value
            : value > upperThreshold
                ? value - upperThreshold
                : 0;
        const range = upperThreshold - lowerThreshold;
        const score = range > 0 ? distance / range : 0;

        return {
            index,
            value,
            score,
            isAnomaly,
            type: value > upperThreshold ? "high" : value < lowerThreshold ? "low" : "normal",
            reason: isAnomaly
                ? value > upperThreshold
                    ? `Vượt ngưỡng trên (${upperThreshold})`
                    : `Dưới ngưỡng dưới (${lowerThreshold})`
                : undefined,
        };
    });

    const anomalyCount = anomalies.filter(a => a.isAnomaly).length;

    return {
        anomalies,
        method: "threshold",
        threshold: upperThreshold,
        stats: {
            mean: avg,
            std,
            anomalyCount,
            anomalyRate: values.length > 0 ? anomalyCount / values.length : 0,
        },
    };
}

/**
 * MAD (Median Absolute Deviation) based anomaly detection
 * More robust than Z-score for non-normal distributions
 */
export function detectAnomaliesMAD(
    values: number[],
    threshold: number = 3.5
): AnomalyResult {
    const sortedValues = [...values].sort((a, b) => a - b);
    const medianValue = sortedValues.length % 2 === 0
        ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
        : sortedValues[Math.floor(sortedValues.length / 2)];

    const deviations = values.map(v => Math.abs(v - medianValue));
    const sortedDeviations = [...deviations].sort((a, b) => a - b);
    const mad = sortedDeviations.length % 2 === 0
        ? (sortedDeviations[sortedDeviations.length / 2 - 1] + sortedDeviations[sortedDeviations.length / 2]) / 2
        : sortedDeviations[Math.floor(sortedDeviations.length / 2)];

    // Modified Z-score using MAD
    const k = 1.4826; // Consistency constant for normal distribution
    const avg = mean(values);
    const std = standardDeviation(values);

    const anomalies: AnomalyPoint[] = values.map((value, index) => {
        const modifiedZScore = mad === 0 ? 0 : (0.6745 * (value - medianValue)) / (k * mad);
        const isAnomaly = Math.abs(modifiedZScore) > threshold;

        return {
            index,
            value,
            score: Math.abs(modifiedZScore),
            isAnomaly,
            type: modifiedZScore > threshold ? "high" : modifiedZScore < -threshold ? "low" : "normal",
            reason: isAnomaly
                ? `Modified Z-score: ${modifiedZScore.toFixed(2)}`
                : undefined,
        };
    });

    const anomalyCount = anomalies.filter(a => a.isAnomaly).length;

    return {
        anomalies,
        method: "mad",
        threshold,
        stats: {
            mean: avg,
            std,
            anomalyCount,
            anomalyRate: values.length > 0 ? anomalyCount / values.length : 0,
        },
    };
}

/**
 * Unified anomaly detection function
 */
export function detectAnomalies(
    values: number[],
    options: {
        method: AnomalyMethod;
        threshold?: number;
        lowerThreshold?: number;
        upperThreshold?: number;
    }
): AnomalyResult {
    const { method, threshold = 2.5, lowerThreshold, upperThreshold } = options;

    switch (method) {
        case "zscore":
            return detectAnomaliesZScore(values, threshold);
        case "iqr":
            return detectAnomaliesIQR(values, threshold);
        case "threshold":
            if (lowerThreshold !== undefined && upperThreshold !== undefined) {
                return detectAnomaliesThreshold(values, lowerThreshold, upperThreshold);
            }
            // Fall back to IQR-based thresholds
            const { q1, q3, iqr } = interquartileRange(values);
            return detectAnomaliesThreshold(
                values,
                lowerThreshold ?? q1 - 1.5 * iqr,
                upperThreshold ?? q3 + 1.5 * iqr
            );
        case "mad":
            return detectAnomaliesMAD(values, threshold);
        default:
            return detectAnomaliesZScore(values, threshold);
    }
}

/**
 * Get anomaly highlight color based on type
 */
export function getAnomalyColor(type: "high" | "low" | "normal"): string {
    switch (type) {
        case "high":
            return "#ef4444"; // Red
        case "low":
            return "#3b82f6"; // Blue
        default:
            return "transparent";
    }
}

/**
 * Check if a specific value is an anomaly
 */
export function isAnomaly(
    value: number,
    values: number[],
    method: AnomalyMethod = "zscore",
    threshold: number = 2.5
): boolean {
    const result = detectAnomalies(values, { method, threshold });
    const index = values.indexOf(value);
    if (index === -1) return false;
    return result.anomalies[index]?.isAnomaly || false;
}
