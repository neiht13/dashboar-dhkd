import { executeQuery } from "@/lib/db";
import { sanitizeIdentifier } from "@/lib/security/sql-validator";
import { computeNextRunAt, type AlertFrequency, type AlertSchedule } from "@/lib/alerts/utils";

interface AlertCondition {
    field?: string;
    operator: string;
    value: number;
}

interface AlertQueryConfig {
    table: string;
    field: string;
    aggregation?: "sum" | "avg" | "count" | "min" | "max";
    filters?: Array<{ field: string; operator: string; value: unknown }>;
}

interface AlertRecipientsConfig {
    emails?: string[];
    webhookUrl?: string;
    zaloUserIds?: string[];
    zaloWebhookUrl?: string;
}

interface AlertDoc {
    _id?: unknown;
    name: string;
    frequency: AlertFrequency;
    schedule?: AlertSchedule;
    channels?: string[];
    conditionLogic?: "AND" | "OR";
    conditions?: AlertCondition[];
    anomalyConfig?: {
        enabled?: boolean;
        mode?: string;
        threshold?: number;
    };
    query: AlertQueryConfig;
    recipients?: AlertRecipientsConfig;
    connectionId?: { toString(): string } | string;
    lastValue?: number | null;
}

export interface AlertEvaluationResult {
    currentValue: number;
    conditionsMet: boolean;
    conditionResults: Array<{ condition: AlertCondition; met: boolean }>;
    anomalyTriggered: boolean;
    anomalyReason?: string;
    shouldTrigger: boolean;
}

const sanitizeTableReference = (table: string) => {
    const clean = sanitizeIdentifier(table);
    const parts = clean
        .split(".")
        .map((part) => part.replace(/[^\w]/g, ""))
        .filter(Boolean);

    return parts.length > 1 ? parts.map((part) => `[${part}]`).join(".") : `[dbo].[${parts[0]}]`;
};

const sanitizeColumn = (column: string) => `[${sanitizeIdentifier(column).replace(/[^\w]/g, "")}]`;

const buildWhereClause = (
    filters: Array<{ field: string; operator: string; value: unknown }> = []
) => {
    const params: Record<string, unknown> = {};
    const conditions: string[] = [];
    const validOperators = new Set(["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN"]);

    filters.forEach((filter, index) => {
        try {
            const field = sanitizeColumn(filter.field);
            const operator = String(filter.operator || "=").toUpperCase();
            if (!validOperators.has(operator)) return;

            if (operator === "IN" && Array.isArray(filter.value) && filter.value.length > 0) {
                const placeholders = filter.value.map((value, i) => {
                    const key = `filter_${index}_${i}`;
                    params[key] = value;
                    return `@${key}`;
                });
                conditions.push(`${field} IN (${placeholders.join(", ")})`);
                return;
            }

            const key = `filter_${index}`;
            params[key] = filter.value;
            conditions.push(`${field} ${operator} @${key}`);
        } catch {
            // Skip invalid filters safely.
        }
    });

    return {
        clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
        params,
    };
};

export async function readAlertMetricValue(alert: AlertDoc): Promise<number> {
    const aggregation = (alert.query.aggregation || "sum").toUpperCase();
    const aggMap: Record<string, string> = {
        SUM: "SUM",
        AVG: "AVG",
        COUNT: "COUNT",
        MIN: "MIN",
        MAX: "MAX",
    };
    const aggFunction = aggMap[aggregation] || "SUM";

    const tableSql = sanitizeTableReference(alert.query.table);
    const fieldSql = sanitizeColumn(alert.query.field);
    const { clause, params } = buildWhereClause(alert.query.filters || []);

    const sql = `
        SELECT ${aggFunction}(${fieldSql}) AS metric_value
        FROM ${tableSql}
        ${clause}
    `;

    const rows = await executeQuery<{ metric_value: number }>(
        sql,
        params,
        typeof alert.connectionId === "string"
            ? alert.connectionId
            : alert.connectionId?.toString()
    );

    return Number(rows?.[0]?.metric_value ?? 0);
}

const evaluateSingleCondition = (
    currentValue: number,
    condition: AlertCondition,
    previousValue?: number | null
) => {
    const threshold = Number(condition.value ?? 0);
    const operator = String(condition.operator || "gt").toLowerCase();

    switch (operator) {
        case "gt":
            return currentValue > threshold;
        case "gte":
            return currentValue >= threshold;
        case "lt":
            return currentValue < threshold;
        case "lte":
            return currentValue <= threshold;
        case "eq":
            return currentValue === threshold;
        case "neq":
            return currentValue !== threshold;
        case "change_percent": {
            if (previousValue === null || previousValue === undefined || previousValue === 0) {
                return false;
            }
            const percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
            return Math.abs(percentChange) >= threshold;
        }
        default:
            return false;
    }
};

const evaluateAnomaly = (
    currentValue: number,
    previousValue: number | null | undefined,
    anomalyConfig: AlertDoc["anomalyConfig"]
) => {
    if (!anomalyConfig?.enabled || previousValue === null || previousValue === undefined) {
        return { triggered: false as const };
    }

    const threshold = Number(anomalyConfig.threshold || 0);
    if (threshold <= 0 || previousValue === 0) {
        return { triggered: false as const };
    }

    const percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    const mode = anomalyConfig.mode || "drop_percent";

    if (mode === "drop_percent" && percentChange <= -threshold) {
        return {
            triggered: true as const,
            reason: `Drop ${percentChange.toFixed(2)}% <= -${threshold}%`,
        };
    }

    if (mode === "spike_percent" && percentChange >= threshold) {
        return {
            triggered: true as const,
            reason: `Spike ${percentChange.toFixed(2)}% >= ${threshold}%`,
        };
    }

    return { triggered: false as const };
};

export async function evaluateAlert(alert: AlertDoc): Promise<AlertEvaluationResult> {
    const currentValue = await readAlertMetricValue(alert);
    const previousValue = alert.lastValue ?? null;
    const conditions = alert.conditions || [];

    const conditionResults = conditions.map((condition) => ({
        condition,
        met: evaluateSingleCondition(currentValue, condition, previousValue),
    }));

    const logic = alert.conditionLogic || "AND";
    const conditionsMet =
        conditionResults.length === 0
            ? false
            : logic === "OR"
                ? conditionResults.some((result) => result.met)
                : conditionResults.every((result) => result.met);

    const anomaly = evaluateAnomaly(currentValue, previousValue, alert.anomalyConfig);
    const shouldTrigger = conditionsMet || anomaly.triggered;

    return {
        currentValue,
        conditionsMet,
        conditionResults,
        anomalyTriggered: anomaly.triggered,
        anomalyReason: anomaly.triggered ? anomaly.reason : undefined,
        shouldTrigger,
    };
}

export async function sendAlertNotifications(
    alert: AlertDoc,
    payload: Record<string, unknown>
) {
    const channels = alert.channels || [];
    const recipients = alert.recipients || {};
    const results: Array<{ channel: string; status: "queued" | "sent" | "failed"; error?: string }> = [];

    if (channels.includes("in_app")) {
        results.push({ channel: "in_app", status: "queued" });
    }

    if (channels.includes("email")) {
        results.push({ channel: "email", status: "queued" });
    }

    if (channels.includes("webhook") && recipients.webhookUrl) {
        try {
            await fetch(recipients.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            results.push({ channel: "webhook", status: "sent" });
        } catch (error) {
            results.push({
                channel: "webhook",
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    if (channels.includes("zalo")) {
        if (recipients.zaloWebhookUrl) {
            try {
                await fetch(recipients.zaloWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                results.push({ channel: "zalo", status: "sent" });
            } catch (error) {
                results.push({
                    channel: "zalo",
                    status: "failed",
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        } else {
            results.push({ channel: "zalo", status: "queued" });
        }
    }

    return results;
}

export const nextRunAfterCheck = (alert: AlertDoc, from = new Date()) =>
    computeNextRunAt(alert.frequency, alert.schedule, from);
