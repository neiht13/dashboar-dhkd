"use client";

import React from 'react';
import { Header } from '@/components/layout/Header';
import { ActivityLogViewer } from '@/components/user/ActivityLogViewer';

export default function ActivityPage() {
    return (
        <div className="flex flex-col h-full">
            <Header 
                title="Nhật ký hoạt động" 
                subtitle="Theo dõi các hoạt động trong hệ thống"
                showDatePicker={false}
                showSearch={false}
            />
            
            <div className="flex-1 p-6 overflow-hidden">
                <ActivityLogViewer showUserFilter={true} />
            </div>
        </div>
    );
}
