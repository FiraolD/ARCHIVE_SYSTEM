import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  /** 
   * Optional custom classes. 
   * If you want a specific height, pass e.g., "h-10 w-auto". 
   */
  className?: string;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", // Empty by default so it renders at natural size
  variant = 'light' 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Skeleton loader while the image is loading */}
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
        // w-auto h-auto ensures it uses the image's natural dimensions
        // object-contain ensures it never stretches or squishes
        className="w-auto h-auto max-w-full max-h-full object-contain"
      />
    </div>
  );
};