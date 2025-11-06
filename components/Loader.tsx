
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-white dark:bg-slate-800 bg-opacity-75 dark:bg-opacity-75 flex flex-col items-center justify-center z-10 rounded-xl">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">Analisando e gerando a ata...</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">Isso pode levar alguns segundos.</p>
    </div>
  );
};

export default Loader;