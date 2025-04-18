import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Category } from "@shared/schema";

// Schema for the form validation
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().regex(/^#([0-9A-F]{6})$/i, "Must be a valid hex color (e.g. #FF0000)")
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  boardId: number;
  initialData?: Category | null;
  isEdit?: boolean;
  onSubmit: (data: CategoryFormValues & { boardId: number }) => void;
  onCancel: () => void;
}

export default function CategoryForm({
  boardId,
  initialData,
  isEdit = false,
  onSubmit,
  onCancel
}: CategoryFormProps) {
  // Set up form with default values
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: initialData ? {
      name: initialData.name,
      color: initialData.color
    } : {
      name: "",
      color: "#6366F1" // Default color (indigo)
    }
  });

  const handleSubmit = (data: CategoryFormValues) => {
    onSubmit({
      ...data,
      boardId
    });
  };

  return (
    <div className="p-1">
      <DialogTitle className="text-xl font-semibold mb-4">
        {isEdit ? "Edit Category" : "Add Category"}
      </DialogTitle>
      <DialogDescription className="mb-6">
        {isEdit 
          ? "Update the name and color of your category." 
          : "Create a new category to organize your tasks."}
      </DialogDescription>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter category name" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <div className="flex items-center space-x-2">
                  <FormControl>
                    <Input 
                      type="color" 
                      {...field} 
                      className="w-16 h-10 p-1"
                    />
                  </FormControl>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="#RRGGBB" 
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}