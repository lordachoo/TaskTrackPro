import { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Task, Category, Board } from "@shared/schema";
import TaskColumn from "./TaskColumn";
import TaskForm from "./TaskForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface TaskBoardProps {
  boardId: number;
  onAddCategory: () => void;
}

export default function TaskBoard({ boardId, onAddCategory }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

  // Fetch categories
  const { 
    data: categories, 
    isLoading: isCategoriesLoading,
    error: categoriesError
  } = useQuery({
    queryKey: ['/api/boards', boardId, 'categories'],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/categories`);
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    }
  });

  // Create state to hold tasks for each category
  const [categoryTasks, setCategoryTasks] = useState<Record<number, Task[]>>({});

  // Fetch tasks for each category
  useEffect(() => {
    if (!categories || categories.length === 0) return;

    const fetchTasks = async () => {
      const tasksByCategory: Record<number, Task[]> = {};
      
      await Promise.all(categories.map(async (category: Category) => {
        try {
          const res = await fetch(`/api/categories/${category.id}/tasks`);
          if (!res.ok) throw new Error(`Failed to load tasks for category ${category.id}`);
          const tasks = await res.json();
          tasksByCategory[category.id] = tasks;
        } catch (error) {
          console.error(`Error fetching tasks for category ${category.id}:`, error);
          tasksByCategory[category.id] = [];
        }
      }));
      
      setCategoryTasks(tasksByCategory);
    };

    fetchTasks();
  }, [categories]);

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: async (newTask: Omit<Task, 'id' | 'createdAt'>) => {
      const res = await apiRequest('POST', '/api/tasks', newTask);
      return res.json();
    },
    onSuccess: (newTask: Task) => {
      // Update local state
      setCategoryTasks(prev => ({
        ...prev,
        [newTask.categoryId]: [...(prev[newTask.categoryId] || []), newTask]
      }));
      
      toast({
        title: "Task created",
        description: "Task has been created successfully.",
      });
      
      setIsTaskModalOpen(false);
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({
        title: "Failed to create task",
        description: "There was an error creating the task. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<Task> & { id: number }) => {
      const { id, ...taskData } = updatedTask;
      const res = await apiRequest('PUT', `/api/tasks/${id}`, taskData);
      return res.json();
    },
    onSuccess: (updatedTask: Task) => {
      // Update local state
      setCategoryTasks(prev => {
        const newTasks = { ...prev };
        // Remove from old category if it changed
        Object.keys(newTasks).forEach(catId => {
          newTasks[Number(catId)] = newTasks[Number(catId)].filter(t => t.id !== updatedTask.id);
        });
        // Add to new category
        newTasks[updatedTask.categoryId] = [
          ...(newTasks[updatedTask.categoryId] || []),
          updatedTask
        ];
        return newTasks;
      });
      
      toast({
        title: "Task updated",
        description: "Task has been updated successfully.",
      });
      
      setIsTaskModalOpen(false);
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast({
        title: "Failed to update task",
        description: "There was an error updating the task. Please try again.",
        variant: "destructive",
      });
    }
  });

  const archiveTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest('PUT', `/api/tasks/${taskId}/archive`, {});
      return res.json();
    },
    onSuccess: (archivedTask: Task) => {
      // Update local state
      setCategoryTasks(prev => {
        const newTasks = { ...prev };
        newTasks[archivedTask.categoryId] = newTasks[archivedTask.categoryId].filter(
          t => t.id !== archivedTask.id
        );
        return newTasks;
      });
      
      toast({
        title: "Task archived",
        description: "Task has been moved to the archive.",
      });
    },
    onError: (error) => {
      console.error('Error archiving task:', error);
      toast({
        title: "Failed to archive task",
        description: "There was an error archiving the task. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    // If dropped outside a droppable area
    if (!destination) return;
    
    // If dropped in the same location
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    // Extract the category IDs
    const sourceId = parseInt(source.droppableId.replace('category-', ''));
    const destinationId = parseInt(destination.droppableId.replace('category-', ''));
    
    // Get the task ID
    const taskId = parseInt(draggableId.replace('task-', ''));
    
    // Find the task
    const task = categoryTasks[sourceId].find(t => t.id === taskId);
    if (!task) return;
    
    // Create a new task with the updated category
    const updatedTask = { ...task, categoryId: destinationId };
    
    // Update the task in the backend
    updateTaskMutation.mutate({ id: taskId, categoryId: destinationId });
    
    // Update local state immediately for a smoother UX
    setCategoryTasks(prev => {
      const newTasks = { ...prev };
      
      // Remove from source
      newTasks[sourceId] = newTasks[sourceId].filter(t => t.id !== taskId);
      
      // Add to destination
      const newDestTasks = [...newTasks[destinationId]];
      newDestTasks.splice(destination.index, 0, updatedTask);
      newTasks[destinationId] = newDestTasks;
      
      return newTasks;
    });
  };

  // Handle opening the task form
  const handleAddTask = (categoryId: number) => {
    setSelectedTask(null);
    setIsEditMode(false);
    setIsTaskModalOpen(true);
    // Pre-select the category
    const category = categories.find((c: Category) => c.id === categoryId);
    setSelectedCategory(category || null);
  };

  // Handle editing a task
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditMode(true);
    setIsTaskModalOpen(true);
    // Set the category
    const category = categories.find((c: Category) => c.id === task.categoryId);
    setSelectedCategory(category || null);
  };

  // Handle submitting the task form
  const handleTaskSubmit = (taskData: Partial<Task>) => {
    if (isEditMode && selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask.id, ...taskData });
    } else {
      createTaskMutation.mutate(taskData as Omit<Task, 'id' | 'createdAt'>);
    }
  };

  // Loading state
  if (isCategoriesLoading) {
    return (
      <div className="flex-1 overflow-hidden bg-gray-50 p-4 flex justify-center items-center">
        <div className="text-lg text-gray-600">Loading board...</div>
      </div>
    );
  }

  // Error state
  if (categoriesError) {
    return (
      <div className="flex-1 overflow-hidden bg-gray-50 p-4 flex justify-center items-center">
        <div className="text-lg text-red-600">Error loading board: {(categoriesError as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-gray-50 p-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-container h-full flex space-x-4 pb-4">
          {categories && categories.map((category: Category) => (
            <TaskColumn
              key={category.id}
              category={category}
              tasks={categoryTasks[category.id] || []}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onArchiveTask={(taskId) => archiveTaskMutation.mutate(taskId)}
              onEditCategory={() => {}}
              onDeleteCategory={() => {}}
            />
          ))}
          
          {/* Add Column Button */}
          <div className="flex items-center justify-center min-w-[120px]">
            <Button 
              variant="ghost"
              className="h-12 px-4 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-primary hover:border-primary flex items-center justify-center"
              onClick={onAddCategory}
            >
              <i className="ri-add-line mr-1"></i>
              <span>Add Column</span>
            </Button>
          </div>
        </div>
      </DragDropContext>

      {/* Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <TaskForm
            boardId={boardId}
            categories={categories || []}
            initialCategory={selectedCategory}
            initialData={selectedTask}
            isEdit={isEditMode}
            onSubmit={handleTaskSubmit}
            onCancel={() => setIsTaskModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
