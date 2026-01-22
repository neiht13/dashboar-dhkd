/**
 * API Types and Interfaces
 * Type definitions for API requests and responses
 */

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

// ===========================================
// AUTH TYPES
// ===========================================

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'editor' | 'viewer';
    avatar?: string;
}

export interface AuthResponse {
    user: AuthUser;
    token?: string;
}

// ===========================================
// DATABASE TYPES
// ===========================================

export interface DatabaseConnection {
    _id: string;
    name: string;
    host: string;
    port: number;
    database: string;
    user: string;
    encrypt: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TableInfo {
    schema: string;
    name: string;
    rowCount: number;
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: string;
    isPrimaryKey: boolean | number;
}

export interface SchemaResponse {
    columns: ColumnInfo[];
    sampleData: Record<string, unknown>[];
}

// ===========================================
// CHART DATA TYPES
// ===========================================

export interface ChartDataRequest {
    table: string;
    xAxis: string;
    yAxis: string[];
    aggregation?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
    filters?: Array<{
        field: string;
        operator: string;
        value: string | number | string[] | number[];
    }>;
    connectionId?: string;
}

export interface ChartDataResponse {
    data: Record<string, unknown>[];
}

// ===========================================
// DASHBOARD TYPES
// ===========================================

export interface DashboardRequest {
    name: string;
    description?: string;
    widgets?: unknown[];
    layout?: unknown[];
    tabs?: unknown[];
    activeTabId?: string;
}

export interface ShareLinkRequest {
    permission?: 'view' | 'edit';
    expiresIn?: string;
    maxViews?: number;
}

export interface ShareLinkResponse {
    publicUrl: string;
    token: string;
}

// ===========================================
// ERROR TYPES
// ===========================================

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export class ApiException extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ApiException';
    }
}

// ===========================================
// REQUEST HELPERS
// ===========================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig {
    method?: HttpMethod;
    headers?: HeadersInit;
    body?: unknown;
    timeout?: number;
}

// ===========================================
// RATE LIMIT TYPES
// ===========================================

export interface RateLimitInfo {
    remaining: number;
    resetTime: number;
    limit: number;
}
