import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogoutButton } from "@/components/auth/logout-button";
import { LayoutDashboard, Archive, Settings } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "?";
    
    if (user.fullName) {
      return user.fullName
        .split(" ")
        .map(name => name[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    
    return user.username.substring(0, 2).toUpperCase();
  };

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
          <div className="flex flex-col items-center">
            <span className="text-white text-2xl font-bold">TaskFlow</span>
            <span className="text-gray-400 text-xs">v1.0</span>
          </div>
        </div>
        
        <nav className="flex-grow p-5 space-y-1">
          <Link href="/">
            <a className={`flex items-center px-4 py-3 text-gray-300 rounded-md ${location === '/' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-700'}`}>
              <LayoutDashboard className="mr-3 h-5 w-5" />
              <span>Boards</span>
            </a>
          </Link>
          
          <Link href="/archived">
            <a className={`flex items-center px-4 py-3 text-gray-300 rounded-md ${location === '/archived' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-700'}`}>
              <Archive className="mr-3 h-5 w-5" />
              <span>Archived</span>
            </a>
          </Link>
          
          <Link href="/settings">
            <a className={`flex items-center px-4 py-3 text-gray-300 rounded-md ${location === '/settings' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-700'}`}>
              <Settings className="mr-3 h-5 w-5" />
              <span>Settings</span>
            </a>
          </Link>
        </nav>
        
        <div className="p-5 border-t border-gray-700">
          {user && (
            <div className="space-y-4">
              <div className="flex items-center">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center" 
                  style={{ backgroundColor: user.avatarColor || "#6366f1" }}
                >
                  <span className="text-white font-medium">{getInitials()}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">{user.fullName || user.username}</p>
                  <p className="text-xs text-gray-400">{user.email || ""}</p>
                </div>
              </div>
              
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
