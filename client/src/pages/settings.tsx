import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Trash2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import UserList from "@/components/user/UserList";
import RegistrationSetting from "@/components/user/RegistrationSetting";
import { Board, CustomField } from "@shared/schema";

export default function Settings() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [newField, setNewField] = useState<{
    name: string;
    type: string;
    options: string | null;
    boardId: number;
  }>({ name: '', type: '', options: null, boardId: 1 }); // Default to 1, will update after boards load
  const { toast } = useToast();

  // Fetch all boards
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

  // Set the default selected board when boards load
  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0].id);
      // Update the newField form with the right board ID
      setNewField(prev => ({ ...prev, boardId: boards[0].id }));
    }
  }, [boards, selectedBoardId]);

  // Get the current board object
  const currentBoard = selectedBoardId && boards.length > 0
    ? boards.find((board: Board) => board.id === selectedBoardId) || boards[0]
    : boards.length > 0 ? boards[0] : { id: 1, name: "Marketing Campaign Board", userId: 1 };

  // Fetch custom fields
  const { 
    data: customFields = [],
    isLoading: isFieldsLoading,
    error: fieldsError
  } = useQuery({
    queryKey: ['/api/boards', currentBoard.id, 'customFields'],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${currentBoard.id}/customFields`);
      if (!res.ok) throw new Error('Failed to load custom fields');
      return res.json();
    },
    enabled: !!currentBoard.id
  });

  // Delete custom field mutation
  const deleteCustomFieldMutation = useMutation({
    mutationFn: async (fieldId: number) => {
      const res = await apiRequest('DELETE', `/api/customFields/${fieldId}`, {});
      return fieldId;
    },
    onSuccess: (fieldId) => {
      toast({
        title: "Custom field deleted",
        description: "The custom field has been removed from the board.",
      });
      
      // Update local cache
      queryClient.setQueryData(
        ['/api/boards', currentBoard.id, 'customFields'],
        (oldData: CustomField[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(field => field.id !== fieldId);
        }
      );
    },
    onError: (error) => {
      console.error('Error deleting custom field:', error);
      toast({
        title: "Failed to delete custom field",
        description: "There was an error deleting the custom field. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Add custom field mutation
  const addFieldMutation = useMutation({
    mutationFn: async (fieldData: typeof newField) => {
      const res = await apiRequest('POST', '/api/customFields', fieldData);
      return res.json();
    },
    onSuccess: (newField: CustomField) => {
      toast({
        title: "Custom field added",
        description: `The custom field "${newField.name}" has been added to the board.`,
      });
      
      // Update local cache
      queryClient.setQueryData(
        ['/api/boards', currentBoard.id, 'customFields'],
        (oldData: CustomField[] | undefined) => {
          if (!oldData) return [newField];
          return [...oldData, newField];
        }
      );
      
      // Reset form and close it
      setIsAddingField(false);
      setNewField({ name: '', type: '', options: null, boardId: currentBoard.id });
    },
    onError: (error) => {
      console.error('Error adding custom field:', error);
      toast({
        title: "Failed to add custom field",
        description: "There was an error adding the custom field. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure we have the current board ID
    const fieldData = {
      ...newField,
      boardId: currentBoard.id
    };
    
    // Validate options for select type
    if (fieldData.type === 'select' && (!fieldData.options || fieldData.options.trim() === '')) {
      toast({
        title: "Validation error",
        description: "Please provide comma-separated options for the dropdown field.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the mutation
    addFieldMutation.mutate(fieldData);
  };

  const handleDeleteField = (fieldId: number) => {
    if (window.confirm("Are you sure you want to delete this custom field? This may affect existing tasks.")) {
      deleteCustomFieldMutation.mutate(fieldId);
    }
  };

  // Loading state
  if (isBoardsLoading || isFieldsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading settings...</div>
      </div>
    );
  }

  // Error state
  if (fieldsError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-red-600">Error loading settings: {(fieldsError as Error).message}</div>
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
          boardName="Settings"
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        {/* Settings Content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>
            
            <Tabs defaultValue="fields">
              <TabsList className="mb-6">
                <TabsTrigger value="fields">Custom Fields</TabsTrigger>
                <TabsTrigger value="users">User Management</TabsTrigger>
              </TabsList>
              
              <TabsContent value="fields">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Custom Fields</CardTitle>
                      <CardDescription>
                        Manage custom fields that can be added to tasks.
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => setIsAddingField(true)}
                      className="ml-auto"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {/* Board Selector */}
                    {boards.length > 1 && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-md border">
                        <h3 className="text-sm font-medium mb-2 text-gray-700">Select Board</h3>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          value={selectedBoardId || ''}
                          onChange={(e) => {
                            const newBoardId = parseInt(e.target.value);
                            setSelectedBoardId(newBoardId);
                            // Update the newField form with the right board ID
                            setNewField(prev => ({ ...prev, boardId: newBoardId }));
                          }}
                        >
                          {boards.map((board: Board) => (
                            <option key={board.id} value={board.id}>
                              {board.name} (Board #{board.id})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Custom fields are board-specific. Select a board to manage its custom fields.
                        </p>
                      </div>
                    )}
                    {isAddingField && (
                      <div className="mb-8 p-4 border rounded-md bg-gray-50">
                        <h3 className="text-lg font-medium mb-4">Add New Custom Field</h3>
                        <form onSubmit={handleAddField} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Field Name
                              </label>
                              <Input
                                value={newField.name}
                                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                                placeholder="Enter field name"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Field Type
                              </label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                value={newField.type}
                                onChange={(e) => {
                                  setNewField({ 
                                    ...newField, 
                                    type: e.target.value,
                                    // Reset options when changing type
                                    options: e.target.value === 'select' ? newField.options : null
                                  });
                                }}
                                required
                              >
                                <option value="">Select a type</option>
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="date">Date</option>
                                <option value="select">Dropdown</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="url">URL</option>
                              </select>
                            </div>
                          </div>
                          
                          {newField.type === 'select' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Options (comma-separated)
                              </label>
                              <Input
                                value={newField.options || ''}
                                onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                                placeholder="Option 1, Option 2, Option 3"
                                required
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Enter dropdown options separated by commas
                              </p>
                            </div>
                          )}
                          
                          <div className="flex gap-2 justify-end">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => {
                                setIsAddingField(false);
                                setNewField({ name: '', type: '', options: null, boardId: currentBoard.id });
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit"
                              disabled={addFieldMutation.isPending || !newField.name || !newField.type}
                            >
                              {addFieldMutation.isPending ? 'Adding...' : 'Add Field'}
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                    
                    {customFields.length === 0 && !isAddingField ? (
                      <div className="text-center py-6 text-gray-500">
                        <p>No custom fields found.</p>
                        <p className="text-sm mt-1">
                          Click the "Add Field" button to create your first custom field.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Options</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customFields.map((field: CustomField) => (
                            <TableRow key={field.id}>
                              <TableCell className="font-medium">{field.name}</TableCell>
                              <TableCell className="capitalize">{field.type}</TableCell>
                              <TableCell>
                                {field.type === 'select' && field.options ? (
                                  <div className="text-xs text-gray-600">
                                    {field.options.split(',').join(', ')}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteField(field.id)}
                                  disabled={deleteCustomFieldMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="users">
                {/* Registration Settings */}
                <RegistrationSetting />
                
                {/* User List */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Add, edit, and manage users for your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <UserList />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
