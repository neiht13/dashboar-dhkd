import { ObjectId } from "mongodb";

export type AlertFrequency = "realtime" | "hourly" | "daily" | "weekly" | "monthly";

export interface AlertSchedule {
    enabled: boolean;
    frequency: AlertFrequency;
    time?: string;
    timezone?: string;
    daysOfWeek?: number[];
    dayOfMonth?: number;
}

export interface AlertRecipients {
    userIds: ObjectId[];
    emails: string[];
    webhookUrl?: string;
    zaloUserIds?: string[];
    zaloWebhookUrl?: string;
}

const VALID_CHANNELS = new Set(["in_app", "email", "webhook", "zalo"]);

export const sanitizeChannels = (channels: unknown): string[] => {
    if (!Array.isArray(channels)) {
        return ["in_app"];
    }

    const dedup = Array.from(
        new Set(channels.filter((channel): channel is string => typeof channel === "string"))
    ).filter((channel) => VALID_CHANNELS.has(channel));

    return dedup.length > 0 ? dedup : ["in_app"];
};

export const normalizeRecipients = (
    recipients: Record<string, unknown> | undefined,
    fallbackUserId: string
): AlertRecipients => {
    const userIds = Array.isArray(recipients?.userIds)
        ? recipients!.userIds
            .filter((id): id is string => typeof id === "string" && ObjectId.isValid(id))
            .map((id) => new ObjectId(id))
        : [];

    const emails = Array.isArray(recipients?.emails)
        ? recipients!.emails
            .filter((email): email is string => typeof email === "string")
            .map((email) => email.trim())
            .filter(Boolean)
        : [];

    const zaloUserIds = Array.isArray(recipients?.zaloUserIds)
        ? recipients!.zaloUserIds
            .filter((id): id is string => typeof id === "string")
            .map((id) => id.trim())
            .filter(Boolean)
        : [];

    const webhookUrl =
        typeof recipients?.webhookUrl === "string" && recipients.webhookUrl.trim().length > 0
            ? recipients.webhookUrl.trim()
            : undefined;

    const zaloWebhookUrl =
        typeof recipients?.zaloWebhookUrl === "string" && recipients.zaloWebhookUrl.trim().length > 0
            ? recipients.zaloWebhookUrl.trim()
            : undefined;

    return {
        userIds: userIds.length > 0 ? userIds : [new ObjectId(fallbackUserId)],
        emails,
        webhookUrl,
        zaloUserIds,
        zaloWebhookUrl,
    };
};

const parseHourMinute = (value?: string) => {
    if (!value) return { hour: 8, minute: 0 };
    const match = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim());
    if (!match) return { hour: 8, minute: 0 };

    const hour = Math.max(0, Math.min(23, Number(match[1])));
    const minute = Math.max(0, Math.min(59, Number(match[2])));
    return { hour, minute };
};

export const normalizeSchedule = (
    input: Record<string, unknown> | undefined,
    fallbackFrequency: AlertFrequency
): AlertSchedule => {
    const frequency = (input?.frequency as AlertFrequency) || fallbackFrequency;
    const enabled = input?.enabled !== false;
    const { hour, minute } = parseHourMinute(input?.time as string | undefined);
    const timezone =
        typeof input?.timezone === "string" && input.timezone.trim().length > 0
            ? input.timezone
            : "Asia/Ho_Chi_Minh";

    const daysOfWeek = Array.isArray(input?.daysOfWeek)
        ? input!.daysOfWeek
            .map((day) => Number(day))
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        : undefined;

    const dayOfMonth = Number(input?.dayOfMonth);

    return {
        enabled,
        frequency,
        time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        timezone,
        daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : undefined,
        dayOfMonth: Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31
            ? dayOfMonth
            : undefined,
    };
};

export const computeNextRunAt = (
    frequency: AlertFrequency,
    schedule: AlertSchedule | undefined,
    from: Date = new Date()
): Date | null => {
    if (!schedule || schedule.enabled === false) {
        return null;
    }

    const next = new Date(from);
    const { hour, minute } = parseHourMinute(schedule.time);

    if (frequency === "realtime") {
        next.setSeconds(0, 0);
        return next;
    }

    if (frequency === "hourly") {
        next.setMinutes(minute, 0, 0);
        if (next <= from) {
            next.setHours(next.getHours() + 1);
        }
        return next;
    }

    if (frequency === "daily") {
        next.setHours(hour, minute, 0, 0);
        if (next <= from) {
            next.setDate(next.getDate() + 1);
        }
        return next;
    }

    if (frequency === "weekly") {
        const targetDay = schedule.daysOfWeek?.[0] ?? 1;
        const currentDay = next.getDay();
        const dayOffset = (targetDay - currentDay + 7) % 7;
        next.setDate(next.getDate() + dayOffset);
        next.setHours(hour, minute, 0, 0);
        if (next <= from) {
            next.setDate(next.getDate() + 7);
        }
        return next;
    }

    // monthly
    const targetDate = schedule.dayOfMonth ?? 1;
    next.setDate(targetDate);
    next.setHours(hour, minute, 0, 0);
    if (next <= from) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(targetDate);
    }
    return next;
};

export const serializeAlert = (alert: Record<string, any>) => ({
    ...alert,
    _id: alert._id?.toString(),
    dashboardId: alert.dashboardId?.toString(),
    chartId: alert.chartId?.toString(),
    connectionId: alert.connectionId?.toString(),
    createdBy: alert.createdBy?.toString(),
    recipients: {
        ...alert.recipients,
        userIds: alert.recipients?.userIds?.map((id: ObjectId) => id.toString()) || [],
    },
});
