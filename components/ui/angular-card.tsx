"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AngularCardProps {
    children: React.ReactNode;
    accentColor?: string;
    hoverable?: boolean;
    selected?: boolean;
    onClick?: () => void;
    className?: string;
}

export function AngularCard({
    children,
    accentColor = "#2563eb",
    hoverable = true,
    selected = false,
    onClick,
    className,
}: AngularCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-white border-2 relative overflow-hidden transition-all duration-200",
                hoverable && "hover:-translate-y-1 hover:shadow-lg cursor-pointer",
                selected ? "border-blue-600 bg-blue-50/50" : "border-slate-100 hover:border-blue-300",
                className
            )}
        >
            {/* Corner accent decoration */}
            <div
                className="absolute top-0 right-0 w-0 h-0 border-l-[30px] border-l-transparent border-t-[30px]"
                style={{ borderTopColor: accentColor, opacity: 0.15 }}
            />
            {children}
        </div>
    );
}

interface AngularCardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export function AngularCardHeader({ children, className }: AngularCardHeaderProps) {
    return (
        <div className={cn("p-4 pb-2", className)}>
            {children}
        </div>
    );
}

interface AngularCardContentProps {
    children: React.ReactNode;
    className?: string;
}

export function AngularCardContent({ children, className }: AngularCardContentProps) {
    return (
        <div className={cn("p-4 pt-2", className)}>
            {children}
        </div>
    );
}

interface AngularCardTitleProps {
    children: React.ReactNode;
    className?: string;
}

export function AngularCardTitle({ children, className }: AngularCardTitleProps) {
    return (
        <h3 className={cn("font-bold text-slate-800 text-base", className)}>
            {children}
        </h3>
    );
}

interface AngularCardDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export function AngularCardDescription({ children, className }: AngularCardDescriptionProps) {
    return (
        <p className={cn("text-xs text-slate-500 mt-1", className)}>
            {children}
        </p>
    );
}
