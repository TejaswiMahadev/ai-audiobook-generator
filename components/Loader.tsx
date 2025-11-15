
import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-700 text-center">
      <div className="relative flex justify-center items-center">
        <div className="absolute w-24 h-24 rounded-full animate-ping bg-cyan-500 opacity-50"></div>
        <div className="relative w-16 h-16 rounded-full bg-cyan-600 flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0m-12.728 0a9 9 0 0012.728 12.728" />
          </svg>
        </div>
      </div>
      <h3 className="text-xl font-semibold text-white mt-8">Generating Your Content...</h3>
      <p className="text-slate-400 mt-2">The AI is warming up its vocal cords. This may take a moment.</p>
    </div>
  );
};