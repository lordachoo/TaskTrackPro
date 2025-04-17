import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task, Board, Category } from "@shared/schema";

export default function Archived() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all data upfront
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

  const currentBoard: Board = boards && boards.length > 0 ? boards[0] : { id: 1, name: "Marketing Campaign Board", userId: 1 };

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

  // We need to get archived tasks from all boards
  const [allArchivedTasks, setAllArchivedTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<Error | null>(null);
  
  // Use effect to fetch archived tasks from all boards
  useEffect(() => {
    if (!boards || boards.length === 0) {
      setIsTasksLoading(false);
      return;
    }
    
    // Get archived tasks from all boards sequentially
    const fetchAllArchivedTasks = async () => {
      try {
        setIsTasksLoading(true);
        let allTasks: Task[] = [];
        
        for (const board of boards) {
          const res = await fetch(`/api/boards/${board.id}/archivedTasks`);
          if (!res.ok) {
            console.error(`Failed to load archived tasks for board ${board.id}`);
            continue;
          }
          const boardTasks = await res.json();
          allTasks = [...allTasks, ...boardTasks];
        }
        
        setAllArchivedTasks(allTasks);
        setIsTasksLoading(false);
      } catch (error) {
        console.error('Error fetching archived tasks:', error);
        setTasksError(error instanceof Error ? error : new Error('Unknown error'));
        setIsTasksLoading(false);
      }
    };
    
    fetchAllArchivedTasks();
  }, [boards]);
  
  const { 
    data: archivedBoards = [],
    isLoading: isArchivedBoardsLoading
  } = useQuery({
    queryKey: ['/api/users', 1, 'archivedBoards'], // For demo purposes, always use userId 1
    queryFn: async () => {
      const res = await fetch('/api/users/1/archivedBoards');
      if (!res.ok) throw new Error('Failed to load archived boards');
      return res.json();
    }
  });

  // Mutations
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
      
      // Update our local state first
      setAllArchivedTasks(prev => prev.filter(task => task.id !== restoredTask.id));
      
      // Invalidate the category's tasks to ensure it appears there
      queryClient.invalidateQueries({ 
        queryKey: ['/api/categories', restoredTask.categoryId, 'tasks'] 
      });
      
      // Refresh archived tasks cache for all boards
      queryClient.invalidateQueries({
        queryKey: ['/api/boards']
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
      
      // Update our local state first
      setAllArchivedTasks(prev => prev.filter(task => task.id !== taskId));
      
      // Also update any query cache data that may exist
      queryClient.invalidateQueries({
        queryKey: ['/api/boards']
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

  const restoreBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const res = await apiRequest('PUT', `/api/boards/${boardId}/restore`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Board restored",
        description: "The board has been restored successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/users', 1, 'archivedBoards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
    },
    onError: (error) => {
      console.error('Error restoring board:', error);
      toast({
        title: "Failed to restore board",
        description: "There was an error restoring the board. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const res = await apiRequest('DELETE', `/api/boards/${boardId}`, {});
      return boardId;
    },
    onSuccess: () => {
      toast({
        title: "Board deleted",
        description: "The board has been permanently deleted.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/users', 1, 'archivedBoards'] });
    },
    onError: (error) => {
      console.error('Error deleting board:', error);
      toast({
        title: "Failed to delete board",
        description: "There was an error deleting the board. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Utility functions
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

  const formatDateTime = (dateString: string | Date) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const handleRestoreBoard = (boardId: number) => {
    restoreBoardMutation.mutate(boardId);
  };

  const handleDeleteBoard = (boardId: number) => {
    if (window.confirm("Are you sure you want to permanently delete this board? This will also delete all categories, tasks, and custom fields associated with it. This action cannot be undone.")) {
      deleteBoardMutation.mutate(boardId);
    }
  };

  // Loading state for all data
  if (isBoardsLoading || isCategoriesLoading || isTasksLoading || isArchivedBoardsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading archived items...</div>
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
          boardName="Archived Items"
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          disableBoardActions={true}
        />
        
        {/* Archived Content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Archive</h2>
            
            <Tabs defaultValue="tasks" className="w-full mb-8">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="tasks">Archived Tasks</TabsTrigger>
                <TabsTrigger value="boards">Archived Boards</TabsTrigger>
              </TabsList>
              
              {/* Archived Tasks Tab */}
              <TabsContent value="tasks">
                <div className="mt-6">
                  {allArchivedTasks.length === 0 ? (
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
                      {allArchivedTasks.map((task: Task) => {
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
              </TabsContent>
              
              {/* Archived Boards Tab */}
              <TabsContent value="boards">
                <div className="mt-6">
                  {archivedBoards.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <i className="ri-dashboard-3-line text-4xl text-gray-400 mb-4"></i>
                        <p className="text-gray-500 text-center">No archived boards found.</p>
                        <p className="text-gray-500 text-center text-sm mt-1">
                          When you archive boards, they will appear here.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {archivedBoards.map((board: Board) => (
                        <Card key={board.id}>
                          <CardHeader>
                            <CardTitle>{board.name}</CardTitle>
                            <CardDescription>
                              Archived on {formatDateTime(board.createdAt)}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex justify-end space-x-2 mt-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-sm"
                                onClick={() => handleRestoreBoard(board.id)}
                                disabled={restoreBoardMutation.isPending}
                              >
                                <i className="ri-arrow-go-back-line mr-1"></i>
                                Restore
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                className="text-sm"
                                onClick={() => handleDeleteBoard(board.id)}
                                disabled={deleteBoardMutation.isPending}
                              >
                                <i className="ri-delete-bin-line mr-1"></i>
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}