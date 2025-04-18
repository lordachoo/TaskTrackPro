import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CustomFieldFormProps {
  boardId: number;
  onClose: () => void;
  onSuccess: () => void;
}

// Create form schema
const customFieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  type: z.enum(["text", "number", "date", "select", "checkbox", "url"]),
  options: z.string().optional(),
  boardId: z.number()
});

type CustomFieldFormValues = z.infer<typeof customFieldSchema>;

export default function CustomFieldForm({
  boardId,
  onClose,
  onSuccess
}: CustomFieldFormProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();
  
  // Set up form with default values
  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      name: "",
      type: "text",
      options: "",
      boardId
    }
  });

  // Field type options
  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "select", label: "Dropdown" },
    { value: "checkbox", label: "Checkbox" },
    { value: "url", label: "URL" }
  ];

  // Create custom field mutation
  const createCustomFieldMutation = useMutation({
    mutationFn: async (newField: CustomFieldFormValues) => {
      try {
        console.log('Submitting new custom field:', newField);
        const res = await apiRequest('POST', '/api/customFields', newField);
        
        if (!res.ok) {
          let errorMessage = 'Failed to create custom field';
          try {
            const errorData = await res.json();
            errorMessage = errorData?.message || errorMessage;
            console.error('Server returned error:', errorData);
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
          }
          throw new Error(errorMessage);
        }
        
        const data = await res.json();
        console.log('Successfully created custom field:', data);
        return data;
      } catch (error: any) {
        console.error('Error creating custom field:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Custom field created successfully:', data);
      toast({
        title: "Custom field created",
        description: "The custom field has been added to the board.",
      });
      handleClose();
      onSuccess();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Unknown error occurred";
      console.error('Error creating custom field:', errorMessage);
      toast({
        title: "Failed to create custom field",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const handleFormSubmit = (data: CustomFieldFormValues) => {
    // Clean up options if not a select type
    if (data.type !== 'select') {
      data.options = undefined;
    }
    
    createCustomFieldMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Field</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Budget, Timeline, URL" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch('type') === 'select' && (
              <FormField
                control={form.control}
                name="options"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Options (one per line)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Option 1&#10;Option 2&#10;Option 3" 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createCustomFieldMutation.isPending}
              >
                {createCustomFieldMutation.isPending ? "Adding..." : "Add Field"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
