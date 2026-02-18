import React from 'react';
import { Hexagon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-flow-charcoal">
      <header className="bg-flow-purple text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             {/* Logo Icon */}
            <div className="bg-white p-1 rounded-md">
                <Hexagon className="text-flow-purple w-6 h-6 fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight">Flow Productions</span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-xs bg-flow-yellow text-flow-charcoal font-semibold uppercase tracking-wider">
              Strategy Agent
            </span>
          </div>
          <nav className="text-sm font-medium text-flow-grey">
            Internal Tool v1.0
          </nav>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Flow Productions. All rights reserved.</p>
          <div className="flex gap-4">
             <span>Confidential & Proprietary</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
