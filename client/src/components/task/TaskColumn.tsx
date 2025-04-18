import { useState } from "react";
import { Droppable } from "react-beautiful-dnd";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Task, Category } from "@shared/schema";
import TaskCard from "./TaskCard";
import { Plus, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <Card className="min-w-[300px] max-w-[300px] bg-white shadow-sm border border-gray-200 overflow-visible">
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: category.color || '#888888' }} 
          />
          <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
          {tasks.length > 0 && (
            <Badge variant="outline" className="ml-2 text-xs">
              {tasks.length}
            </Badge>
          )}
        </div>
        
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              className="cursor-pointer flex items-center gap-2"
              onClick={() => onEditCategory(category)}
            >
              <Edit className="h-4 w-4" />
              <span>Edit Column</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer text-red-600 flex items-center gap-2"
              onClick={() => {
                if (tasks.length > 0) {
                  alert("Cannot delete a column with tasks. Move or delete the tasks first.");
                  return;
                }
                onDeleteCategory(category.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Column</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <Droppable droppableId={`category-${category.id}`} type="task">
        {(provided) => (
          <CardContent 
            className="p-2 max-h-[calc(100vh-220px)] min-h-[200px] overflow-y-auto"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {tasks.length === 0 ? (
              <div className="text-center text-sm text-gray-500 p-4 border border-dashed border-gray-200 rounded-md">
                No tasks yet
              </div>
            ) : (
              tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  categoryColor={category.color || '#888888'}
                  onEdit={() => onEditTask(task)}
                  onArchive={() => onArchiveTask(task.id)}
                  onDelete={() => onDeleteTask(task.id)}
                  boardId={boardId}
                />
              ))
            )}
            {provided.placeholder}
          </CardContent>
        )}
      </Droppable>
      
      <CardFooter className="p-2 pt-0">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-gray-500 hover:text-gray-800 text-sm"
          onClick={() => onAddTask(category.id)}
        >
          <Plus className="h-4 w-4 mr-1" />
          <span>Add Task</span>
        </Button>
      </CardFooter>
    </Card>
  );
}