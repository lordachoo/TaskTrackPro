import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
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
import { Board, CustomField } from "@shared/schema";

export default function Settings() {
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
                <TabsTrigger value="display">Display Settings</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="fields">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Fields</CardTitle>
                    <CardDescription>
                      Manage custom fields that can be added to tasks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customFields.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <p>No custom fields found.</p>
                        <p className="text-sm mt-1">
                          Add custom fields from the task creation form.
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
                                  <i className="ri-delete-bin-line mr-1"></i>
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
              
              <TabsContent value="display">
                <Card>
                  <CardHeader>
                    <CardTitle>Display Settings</CardTitle>
                    <CardDescription>
                      Customize the appearance of your task board.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Theme
                      </label>
                      <div className="flex space-x-3">
                        <Button 
                          variant="outline" 
                          className="flex-1 border-2 border-primary"
                        >
                          <span className="w-4 h-4 bg-white rounded-full mr-2 border border-gray-300"></span>
                          Light
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <span className="w-4 h-4 bg-gray-800 rounded-full mr-2 border border-gray-300"></span>
                          Dark
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <span className="w-4 h-4 rounded-full mr-2 bg-gradient-to-r from-gray-100 to-gray-800 border border-gray-300"></span>
                          System
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Color
                      </label>
                      <div className="flex space-x-3">
                        <Button
                          variant="outline"
                          className="flex-1 bg-indigo-500 text-white hover:bg-indigo-600"
                        >
                          Indigo
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 bg-purple-500 text-white hover:bg-purple-600"
                        >
                          Purple
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 bg-blue-500 text-white hover:bg-blue-600"
                        >
                          Blue
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Density
                      </label>
                      <div className="flex space-x-3">
                        <Button variant="outline" className="flex-1">
                          Compact
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 border-2 border-primary"
                        >
                          Comfortable
                        </Button>
                        <Button variant="outline" className="flex-1">
                          Spacious
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>
                      Manage your account information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <Input 
                        defaultValue="John Smith" 
                        className="max-w-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input 
                        type="email" 
                        defaultValue="john@example.com" 
                        className="max-w-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <Input 
                        type="password" 
                        defaultValue="********" 
                        className="max-w-md mb-2"
                      />
                      <Button variant="link" className="px-0 text-primary">
                        Change Password
                      </Button>
                    </div>
                    
                    <div className="pt-4">
                      <Button>
                        Save Changes
                      </Button>
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
