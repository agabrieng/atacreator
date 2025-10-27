
import React, { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m6 9 6 6 6-6"/>
    </svg>
);


const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        type="button"
        className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
