import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { Task, Board, Category } from "@shared/schema";

export default function Archived() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  // Fetch the first board (for demo purposes)
  const { 
    data: boards,
    isLoading: isBoardsLoading
  } = useQuery({
    queryKey: ['/api/boards'],
    queryFn: async () => {
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to load boards');
      return res.json();
    }
  });

  // Use the first board or default to ID 1
  const currentBoard: Board = boards && boards.length > 0 ? boards[0] : { id: 1, name: "Marketing Campaign Board", userId: 1 };

  // Fetch categories for the current board
  const { 
    data: categories = [],
    isLoading: isCategoriesLoading
  } = useQuery({
    queryKey: ['/api/boards', currentBoard.id, 'categories'],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${currentBoard.id}/categories`);
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    },
    enabled: !!currentBoard.id
  });

  // Fetch archived tasks
  const { 
    data: archivedTasks = [],
    isLoading: isTasksLoading,
    error: tasksError
  } = useQuery({
    queryKey: ['/api/boards', currentBoard.id, 'archivedTasks'],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${currentBoard.id}/archivedTasks`);
      if (!res.ok) throw new Error('Failed to load archived tasks');
      return res.json();
    },
    enabled: !!currentBoard.id
  });

  // Restore task mutation
  const restoreTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest('PUT', `/api/tasks/${taskId}/restore`, {});
      return res.json();
    },
    onSuccess: (restoredTask) => {
      toast({
        title: "Task restored",
        description: "The task has been moved back to its category.",
      });
      
      // Update local cache by removing the task from archived tasks
      queryClient.setQueryData(
        ['/api/boards', currentBoard.id, 'archivedTasks'],
        (oldData: Task[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(task => task.id !== restoredTask.id);
        }
      );
      
      // Invalidate the category's tasks to ensure it appears there
      queryClient.invalidateQueries({ 
        queryKey: ['/api/categories', restoredTask.categoryId, 'tasks'] 
      });
    },
    onError: (error) => {
      console.error('Error restoring task:', error);
      toast({
        title: "Failed to restore task",
        description: "There was an error restoring the task. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete task permanently mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest('DELETE', `/api/tasks/${taskId}`, {});
      return taskId;
    },
    onSuccess: (taskId) => {
      toast({
        title: "Task deleted",
        description: "The task has been permanently deleted.",
      });
      
      // Update local cache by removing the task from archived tasks
      queryClient.setQueryData(
        ['/api/boards', currentBoard.id, 'archivedTasks'],
        (oldData: Task[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(task => task.id !== taskId);
        }
      );
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

  const getCategoryById = (categoryId: number): Category | undefined => {
    return categories.find((cat: Category) => cat.id === categoryId);
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

  const handleRestore = (taskId: number) => {
    restoreTaskMutation.mutate(taskId);
  };

  const handleDelete = (taskId: number) => {
    if (window.confirm("Are you sure you want to permanently delete this task? This action cannot be undone.")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  // Loading state
  if (isBoardsLoading || isCategoriesLoading || isTasksLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading archived tasks...</div>
      </div>
    );
  }

  // Error state
  if (tasksError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-red-600">Error loading archived tasks: {(tasksError as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <TopNav 
          boardName={`${currentBoard.name} - Archived Tasks`}
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        {/* Archived Tasks */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Archived Tasks</h2>
            
            {archivedTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <i className="ri-archive-line text-4xl text-gray-400 mb-4"></i>
                  <p className="text-gray-500 text-center">No archived tasks found.</p>
                  <p className="text-gray-500 text-center text-sm mt-1">
                    When you archive tasks, they will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {archivedTasks.map((task: Task) => {
                  const category = getCategoryById(task.categoryId);
                  
                  return (
                    <Card key={task.id} className="overflow-hidden">
                      {category && (
                        <div 
                          className="h-1" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            {category ? category.name : 'Unknown Category'}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {task.description && (
                          <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
                          {task.priority && (
                            <span className="bg-gray-100 px-2 py-1 rounded-full">
                              Priority: {task.priority}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="bg-gray-100 px-2 py-1 rounded-full">
                              Due: {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-sm"
                            onClick={() => handleRestore(task.id)}
                            disabled={restoreTaskMutation.isPending}
                          >
                            <i className="ri-arrow-go-back-line mr-1"></i>
                            Restore
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="text-sm"
                            onClick={() => handleDelete(task.id)}
                            disabled={deleteTaskMutation.isPending}
                          >
                            <i className="ri-delete-bin-line mr-1"></i>
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
