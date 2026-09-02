import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ size = 'md', label = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-slate-400 gap-3">
      <Loader2 className={`${sizeClasses[size] || sizeClasses.md} animate-spin text-brand-500`} />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
};
