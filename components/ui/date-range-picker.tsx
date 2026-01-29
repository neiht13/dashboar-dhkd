"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
    value?: DateRange
    onChange?: (range: DateRange | undefined) => void
    className?: string
    placeholder?: string
}

export function DateRangePicker({
    value,
    onChange,
    className,
    placeholder = "Chọn khoảng thời gian",
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger
                    className={cn(
                        "w-auto justify-start text-left font-normal h-auto min-h-[36px] px-3 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#3B82F6] transition-all rounded-md flex items-center gap-2 cursor-pointer",
                        !value && "text-muted-foreground",
                        isOpen && "border-[#3B82F6] ring-2 ring-[#3B82F6]/20"
                    )}
                >
                    <CalendarIcon className="h-4 w-4 text-[#64748B] flex-shrink-0" />
                    {value?.from ? (
                        value.to ? (
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-start justify-center min-w-[80px]">
                                    <span className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium leading-tight">Từ ngày</span>
                                    <span className="text-sm font-medium text-[#0F172A] leading-tight">
                                        {format(value.from, "dd/MM/yyyy", { locale: vi })}
                                    </span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-[#94A3B8] flex-shrink-0" />
                                <div className="flex flex-col items-start justify-center min-w-[80px]">
                                    <span className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium leading-tight">Đến ngày</span>
                                    <span className="text-sm font-medium text-[#0F172A] leading-tight">
                                        {format(value.to, "dd/MM/yyyy", { locale: vi })}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-start justify-center min-w-[80px]">
                                    <span className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium leading-tight">Từ ngày</span>
                                    <span className="text-sm font-medium text-[#0F172A] leading-tight">
                                        {format(value.from, "dd/MM/yyyy", { locale: vi })}
                                    </span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-[#94A3B8] flex-shrink-0" />
                                <div className="flex flex-col items-start justify-center min-w-[80px]">
                                    <span className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium leading-tight opacity-0">Đến ngày</span>
                                    <span className="text-sm text-[#94A3B8] leading-tight">Chọn ngày kết thúc</span>
                                </div>
                            </div>
                        )
                    ) : (
                        <span className="text-sm text-[#94A3B8]">{placeholder}</span>
                    )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-lg border-[#E2E8F0]" align="center">
                    <div className="p-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#3B82F6] to-[#1E40AF]">
                        <div className="flex items-center gap-2 text-white">
                            <CalendarIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Chọn khoảng thời gian</span>
                        </div>
                        {value?.from && (
                            <div className="mt-2 flex items-center gap-2 text-white/90 text-xs">
                                <span className="font-medium">Từ:</span>
                                <span>{format(value.from, "dd/MM/yyyy", { locale: vi })}</span>
                                {value.to && (
                                    <>
                                        <span className="mx-1">→</span>
                                        <span className="font-medium">Đến:</span>
                                        <span>{format(value.to, "dd/MM/yyyy", { locale: vi })}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center">
                    <Calendar
                        mode="range"
                        defaultMonth={value?.from}
                        selected={value}
                        onSelect={onChange}
                        numberOfMonths={1}
                    />
                    </div>
                    
                </PopoverContent>
            </Popover>
        </div>
    )
}
