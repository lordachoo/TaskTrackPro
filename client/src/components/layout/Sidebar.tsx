import { Link, useLocation } from "wouter";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          ${isOpen ? 'flex' : 'hidden'} md:flex flex-col w-64 bg-gray-800 text-white fixed 
          md:sticky top-0 h-screen z-50 md:z-auto transition-all duration-300
        `}
      >
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-white text-2xl font-bold">TaskFlow</span>
          </div>
        </div>
        
        <nav className="flex-grow p-5 space-y-1">
          <Link href="/">
            <a className={`flex items-center px-4 py-3 text-gray-300 rounded-md ${location === '/' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-700'}`}>
              <i className="ri-dashboard-line mr-3"></i>
              <span>Boards</span>
            </a>
          </Link>
          
          <Link href="/archived">
            <a className={`flex items-center px-4 py-3 text-gray-300 rounded-md ${location === '/archived' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-700'}`}>
              <i className="ri-archive-line mr-3"></i>
              <span>Archived</span>
            </a>
          </Link>
          
          <Link href="/settings">
            <a className={`flex items-center px-4 py-3 text-gray-300 rounded-md ${location === '/settings' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-700'}`}>
              <i className="ri-settings-line mr-3"></i>
              <span>Settings</span>
            </a>
          </Link>
        </nav>
        
        <div className="p-5 border-t border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-medium">JS</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">John Smith</p>
              <p className="text-xs text-gray-400">john@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
