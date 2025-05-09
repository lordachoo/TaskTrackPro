import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TopNavProps {
  boardName: string;
  onMobileMenuToggle: () => void;
  onBoardNameChange?: (name: string) => void;
  onBoardArchive?: () => void;
  onBoardDelete?: () => void;
  onExportBoard?: () => void;
  disableBoardActions?: boolean;
  allBoards?: { id: number; name: string }[];
  activeBoardId?: number;
  onBoardSelect?: (boardId: number) => void;
  boardSelectorOpen?: boolean;
  onBoardSelectorToggle?: () => void;
}

export default function TopNav({
  boardName,
  onMobileMenuToggle,
  onBoardNameChange,
  onBoardArchive,
  onBoardDelete,
  onExportBoard,
  disableBoardActions = false,
  allBoards = [],
  activeBoardId,
  onBoardSelect,
  boardSelectorOpen = false,
  onBoardSelectorToggle,
}: TopNavProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(boardName);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { user } = useAuth();

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "?";

    if (user.fullName) {
      return user.fullName
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }

    return user.username.substring(0, 2).toUpperCase();
  };

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
    if (e.key === "Enter") {
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditedName(boardName);
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <button
              className="md:hidden text-gray-600 focus:outline-none mr-4"
              onClick={onMobileMenuToggle}
            >
              <i className="ri-menu-line text-xl"></i>
            </button>
            <div className="md:hidden flex flex-col">
              <span className="font-bold text-lg text-primary">{APP_NAME}</span>
              <span className="text-gray-400 text-xs mt-[-5px]">{APP_VERSION}</span>
            </div>

            {/* Mobile Board Selector - Only show when there are multiple boards */}
            {allBoards && allBoards.length > 1 && onBoardSelect && (
              <div className="md:hidden ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-gray-700 text-sm">
                      <span className="font-medium truncate max-w-[120px]">
                        {boardName}
                      </span>
                      <i className="ri-arrow-down-s-line ml-1"></i>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {allBoards.map((board) => (
                      <DropdownMenuItem
                        key={board.id}
                        onClick={() => onBoardSelect(board.id)}
                        className={
                          board.id === activeBoardId ? "bg-gray-100" : ""
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{board.name}</span>
                          {board.id === activeBoardId && (
                            <i className="ri-check-line text-green-600"></i>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile Board Name Editor (if only one board) */}
            {(!allBoards || allBoards.length <= 1) && boardName && (
              <div className="md:hidden ml-4">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={handleNameChange}
                    onBlur={handleSubmit}
                    onKeyDown={handleKeyDown}
                    className="text-sm font-medium text-gray-800 border-b border-primary px-1 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center">
                    <span className="text-sm font-medium">{boardName}</span>
                    {onBoardNameChange && (
                      <button
                        className="ml-2 text-gray-500 hover:text-gray-700"
                        onClick={handleEditClick}
                      >
                        <i className="ri-edit-line text-xs"></i>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="hidden md:flex items-center">
              {/* Board Selector Dropdown */}
              {allBoards && allBoards.length > 1 && onBoardSelect && (
                <DropdownMenu
                  open={boardSelectorOpen}
                  onOpenChange={onBoardSelectorToggle}
                >
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center mr-4 px-3 py-1 rounded hover:bg-gray-100 text-gray-700">
                      <i className="ri-dashboard-line mr-2"></i>
                      <span className="font-medium">Boards</span>
                      <i className="ri-arrow-down-s-line ml-2"></i>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {allBoards.map((board) => (
                      <DropdownMenuItem
                        key={board.id}
                        onClick={() => onBoardSelect(board.id)}
                        className={
                          board.id === activeBoardId ? "bg-gray-100" : ""
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{board.name}</span>
                          {board.id === activeBoardId && (
                            <i className="ri-check-line text-green-600"></i>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Board Name (Editable) */}
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
                  <h1 className="text-xl font-semibold text-gray-800">
                    {boardName}
                  </h1>
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

            {/* Board actions dropdown */}
            {!disableBoardActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                    <i className="ri-more-2-line text-lg"></i>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onBoardNameChange && (
                    <DropdownMenuItem onClick={handleEditClick}>
                      <i className="ri-edit-line mr-2"></i>
                      Rename Board
                    </DropdownMenuItem>
                  )}
                  {onExportBoard && (
                    <DropdownMenuItem onClick={onExportBoard}>
                      <i className="ri-download-2-line mr-2"></i>
                      Export Board
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onBoardArchive && (
                    <DropdownMenuItem
                      onClick={onBoardArchive}
                      className="text-amber-600 focus:text-amber-600"
                    >
                      <i className="ri-archive-line mr-2"></i>
                      Archive Board
                    </DropdownMenuItem>
                  )}
                  {onBoardDelete && (
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <i className="ri-delete-bin-line mr-2"></i>
                      Delete Board
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="md:hidden">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: user?.avatarColor || "#6366f1" }}
              >
                <span className="text-white font-medium">{getInitials()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Delete Board Confirmation Dialog */}
      {onBoardDelete && (
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                board
                <span className="font-medium text-foreground">
                  {" "}
                  "{boardName}"{" "}
                </span>
                and all of its tasks and categories.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onBoardDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Board
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
