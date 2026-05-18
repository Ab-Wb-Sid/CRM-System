// ═══════════════════════════════════════════════════════
//  GlassCard — Reusable glassmorphic container
// ═══════════════════════════════════════════════════════
import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
  padding?: number | string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children, className = '', style, hover = false, onClick, padding = 20,
}) => (
  <motion.div
    onClick={onClick}
    whileHover={hover ? { y: -2, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' } : undefined}
    transition={{ duration: 0.2 }}
    className={`glass-card rounded-2xl ${hover ? 'cursor-pointer' : ''} ${className}`}
    style={{ padding, ...style }}
  >
    {children}
  </motion.div>
);
