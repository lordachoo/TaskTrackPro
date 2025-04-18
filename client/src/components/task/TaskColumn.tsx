import { Droppable } from "react-beautiful-dnd";
import TaskCard from "./TaskCard";
import { Task, Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Edit, Trash2, Plus } from "lucide-react";

interface TaskColumnProps {
  category: Category;
  tasks: Task[];
  boardId: number;
  onAddTask: (categoryId: number) => void;
  onEditTask: (task: Task) => void;
  onArchiveTask: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: number) => void;
}

export default function TaskColumn({
  category,
  tasks,
  boardId,
  onAddTask,
  onEditTask,
  onArchiveTask,
  onDeleteTask,
  onEditCategory,
  onDeleteCategory
}: TaskColumnProps) {
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

  const handleDeleteCategory = () => {
    if (tasks.length > 0) {
      alert("Cannot delete a category that contains tasks. Move or delete the tasks first.");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this category?")) {
      onDeleteCategory(category.id);
    }
    setMenuOpen(false);
  };
  
  const handleEditCategory = () => {
    onEditCategory(category);
    setMenuOpen(false);
  };
  
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };
  
  return (
    <div className="task-column flex flex-col bg-white rounded-lg shadow-sm border border-gray-200" data-column-id={category.id}>
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <div 
            className="w-3 h-3 rounded-full mr-3" 
            style={{ backgroundColor: category.color }}
          ></div>
          <h3 className="font-semibold text-gray-800">{category.name}</h3>
          <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
        <div ref={menuRef} className="relative">
          <button 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            onClick={toggleMenu}
            aria-label="Column menu"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white shadow-lg rounded-md py-1 z-50">
              <button 
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                onClick={handleEditCategory}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Category
              </button>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                onClick={handleDeleteCategory}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Category
              </button>
            </div>
          )}
        </div>
      </div>
      
      <Droppable droppableId={`category-${category.id}`}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-3 space-y-0 ${
              snapshot.isDraggingOver ? 'bg-gray-50' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                categoryColor={category.color}
                onEdit={onEditTask}
                onArchive={onArchiveTask}
                onDelete={onDeleteTask}
                boardId={boardId}
              />
            ))}
            {provided.placeholder}
            
            <Button
              variant="ghost" 
              className="mt-2 w-full py-2 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-primary hover:border-primary flex items-center justify-center"
              onClick={() => onAddTask(category.id)}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span>Add Task</span>
            </Button>
          </div>
        )}
      </Droppable>
    </div>
  );
}
