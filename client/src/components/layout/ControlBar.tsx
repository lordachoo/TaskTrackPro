import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface ControlBarProps {
  onCreateTask: () => void;
  onAddCategory: () => void;
  onSearch: (query: string) => void;
  onFilter: () => void;
  onSort: () => void;
}

export default function ControlBar({
  onCreateTask,
  onAddCategory,
  onSearch,
  onFilter,
  onSort
}: ControlBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div className="bg-white border-b p-4 flex flex-wrap items-center justify-between gap-y-3">
      <div className="flex space-x-2 items-center order-1">
        <Button 
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md flex items-center text-sm font-medium"
          onClick={onCreateTask}
        >
          <i className="ri-add-line mr-2"></i>
          <span>New Task</span>
        </Button>
        <Button
          variant="outline"
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center text-sm font-medium"
          onClick={onAddCategory}
        >
          <i className="ri-add-circle-line mr-2"></i>
          <span>Add Category</span>
        </Button>
      </div>
      
      <div className="flex items-center space-x-2 order-3 md:order-2">
        <Button
          variant="outline"
          size="icon"
          className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
          onClick={onFilter}
        >
          <i className="ri-filter-3-line text-gray-600"></i>
        </Button>
        <Button
          variant="outline"
          size="icon" 
          className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
          onClick={onSort}
        >
          <i className="ri-sort-desc text-gray-600"></i>
        </Button>
      </div>
      
      <div className="w-full md:w-auto order-2 md:order-3">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full md:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>
    </div>
  );
}
