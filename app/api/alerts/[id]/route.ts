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
} from "@/lib/alerts/utils";
import { evaluateAlert } from "@/lib/alerts/engine";

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

const mapAlertUpdateData = (
    body: Record<string, unknown>,
    fallbackFrequency: "realtime" | "hourly" | "daily" | "weekly" | "monthly",
    fallbackUserId: string
) => {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.query !== undefined) {
        const query = body.query as Record<string, unknown>;
        updateData.query = {
            table: query.table,
            field: query.field,
            aggregation: query.aggregation || "sum",
            filters: query.filters || [],
        };
    }
    if (body.conditions !== undefined) {
        const conditions = body.conditions as Array<Record<string, unknown>>;
        updateData.conditions = conditions.map((condition) => ({
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
            compareWith: condition.compareWith || "fixed",
        }));
    }
    if (body.conditionLogic !== undefined) updateData.conditionLogic = body.conditionLogic;
    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.channels !== undefined) updateData.channels = sanitizeChannels(body.channels);
    if (body.recipients !== undefined) {
        updateData.recipients = normalizeRecipients(
            body.recipients as Record<string, unknown>,
            fallbackUserId
        );
    }
    if (body.anomalyConfig !== undefined) {
        const anomalyConfig = body.anomalyConfig as Record<string, unknown>;
        updateData.anomalyConfig = {
            enabled: anomalyConfig.enabled === true,
            mode: anomalyConfig.mode || "drop_percent",
            threshold: Number(anomalyConfig.threshold) || 0,
            lookback: Number(anomalyConfig.lookback) || 7,
        };
    }
    if (body.reportSchedule !== undefined) {
        const reportSchedule = body.reportSchedule as Record<string, unknown>;
        const normalizedReport = normalizeSchedule(reportSchedule, "daily");
        updateData.reportSchedule = {
            ...normalizedReport,
            enabled: reportSchedule.enabled === true,
            channels: Array.isArray(reportSchedule.channels)
                ? reportSchedule.channels.filter((channel) => channel === "email" || channel === "zalo")
                : [],
        };
    }
    if (body.schedule !== undefined || body.frequency !== undefined) {
        const normalizedSchedule = normalizeSchedule(
            body.schedule as Record<string, unknown>,
            (body.frequency as "realtime" | "hourly" | "daily" | "weekly" | "monthly") ||
            fallbackFrequency
        );
        updateData.schedule = normalizedSchedule;
        updateData.frequency = normalizedSchedule.frequency;
        updateData.nextRunAt = computeNextRunAt(normalizedSchedule.frequency, normalizedSchedule);
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    return updateData;
};

async function getOwnedAlert(db: Awaited<ReturnType<typeof getDb>>, id: string, userId: string) {
    return db.collection("dataalerts").findOne({
        _id: new ObjectId(id),
        createdBy: new ObjectId(userId),
    });
}

// GET /api/alerts/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: "Invalid alert ID" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const alert = await getOwnedAlert(db, id, user.userId);

        if (!alert) {
            return NextResponse.json(
                { success: false, error: "Alert not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: serializeAlert(alert as Record<string, unknown>),
        });
    } catch (error) {
        console.error("Error fetching alert:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch alert" },
            { status: 500 }
        );
    }
}

// PUT /api/alerts/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: "Invalid alert ID" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const alert = await getOwnedAlert(db, id, user.userId);

        if (!alert) {
            return NextResponse.json(
                { success: false, error: "Alert not found" },
                { status: 404 }
            );
        }

        const body = (await request.json()) as Record<string, unknown>;
        const updateData = mapAlertUpdateData(
            body,
            ((alert as Record<string, any>).frequency || "daily") as
                | "realtime"
                | "hourly"
                | "daily"
                | "weekly"
                | "monthly",
            user.userId
        );

        await db.collection("dataalerts").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return NextResponse.json({
            success: true,
            message: "Alert updated successfully",
        });
    } catch (error) {
        console.error("Error updating alert:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update alert" },
            { status: 500 }
        );
    }
}

// DELETE /api/alerts/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: "Invalid alert ID" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const result = await db.collection("dataalerts").deleteOne({
            _id: new ObjectId(id),
            createdBy: new ObjectId(user.userId),
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { success: false, error: "Alert not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Alert deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting alert:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete alert" },
            { status: 500 }
        );
    }
}

// POST /api/alerts/[id] - test alert
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: "Invalid alert ID" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const alert = await getOwnedAlert(db, id, user.userId);

        if (!alert) {
            return NextResponse.json(
                { success: false, error: "Alert not found" },
                { status: 404 }
            );
        }

        const result = await evaluateAlert(alert as Record<string, unknown> as any);

        return NextResponse.json({
            success: true,
            data: {
                alertId: id,
                testResult: {
                    currentValue: result.currentValue,
                    conditionsResults: result.conditionResults,
                    conditionsMet: result.conditionsMet,
                    anomalyTriggered: result.anomalyTriggered,
                    anomalyReason: result.anomalyReason,
                    wouldTrigger: result.shouldTrigger,
                },
                message: "Alert test completed",
            },
        });
    } catch (error) {
        console.error("Error testing alert:", error);
        return NextResponse.json(
            { success: false, error: "Failed to test alert" },
            { status: 500 }
        );
    }
}
