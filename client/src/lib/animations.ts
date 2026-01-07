/**
 * Enhanced Animation Utilities
 * Micro-animations and transitions for improved UX across the platform
 */

import { Variants } from 'framer-motion';

// Form input animations
export const formInputAnimations: Variants = {
    initial: { scale: 1 },
    focus: {
        scale: 1.01,
        transition: { duration: 0.15, ease: 'easeOut' }
    },
    error: {
        x: [-10, 10, -10, 10, 0],
        transition: { duration: 0.4 }
    }
};

// Button hover animations
export const buttonHoverAnimations: Variants = {
    initial: { scale: 1, y: 0 },
    hover: {
        scale: 1.02,
        y: -2,
        transition: { duration: 0.2, ease: 'easeOut' }
    },
    tap: {
        scale: 0.98,
        y: 0,
        transition: { duration: 0.1 }
    }
};

// Card hover animations
export const cardHoverAnimations: Variants = {
    initial: { y: 0, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' },
    hover: {
        y: -4,
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
        transition: { duration: 0.3, ease: 'easeOut' }
    }
};

// List stagger animations
export const listStaggerAnimations = {
    container: {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    },
    item: {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3 }
        }
    }
};

// Slide in animations
export const slideInAnimations: Variants = {
    fromLeft: {
        initial: { x: -20, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: -20, opacity: 0 }
    },
    fromRight: {
        initial: { x: 20, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: 20, opacity: 0 }
    },
    fromTop: {
        initial: { y: -20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -20, opacity: 0 }
    },
    fromBottom: {
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 20, opacity: 0 }
    }
};

// Loading spinner animation
export const spinnerAnimation: Variants = {
    animate: {
        rotate: 360,
        transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
        }
    }
};

// Pulse animation for notifications
export const pulseAnimation: Variants = {
    animate: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
        }
    }
};

// Modal backdrop animations
export const modalBackdropAnimations: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

// Modal content animations
export const modalContentAnimations: Variants = {
    initial: { scale: 0.9, opacity: 0, y: 20 },
    animate: {
        scale: 1,
        opacity: 1,
        y: 0,
        transition: { type: 'spring', damping: 25, stiffness: 300 }
    },
    exit: {
        scale: 0.9,
        opacity: 0,
        y: 20,
        transition: { duration: 0.2 }
    }
};

// Toast notification animations
export const toastAnimations: Variants = {
    initial: { x: 400, opacity: 0 },
    animate: {
        x: 0,
        opacity: 1,
        transition: { type: 'spring', damping: 20, stiffness: 300 }
    },
    exit: {
        x: 400,
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

// Progress bar fill animation
export const progressBarAnimations = {
    initial: { width: '0%' },
    animate: (progress: number) => ({
        width: `${progress}%`,
        transition: { duration: 0.5, ease: 'easeOut' }
    })
};

// Skeleton loading animation
export const skeletonAnimations: Variants = {
    animate: {
        backgroundColor: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)'],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
        }
    }
};

// Tab switch animations
export const tabSwitchAnimations: Variants = {
    initial: { opacity: 0, x: -10 },
    animate: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.2 }
    },
    exit: {
        opacity: 0,
        x: 10,
        transition: { duration: 0.2 }
    }
};

// Success checkmark animation
export const checkmarkAnimations: Variants = {
    initial: { pathLength: 0, opacity: 0 },
    animate: {
        pathLength: 1,
        opacity: 1,
        transition: { duration: 0.5, ease: 'easeInOut' }
    }
};

// Error shake animation
export const shakeAnimation: Variants = {
    animate: {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 }
    }
};

// Fade animations
export const fadeAnimations: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.3 }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

// Scale animations
export const scaleAnimations: Variants = {
    initial: { scale: 0, opacity: 0 },
    animate: {
        scale: 1,
        opacity: 1,
        transition: { type: 'spring', damping: 15, stiffness: 300 }
    },
    exit: {
        scale: 0,
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

// Dropdown menu animations
export const dropdownAnimations: Variants = {
    initial: { opacity: 0, scale: 0.95, y: -10 },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.15, ease: 'easeOut' }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: -10,
        transition: { duration: 0.1 }
    }
};

// Hover glow effect
export const glowHoverAnimation: Variants = {
    initial: { boxShadow: '0 0 0 rgba(139, 92, 246, 0)' },
    hover: {
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
        transition: { duration: 0.3 }
    }
};

export default {
    formInputAnimations,
    buttonHoverAnimations,
    cardHoverAnimations,
    listStaggerAnimations,
    slideInAnimations,
    spinnerAnimation,
    pulseAnimation,
    modalBackdropAnimations,
    modalContentAnimations,
    toastAnimations,
    progressBarAnimations,
    skeletonAnimations,
    tabSwitchAnimations,
    checkmarkAnimations,
    shakeAnimation,
    fadeAnimations,
    scaleAnimations,
    dropdownAnimations,
    glowHoverAnimation
};
