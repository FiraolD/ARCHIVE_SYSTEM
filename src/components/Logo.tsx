import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "",
  variant = 'light' 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
      )}
      
      <motion.img 
        src="/logo.png" 
        alt="Awash Insurance Logo" 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onLoad={() => setIsLoaded(true)}
        className="w-auto h-auto max-w-full max-h-full object-contain"
      />
    </div>
  );
};