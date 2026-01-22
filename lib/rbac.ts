/**
 * Role-Based Access Control (RBAC) System
 * 
 * Roles:
 * - admin: Full access to all features
 * - editor: Can create, edit, share dashboards and charts
 * - viewer: Can only view dashboards and charts
 */

export type UserRole = 'admin' | 'editor' | 'viewer';

export type Permission =
    // Dashboard permissions
    | 'dashboard:create'
    | 'dashboard:view'
    | 'dashboard:edit'
    | 'dashboard:delete'
    | 'dashboard:share'
    | 'dashboard:export'
    // Chart permissions
    | 'chart:create'
    | 'chart:view'
    | 'chart:edit'
    | 'chart:delete'
    // Connection permissions
    | 'connection:create'
    | 'connection:view'
    | 'connection:edit'
    | 'connection:delete'
    | 'connection:query'
    // User management
    | 'user:create'
    | 'user:view'
    | 'user:edit'
    | 'user:delete'
    // Team management
    | 'team:create'
    | 'team:view'
    | 'team:edit'
    | 'team:delete'
    // Alert management
    | 'alert:create'
    | 'alert:view'
    | 'alert:edit'
    | 'alert:delete'
    // Folder management
    | 'folder:create'
    | 'folder:view'
    | 'folder:edit'
    | 'folder:delete'
    // Admin permissions
    | 'admin:audit'
    | 'admin:settings'
    | 'admin:users';

/**
 * Permission matrix for each role
 */
const rolePermissions: Record<UserRole, Permission[]> = {
    admin: [
        // All permissions
        'dashboard:create', 'dashboard:view', 'dashboard:edit', 'dashboard:delete', 'dashboard:share', 'dashboard:export',
        'chart:create', 'chart:view', 'chart:edit', 'chart:delete',
        'connection:create', 'connection:view', 'connection:edit', 'connection:delete', 'connection:query',
        'user:create', 'user:view', 'user:edit', 'user:delete',
        'team:create', 'team:view', 'team:edit', 'team:delete',
        'alert:create', 'alert:view', 'alert:edit', 'alert:delete',
        'folder:create', 'folder:view', 'folder:edit', 'folder:delete',
        'admin:audit', 'admin:settings', 'admin:users',
    ],
    editor: [
        'dashboard:create', 'dashboard:view', 'dashboard:edit', 'dashboard:delete', 'dashboard:share', 'dashboard:export',
        'chart:create', 'chart:view', 'chart:edit', 'chart:delete',
        'connection:view', 'connection:query',
        'team:view',
        'alert:create', 'alert:view', 'alert:edit', 'alert:delete',
        'folder:create', 'folder:view', 'folder:edit', 'folder:delete',
    ],
    viewer: [
        'dashboard:view', 'dashboard:export',
        'chart:view',
        'connection:view',
        'team:view',
        'alert:view',
        'folder:view',
    ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
    return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): Permission[] {
    return rolePermissions[role] || [];
}

/**
 * Check if user can perform action on resource
 * Considers both role-based and resource-based permissions
 */
export function canAccess(
    userRole: UserRole,
    permission: Permission,
    resource?: {
        ownerId?: string;
        sharedWith?: Array<{ userId: string; permission: 'view' | 'edit' }>;
        isPublic?: boolean;
    },
    userId?: string
): boolean {
    // Admin can do everything
    if (userRole === 'admin') return true;

    // Check role-based permission first
    if (!hasPermission(userRole, permission)) return false;

    // If no resource to check, permission is granted
    if (!resource || !userId) return true;

    // Owner has full access
    if (resource.ownerId === userId) return true;

    // Check shared access
    if (resource.sharedWith) {
        const sharedAccess = resource.sharedWith.find(s => s.userId === userId);
        if (sharedAccess) {
            // For edit/delete, need 'edit' permission
            if (permission.endsWith(':edit') || permission.endsWith(':delete')) {
                return sharedAccess.permission === 'edit';
            }
            // For view/export, any share is sufficient
            return true;
        }
    }

    // Public resources can be viewed
    if (resource.isPublic && permission.endsWith(':view')) {
        return true;
    }

    return false;
}

/**
 * Role hierarchy for comparison
 */
const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
};

/**
 * Check if role1 is higher or equal to role2
 */
export function isRoleHigherOrEqual(role1: UserRole, role2: UserRole): boolean {
    return roleHierarchy[role1] >= roleHierarchy[role2];
}

/**
 * Get role display name in Vietnamese
 */
export function getRoleDisplayName(role: UserRole): string {
    const displayNames: Record<UserRole, string> = {
        admin: 'Quản trị viên',
        editor: 'Biên tập viên',
        viewer: 'Người xem',
    };
    return displayNames[role] || role;
}

/**
 * Middleware helper for API routes
 */
export function requirePermission(permission: Permission) {
    return (userRole?: UserRole): { allowed: boolean; message?: string } => {
        if (!userRole) {
            return { allowed: false, message: 'Unauthorized: Not logged in' };
        }
        if (!hasPermission(userRole, permission)) {
            return {
                allowed: false,
                message: `Forbidden: Requires '${permission}' permission`
            };
        }
        return { allowed: true };
    };
}

/**
 * Require one of multiple permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
    return (userRole?: UserRole): { allowed: boolean; message?: string } => {
        if (!userRole) {
            return { allowed: false, message: 'Unauthorized: Not logged in' };
        }
        if (!hasAnyPermission(userRole, permissions)) {
            return {
                allowed: false,
                message: `Forbidden: Requires one of ${permissions.join(', ')}`
            };
        }
        return { allowed: true };
    };
}
