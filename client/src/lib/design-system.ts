// Apple-inspired Design System
// Based on iPhone 16 Pro marketing page aesthetics

export const colors = {
    // Background colors
    background: {
        dark: '#0a0a0f',
        darkGlass: 'rgba(10, 10, 15, 0.7)',
        darkGlassHover: 'rgba(10, 10, 15, 0.85)',
        card: 'rgba(20, 20, 30, 0.6)',
        cardHover: 'rgba(25, 25, 35, 0.7)',
    },

    // Accent colors - vibrant and modern
    accent: {
        purple: '#8b5cf6',
        purpleDark: '#7c3aed',
        blue: '#3b82f6',
        blueDark: '#2563eb',
        green: '#10b981',
        greenDark: '#059669',
        orange: '#f59e0b',
        orangeDark: '#d97706',
        red: '#ef4444',
        redDark: '#dc2626',
    },

    // Gradient presets
    gradients: {
        primary: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
        success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        purple: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        blue: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        subtle: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
    },

    // Text colors
    text: {
        primary: '#ffffff',
        secondary: '#a1a1aa',
        tertiary: '#71717a',
        muted: '#52525b',
    },

    // Border colors
    border: {
        default: 'rgba(255, 255, 255, 0.1)',
        hover: 'rgba(255, 255, 255, 0.2)',
        focus: 'rgba(139, 92, 246, 0.5)',
    },

    // Status colors
    status: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
    },
};

export const typography = {
    fontFamily: {
        sans: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
        mono: `'JetBrains Mono', 'Fira Code', 'Courier New', monospace`,
    },

    fontSize: {
        xs: '0.75rem',      // 12px
        sm: '0.875rem',     // 14px
        base: '1rem',       // 16px
        lg: '1.125rem',     // 18px
        xl: '1.25rem',      // 20px
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
        '5xl': '3rem',      // 48px
        '6xl': '3.75rem',   // 60px
    },

    fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
    },

    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
};

export const spacing = {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
};

export const borderRadius = {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
};

export const transitions = {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
};

export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)',
    glowBlue: '0 0 20px rgba(59, 130, 246, 0.3)',
    glowGreen: '0 0 20px rgba(16, 185, 129, 0.3)',
};

// Glassmorphism effect
export const glass = {
    default: {
        background: colors.background.darkGlass,
        backdropFilter: 'blur(12px) saturate(180%)',
        border: `1px solid ${colors.border.default}`,
    },
    hover: {
        background: colors.background.darkGlassHover,
        backdropFilter: 'blur(16px) saturate(200%)',
        border: `1px solid ${colors.border.hover}`,
    },
    card: {
        background: colors.background.card,
        backdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${colors.border.default}`,
    },
};

// Button variants
export const buttonVariants = {
    primary: {
        background: colors.gradients.primary,
        color: colors.text.primary,
        hoverTransform: 'scale(1.02)',
        shadow: shadows.glow,
    },
    secondary: {
        background: 'transparent',
        border: `1px solid ${colors.border.default}`,
        color: colors.text.primary,
        hoverBackground: colors.background.card,
    },
    ghost: {
        background: 'transparent',
        color: colors.text.secondary,
        hoverBackground: colors.background.card,
    },
    success: {
        background: colors.gradients.success,
        color: colors.text.primary,
        shadow: shadows.glowGreen,
    },
    danger: {
        background: colors.gradients.error,
        color: colors.text.primary,
    },
};

// Animation keyframes
export const animations = {
    fadeIn: {
        from: { opacity: 0 },
        to: { opacity: 1 },
    },
    slideUp: {
        from: { transform: 'translateY(10px)', opacity: 0 },
        to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideDown: {
        from: { transform: 'translateY(-10px)', opacity: 0 },
        to: { transform: 'translateY(0)', opacity: 1 },
    },
    scaleIn: {
        from: { transform: 'scale(0.95)', opacity: 0 },
        to: { transform: 'scale(1)', opacity: 1 },
    },
    pulse: {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
    },
};

// Z-index layers
export const zIndex = {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
};

// Breakpoints for responsive design
export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
};
