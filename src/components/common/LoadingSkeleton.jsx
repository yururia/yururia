import React from 'react';
import { motion } from 'framer-motion';
import './LoadingSkeleton.css';

const shimmerTransition = {
    duration: 1.5,
    repeat: Infinity,
    ease: "linear"
};

const shimmerVariants = {
    initial: { backgroundPosition: "-200% 0" },
    animate: { backgroundPosition: "200% 0" }
};

export const SkeletonBase = ({ className = '', style = {}, ...props }) => {
    return (
        <motion.div
            className={`skeleton-base ${className}`}
            style={style}
            // グラデーションアニメーションはCSSでも可能だが、Framer Motionで制御も可能
            // ここではCSSクラスで背景スタイルを定義し、animateプロパティで不透明度やパルスを制御するアプローチも可
            // 今回はシンプルに明滅(pulse)させる
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            {...props}
        />
    );
};

export const SkeletonText = ({ lines = 1, height = 20, className = '', gap = 10 }) => {
    return (
        <div className={`skeleton-text-container ${className}`} style={{ gap: `${gap}px` }}>
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonBase
                    key={i}
                    className="skeleton-text-line"
                    style={{ height: `${height}px`, width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
                />
            ))}
        </div>
    );
};

export const SkeletonRect = ({ width, height, className = '' }) => {
    return (
        <SkeletonBase
            className={`skeleton-rect ${className}`}
            style={{ width, height }}
        />
    );
};

export const SkeletonCircle = ({ size, className = '' }) => {
    return (
        <SkeletonBase
            className={`skeleton-circle ${className}`}
            style={{ width: size, height: size }}
        />
    );
};

export const LoadingSkeleton = ({ type = 'text', ...props }) => {
    if (type === 'rect') return <SkeletonRect {...props} />;
    if (type === 'circle') return <SkeletonCircle {...props} />;
    return <SkeletonText {...props} />;
};

export default LoadingSkeleton;
