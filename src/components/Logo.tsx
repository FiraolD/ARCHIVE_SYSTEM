import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8", variant = 'light' }) => {
  return (
    <img 
      src="/logo.png" 
      alt="Company Logo" 
      className={className}
    />
  );
};