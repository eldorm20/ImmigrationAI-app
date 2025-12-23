import React from "react";
import { motion } from "framer-motion";

interface StaggerContainerProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    staggerDelay?: number;
}

export const containerVariants = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
        opacity: 1,
        transition: { staggerChildren: 0.12, delayChildren: 0.04 * i },
    }),
};

export const childVariants = {
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            damping: 12,
            stiffness: 100,
        },
    },
    hidden: {
        opacity: 0,
        y: 20,
        transition: {
            type: "spring",
            damping: 12,
            stiffness: 100,
        },
    },
};

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
    children,
    className = "",
    delay = 0,
}) => {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            // viewport={{ once: true, margin: "0px" }} // Disabled scroll trigger for reliability on mobile
            custom={delay}
            className={className}
        >
            {React.Children.map(children, (child) => (
                <motion.div variants={childVariants}>{child}</motion.div>
            ))}
        </motion.div>
    );
};
