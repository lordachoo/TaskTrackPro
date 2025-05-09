import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
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
import { Plus, GripVertical } from "lucide-react";
import { FilterOptions, SortOption, SearchOptions } from "@/components/layout/ControlBar";
import { useUsers } from "@/hooks/use-users";

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

  // Fetch the current board data
  const {
    data: currentBoard,
    isLoading: isBoardLoading,
    error: boardError
  } = useQuery({
    queryKey: ['/api/boards', boardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}`);
      if (!res.ok) throw new Error('Failed to load board');
      return res.json();
    }
  });
  
  // Fetch categories
  const { 
    data: categoriesData, 
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
  
  // Sort categories by order field
  const categories = categoriesData ? 
    [...categoriesData].sort((a, b) => (a.order || 0) - (b.order || 0)) : 
    [];
  
  // State to store tasks by category
  const [categoryTasks, setCategoryTasks] = useState<Record<number, Task[]>>({});
  
  // Fetch custom fields
  const {
    data: customFields,
    isLoading: isCustomFieldsLoading,
    error: customFieldsError
  } = useQuery({
    queryKey: ['/api/boards', boardId, 'customFields'],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/customFields`);
      if (!res.ok) throw new Error('Failed to load custom fields');
      return res.json();
    }
  });
  
  // State for filtered tasks
  const [filteredCategoryTasks, setFilteredCategoryTasks] = useState<Record<number, Task[]>>({});
  
  // State for filter, sort, and search options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    priorities: [],
    categories: [],
    assignees: [],
    dueDateRange: 'all',
    hideCompleted: false
  });
  
  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'dueDate',
    direction: 'asc'
  });
  
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    query: "",
    searchAllBoards: false,
    searchInDescription: false
  });
  
  const { users } = useUsers();

  // Fetch tasks for each category using TanStack Query
  useEffect(() => {
    if (!categories || categories.length === 0) return;

    const fetchTasks = async () => {
      const tasksByCategory: Record<number, Task[]> = {};
      
      await Promise.all(categories.map(async (category: Category) => {
        try {
          // Use the cached data if available
          const queryKey = ['/api/categories', category.id, 'tasks'];
          const cachedData = queryClient.getQueryData<Task[]>(queryKey);
          
          if (cachedData) {
            tasksByCategory[category.id] = cachedData;
          } else {
            const res = await fetch(`/api/categories/${category.id}/tasks`);
            if (!res.ok) throw new Error(`Failed to load tasks for category ${category.id}`);
            const tasks = await res.json();
            tasksByCategory[category.id] = tasks;
            
            // Cache the result
            queryClient.setQueryData(queryKey, tasks);
          }
        } catch (error) {
          console.error(`Error fetching tasks for category ${category.id}:`, error);
          tasksByCategory[category.id] = [];
        }
      }));
      
      setCategoryTasks(tasksByCategory);
    };

    fetchTasks();
  }, [categories.map(c => c.id).join(',')]);
  
  // Effect to listen for filter and sort events from ControlBar
  useEffect(() => {
    // Load filter/sort preferences from localStorage on component mount
    const savedFilters = localStorage.getItem('taskFilterOptions');
    const savedSort = localStorage.getItem('taskSortOption');
    
    if (savedFilters) {
      try {
        setFilterOptions(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Error parsing saved filters:', e);
      }
    }
    
    if (savedSort) {
      try {
        setSortOption(JSON.parse(savedSort));
      } catch (e) {
        console.error('Error parsing saved sort option:', e);
      }
    }
    
    // Setup event listeners for filter and sort changes
    const handleFilterChange = (e: CustomEvent<FilterOptions>) => {
      setFilterOptions(e.detail);
    };
    
    const handleSortChange = (e: CustomEvent<SortOption>) => {
      setSortOption(e.detail);
    };
    
    const handleSearchChange = (e: CustomEvent<SearchOptions>) => {
      setSearchOptions(e.detail);
    };
    
    const handleCreateTask = (e: CustomEvent<{categoryId: number}>) => {
      if (e.detail && e.detail.categoryId) {
        handleAddTask(e.detail.categoryId);
      }
    };
    
    window.addEventListener('applyTaskFilters', handleFilterChange as EventListener);
    window.addEventListener('applyTaskSort', handleSortChange as EventListener);
    window.addEventListener('applyTaskSearch', handleSearchChange as EventListener);
    window.addEventListener('createNewTask', handleCreateTask as EventListener);
    
    return () => {
      window.removeEventListener('applyTaskFilters', handleFilterChange as EventListener);
      window.removeEventListener('applyTaskSort', handleSortChange as EventListener);
      window.removeEventListener('applyTaskSearch', handleSearchChange as EventListener);
      window.removeEventListener('createNewTask', handleCreateTask as EventListener);
    };
  }, []);
  
  // Apply filtering, searching, and sorting to tasks
  useEffect(() => {
    if (!categoryTasks || Object.keys(categoryTasks).length === 0) {
      setFilteredCategoryTasks({});
      return;
    }
    
    const newFilteredTasks: Record<number, Task[]> = {};
    
    // If we're searching across all boards and we need to fetch other board tasks
    if (searchOptions.query && searchOptions.searchAllBoards && boardId) {
      // For client-side only, we're working with the current board's tasks
      // In a real application, we would fetch all boards' tasks or create a server endpoint for cross-board search
      console.log("Would search across all boards in a real implementation");
    }
    
    // Apply filters for each category
    Object.entries(categoryTasks).forEach(([categoryId, tasks]) => {
      const categoryIdNum = Number(categoryId);
      
      // Start with all tasks
      let filteredTasks = [...tasks];
      
      // Apply search filter if query exists
      if (searchOptions.query.trim()) {
        const query = searchOptions.query.toLowerCase().trim();
        filteredTasks = filteredTasks.filter(task => {
          const titleMatch = task.title.toLowerCase().includes(query);
          
          // If not searching in descriptions or title already matches, return true/false based on title match
          if (!searchOptions.searchInDescription || titleMatch) {
            return titleMatch;
          }
          
          // Search in description if option is enabled
          return task.description && task.description.toLowerCase().includes(query);
        });
      }
      
      // Apply priority filter
      if (filterOptions.priorities.length > 0) {
        filteredTasks = filteredTasks.filter(task => 
          filterOptions.priorities.includes(task.priority || 'medium')
        );
      }
      
      // Apply category filter
      if (filterOptions.categories.length > 0) {
        if (!filterOptions.categories.includes(categoryId)) {
          filteredTasks = [];
        }
      }
      
      // Apply assignee filter
      if (filterOptions.assignees.length > 0) {
        filteredTasks = filteredTasks.filter(task => {
          if (!task.assignees || task.assignees.length === 0) return false;
          return task.assignees.some(assigneeId => 
            filterOptions.assignees.includes(assigneeId.toString())
          );
        });
      }
      
      // Apply due date filter
      if (filterOptions.dueDateRange !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculate end of week (next Sunday)
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
        
        filteredTasks = filteredTasks.filter(task => {
          if (!task.dueDate) {
            return filterOptions.dueDateRange === 'none';
          }
          
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          switch (filterOptions.dueDateRange) {
            case 'today':
              return dueDate.getTime() === today.getTime();
            case 'week':
              return dueDate >= today && dueDate <= endOfWeek;
            case 'overdue':
              return dueDate < today;
            default:
              return true;
          }
        });
      }
      
      // Apply sort
      filteredTasks.sort((a, b) => {
        switch (sortOption.field) {
          case 'dueDate':
            // Handle null/empty due dates
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return sortOption.direction === 'asc' ? 1 : -1;
            if (!b.dueDate) return sortOption.direction === 'asc' ? -1 : 1;
            
            return sortOption.direction === 'asc' 
              ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
              : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
            
          case 'priority': {
            // Convert priorities to numeric values for comparison
            const priorityMap: Record<string, number> = { 
              low: 1, 
              medium: 2, 
              high: 3 
            };
            
            const aPriority = priorityMap[a.priority || 'medium'] || 2;
            const bPriority = priorityMap[b.priority || 'medium'] || 2;
            
            return sortOption.direction === 'asc' 
              ? aPriority - bPriority
              : bPriority - aPriority;
          }
            
          case 'title':
            return sortOption.direction === 'asc' 
              ? (a.title || '').localeCompare(b.title || '')
              : (b.title || '').localeCompare(a.title || '');
            
          case 'createdAt':
            // Handle createdAt (always present, but explicitly check to be safe)
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            
            return sortOption.direction === 'asc' 
              ? aTime - bTime
              : bTime - aTime;
            
          default:
            return 0;
        }
      });
      
      newFilteredTasks[categoryIdNum] = filteredTasks;
    });
    
    setFilteredCategoryTasks(newFilteredTasks);
  }, [categoryTasks, filterOptions, sortOption, searchOptions, boardId]);

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
      
      // Refresh all data for the board to ensure we have the latest state
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'categories'] });
      
      // Force refresh of all task data across all categories
      if (categories) {
        categories.forEach(category => {
          queryClient.invalidateQueries({ queryKey: ['/api/categories', category.id, 'tasks'] });
        });
      }
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

  // Handle drag and drop for both tasks and categories
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId, type } = result;
    
    // If dropped outside a droppable area
    if (!destination) return;
    
    // If dropped in the same location
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    // Handle column reordering
    if (type === 'column') {
      try {
        console.log('Column drag detected:', result);
        
        // Extract the category ID from the draggableId
        const categoryId = parseInt(draggableId.replace('column-', ''));
        console.log(`Moving category ID ${categoryId} from index ${source.index} to ${destination.index}`);
        
        // Create a new array of categories
        const newCategories = [...categories];
        
        // Find the category being moved
        const categoryToMove = newCategories.find(c => c.id === categoryId);
        if (!categoryToMove) {
          console.error(`Could not find category with ID ${categoryId}`);
          return;
        }
        
        console.log('Category being moved:', categoryToMove);
        
        // Remove the category from its old position
        newCategories.splice(source.index, 1);
        
        // Insert it at the new position
        newCategories.splice(destination.index, 0, categoryToMove);
        
        // Update the order field of each category
        const updatedCategories = newCategories.map((category, index) => ({
          id: category.id,
          name: category.name, // Preserve name when updating
          color: category.color, // Preserve color when updating 
          boardId: category.boardId, // Preserve boardId when updating
          order: index
        }));
        
        console.log('Updated categories with new order:', updatedCategories);
        
        // First update local state to reflect change immediately
        const categoriesWithUpdatedOrder = newCategories.map((cat, index) => ({
          ...cat,
          order: index
        }));
        
        // Update local categories cache with new order for immediate visual feedback
        queryClient.setQueryData(['/api/boards', boardId, 'categories'], categoriesWithUpdatedOrder);
        
        // Update the orders in the backend
        updateCategoryOrdersMutation.mutate(updatedCategories);
      } catch (error) {
        console.error('Error handling column drag:', error);
        // Refresh from server to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'categories'] });
        toast({
          title: "Error reordering columns",
          description: "There was a problem reordering columns. Changes may not be saved.",
          variant: "destructive",
        });
      }
      
      return;
    }
    
    // Handle task reordering/moving (existing logic)
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
  
  // Mutation to update category orders
  const updateCategoryOrdersMutation = useMutation({
    mutationFn: async (updatedCategories: Array<Partial<Category> & { id: number }>) => {
      // Log the update operation for debugging
      console.log('Updating category orders:', updatedCategories);
      
      // Process sequentially to avoid race conditions
      const results = [];
      for (const { id, order } of updatedCategories) {
        try {
          console.log(`Updating category ${id} to order ${order}`);
          const res = await apiRequest('PUT', `/api/categories/${id}`, { order });
          const result = await res.json();
          results.push(result);
          console.log(`Successfully updated category ${id}`, result);
        } catch (err) {
          console.error(`Error updating category ${id}:`, err);
          throw err; // Re-throw to trigger the onError handler
        }
      }
      return results;
    },
    onSuccess: (updatedCategories) => {
      console.log('All categories successfully reordered:', updatedCategories);
      
      // Force a refresh from the server to ensure we have the latest order
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'categories'] });
      
      toast({
        title: "Categories reordered",
        description: "Categories have been reordered successfully.",
      });
    },
    onError: (error) => {
      console.error('Error reordering categories:', error);
      toast({
        title: "Failed to reorder categories",
        description: "There was an error reordering the categories. Please try again.",
        variant: "destructive",
      });
      
      // Refresh the list to restore original order
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'categories'] });
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

  // Handle opening the category form
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsEditMode(true);
    setIsCategoryModalOpen(true);
  };
  
  // Handle creating a new category
  const handleCategorySubmit = (categoryData: Partial<Category>) => {
    if (isEditMode && selectedCategory) {
      // For editing
      updateCategoryMutation.mutate({ 
        id: selectedCategory.id, 
        ...categoryData
      });
    } else {
      // For creating
      // Find the highest order value
      const existingCategories = categories || [];
      const order = existingCategories.length > 0 
        ? Math.max(...existingCategories.map((c: Category) => c.order ?? 0)) + 1
        : 0;
        
      // Create category mutation - implemented in parent component
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'categories'] });
      
      // Send API request to create
      apiRequest('POST', '/api/categories', {
        ...categoryData,
        boardId,
        order
      })
      .then(() => {
        toast({
          title: "Category created",
          description: "Category has been created successfully.",
        });
        setIsCategoryModalOpen(false);
      })
      .catch((error) => {
        console.error('Error creating category:', error);
        toast({
          title: "Failed to create category",
          description: "There was an error creating the category. Please try again.",
          variant: "destructive",
        });
      });
    }
  };
  
  // Handle deleting a category
  const handleDeleteCategory = (categoryId: number) => {
    // Confirm before deletion
    if (window.confirm('Are you sure you want to delete this category and all its tasks?')) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };
  
  // Handle submitting a task
  const handleTaskSubmit = (taskData: any) => {
    // Process custom field data from the form
    // The task form should properly format customData
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
  if (isBoardLoading || isCategoriesLoading || isCustomFieldsLoading) {
    return (
      <div className="flex-1 overflow-hidden bg-gray-50 p-4 flex justify-center items-center">
        <div className="text-lg text-gray-600">Loading board...</div>
      </div>
    );
  }

  // Error state
  if (boardError || categoriesError) {
    const errorMessage = boardError 
      ? (boardError as Error).message 
      : (categoriesError as Error).message;
      
    return (
      <div className="flex-1 overflow-hidden bg-gray-50 p-4 flex justify-center items-center">
        <div className="text-lg text-red-600">Error loading board: {errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 p-4">
      {/* Board info and custom fields summary */}
      {currentBoard && customFields && (
        <div className="flex-shrink-0 mb-4 px-3 py-2 bg-white rounded-md border border-gray-200 shadow-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <h2 className="text-sm font-medium text-gray-700">
              {currentBoard.name}
            </h2>
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            <div className="text-xs text-gray-500">
              {customFields.length === 0 ? (
                <span>No custom fields available for this board</span>
              ) : (
                <span>
                  {customFields.length} custom field{customFields.length !== 1 ? 's' : ''} available: {' '}
                  {customFields.map((field: any, index: number) => (
                    <span key={field.id} className="font-medium">
                      {field.name}{index < customFields.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              )}
              <span className="ml-1 text-xs text-blue-500 hover:underline cursor-pointer" 
                onClick={() => window.location.href = '/settings'}>
                (Manage Fields)
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Main scrollable board area */}
      <div className="flex-1 overflow-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board-columns" direction="horizontal" type="column">
            {(provided) => (
              <div 
                className="flex space-x-4 pb-4"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {categories && categories.map((category: Category, index: number) => (
                  <Draggable 
                    key={category.id} 
                    draggableId={`column-${category.id}`} 
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${snapshot.isDragging ? 'opacity-70' : ''}`}
                      >
                        <div className="flex flex-col">
                          <div 
                            className="mb-1 flex items-center justify-center py-1 px-2 rounded cursor-grab bg-gray-50 hover:bg-gray-100 transition-colors" 
                            {...provided.dragHandleProps}
                          >
                            <GripVertical className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500 font-medium">Drag to reorder</span>
                          </div>
                          <TaskColumn
                            key={category.id}
                            category={category}
                            tasks={
                              // Use filtered tasks if they exist, otherwise use the raw tasks
                              (Object.keys(filteredCategoryTasks).length > 0 
                                ? filteredCategoryTasks[category.id] 
                                : categoryTasks[category.id]) || []
                            }
                            boardId={boardId}
                            onAddTask={handleAddTask}
                            onEditTask={handleEditTask}
                            onArchiveTask={(taskId) => archiveTaskMutation.mutate(taskId)}
                            onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                            onEditCategory={handleEditCategory}
                            onDeleteCategory={handleDeleteCategory}
                          />
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                {/* "Add Column" button removed as requested - users can add new categories via the "Add New" dropdown */}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

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