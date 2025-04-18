import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Task, Category, CustomField } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { processCustomData } from "./CustomDataHandler";

interface TaskFormProps {
  boardId: number;
  categories: Category[];
  initialCategory: Category | null;
  initialData: Task | null;
  isEdit: boolean;
  onSubmit: (data: Partial<Task>) => void;
  onCancel: () => void;
}

// Create form schema
const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.string().optional(),
  categoryId: z.coerce.number(),
  assignees: z.array(z.string()).default([]),
  customData: z.record(z.string(), z.any()).optional()
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export default function TaskForm({
  boardId,
  categories,
  initialCategory,
  initialData,
  isEdit,
  onSubmit,
  onCancel
}: TaskFormProps) {
  // We still need the forceRender state for the component to update when customData changes
  const [forceRender, setForceRender] = useState(0);
  
  // Import toast for notifications
  const { toast } = useToast();
  
  // Fetch custom fields
  const { 
    data: customFields = [], 
    refetch: refetchCustomFields 
  } = useQuery({
    queryKey: ['/api/boards', boardId, 'customFields'],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/customFields`);
      if (!res.ok) throw new Error('Failed to load custom fields');
      return res.json();
    }
  });

  // Set up form with default values
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      dueDate: initialData?.dueDate || "",
      priority: initialData?.priority || "medium",
      categoryId: initialData?.categoryId || initialCategory?.id || (categories[0]?.id || 0),
      assignees: initialData?.assignees || [],
      customData: initialData?.customData || {}
    }
  });

  // Update form values when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        description: initialData.description || "",
        dueDate: initialData.dueDate || "",
        priority: initialData.priority || "medium",
        categoryId: initialData.categoryId,
        assignees: initialData.assignees || [],
        customData: initialData.customData || {}
      });
    } else {
      form.reset({
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
        categoryId: initialCategory?.id || (categories[0]?.id || 0),
        assignees: [],
        customData: {}
      });
    }
  }, [initialData, initialCategory, categories, form]);

  // Sample assignees for demo
  const availableAssignees = [
    { id: "AS", name: "Amy Smith" },
    { id: "JD", name: "John Doe" },
    { id: "TM", name: "Tom Miller" },
    { id: "RK", name: "Rachel Kim" },
    { id: "MD", name: "Michael Davis" },
    { id: "LR", name: "Lisa Rodriguez" }
  ];

  const handleFormSubmit = (data: TaskFormValues) => {
    // Make a deep copy of the form data to avoid reference issues
    const formData = JSON.parse(JSON.stringify(data));
    
    // Use the CustomDataHandler utility to process the customData
    const processedCustomData = processCustomData(formData.customData);
    
    // Create the final formatted data with the processed customData
    const formattedData = {
      ...formData,
      customData: processedCustomData
    };
    
    // Log data at each step for debugging
    console.log("Raw form data:", data);
    console.log("Processed customData:", processedCustomData);
    console.log("Final data being submitted:", formattedData);
    
    // Submit the form data
    onSubmit(formattedData);
  };

  // Function to check if a custom field should be displayed
  const shouldShowCustomField = (fieldName: string): boolean => {
    // Always get the latest customData from the form
    const customData = form.getValues('customData');
    
    console.log(`Checking if field ${fieldName} should be shown:`, { 
      customData, 
      forceRender,
      hasField: customData && fieldName in customData 
    });
    
    // For empty/null customData, show all fields
    if (!customData || Object.keys(customData).length === 0) {
      return true;
    }
    
    // Only show fields that exist in customData (have a property)
    return fieldName in customData;
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Task" : "Create New Task"}</DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter task title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Describe the task" 
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    value={field.value.toString()} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: category.color }}
                            ></div>
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select 
                    value={field.value || "medium"} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Assignees</FormLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableAssignees.map((assignee) => (
                  <div key={assignee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`assignee-${assignee.id}`}
                      checked={form.watch('assignees').includes(assignee.id)}
                      onCheckedChange={(checked) => {
                        const currentAssignees = form.getValues('assignees');
                        if (checked) {
                          form.setValue('assignees', [...currentAssignees, assignee.id]);
                        } else {
                          form.setValue(
                            'assignees', 
                            currentAssignees.filter(a => a !== assignee.id)
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`assignee-${assignee.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {assignee.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Custom field management is now in Settings > Custom Fields */}
          
          {/* Render custom fields - with scrollable container */}
          {customFields.length > 0 && (
            <div className="space-y-3 max-h-60 overflow-y-auto p-1">
              {/* Key off forceRender to ensure the component updates when fields are removed */}
              {forceRender >= 0 && customFields.map((field: CustomField) => {
                const fieldName = field.name;
                
                // Skip rendering this field if it should be hidden
                if (!shouldShowCustomField(fieldName)) {
                  return null;
                }
                
                // Get the field value directly from form values 
                // Don't use nested path notation which doesn't work properly with the form structure
                const customData = form.getValues('customData') || {};
                const fieldValue = customData[fieldName] || '';
                
                return (
                  <div key={field.id} className="custom-field grid grid-cols-1 bg-gray-50 p-3 rounded-md border border-gray-200">
                    <FormLabel>{field.name}</FormLabel>
                    {field.type === 'text' && (
                      <Input
                        type="text"
                        value={fieldValue}
                        onChange={(e) => {
                          const customData = { ...(form.getValues('customData') || {}) };
                          customData[fieldName] = e.target.value; 
                          form.setValue('customData', customData, { 
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true 
                          });
                          // Force re-render to ensure the UI updates
                          setForceRender(prev => prev + 1);
                        }}
                      />
                    )}
                    {field.type === 'number' && (
                      <Input
                        type="number"
                        value={fieldValue}
                        onChange={(e) => {
                          const customData = { ...(form.getValues('customData') || {}) };
                          customData[fieldName] = e.target.value; 
                          form.setValue('customData', customData, { 
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true 
                          });
                          // Force re-render to ensure the UI updates
                          setForceRender(prev => prev + 1);
                        }}
                      />
                    )}
                    {field.type === 'date' && (
                      <Input
                        type="date"
                        value={fieldValue}
                        onChange={(e) => {
                          const customData = { ...(form.getValues('customData') || {}) };
                          customData[fieldName] = e.target.value; 
                          form.setValue('customData', customData, { 
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true 
                          });
                          // Force re-render to ensure the UI updates
                          setForceRender(prev => prev + 1);
                        }}
                      />
                    )}
                    {field.type === 'select' && field.options && (
                      <Select
                        value={fieldValue}
                        onValueChange={(value) => {
                          const customData = { ...(form.getValues('customData') || {}) };
                          customData[fieldName] = value; 
                          form.setValue('customData', customData, { 
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true 
                          });
                          // Force re-render to ensure the UI updates
                          setForceRender(prev => prev + 1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.split(',').map((option: string, index: number) => (
                            <SelectItem key={index} value={option.trim()}>
                              {option.trim()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === 'checkbox' && (
                      <div className="flex items-center mt-1">
                        <Checkbox
                          id={`custom-${field.id}`}
                          checked={!!fieldValue}
                          onCheckedChange={(checked) => {
                            const customData = { ...(form.getValues('customData') || {}) };
                            customData[fieldName] = checked; 
                            form.setValue('customData', customData, { 
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true 
                            });
                            // Force re-render to ensure the UI updates
                            setForceRender(prev => prev + 1);
                          }}
                        />
                        <label
                          htmlFor={`custom-${field.id}`}
                          className="ml-2 text-sm font-medium"
                        >
                          {field.name}
                        </label>
                      </div>
                    )}
                    {field.type === 'url' && (
                      <Input
                        type="url"
                        value={fieldValue}
                        placeholder="https://"
                        onChange={(e) => {
                          const customData = { ...(form.getValues('customData') || {}) };
                          customData[fieldName] = e.target.value; 
                          form.setValue('customData', customData, { 
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true 
                          });
                          // Force re-render to ensure the UI updates
                          setForceRender(prev => prev + 1);
                        }}
                      />
                    )}
                    {/* Field removal has been moved to Settings > Custom Fields */}
                  </div>
                );
              })}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEdit ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}