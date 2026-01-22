import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ColorTheme {
    id: string;
    name: string;
    colors: string[];
    isDark?: boolean;
    isCustom?: boolean;
}

// Predefined color themes
export const PRESET_THEMES: ColorTheme[] = [
    {
        id: 'default',
        name: 'Mặc định',
        colors: ['#0066FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'],
    },
    {
        id: 'ocean',
        name: 'Đại dương',
        colors: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#03045E', '#023E8A', '#0096C7', '#48CAE4'],
    },
    {
        id: 'sunset',
        name: 'Hoàng hôn',
        colors: ['#FF6B6B', '#FFA07A', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8C00', '#FF4500', '#DC143C'],
    },
    {
        id: 'forest',
        name: 'Rừng xanh',
        colors: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#1B4332', '#081C15', '#D8F3DC'],
    },
    {
        id: 'purple',
        name: 'Tím hồng',
        colors: ['#7209B7', '#560BAD', '#480CA8', '#3A0CA3', '#3F37C9', '#4361EE', '#4895EF', '#4CC9F0'],
    },
    {
        id: 'earth',
        name: 'Đất nâu',
        colors: ['#6B4423', '#8B5A2B', '#A0522D', '#CD853F', '#DEB887', '#D2691E', '#8B4513', '#F4A460'],
    },
    {
        id: 'neon',
        name: 'Neon',
        colors: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0080', '#80FF00', '#0080FF', '#FF8000', '#8000FF'],
        isDark: true,
    },
    {
        id: 'pastel',
        name: 'Pastel',
        colors: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFDFBA', '#E0BBE4', '#957DAD', '#D4A5A5'],
    },
    {
        id: 'monochrome',
        name: 'Đơn sắc',
        colors: ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#950740', '#c3073f', '#6f2232'],
    },
    {
        id: 'corporate',
        name: 'Doanh nghiệp',
        colors: ['#003366', '#004488', '#0055AA', '#0066CC', '#3399FF', '#66B2FF', '#99CCFF', '#CCE5FF'],
    },
];

interface ColorThemeState {
    // Current active theme
    activeThemeId: string;

    // Custom themes created by user
    customThemes: ColorTheme[];

    // Actions
    setActiveTheme: (themeId: string) => void;
    getActiveTheme: () => ColorTheme;
    getThemeById: (themeId: string) => ColorTheme | undefined;
    getAllThemes: () => ColorTheme[];

    // Custom theme management
    createCustomTheme: (name: string, colors: string[]) => ColorTheme;
    updateCustomTheme: (themeId: string, updates: Partial<Omit<ColorTheme, 'id' | 'isCustom'>>) => void;
    deleteCustomTheme: (themeId: string) => void;
    duplicateTheme: (themeId: string, newName: string) => ColorTheme | null;

    // Color utilities
    getChartColors: (count?: number) => string[];
    getColorByIndex: (index: number) => string;
}

export const useColorThemeStore = create<ColorThemeState>()(
    persist(
        (set, get) => ({
            activeThemeId: 'default',
            customThemes: [],

            setActiveTheme: (themeId) => {
                set({ activeThemeId: themeId });
            },

            getActiveTheme: () => {
                const { activeThemeId, customThemes } = get();
                const allThemes = [...PRESET_THEMES, ...customThemes];
                return allThemes.find((t) => t.id === activeThemeId) || PRESET_THEMES[0];
            },

            getThemeById: (themeId) => {
                const { customThemes } = get();
                const allThemes = [...PRESET_THEMES, ...customThemes];
                return allThemes.find((t) => t.id === themeId);
            },

            getAllThemes: () => {
                const { customThemes } = get();
                return [...PRESET_THEMES, ...customThemes];
            },

            createCustomTheme: (name, colors) => {
                const newTheme: ColorTheme = {
                    id: `custom_${Date.now()}`,
                    name,
                    colors,
                    isCustom: true,
                };

                set((state) => ({
                    customThemes: [...state.customThemes, newTheme],
                }));

                return newTheme;
            },

            updateCustomTheme: (themeId, updates) => {
                set((state) => ({
                    customThemes: state.customThemes.map((theme) =>
                        theme.id === themeId ? { ...theme, ...updates } : theme
                    ),
                }));
            },

            deleteCustomTheme: (themeId) => {
                const { activeThemeId } = get();

                set((state) => ({
                    customThemes: state.customThemes.filter((t) => t.id !== themeId),
                    // Reset to default if deleted theme was active
                    activeThemeId: activeThemeId === themeId ? 'default' : activeThemeId,
                }));
            },

            duplicateTheme: (themeId, newName) => {
                const theme = get().getThemeById(themeId);
                if (!theme) return null;

                return get().createCustomTheme(newName, [...theme.colors]);
            },

            getChartColors: (count) => {
                const theme = get().getActiveTheme();
                if (!count) return theme.colors;

                // If we need more colors than available, cycle through
                const colors: string[] = [];
                for (let i = 0; i < count; i++) {
                    colors.push(theme.colors[i % theme.colors.length]);
                }
                return colors;
            },

            getColorByIndex: (index) => {
                const theme = get().getActiveTheme();
                return theme.colors[index % theme.colors.length];
            },
        }),
        {
            name: 'color-theme-storage',
            partialize: (state) => ({
                activeThemeId: state.activeThemeId,
                customThemes: state.customThemes,
            }),
        }
    )
);

// Hook for easy access
export function useChartColors() {
    const { getChartColors, getColorByIndex, getActiveTheme } = useColorThemeStore();
    
    return {
        colors: getChartColors(),
        getColor: getColorByIndex,
        theme: getActiveTheme(),
    };
}
