import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FilterX } from "lucide-react";
import { useUsers } from "@/hooks/use-users";

interface EventLogFiltersProps {
  filters: {
    userId?: number;
    entityType?: string;
    page: number;
    limit: number;
  };
  onUpdateFilters: (filters: Partial<EventLogFiltersProps["filters"]>) => void;
  onResetFilters: () => void;
}

export function EventLogFilters({
  filters,
  onUpdateFilters,
  onResetFilters,
}: EventLogFiltersProps) {
  const { data: users, isLoading: isLoadingUsers } = useUsers();

  const entityTypes = [
    { value: "board", label: "Boards" },
    { value: "category", label: "Categories" },
    { value: "task", label: "Tasks" },
    { value: "customField", label: "Custom Fields" },
    { value: "user", label: "Users" },
    { value: "system", label: "System" },
  ];

  const limitOptions = [10, 25, 50, 100];

  const handleUserChange = (value: string) => {
    onUpdateFilters({ 
      userId: value === "" ? undefined : Number(value),
      page: 0 // Reset page when changing filters
    });
  };

  const handleEntityTypeChange = (value: string) => {
    onUpdateFilters({ 
      entityType: value === "" ? undefined : value,
      page: 0 // Reset page when changing filters
    });
  };

  const handleLimitChange = (value: string) => {
    onUpdateFilters({ 
      limit: Number(value),
      page: 0 // Reset page when changing filters
    });
  };

  const hasActiveFilters = filters.userId !== undefined || filters.entityType !== undefined;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="user-filter">Filter by User</Label>
            <Select
              value={filters.userId?.toString() || ""}
              onValueChange={handleUserChange}
            >
              <SelectTrigger id="user-filter">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All users</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entity-filter">Filter by Entity Type</Label>
            <Select
              value={filters.entityType || ""}
              onValueChange={handleEntityTypeChange}
            >
              <SelectTrigger id="entity-filter">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All entities</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-size">Results per page</Label>
            <Select
              value={filters.limit.toString()}
              onValueChange={handleLimitChange}
            >
              <SelectTrigger id="page-size">
                <SelectValue placeholder="50" />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map((limit) => (
                  <SelectItem key={limit} value={limit.toString()}>
                    {limit} items
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={onResetFilters}
              disabled={!hasActiveFilters}
            >
              <FilterX className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}