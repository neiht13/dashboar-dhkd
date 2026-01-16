"use client"

import * as React from "react"
import { HexColorPicker } from "react-colorful"
import { cn } from "@/lib/utils"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Copy } from "lucide-react"
import { toast } from "sonner"

interface ColorPickerProps {
    value?: string
    onChange?: (color: string) => void
    className?: string
}

export function ColorPicker({ value = "#d6b72b", onChange, className }: ColorPickerProps) {
    const [open, setOpen] = React.useState(false)

    // Hàm copy mã màu
    const copyToClipboard = () => {
        navigator.clipboard.writeText(value)
        toast.success("Đã sao chép mã màu!")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-2 p-2 border rounded-md bg-white hover:bg-gray-50 transition-all",
                        className
                    )}
                >
                    <div
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: value }}
                    />
                    <span className="text-sm font-mono uppercase">{value}</span>
                </button>
            </PopoverTrigger>

            <PopoverContent className="w-fit p-3 bg-white shadow-xl border-none" align="start">
                <div className="space-y-4 custom-color-picker">
                    {/* Bảng chọn màu Canvas + Hue Slider từ react-colorful */}
                    <HexColorPicker color={value} onChange={onChange} />

                    {/* Ô nhập mã HEX và nút Copy */}
                    <div className="relative flex flex-col items-center justify-center pt-2">
                        <span className="absolute -top-1 px-2 bg-white text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                            Hex
                        </span>
                        <div className="flex w-full items-center gap-2 border rounded-md px-3 py-1 mt-1">
                            <Input
                                value={value}
                                onChange={(e) => onChange?.(e.target.value)}
                                className="border-none p-0 h-8 focus-visible:ring-0 text-center font-mono uppercase"
                            />
                            <button
                                onClick={copyToClipboard}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* CSS đặc trị để làm giao diện giống ảnh mẫu */}
                <style jsx global>{`
                    .custom-color-picker .react-colorful {
                        width: 240px;
                        height: 200px;
                        gap: 12px;
                    }
                    .custom-color-picker .react-colorful__saturation {
                        border-radius: 4px;
                        border-bottom: none;
                    }
                    .custom-color-picker .react-colorful__hue {
                        height: 14px;
                        border-radius: 10px;
                    }
                    .custom-color-picker .react-colorful__pointer {
                        width: 18px;
                        height: 18px;
                        border: 2px solid #fff;
                    }
                `}</style>
            </PopoverContent>
        </Popover>
    )
}