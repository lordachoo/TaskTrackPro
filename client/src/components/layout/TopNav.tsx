import { useState } from "react";

interface TopNavProps {
  boardName: string;
  onMobileMenuToggle: () => void;
  onBoardNameChange?: (name: string) => void;
}

export default function TopNav({ 
  boardName, 
  onMobileMenuToggle,
  onBoardNameChange 
}: TopNavProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(boardName);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleSubmit = () => {
    if (editedName.trim() && onBoardNameChange) {
      onBoardNameChange(editedName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedName(boardName);
    }
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <button 
            className="md:hidden text-gray-600 focus:outline-none mr-4"
            onClick={onMobileMenuToggle}
          >
            <i className="ri-menu-line text-xl"></i>
          </button>
          <div className="md:hidden font-bold text-lg text-primary">TaskFlow</div>
          <div className="hidden md:flex items-center">
            {isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={handleNameChange}
                onBlur={handleSubmit}
                onKeyDown={handleKeyDown}
                className="text-xl font-semibold text-gray-800 border-b border-primary px-1 focus:outline-none"
                autoFocus
              />
            ) : (
              <>
                <h1 className="text-xl font-semibold text-gray-800">{boardName}</h1>
                <button 
                  className="ml-4 text-gray-500 hover:text-gray-700"
                  onClick={handleEditClick}
                >
                  <i className="ri-edit-line"></i>
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
            <i className="ri-search-line text-lg"></i>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
            <i className="ri-notification-line text-lg"></i>
          </button>
          <div className="md:hidden">
            <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-medium">JS</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
