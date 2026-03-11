import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { jwtVerify } from "jose";
import {
    computeNextRunAt,
    normalizeRecipients,
    normalizeSchedule,
    sanitizeChannels,
    serializeAlert,
    type AlertFrequency,
} from "@/lib/alerts/utils";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "your-super-secret-key-change-in-production"
);

async function getUserFromToken(request: NextRequest) {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; email: string; role: string };
    } catch {
        return null;
    }
}

const normalizeAnomalyConfig = (input: Record<string, unknown> | undefined) => {
    if (!input) {
        return { enabled: false };
    }

    return {
        enabled: input.enabled === true,
        mode:
            typeof input.mode === "string" && input.mode.trim().length > 0
                ? input.mode
                : "drop_percent",
        threshold: Number(input.threshold) || 0,
        lookback: Number(input.lookback) || 7,
    };
};

const normalizeReportSchedule = (
    input: Record<string, unknown> | undefined
): Record<string, unknown> => {
    if (!input) {
        return { enabled: false };
    }

    const base = normalizeSchedule(input, "daily");
    const channels = Array.isArray(input.channels)
        ? input.channels.filter((channel) => channel === "email" || channel === "zalo")
        : [];

    return {
        ...base,
        channels,
        enabled: input.enabled === true,
    };
};

// GET /api/alerts
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const dashboardId = searchParams.get("dashboardId");
        const isActive = searchParams.get("isActive");

        const db = await getDb();
        const query: Record<string, unknown> = {
            createdBy: new ObjectId(user.userId),
        };

        if (dashboardId && ObjectId.isValid(dashboardId)) {
            query.dashboardId = new ObjectId(dashboardId);
        }

        if (isActive !== null) {
            query.isActive = isActive === "true";
        }

        const alerts = await db
            .collection("dataalerts")
            .aggregate([
                { $match: query },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "dashboards",
                        localField: "dashboardId",
                        foreignField: "_id",
                        as: "dashboard",
                    },
                },
                {
                    $lookup: {
                        from: "databaseconnections",
                        localField: "connectionId",
                        foreignField: "_id",
                        as: "connection",
                    },
                },
                {
                    $addFields: {
                        dashboard: { $arrayElemAt: ["$dashboard", 0] },
                        connection: { $arrayElemAt: ["$connection", 0] },
                    },
                },
            ])
            .toArray();

        return NextResponse.json({
            success: true,
            data: alerts.map((alert) => ({
                ...serializeAlert(alert as Record<string, unknown>),
                dashboard: (alert as Record<string, any>).dashboard
                    ? {
                        _id: (alert as Record<string, any>).dashboard._id?.toString(),
                        name: (alert as Record<string, any>).dashboard.name,
                    }
                    : null,
                connection: (alert as Record<string, any>).connection
                    ? {
                        _id: (alert as Record<string, any>).connection._id?.toString(),
                        name: (alert as Record<string, any>).connection.name,
                    }
                    : null,
            })),
        });
    } catch (error) {
        console.error("Error fetching alerts:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch alerts" },
            { status: 500 }
        );
    }
}

// POST /api/alerts
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            name,
            description,
            dashboardId,
            chartId,
            connectionId,
            query,
            conditions,
            conditionLogic = "AND",
            frequency = "daily",
            schedule,
            channels = ["in_app"],
            recipients,
            anomalyConfig,
            reportSchedule,
            isActive = true,
        } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: "Alert name is required" },
                { status: 400 }
            );
        }

        if (!connectionId || !ObjectId.isValid(connectionId)) {
            return NextResponse.json(
                { success: false, error: "Valid connection ID is required" },
                { status: 400 }
            );
        }

        if (!query?.table || !query?.field) {
            return NextResponse.json(
                { success: false, error: "Query table and field are required" },
                { status: 400 }
            );
        }

        if (!conditions?.length) {
            return NextResponse.json(
                { success: false, error: "At least one condition is required" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const connection = await db
            .collection("databaseconnections")
            .findOne({ _id: new ObjectId(connectionId) });

        if (!connection) {
            return NextResponse.json(
                { success: false, error: "Connection not found" },
                { status: 404 }
            );
        }

        const normalizedSchedule = normalizeSchedule(
            schedule,
            (frequency as AlertFrequency) || "daily"
        );

        const alert = {
            name,
            description: description || "",
            dashboardId: dashboardId && ObjectId.isValid(dashboardId) ? new ObjectId(dashboardId) : null,
            chartId: chartId && ObjectId.isValid(chartId) ? new ObjectId(chartId) : null,
            connectionId: new ObjectId(connectionId),
            query: {
                table: query.table,
                field: query.field,
                aggregation: query.aggregation || "sum",
                filters: query.filters || [],
            },
            conditions: conditions.map((condition: Record<string, unknown>) => ({
                field: condition.field || query.field,
                operator: condition.operator,
                value: condition.value,
                compareWith: condition.compareWith || "fixed",
            })),
            conditionLogic,
            frequency: normalizedSchedule.frequency,
            schedule: normalizedSchedule,
            reportSchedule: normalizeReportSchedule(reportSchedule),
            anomalyConfig: normalizeAnomalyConfig(anomalyConfig),
            channels: sanitizeChannels(channels),
            recipients: normalizeRecipients(recipients, user.userId),
            isActive: isActive !== false,
            lastValue: null,
            previousValue: null,
            triggerCount: 0,
            nextRunAt: computeNextRunAt(normalizedSchedule.frequency, normalizedSchedule),
            createdBy: new ObjectId(user.userId),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("dataalerts").insertOne(alert);

        return NextResponse.json({
            success: true,
            data: {
                ...serializeAlert({
                    ...alert,
                    _id: result.insertedId,
                }),
                createdBy: user.userId,
            },
        });
    } catch (error) {
        console.error("Error creating alert:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create alert" },
            { status: 500 }
        );
    }
}
