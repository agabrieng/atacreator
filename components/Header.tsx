
import React from 'react';
import { FileTextIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-slate-800 shadow-md">
      <div className="container mx-auto px-4 py-4 md:px-8 flex items-center">
        <FileTextIcon className="w-8 h-8 md:w-10 md:h-10 text-blue-600 dark:text-blue-400 mr-4" />
        <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                Gerador de Atas de Reunião com IA
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Transforme transcrições do Teams em atas profissionais instantaneamente.
            </p>
        </div>
      </div>
    </header>
  );
};

export default Header;