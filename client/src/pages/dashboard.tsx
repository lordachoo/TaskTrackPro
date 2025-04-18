import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import ControlBar from "@/components/layout/ControlBar";
import TaskBoard from "@/components/task/TaskBoard";
import { Board, Category } from "@shared/schema";

// Form schema
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format")
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function Dashboard() {
  // State hooks - keep these at the top
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBoardId, setActiveBoardId] = useState<number | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [boardSelectorOpen, setBoardSelectorOpen] = useState(false);
  const { toast } = useToast();

  // All mutation hooks - define ALL hooks before any conditional returns
  // Create board mutation
  const createBoardMutation = useMutation({
    mutationFn: async (boardName: string) => {
      const res = await apiRequest('POST', '/api/boards', { 
        name: boardName, 
        userId: 1 
      });
      return res.json();
    },
    onSuccess: (newBoard) => {
      toast({
        title: "Board created",
        description: "The new board has been created successfully.",
      });
      // Add new board to cached data
      queryClient.setQueryData(['/api/boards'], (oldData: Board[] | undefined) => {
        if (!oldData) return [newBoard];
        return [...oldData, newBoard];
      });
      
      // Set the active board to the new board and activate it
      setActiveBoardId(newBoard.id);
    },
    onError: (error) => {
      console.error('Error creating board:', error);
      toast({
        title: "Failed to create board",
        description: "There was an error creating the board. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Delete board mutation
  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const res = await apiRequest('DELETE', `/api/boards/${boardId}`, {});
      return boardId;
    },
    onSuccess: (deletedBoardId) => {
      toast({
        title: "Board deleted",
        description: "The board has been permanently deleted.",
      });
      
      // Remove the deleted board from cache
      queryClient.setQueryData(['/api/boards'], (oldData: Board[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(board => board.id !== deletedBoardId);
      });
      
      // If the deleted board was the active one, select the first available board
      queryClient.fetchQuery({
        queryKey: ['/api/boards'],
        queryFn: async () => {
          const res = await fetch('/api/boards');
          if (!res.ok) throw new Error('Failed to load boards');
          return res.json();
        }
      }).then((boards: Board[]) => {
        if (boards.length > 0) {
          setActiveBoardId(boards[0].id);
        } else {
          setActiveBoardId(undefined);
        }
      });
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

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (newCategory: CategoryFormValues & { boardId: number, order: number }) => {
      const res = await apiRequest('POST', '/api/categories', newCategory);
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Category created",
        description: "The new category has been added to the board.",
      });
      setIsCategoryModalOpen(false);
      categoryForm.reset();
      // Refetch categories
      queryClient.invalidateQueries({ queryKey: ['/api/boards', variables.boardId, 'categories'] });
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

  // Update board name mutation
  const updateBoardNameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number, name: string }) => {
      const res = await apiRequest('PUT', `/api/boards/${id}`, { name });
      return res.json();
    },
    onSuccess: (updatedBoard) => {
      toast({
        title: "Board name updated",
        description: "The board name has been successfully updated.",
      });
      // Update local cache
      queryClient.setQueryData(['/api/boards'], (oldData: Board[] | undefined) => {
        if (!oldData) return [updatedBoard];
        return oldData.map(board => 
          board.id === updatedBoard.id ? updatedBoard : board
        );
      });
    },
    onError: (error) => {
      console.error('Error updating board name:', error);
      toast({
        title: "Failed to update board name",
        description: "There was an error updating the board name. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Archive board mutation
  const archiveBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const res = await apiRequest('PUT', `/api/boards/${boardId}/archive`, {});
      return res.json();
    },
    onSuccess: (archivedBoard) => {
      toast({
        title: "Board archived",
        description: "The board has been moved to the archive. You can restore it from the Archive page.",
      });
      // Redirect to another board or create a new one
      // For now, we'll just navigate to the archived page
      window.location.href = '/archived';
    },
    onError: (error) => {
      console.error('Error archiving board:', error);
      toast({
        title: "Failed to archive board",
        description: "There was an error archiving the board. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Category form
  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      color: "#6366f1" // default color
    }
  });

  // Data fetching - Fetch all active boards
  const { 
    data: boards = [],
    isLoading: isBoardsLoading
  } = useQuery({
    queryKey: ['/api/boards'],
    queryFn: async () => {
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to load boards');
      return res.json();
    }
  });

  // Set active board ID if it's not set and we have boards
  useEffect(() => {
    if (boards.length > 0 && !activeBoardId) {
      setActiveBoardId(boards[0].id);
    }
  }, [boards, activeBoardId]);
  
  // Find the active board using the activeBoardId
  const currentBoard = activeBoardId 
    ? boards.find((board: Board) => board.id === activeBoardId) || (boards.length > 0 ? boards[0] : null)
    : (boards.length > 0 ? boards[0] : null);
  
  // Fetch categories for the current board (if we have one)
  const { 
    data: categoriesData = [],
    isLoading: isCategoriesLoading
  } = useQuery({
    queryKey: ['/api/boards', currentBoard?.id, 'categories'],
    queryFn: async () => {
      if (!currentBoard?.id) return [];
      const res = await fetch(`/api/boards/${currentBoard.id}/categories`);
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    },
    enabled: !!currentBoard?.id
  });

  // Event handlers
  const handleCategoryFormSubmit = (data: CategoryFormValues) => {
    if (!currentBoard?.id) {
      toast({
        title: "Error",
        description: "No active board found. Please create a board first.",
        variant: "destructive",
      });
      return;
    }
    
    // Get existing categories to determine next order value
    queryClient.fetchQuery({
      queryKey: ['/api/boards', currentBoard.id, 'categories'],
      queryFn: async () => {
        const res = await fetch(`/api/boards/${currentBoard.id}/categories`);
        if (!res.ok) throw new Error('Failed to load categories');
        return res.json();
      }
    }).then((categories: Category[]) => {
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.order))
        : -1;
      
      createCategoryMutation.mutate({
        ...data,
        boardId: currentBoard.id,
        order: maxOrder + 1
      });
    }).catch(error => {
      console.error('Error fetching categories:', error);
      // Fallback to order 0 if we can't determine
      createCategoryMutation.mutate({
        ...data,
        boardId: currentBoard.id,
        order: 0
      });
    });
  };

  const handleBoardNameChange = (name: string) => {
    if (!currentBoard) return;
    
    if (currentBoard.id) {
      updateBoardNameMutation.mutate({
        id: currentBoard.id,
        name
      });
    }
  };
  
  const handleBoardArchive = () => {
    if (!currentBoard) return;
    
    if (window.confirm(`Are you sure you want to archive the board "${currentBoard.name}"? All tasks and categories will be archived with it.`)) {
      if (currentBoard.id) {
        archiveBoardMutation.mutate(currentBoard.id);
      }
    }
  };

  // Handle creating a new board
  const handleCreateBoard = () => {
    const boardName = prompt("Enter a name for your new board:");
    if (boardName) {
      createBoardMutation.mutate(boardName);
    }
  };
  
  // Handle board selection
  const handleBoardSelect = (boardId: number) => {
    setActiveBoardId(boardId);
    setBoardSelectorOpen(false);
    
    // Invalidate categories and tasks queries for the new board
    queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId, 'categories'] });
  };
  
  // Handle board deletion
  const handleBoardDelete = () => {
    if (!currentBoard) return;
    
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm board deletion
  const confirmBoardDelete = () => {
    if (!currentBoard) return;
    
    deleteBoardMutation.mutate(currentBoard.id);
    setIsDeleteDialogOpen(false);
  };

  // Placeholder handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In a real implementation, filter tasks by query
  };

  const handleFilter = () => {
    toast({
      title: "Filter functionality",
      description: "This would open a filter dialog in a full implementation.",
    });
  };

  const handleSort = () => {
    toast({
      title: "Sort functionality",
      description: "This would open a sort options dialog in a full implementation.",
    });
  };

  // Loading state
  if (isBoardsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // No active boards case
  if (!currentBoard) {
    return (
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />
        
        {/* Empty state with create board button */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
          <div className="text-center max-w-md">
            <i className="ri-dashboard-3-line text-6xl text-gray-300 mb-4"></i>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">No Active Boards</h1>
            <p className="text-gray-600 mb-6">Create a new board to get started with your tasks.</p>
            <Button 
              size="lg"
              onClick={handleCreateBoard}
              className="flex items-center justify-center"
              disabled={createBoardMutation.isPending}
            >
              <i className="ri-add-line mr-2"></i>
              {createBoardMutation.isPending ? "Creating..." : "Create New Board"}
            </Button>
            <div className="mt-8">
              <Link to="/archived" className="text-blue-500 flex items-center justify-center">
                <i className="ri-archive-line mr-2"></i>
                View Archived Boards
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal view with active board
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
          boardName={currentBoard.name} 
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onBoardNameChange={handleBoardNameChange}
          onBoardArchive={handleBoardArchive}
          onBoardDelete={handleBoardDelete}
          allBoards={boards}
          activeBoardId={activeBoardId}
          onBoardSelect={handleBoardSelect}
          boardSelectorOpen={boardSelectorOpen}
          onBoardSelectorToggle={() => setBoardSelectorOpen(!boardSelectorOpen)}
        />
        
        {/* Control Bar */}
        <ControlBar 
          onCreateTask={() => {
            // This will be handled by the TaskBoard component
            const createTaskButton = document.querySelector('.task-column:first-child button.flex.items-center.justify-center');
            if (createTaskButton) {
              (createTaskButton as HTMLElement).click();
            }
          }}
          onAddCategory={() => setIsCategoryModalOpen(true)}
          onSearch={handleSearch}
          onFilter={(options) => {
            console.log('Filter options:', options);
            // Store the filter options in local storage
            localStorage.setItem('taskFilterOptions', JSON.stringify(options));
            // Apply filter by dispatching a custom event that TaskBoard will listen for
            window.dispatchEvent(new CustomEvent('applyTaskFilters', { 
              detail: options 
            }));
          }}
          onSort={(option) => {
            console.log('Sort option:', option);
            // Store the sort options in local storage
            localStorage.setItem('taskSortOption', JSON.stringify(option));
            // Apply sort by dispatching a custom event that TaskBoard will listen for
            window.dispatchEvent(new CustomEvent('applyTaskSort', { 
              detail: option 
            }));
          }}
          onCreateBoard={handleCreateBoard}
          categories={categoriesData || []}
        />
        
        {/* Task Board */}
        <TaskBoard 
          boardId={currentBoard.id}
        />
      </div>
      
      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(handleCategoryFormSubmit)} className="space-y-4 py-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., To Do, In Progress, Completed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Input {...field} type="color" className="w-12 h-8 p-1" />
                      </FormControl>
                      <Input 
                        value={field.value} 
                        onChange={(e) => field.onChange(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Board Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the board
              <span className="font-medium text-foreground"> "{currentBoard?.name}" </span>
              and all of its tasks and categories.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBoardDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}