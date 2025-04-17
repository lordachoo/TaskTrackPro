import { Draggable } from "react-beautiful-dnd";
import { Task } from "@shared/schema";
import { ReactNode } from "react";

interface TaskCardProps {
  task: Task;
  index: number;
  categoryColor: string;
  onEdit: (task: Task) => void;
  onArchive: (taskId: number) => void;
  onDelete: (taskId: number) => void;
}

export default function TaskCard({ 
  task, 
  index, 
  categoryColor,
  onEdit,
  onArchive,
  onDelete
}: TaskCardProps) {
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

  const getAssigneeInitials = (assignee: string) => {
    if (assignee.length <= 2) return assignee;
    
    // If it's longer than 2 chars, assume it's a name and get initials
    const parts = assignee.split(' ');
    if (parts.length === 1) return assignee.substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getAssigneeColor = (assignee: string) => {
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-indigo-500',
      'bg-pink-500',
    ];
    
    // Generate a consistent color based on the assignee string
    const hash = assignee.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
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

  const handleEdit = () => {
    onEdit(task);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(id);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this task? This action cannot be undone.")) {
      onDelete(id);
    }
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
              <div className="flex">
                <button className="text-gray-400 hover:text-gray-600 mr-2" onClick={handleArchive} title="Archive Task">
                  <i className="ri-archive-line"></i>
                </button>
                <button className="text-red-400 hover:text-red-600 mr-2" onClick={handleDelete} title="Delete Task">
                  <i className="ri-delete-bin-line"></i>
                </button>
                <button className="text-gray-400 hover:text-gray-600">
                  <i className="ri-drag-move-line"></i>
                </button>
              </div>
            </div>
            
            {description && (
              <div className="text-sm text-gray-600 mb-3">
                {description}
              </div>
            )}
            
            <div className="flex justify-between items-center mb-2">
              {dueDate && (
                <div className="text-xs font-medium text-gray-500">
                  Due: {formatDate(dueDate)}
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
                {assignees && assignees.map((assignee, index) => (
                  <div 
                    key={index}
                    className={`w-7 h-7 rounded-full ${getAssigneeColor(assignee)} flex items-center justify-center text-white text-xs`}
                    title={assignee}
                  >
                    {getAssigneeInitials(assignee)}
                  </div>
                ))}
              </div>
              <div className="flex items-center text-gray-500 text-sm">
                <i className="ri-chat-1-line mr-1"></i>
                <span>{comments}</span>
              </div>
            </div>
            
            {/* Render custom fields if any */}
            {hasCustomData && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {Object.entries(customData as Record<string, unknown>).map(([key, value], index) => (
                  <div key={index} className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">{key}:</span>
                    <span className="text-gray-700 font-medium">
                      {renderCustomValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}