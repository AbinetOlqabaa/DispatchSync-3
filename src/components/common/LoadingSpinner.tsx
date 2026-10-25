import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label, text, size = 'md' }) => {
  const displayLabel = text || label || 'Loading...';
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3" role="status" aria-live="polite">
      <div
        className={`${sizeMap[size]} border-slate-700 border-t-indigo-500 rounded-full animate-spin`}
      />
      {displayLabel && <p className="text-sm text-slate-400 font-medium">{displayLabel}</p>}
      <span className="sr-only">{displayLabel}</span>
    </div>
  );
};
