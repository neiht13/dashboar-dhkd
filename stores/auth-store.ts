import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'editor' | 'viewer';
    avatar?: string;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;

    // Actions
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, password: string, name: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isLoading: false, // Changed to false - only true during actual API calls
            isAuthenticated: false,
            error: null,

            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            clearError: () => set({ error: null }),

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });

                    const result = await response.json();

                    if (result.success && result.data?.user) {
                        set({
                            user: result.data.user,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        });
                        return true;
                    } else {
                        set({ error: result.error || 'Đăng nhập thất bại', isLoading: false });
                        return false;
                    }
                } catch {
                    set({ error: 'Lỗi kết nối server', isLoading: false });
                    return false;
                }
            },

            register: async (email, password, name) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, name }),
                    });

                    const result = await response.json();

                    if (result.success && result.data?.user) {
                        set({
                            user: result.data.user,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        });
                        return true;
                    } else {
                        set({ error: result.error || 'Đăng ký thất bại', isLoading: false });
                        return false;
                    }
                } catch {
                    set({ error: 'Lỗi kết nối server', isLoading: false });
                    return false;
                }
            },

            logout: async () => {
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch (e) {
                    console.error('Logout error:', e);
                }
                set({ user: null, isAuthenticated: false, isLoading: false });
            },

            checkAuth: async () => {
                // Don't set loading for background auth check
                try {
                    const response = await fetch('/api/auth/me');
                    const result = await response.json();

                    if (result.success && result.data?.user) {
                        set({
                            user: result.data.user,
                            isAuthenticated: true,
                        });
                    } else {
                        set({ user: null, isAuthenticated: false });
                    }
                } catch {
                    set({ user: null, isAuthenticated: false });
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                // Don't persist isLoading - it should always start as false
            }),
        }
    )
);
