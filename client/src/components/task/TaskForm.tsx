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
import CustomFieldForm from "./CustomFieldForm";
import { processCustomData, removeCustomDataField } from "./CustomDataHandler";

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
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false);
  
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
    
    // Ensure customData is properly initialized and has no empty fields
    const customData = formData.customData || {};
    
    // Create a clean version of customData by removing empty values
    const cleanCustomData = Object.entries(customData)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, any>);
    
    // Create the final formatted data with the clean customData
    const formattedData = {
      ...formData,
      customData: cleanCustomData
    };
    
    // Log data at each step for debugging
    console.log("Raw form data:", data);
    console.log("Cleaned customData:", cleanCustomData);
    console.log("Final data being submitted:", formattedData);
    
    // Submit the form data
    onSubmit(formattedData);
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
          
          <div className="mb-4">
            <Button
              type="button"
              variant="link"
              className="p-0 text-primary hover:text-primary/80 text-sm flex items-center"
              onClick={() => setShowCustomFieldForm(true)}
            >
              <i className="ri-add-line mr-1"></i>
              <span>Add Custom Field</span>
            </Button>
          </div>
          
          {/* Render custom fields */}
          {customFields.length > 0 && (
            <div className="space-y-3">
              {customFields.map((field: CustomField) => {
                const fieldKey = field.name;
                const fieldValue = form.watch('customData')?.[fieldKey] || '';
                
                return (
                  <div key={field.id} className="custom-field grid grid-cols-1 bg-gray-50 p-3 rounded-md border border-gray-200">
                    <FormLabel>{field.name}</FormLabel>
                    {field.type === 'text' && (
                      <Input
                        type="text"
                        value={fieldValue}
                        onChange={(e) => {
                          const customData = { ...(form.getValues('customData') || {}) };
                          customData[fieldKey] = e.target.value; 
                          form.setValue('customData', customData);
                          console.log('Updated customData:', form.getValues('customData'));
                        }}
                      />
                    )}
                    {field.type === 'number' && (
                      <Input
                        type="number"
                        value={fieldValue}
                        onChange={(e) => {
                          const customData = form.getValues('customData') || {};
                          form.setValue('customData', {
                            ...customData,
                            [fieldKey]: e.target.value
                          });
                        }}
                      />
                    )}
                    {field.type === 'date' && (
                      <Input
                        type="date"
                        value={fieldValue}
                        onChange={(e) => {
                          const customData = form.getValues('customData') || {};
                          form.setValue('customData', {
                            ...customData,
                            [fieldKey]: e.target.value
                          });
                        }}
                      />
                    )}
                    {field.type === 'select' && field.options && (
                      <Select
                        value={fieldValue}
                        onValueChange={(value) => {
                          const customData = form.getValues('customData') || {};
                          form.setValue('customData', {
                            ...customData,
                            [fieldKey]: value
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.split(',').map((option, index) => (
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
                            const customData = form.getValues('customData') || {};
                            form.setValue('customData', {
                              ...customData,
                              [fieldKey]: checked
                            });
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
                          const customData = form.getValues('customData') || {};
                          form.setValue('customData', {
                            ...customData,
                            [fieldKey]: e.target.value
                          });
                        }}
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-500 text-sm mt-2 flex items-center self-end"
                      onClick={() => {
                        // Get the custom field data object
                        const currentData = { ...(form.getValues('customData') || {}) };
                        
                        // Log the current state
                        console.log('Current customData:', currentData);
                        console.log(`Removing field: ${fieldKey}`);
                        
                        // Remove the field by creating a new object without that field
                        const newCustomData = Object.entries(currentData)
                          .filter(([key]) => key !== fieldKey)
                          .reduce((obj, [key, value]) => {
                            obj[key] = value;
                            return obj;
                          }, {} as Record<string, any>);
                        
                        // Reset the entire customData field with our filtered object
                        form.setValue('customData', newCustomData, { 
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true
                        });
                        
                        // Log the changes
                        console.log('Updated customData:', form.getValues('customData'));
                        console.log('Full form state after removal:', form.getValues());
                        
                        // Show a notification
                        toast({
                          title: "Field removed",
                          description: `${field.name} has been removed from this task.`,
                          duration: 2000
                        });
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                      <span>Remove</span>
                    </Button>
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
      
      {showCustomFieldForm && (
        <CustomFieldForm
          boardId={boardId}
          onClose={() => setShowCustomFieldForm(false)}
          onSuccess={() => {
            setShowCustomFieldForm(false);
            // Explicitly refetch custom fields
            refetchCustomFields();
          }}
        />
      )}
    </>
  );
}
