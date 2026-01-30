"use client";

import React from "react";
import { RouteManager } from "@/components/settings/RouteManager";

export default function RouteSettingsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <RouteManager />
        </div>
    );
}
