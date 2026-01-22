"use client";

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { AlertManager } from '@/components/data/AlertManager';
import { Loader2 } from 'lucide-react';

interface Connection {
    _id: string;
    name: string;
}

interface Table {
    name: string;
    columns: string[];
}

export default function AlertsPage() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConnection, setSelectedConnection] = useState<string>('');

    useEffect(() => {
        fetchConnections();
    }, []);

    useEffect(() => {
        if (selectedConnection) {
            fetchTables(selectedConnection);
        }
    }, [selectedConnection]);

    const fetchConnections = async () => {
        try {
            const response = await fetch('/api/connections');
            const data = await response.json();
            if (data.success) {
                setConnections(data.data);
                if (data.data.length > 0) {
                    setSelectedConnection(data.data[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching connections:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTables = async (connectionId: string) => {
        try {
            const response = await fetch(`/api/database/tables?connectionId=${connectionId}`);
            const data = await response.json();
            if (data.success) {
                // Transform tables data to include columns
                const tablesWithColumns = await Promise.all(
                    data.tables.map(async (tableName: string) => {
                        try {
                            const schemaRes = await fetch(`/api/database/schema/${tableName}?connectionId=${connectionId}`);
                            const schemaData = await schemaRes.json();
                            return {
                                name: tableName,
                                columns: schemaData.success ? schemaData.columns.map((c: { name: string }) => c.name) : [],
                            };
                        } catch {
                            return { name: tableName, columns: [] };
                        }
                    })
                );
                setTables(tablesWithColumns);
            }
        } catch (error) {
            console.error('Error fetching tables:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full">
                <Header 
                    title="Quản lý Cảnh báo" 
                    subtitle="Thiết lập cảnh báo khi dữ liệu đạt ngưỡng"
                    showDatePicker={false}
                    showSearch={false}
                />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <Header 
                title="Quản lý Cảnh báo" 
                subtitle="Thiết lập cảnh báo khi dữ liệu đạt ngưỡng"
                showDatePicker={false}
                showSearch={false}
            />
            
            <div className="flex-1 p-6 overflow-hidden">
                <AlertManager 
                    connections={connections}
                    tables={tables}
                    connectionId={selectedConnection}
                />
            </div>
        </div>
    );
}
