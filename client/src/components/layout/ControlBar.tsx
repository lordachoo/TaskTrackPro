import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export interface FilterOptions {
  priorities: string[];
  categories: string[];
  assignees: string[];
  dueDateRange: string;
  hideCompleted: boolean;
}

export interface SortOption {
  field: 'dueDate' | 'priority' | 'title' | 'createdAt';
  direction: 'asc' | 'desc';
}

interface ControlBarProps {
  onCreateTask: () => void;
  onAddCategory: () => void;
  onSearch: (query: string) => void;
  onFilter: (options: FilterOptions) => void;
  onSort: (option: SortOption) => void;
  onCreateBoard: () => void;
  categories: { id: number; name: string; color: string }[];
}

export default function ControlBar({
  onCreateTask,
  onAddCategory,
  onSearch,
  onFilter,
  onSort,
  onCreateBoard,
  categories = []
}: ControlBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter state
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    priorities: [],
    categories: [],
    assignees: [],
    dueDateRange: 'all',
    hideCompleted: false
  });

  // Sort state
  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'dueDate',
    direction: 'asc'
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newOptions = { ...filterOptions } as FilterOptions;
    
    if (key === 'priorities' || key === 'categories' || key === 'assignees') {
      // Handle array values (checkboxes)
      if (newOptions[key].includes(value)) {
        newOptions[key] = newOptions[key].filter(item => item !== value);
      } else {
        newOptions[key] = [...newOptions[key], value];
      }
    } else if (key === 'dueDateRange') {
      newOptions.dueDateRange = value;
    } else if (key === 'hideCompleted') {
      newOptions.hideCompleted = value;
    }
    
    setFilterOptions(newOptions);
    onFilter(newOptions);
  };

  const handleSortChange = (field: SortOption['field'], direction: SortOption['direction']) => {
    const newSortOption = { field, direction };
    setSortOption(newSortOption);
    onSort(newSortOption);
  };

  const priorityOptions = ['low', 'medium', 'high'];
  const assigneeOptions = ['JS', 'AS', 'TM', 'RK', 'MD', 'LR']; // Sample assignees
  const dueDateOptions = [
    { value: 'all', label: 'All dates' },
    { value: 'today', label: 'Due today' },
    { value: 'week', label: 'Due this week' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'none', label: 'No due date' }
  ];

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center text-sm font-medium"
            >
              <i className="ri-add-circle-line mr-2"></i>
              <span>Add New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <DropdownMenuLabel>Create New</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              className="cursor-pointer"
              onClick={onCreateBoard}
            >
              <i className="ri-dashboard-line mr-2"></i>
              <span>New Board</span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              className="cursor-pointer"
              onClick={onAddCategory}
            >
              <i className="ri-folder-add-line mr-2"></i>
              <span>New Category</span>
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="flex items-center space-x-2 order-3 md:order-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 relative"
            >
              <i className="ri-filter-3-line text-gray-600"></i>
              {(filterOptions.priorities.length > 0 || 
                filterOptions.categories.length > 0 || 
                filterOptions.assignees.length > 0 || 
                filterOptions.dueDateRange !== 'all' || 
                filterOptions.hideCompleted) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-4">
              <h4 className="font-medium">Filter Tasks</h4>
              
              <div>
                <h5 className="text-sm font-medium mb-2">Priority</h5>
                <div className="space-y-1">
                  {priorityOptions.map(priority => (
                    <div key={priority} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`priority-${priority}`} 
                        checked={filterOptions.priorities.includes(priority)}
                        onCheckedChange={() => handleFilterChange('priorities', priority)}
                      />
                      <label 
                        htmlFor={`priority-${priority}`}
                        className="text-sm capitalize"
                      >
                        {priority}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium mb-2">Category</h5>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`category-${category.id}`} 
                        checked={filterOptions.categories.includes(category.id.toString())}
                        onCheckedChange={() => handleFilterChange('categories', category.id.toString())}
                      />
                      <label 
                        htmlFor={`category-${category.id}`}
                        className="text-sm flex items-center"
                      >
                        <span 
                          className="w-3 h-3 rounded-full mr-1" 
                          style={{ backgroundColor: category.color }}
                        ></span>
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium mb-2">Assignee</h5>
                <div className="space-y-1">
                  {assigneeOptions.map(assignee => (
                    <div key={assignee} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`assignee-${assignee}`} 
                        checked={filterOptions.assignees.includes(assignee)}
                        onCheckedChange={() => handleFilterChange('assignees', assignee)}
                      />
                      <label 
                        htmlFor={`assignee-${assignee}`}
                        className="text-sm"
                      >
                        {assignee}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium mb-2">Due Date</h5>
                <RadioGroup 
                  value={filterOptions.dueDateRange}
                  onValueChange={(value) => handleFilterChange('dueDateRange', value)}
                  className="space-y-1"
                >
                  {dueDateOptions.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`date-${option.value}`} />
                      <Label htmlFor={`date-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hide-completed" 
                  checked={filterOptions.hideCompleted}
                  onCheckedChange={(checked) => handleFilterChange('hideCompleted', checked)}
                />
                <label 
                  htmlFor="hide-completed"
                  className="text-sm"
                >
                  Hide completed tasks
                </label>
              </div>
              
              <div className="flex justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const resetOptions = {
                      priorities: [],
                      categories: [],
                      assignees: [],
                      dueDateRange: 'all',
                      hideCompleted: false
                    };
                    setFilterOptions(resetOptions);
                    onFilter(resetOptions);
                  }}
                >
                  Reset
                </Button>
                <Button size="sm">Apply Filters</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon" 
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              <i className="ri-sort-desc text-gray-600"></i>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <div className="space-y-3">
              <h4 className="font-medium">Sort Tasks</h4>
              
              <RadioGroup 
                value={`${sortOption.field}-${sortOption.direction}`}
                onValueChange={(value) => {
                  const [field, direction] = value.split('-') as [SortOption['field'], SortOption['direction']];
                  handleSortChange(field, direction);
                }}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dueDate-asc" id="sort-date-asc" />
                  <Label htmlFor="sort-date-asc" className="text-sm">
                    Due Date (earliest first)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dueDate-desc" id="sort-date-desc" />
                  <Label htmlFor="sort-date-desc" className="text-sm">
                    Due Date (latest first)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="priority-desc" id="sort-priority-high" />
                  <Label htmlFor="sort-priority-high" className="text-sm">
                    Priority (high to low)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="priority-asc" id="sort-priority-low" />
                  <Label htmlFor="sort-priority-low" className="text-sm">
                    Priority (low to high)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="title-asc" id="sort-title-asc" />
                  <Label htmlFor="sort-title-asc" className="text-sm">
                    Title (A to Z)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="title-desc" id="sort-title-desc" />
                  <Label htmlFor="sort-title-desc" className="text-sm">
                    Title (Z to A)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="createdAt-desc" id="sort-created-desc" />
                  <Label htmlFor="sort-created-desc" className="text-sm">
                    Recently Added
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="createdAt-asc" id="sort-created-asc" />
                  <Label htmlFor="sort-created-asc" className="text-sm">
                    Oldest Added
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </PopoverContent>
        </Popover>
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
