import { Draggable } from "react-beautiful-dnd";
import { Task, User } from "@shared/schema";
import { ReactNode, useState, useRef, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Archive, Trash2, MoreVertical, Calendar, MessageSquare, GripVertical } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TaskCardProps {
  task: Task;
  index: number;
  categoryColor: string;
  onEdit: (task: Task) => void;
  onArchive: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  boardId: number;
}

export default function TaskCard({ 
  task, 
  index, 
  categoryColor,
  onEdit,
  onArchive,
  onDelete,
  boardId
}: TaskCardProps) {
  // Fetch users for assignee display
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to load users');
      return res.json();
    }
  });
  
  // Create a map of user IDs to user objects for quick lookup
  const userMap = new Map<number, User>();
  users.forEach((user: User) => {
    userMap.set(user.id, user);
  });
  
  const {
    id,
    title,
    description,
    dueDate,
    priority,
    assignees = [],
    comments = 0,
    customData = {} as Record<string, string>
  } = task;

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'bg-success/10 text-success';
      case 'medium':
        return 'bg-warning/10 text-warning';
      case 'high':
        return 'bg-danger/10 text-danger';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getUserInitials = (userId: number) => {
    const user = userMap.get(userId);
    if (!user) return '??';
    
    const name = user.fullName || user.username;
    if (!name) return '??';
    
    // If it's a short name, use the first two characters
    if (name.length <= 2) return name.toUpperCase();
    
    // Get initials from full name
    const parts = name.split(' ');
    if (parts.length === 1) return name.substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getUserDisplayName = (userId: number) => {
    const user = userMap.get(userId);
    return user ? (user.fullName || user.username) : 'Unknown User';
  };

  const getUserColor = (userId: number) => {
    const user = userMap.get(userId);
    // If the user has an avatarColor defined, use it directly
    if (user && user.avatarColor) {
      // The avatarColor is already a valid CSS color like "#ef4444"
      return user.avatarColor;
    }
    
    // Fallback colors for users without an assigned color
    const colors = [
      '#a855f7', // purple-500
      '#3b82f6', // blue-500
      '#22c55e', // green-500
      '#f97316', // orange-500
      '#6366f1', // indigo-500
      '#ec4899', // pink-500
    ];
    
    // Generate a consistent color based on the user ID
    return colors[userId % colors.length];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    
    // Add event listener when menu is open
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handleEdit = () => {
    onEdit(task);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(id);
    setMenuOpen(false);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this task? This action cannot be undone.")) {
      onDelete(id);
    }
    setMenuOpen(false);
  };
  
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  // Helper function to safely render custom data values
  const renderCustomValue = (value: unknown): ReactNode => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Helper to check if customData exists and is an object
  const hasCustomData = customData !== null && 
    typeof customData === 'object' && 
    Object.keys(customData).length > 0;

  return (
    <Draggable draggableId={`task-${id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            task-card relative bg-white rounded-md border border-gray-200 shadow-sm p-4 mb-3
            ${snapshot.isDragging ? 'shadow-lg opacity-90' : ''}
          `}
          onClick={handleEdit}
        >
          <div 
            className="category-color-indicator" 
            style={{ backgroundColor: categoryColor }}
          ></div>
          <div className="ml-2">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-800">{title}</h4>
              <div ref={menuRef} className="relative">
                <button 
                  onClick={toggleMenu} 
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  aria-label="Task options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                
                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-40 bg-white shadow-lg rounded-md py-1 z-50">
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={handleArchive}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Task
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Task
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {description && (
              <div className="text-sm text-gray-600 mb-3 prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {description}
                </ReactMarkdown>
              </div>
            )}
            
            <div className="flex justify-between items-center mb-2">
              {dueDate && (
                <div className="text-xs font-medium text-gray-500 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(dueDate)}
                </div>
              )}
              {priority && (
                <div className="flex items-center">
                  <span 
                    className={`${getPriorityBadgeClass(priority)} text-xs px-2 py-1 rounded-full font-medium`}
                  >
                    {getPriorityLabel(priority)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex -space-x-2">
                {assignees && assignees.length > 0 ? (
                  assignees.map((userId, index) => (
                    <div 
                      key={index}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: getUserColor(userId) }}
                      title={getUserDisplayName(userId)}
                    >
                      {getUserInitials(userId)}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500">No assignees</div>
                )}
              </div>
              <div className="flex items-center text-gray-500 text-sm">
                <MessageSquare className="h-4 w-4 mr-1" />
                <span>{comments}</span>
              </div>
            </div>
            
            {/* Render custom fields if any */}
            {hasCustomData && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {Object.entries(customData as Record<string, unknown>)
                  .filter(([key]) => {
                    // Check if the custom field still exists in the board
                    const validFields = queryClient.getQueryData<any[]>(['/api/boards', boardId, 'customFields']) || [];
                    return validFields.some(field => field.name === key);
                  })
                  .map(([key, value], index) => (
                    <div key={index} className="flex justify-between text-xs mt-1">
                      <span className="text-gray-500">{key}:</span>
                      <span className="text-gray-700 font-medium">
                        {renderCustomValue(value)}
                      </span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}