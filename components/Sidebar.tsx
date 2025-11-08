

import React, { useState } from 'react';
import { GridIcon, FileTextIcon, ChevronLeftIcon, ChevronRightIcon, CalendarCheckIcon, SettingsIcon, ArchiveIcon, SparklesIcon, BriefcaseIcon, ClipboardListIcon, TrendingUpIcon } from './icons';

type View = 'dashboard' | 'ataCreator' | 'deadlinePanel' | 'settings' | 'ataRepository' | 'projectControl' | 'projectDashboard';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const NavLink: React.FC<{
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}> = ({ icon: Icon, label, isActive, onClick, isCollapsed }) => {
  const activeClasses = 'bg-slate-200 dark:bg-slate-700 text-blue-600 dark:text-blue-300';
  const inactiveClasses = 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50';

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={isCollapsed ? label : undefined}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses} ${isCollapsed ? 'justify-center' : ''}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed ? 'mr-3' : ''}`} />
      <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 absolute' : 'opacity-100'}`}>{label}</span>
    </a>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isCollapsed, toggleCollapse }) => {
  const isAtaGroupActive = ['dashboard', 'ataCreator', 'ataRepository', 'deadlinePanel'].includes(currentView);
  const [isAtaMenuOpen, setIsAtaMenuOpen] = useState(isAtaGroupActive);

  const isProjectGroupActive = ['projectControl', 'projectDashboard'].includes(currentView);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(isProjectGroupActive);
  
  return (
    <aside className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-20 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex items-center h-16 px-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
        <FileTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <h1 className={`ml-3 text-xl font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          Claritas
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
        {isCollapsed ? (
          <NavLink
            icon={FileTextIcon}
            label="Gerador de ATA"
            isActive={isAtaGroupActive}
            onClick={() => setCurrentView('dashboard')}
            isCollapsed={isCollapsed}
          />
        ) : (
          <div>
            <button
              onClick={() => setIsAtaMenuOpen(!isAtaMenuOpen)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isAtaGroupActive
                  ? 'bg-slate-200 dark:bg-slate-700 text-blue-600 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <FileTextIcon className="w-5 h-5 flex-shrink-0 mr-3" />
              <span className="flex-1 text-left font-medium">Gerador de ATA</span>
              <ChevronRightIcon className={`w-4 h-4 transform transition-transform duration-200 ${isAtaMenuOpen ? 'rotate-90' : ''}`} />
            </button>
            {isAtaMenuOpen && (
              <div className="pt-2 pl-5 space-y-1">
                <NavLink
                  icon={GridIcon}
                  label="Dashboard"
                  isActive={currentView === 'dashboard'}
                  onClick={() => setCurrentView('dashboard')}
                  isCollapsed={isCollapsed}
                />
                <NavLink
                  icon={SparklesIcon}
                  label="Gerador de Atas"
                  isActive={currentView === 'ataCreator'}
                  onClick={() => setCurrentView('ataCreator')}
                  isCollapsed={isCollapsed}
                />
                <NavLink
                  icon={ArchiveIcon}
                  label="Repositório de Atas"
                  isActive={currentView === 'ataRepository'}
                  onClick={() => setCurrentView('ataRepository')}
                  isCollapsed={isCollapsed}
                />
                <NavLink
                  icon={CalendarCheckIcon}
                  label="Painel de Prazos"
                  isActive={currentView === 'deadlinePanel'}
                  onClick={() => setCurrentView('deadlinePanel')}
                  isCollapsed={isCollapsed}
                />
              </div>
            )}
          </div>
        )}

        {isCollapsed ? (
            <NavLink
                icon={BriefcaseIcon}
                label="Controle de Projetos"
                isActive={isProjectGroupActive}
                onClick={() => setCurrentView('projectControl')}
                isCollapsed={isCollapsed}
            />
        ) : (
            <div>
                <button
                    onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isProjectGroupActive
                        ? 'bg-slate-200 dark:bg-slate-700 text-blue-600 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                >
                    <BriefcaseIcon className="w-5 h-5 flex-shrink-0 mr-3" />
                    <span className="flex-1 text-left font-medium">Controle de Projetos</span>
                    <ChevronRightIcon className={`w-4 h-4 transform transition-transform duration-200 ${isProjectMenuOpen ? 'rotate-90' : ''}`} />
                </button>
                {isProjectMenuOpen && (
                    <div className="pt-2 pl-5 space-y-1">
                        <NavLink
                          icon={ClipboardListIcon}
                          label="Acompanhamento"
                          isActive={currentView === 'projectControl'}
                          onClick={() => setCurrentView('projectControl')}
                          isCollapsed={isCollapsed}
                        />
                        <NavLink
                          icon={TrendingUpIcon}
                          label="Dashboard de Projetos"
                          isActive={currentView === 'projectDashboard'}
                          onClick={() => setCurrentView('projectDashboard')}
                          isCollapsed={isCollapsed}
                        />
                    </div>
                )}
            </div>
        )}
        
        <NavLink
          icon={SettingsIcon}
          label="Configurações"
          isActive={currentView === 'settings'}
          onClick={() => setCurrentView('settings')}
          isCollapsed={isCollapsed}
        />
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={toggleCollapse}
          className={`w-full flex items-center p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 ${isCollapsed ? 'justify-center' : 'justify-end'}`}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          title={isCollapsed ? 'Expandir' : 'Recolher'}
        >
          {isCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;