import { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Task, Category, Board } from "@shared/schema";
import TaskColumn from "./TaskColumn";
import TaskForm from "./TaskForm";
import CategoryForm from "./CategoryForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface TaskBoardProps {
  boardId: number;
}

export default function TaskBoard({ boardId }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
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
  
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      // Log the task we're attempting to delete
      console.log(`Attempting to delete task with ID: ${taskId}`);
      
      // Find the task's category before deletion for better state management
      let taskCategory = 0;
      for (const [catId, tasks] of Object.entries(categoryTasks)) {
        const foundTask = tasks.find(t => t.id === taskId);
        if (foundTask) {
          taskCategory = Number(catId);
          console.log(`Found task ${taskId} in category ${taskCategory}`);
          break;
        }
      }
      
      // Perform the deletion
      const res = await apiRequest('DELETE', `/api/tasks/${taskId}`, {});
      console.log(`Delete API call completed with status: ${res.status}`);
      
      return { 
        taskId, 
        categoryId: taskCategory || Number(res.headers.get('X-Category-ID') || 0) 
      };
    },
    onSuccess: (data: { taskId: number, categoryId: number }) => {
      console.log(`Task deletion successful, updating UI for task ${data.taskId} in category ${data.categoryId}`);
      
      // Immediately update local state to remove the task
      setCategoryTasks(prev => {
        const newTasks = { ...prev };
        
        // Remove the task from ALL categories to be safe
        Object.keys(newTasks).forEach(catId => {
          const catIdNum = Number(catId);
          const filtered = newTasks[catIdNum].filter(t => {
            const keep = t.id !== data.taskId;
            if (!keep) {
              console.log(`Removing task ${t.id} from category ${catIdNum}`);
            }
            return keep;
          });
          newTasks[catIdNum] = filtered;
        });
        
        console.log("Updated tasks state:", newTasks);
        return newTasks;
      });
      
      // Also invalidate the query cache to ensure data consistency
      queryClient.invalidateQueries({ 
        queryKey: ['/api/categories', data.categoryId, 'tasks'] 
      });
      
      toast({
        title: "Task deleted",
        description: "Task has been permanently deleted.",
      });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({
        title: "Failed to delete task",
        description: "There was an error deleting the task. Please try again.",
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

  // Category mutations
  const updateCategoryMutation = useMutation({
    mutationFn: async (updatedCategory: Partial<Category> & { id: number }) => {
      const { id, ...categoryData } = updatedCategory;
      const res = await apiRequest('PUT', `/api/categories/${id}`, categoryData);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate categories query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'categories'] });
      
      toast({
        title: "Category updated",
        description: "Category has been updated successfully.",
      });
      
      setIsCategoryModalOpen(false);
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      toast({
        title: "Failed to update category",
        description: "There was an error updating the category. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const res = await apiRequest('DELETE', `/api/categories/${categoryId}`, {});
      return { categoryId };
    },
    onSuccess: () => {
      // Invalidate categories query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'categories'] });
      
      toast({
        title: "Category deleted",
        description: "Category has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
      toast({
        title: "Failed to delete category",
        description: "There was an error deleting the category. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle editing a category
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsEditMode(true);
    setIsCategoryModalOpen(true);
  };
  
  // Handle deleting a category
  const handleDeleteCategory = (categoryId: number) => {
    deleteCategoryMutation.mutate(categoryId);
  };
  
  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (newCategory: Partial<Category> & { boardId: number }) => {
      // Get existing categories to determine the next order value
      const categoriesResponse = await fetch(`/api/boards/${boardId}/categories`);
      const existingCategories = await categoriesResponse.json();
      
      // Calculate the max order
      const maxOrder = existingCategories.length > 0 
        ? Math.max(...existingCategories.map((c: Category) => c.order ?? 0))
        : -1;
      
      // Add the order field to the category data
      const categoryWithOrder = {
        ...newCategory,
        order: maxOrder + 1
      };
      
      const res = await apiRequest('POST', '/api/categories', categoryWithOrder);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate categories query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'categories'] });
      
      toast({
        title: "Category created",
        description: "Category has been created successfully.",
      });
      
      setIsCategoryModalOpen(false);
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast({
        title: "Failed to create category",
        description: "There was an error creating the category. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle submitting the category form
  const handleCategorySubmit = (categoryData: Partial<Category> & { boardId: number }) => {
    if (isEditMode && selectedCategory) {
      updateCategoryMutation.mutate({
        ...categoryData,
        id: selectedCategory.id
      });
    } else {
      // Create a new category directly
      createCategoryMutation.mutate(categoryData);
    }
  };

  // Handle submitting the task form
  const handleTaskSubmit = (taskData: Partial<Task>) => {
    // Log the task data to debug custom fields
    console.log('Task data to submit:', taskData);
    
    // Make sure customData is properly formatted for the API
    const processedData = {
      ...taskData,
      // Ensure customData exists and doesn't have undefined fields
      customData: taskData.customData || {}
    };
    
    if (isEditMode && selectedTask) {
      // For editing, merge with existing customData to ensure proper update
      const mergedData = {
        ...processedData,
        id: selectedTask.id
      };
      console.log('Updating task with data:', mergedData);
      updateTaskMutation.mutate(mergedData);
    } else {
      console.log('Creating task with data:', processedData);
      createTaskMutation.mutate(processedData as Omit<Task, 'id' | 'createdAt'>);
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
              boardId={boardId}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onArchiveTask={(taskId) => archiveTaskMutation.mutate(taskId)}
              onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          ))}
          
          {/* Add Column Button */}
          <div className="flex items-center justify-center min-w-[120px]">
            <Button 
              variant="ghost"
              className="h-12 px-4 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-primary hover:border-primary flex items-center justify-center"
              onClick={() => {
                setSelectedCategory(null);
                setIsEditMode(false);
                setIsCategoryModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
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

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <CategoryForm
            boardId={boardId}
            initialData={selectedCategory}
            isEdit={isEditMode}
            onSubmit={handleCategorySubmit}
            onCancel={() => setIsCategoryModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
