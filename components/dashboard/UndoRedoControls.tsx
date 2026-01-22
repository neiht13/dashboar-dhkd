"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Undo2, Redo2 } from 'lucide-react';
import { useUndoRedoStore } from '@/stores/undo-redo-store';
import { cn } from '@/lib/utils';

interface UndoRedoControlsProps {
    onUndo?: () => void;
    onRedo?: () => void;
    className?: string;
    size?: 'sm' | 'default' | 'lg';
}

export function UndoRedoControls({ onUndo, onRedo, className, size = 'default' }: UndoRedoControlsProps) {
    const { undo, redo, canUndo, canRedo, getHistoryLength } = useUndoRedoStore();

    const { past, future } = getHistoryLength();

    const handleUndo = () => {
        const previousState = undo();
        if (previousState && onUndo) {
            onUndo();
        }
    };

    const handleRedo = () => {
        const nextState = redo();
        if (nextState && onRedo) {
            onRedo();
        }
    };

    // Keyboard shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) {
                    // Ctrl/Cmd + Shift + Z = Redo
                    e.preventDefault();
                    if (canRedo()) handleRedo();
                } else {
                    // Ctrl/Cmd + Z = Undo
                    e.preventDefault();
                    if (canUndo()) handleUndo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                // Ctrl/Cmd + Y = Redo
                e.preventDefault();
                if (canRedo()) handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canUndo, canRedo]);

    const buttonSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
    const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

    return (
        <div className={cn('flex items-center gap-1', className)}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleUndo}
                        disabled={!canUndo()}
                        className={cn(
                            buttonSize,
                            'rounded-lg transition-colors',
                            canUndo() 
                                ? 'hover:bg-muted text-foreground' 
                                : 'text-muted-foreground/50'
                        )}
                    >
                        <Undo2 className={iconSize} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>Hoàn tác (Ctrl+Z)</p>
                    {past > 0 && <p className="text-xs text-muted-foreground">{past} bước có thể hoàn tác</p>}
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRedo}
                        disabled={!canRedo()}
                        className={cn(
                            buttonSize,
                            'rounded-lg transition-colors',
                            canRedo() 
                                ? 'hover:bg-muted text-foreground' 
                                : 'text-muted-foreground/50'
                        )}
                    >
                        <Redo2 className={iconSize} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>Làm lại (Ctrl+Y)</p>
                    {future > 0 && <p className="text-xs text-muted-foreground">{future} bước có thể làm lại</p>}
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
