import React from 'react';
import { GridIcon, FileTextIcon } from './icons';

type View = 'dashboard' | 'ataCreator';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavLink: React.FC<{
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, isActive, onClick }) => {
  const activeClasses = 'bg-slate-200 dark:bg-slate-700 text-blue-600 dark:text-blue-300';
  const inactiveClasses = 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50';

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span>{label}</span>
    </a>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-20">
      <div className="flex items-center h-16 px-6 border-b border-slate-200 dark:border-slate-700">
        <FileTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <h1 className="ml-3 text-xl font-bold text-slate-800 dark:text-slate-100">
          ATA Creator
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <NavLink
          icon={GridIcon}
          label="Dashboard"
          isActive={currentView === 'dashboard'}
          onClick={() => setCurrentView('dashboard')}
        />
        <NavLink
          icon={FileTextIcon}
          label="Gerador de Atas"
          isActive={currentView === 'ataCreator'}
          onClick={() => setCurrentView('ataCreator')}
        />
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} ATA Creator with AI
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
