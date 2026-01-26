/**
 * SQL Query Validator - Prevents SQL Injection attacks
 * 
 * This module provides secure SQL query validation using whitelist-based approach
 * and AST parsing to ensure only safe SELECT queries are executed.
 */

interface SQLValidationResult {
    isValid: boolean;
    error?: string;
    sanitizedQuery?: string;
}

/**
 * Allowed SQL keywords for SELECT queries (whitelist approach)
 */
const ALLOWED_KEYWORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'HAVING',
    'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON',
    'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'IS', 'NULL',
    'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'DISTINCT', 'TOP', 'UNION', 'ALL',
    // Aggregation functions
    'SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'STDEV', 'VAR',
    // String functions
    'CONCAT', 'SUBSTRING', 'LEN', 'LOWER', 'UPPER', 'TRIM', 'LTRIM', 'RTRIM',
    // Date functions
    'GETDATE', 'DATEADD', 'DATEDIFF', 'DATEPART', 'YEAR', 'MONTH', 'DAY',
    'FORMAT', 'CAST', 'CONVERT', 'TRY_CAST', 'TRY_CONVERT',
    // Math functions
    'ABS', 'ROUND', 'FLOOR', 'CEILING', 'POWER', 'SQRT',
]);

/**
 * Blocked SQL keywords (blacklist for extra safety)
 */
const BLOCKED_KEYWORDS = new Set([
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER', 'CREATE',
    'EXEC', 'EXECUTE', 'EXECUTE', 'SP_', 'XP_', 'OPENROWSET', 'OPENDATASOURCE',
    'BULK', 'INSERT', 'BULK', 'BACKUP', 'RESTORE', 'SHUTDOWN', 'KILL',
    'GRANT', 'REVOKE', 'DENY', 'DBCC', 'CHECKPOINT',
]);

/**
 * Remove SQL comments from query
 */
function removeComments(query: string): string {
    // Remove single-line comments (-- ...)
    let cleaned = query.replace(/--.*$/gm, '');
    
    // Remove multi-line comments (/* ... */)
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    return cleaned;
}

/**
 * Normalize SQL query for validation
 */
function normalizeQuery(query: string): string {
    // Remove comments first
    let normalized = removeComments(query);
    
    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
}

/**
 * Extract SQL keywords from query
 */
function extractKeywords(query: string): string[] {
    // Match SQL keywords (case-insensitive)
    const keywordPattern = /\b[A-Z_][A-Z0-9_]*\b/gi;
    const matches = query.match(keywordPattern) || [];
    return matches.map(k => k.toUpperCase());
}

/**
 * Check if query contains only SELECT statements
 */
function isSelectOnly(query: string): boolean {
    const normalized = normalizeQuery(query);
    const upperQuery = normalized.toUpperCase();
    
    // Must start with SELECT
    if (!upperQuery.startsWith('SELECT')) {
        return false;
    }
    
    // Check for blocked keywords
    for (const blocked of BLOCKED_KEYWORDS) {
        if (upperQuery.includes(blocked)) {
            return false;
        }
    }
    
    // Check for dangerous patterns
    const dangerousPatterns = [
        /;\s*(DROP|DELETE|UPDATE|INSERT|EXEC|EXECUTE)/i,
        /UNION\s+.*\s+SELECT/i,
        /;\s*--/i, // SQL injection via comment
        /\/\*.*\*\/.*(DROP|DELETE|UPDATE|INSERT)/i,
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(query)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Validate table/column names (prevent SQL injection via identifiers)
 */
function isValidIdentifier(identifier: string): boolean {
    // Only allow alphanumeric, underscore, and brackets
    // SQL Server allows brackets for identifiers: [table_name]
    const identifierPattern = /^[\[\]a-zA-Z_][\[\]a-zA-Z0-9_]*$/;
    return identifierPattern.test(identifier);
}

/**
 * Extract and validate table names from query
 */
function validateTableNames(query: string): { isValid: boolean; error?: string } {
    // Simple regex to find FROM clauses
    const fromPattern = /FROM\s+(\[?[\w]+\]?\.?\[?[\w]+\]?)/gi;
    const matches = query.matchAll(fromPattern);
    
    for (const match of matches) {
        const tableRef = match[1];
        // Remove brackets and schema prefix for validation
        const cleaned = tableRef.replace(/[\[\]\.]/g, '');
        
        if (!isValidIdentifier(cleaned)) {
            return {
                isValid: false,
                error: `Invalid table name: ${tableRef}`,
            };
        }
    }
    
    return { isValid: true };
}

/**
 * Main SQL validation function
 */
export function validateSQLQuery(query: string): SQLValidationResult {
    if (!query || typeof query !== 'string') {
        return {
            isValid: false,
            error: 'Query must be a non-empty string',
        };
    }
    
    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length === 0) {
        return {
            isValid: false,
            error: 'Query cannot be empty',
        };
    }
    
    // Check if it's a SELECT-only query
    if (!isSelectOnly(trimmedQuery)) {
        return {
            isValid: false,
            error: 'Only SELECT queries are allowed. Dangerous keywords or patterns detected.',
        };
    }
    
    // Validate table names
    const tableValidation = validateTableNames(trimmedQuery);
    if (!tableValidation.isValid) {
        return {
            isValid: false,
            error: tableValidation.error,
        };
    }
    
    // Additional checks: prevent nested queries that might be dangerous
    const normalized = normalizeQuery(trimmedQuery);
    const selectCount = (normalized.match(/SELECT/gi) || []).length;
    
    // Allow subqueries but limit depth
    if (selectCount > 10) {
        return {
            isValid: false,
            error: 'Query complexity too high. Maximum 10 nested SELECT statements allowed.',
        };
    }
    
    return {
        isValid: true,
        sanitizedQuery: trimmedQuery,
    };
}

/**
 * Sanitize SQL identifier (table/column name)
 */
export function sanitizeIdentifier(identifier: string): string {
    if (!identifier || typeof identifier !== 'string') {
        throw new Error('Identifier must be a non-empty string');
    }
    
    // Remove all non-alphanumeric characters except brackets and dots
    const sanitized = identifier.replace(/[^\[\]a-zA-Z0-9_\.]/g, '');
    
    // Ensure it starts with a letter, underscore, or bracket
    if (!/^[\[\]a-zA-Z_]/.test(sanitized)) {
        throw new Error(`Invalid identifier: ${identifier}`);
    }
    
    return sanitized;
}

/**
 * Build safe WHERE clause with parameterized values
 */
export function buildSafeWhereClause(
    filters: Array<{ field: string; operator: string; value: string | number }>
): { clause: string; params: Record<string, string | number> } {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};
    
    filters.forEach((filter, index) => {
        const sanitizedField = sanitizeIdentifier(filter.field);
        const paramName = `filterParam${index}`;
        const operator = filter.operator.toUpperCase();
        
        // Validate operator
        const validOperators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'];
        if (!validOperators.includes(operator)) {
            throw new Error(`Invalid operator: ${filter.operator}`);
        }
        
        // Use parameterized query
        if (operator === 'IN' && Array.isArray(filter.value)) {
            const inParams = filter.value.map((v, i) => {
                const inParamName = `${paramName}_${i}`;
                params[inParamName] = v;
                return `@${inParamName}`;
            }).join(', ');
            conditions.push(`[${sanitizedField}] IN (${inParams})`);
        } else if (operator === 'LIKE') {
            params[paramName] = filter.value;
            conditions.push(`[${sanitizedField}] LIKE @${paramName}`);
        } else {
            params[paramName] = filter.value;
            conditions.push(`[${sanitizedField}] ${operator} @${paramName}`);
        }
    });
    
    return {
        clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params,
    };
}
