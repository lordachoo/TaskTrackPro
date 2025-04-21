import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventLogs, useEventLogCounts, EventLogWithUser } from "@/hooks/use-event-logs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Filter, RefreshCcw } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUsers } from "@/hooks/use-users";

// Event log types for more readable UI
const eventTypeLabels: Record<string, string> = {
  "task.created": "Task Created",
  "task.updated": "Task Updated",
  "task.deleted": "Task Deleted",
  "task.archived": "Task Archived",
  "task.restored": "Task Restored",
  "board.created": "Board Created",
  "board.updated": "Board Updated",
  "board.archived": "Board Archived",
  "board.restored": "Board Restored",
  "category.created": "Category Created",
  "category.updated": "Category Updated",
  "category.deleted": "Category Deleted",
  "custom_field.created": "Custom Field Created",
  "custom_field.updated": "Custom Field Updated",
  "custom_field.deleted": "Custom Field Deleted",
  "user.created": "User Created",
  "user.updated": "User Updated",
  "user.deleted": "User Deleted",
  "system.setting_updated": "System Setting Updated"
};

// Entity types for displaying readable UI
const entityTypeLabels: Record<string, string> = {
  "task": "Task",
  "board": "Board",
  "category": "Category",
  "custom_field": "Custom Field",
  "user": "User",
  "system": "System"
};

export default function EventLogs() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedLog, setSelectedLog] = useState<EventLogWithUser | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState<{
    userId: number | null;
    entityType: string | null;
  }>({
    userId: null,
    entityType: null
  });
  
  // Fetch log counts
  const { 
    data: counts,
    isLoading: isCountsLoading,
  } = useEventLogCounts();
  
  // Fetch users for the filter
  const { data: users = [] } = useUsers();
  
  // Fetch event logs
  const { 
    data: logsData,
    isLoading: isLogsLoading,
    refetch: refetchLogs
  } = useEventLogs({
    page,
    limit,
    userId: filters.userId,
    entityType: filters.entityType
  });
  
  const logs = logsData?.logs || [];
  const totalLogs = logsData?.pagination?.total || 0;
  const totalPages = logsData?.pagination?.totalPages || 1;
  
  const handleSelectLog = (log: EventLogWithUser) => {
    setSelectedLog(log);
  };
  
  const handleResetFilters = () => {
    setFilters({ userId: null, entityType: null });
    setPage(1);
  };
  
  const handleFilterChange = (key: 'userId' | 'entityType', value: number | string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Map tab to entity type filter
    if (tab === "all") {
      handleFilterChange('entityType', null);
    } else {
      handleFilterChange('entityType', tab);
    }
  };
  
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
          boardName="Event Logs"
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        {/* Event Logs Content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Link to="/settings">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Settings
                  </Button>
                </Link>
                <h2 className="text-2xl font-bold text-gray-800">System Event Logs</h2>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchLogs()}
              >
                <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Total Events</p>
                      {isCountsLoading ? (
                        <Skeleton className="h-8 w-16 mt-1" />
                      ) : (
                        <p className="text-2xl font-bold">{counts?.totalCount || 0}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-blue-700">Task Events</p>
                      {isCountsLoading ? (
                        <Skeleton className="h-8 w-16 mt-1" />
                      ) : (
                        <p className="text-2xl font-bold text-blue-700">{counts?.taskCount || 0}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 border-green-100">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-green-700">Board Events</p>
                      {isCountsLoading ? (
                        <Skeleton className="h-8 w-16 mt-1" />
                      ) : (
                        <p className="text-2xl font-bold text-green-700">{counts?.boardCount || 0}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-50 border-purple-100">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-purple-700">User Events</p>
                      {isCountsLoading ? (
                        <Skeleton className="h-8 w-16 mt-1" />
                      ) : (
                        <p className="text-2xl font-bold text-purple-700">{counts?.userCount || 0}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Filters and Table */}
            <Card className="mb-6">
              <CardHeader className="pb-1">
                <CardTitle>Event Log History</CardTitle>
                <CardDescription>
                  View and filter system events for auditing and troubleshooting
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Tabs for entity type filter */}
                <Tabs 
                  value={activeTab}
                  onValueChange={handleTabChange}
                  className="mb-4"
                >
                  <TabsList>
                    <TabsTrigger value="all">All Events</TabsTrigger>
                    <TabsTrigger value="task">Tasks</TabsTrigger>
                    <TabsTrigger value="board">Boards</TabsTrigger>
                    <TabsTrigger value="category">Categories</TabsTrigger>
                    <TabsTrigger value="custom_field">Custom Fields</TabsTrigger>
                    <TabsTrigger value="user">Users</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6 items-center">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">Filter By:</span>
                  </div>
                  
                  {/* User Filter */}
                  <div>
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                      value={filters.userId || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        handleFilterChange('userId', value);
                      }}
                    >
                      <option value="">All Users</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName || user.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Reset Filter Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    disabled={!filters.userId && !filters.entityType}
                    className="ml-auto"
                  >
                    Reset Filters
                  </Button>
                </div>
                
                {/* Event Logs Table */}
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-3 px-4 text-left font-medium text-gray-500">Date & Time</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-500">User</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-500">Event Type</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-500">Entity ID</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-500">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLogsLoading ? (
                        Array(5).fill(0).map((_, i) => (
                          <tr key={i} className="border-t border-gray-200">
                            <td className="py-3 px-4"><Skeleton className="h-5 w-24" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-5 w-20" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-5 w-32" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-5 w-8" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-5 w-24" /></td>
                          </tr>
                        ))
                      ) : logs.length === 0 ? (
                        <tr className="border-t border-gray-200">
                          <td colSpan={5} className="py-6 px-4 text-center text-gray-500">
                            No event logs found. Try changing your filters.
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr 
                            key={log.id} 
                            className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer ${
                              selectedLog?.id === log.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleSelectLog(log)}
                          >
                            <td className="py-3 px-4">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium">{log.user ? log.user.username : 'Unknown'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {eventTypeLabels[log.eventType] || log.eventType}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {log.entityId}
                            </td>
                            <td className="py-3 px-4 text-gray-500">
                              {log.ipAddress}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {!isLogsLoading && logs.length > 0 && (
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {logs.length} of {totalLogs} events
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Log Details Panel */}
            {selectedLog && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Log Details</CardTitle>
                  <CardDescription>
                    Detailed information about the selected event
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Event Information</h3>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-gray-500">Event Type:</span>
                          <span className="col-span-2 font-medium">{eventTypeLabels[selectedLog.eventType] || selectedLog.eventType}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-gray-500">Entity Type:</span>
                          <span className="col-span-2 font-medium">{entityTypeLabels[selectedLog.entityType] || selectedLog.entityType}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-gray-500">Entity ID:</span>
                          <span className="col-span-2 font-medium">{selectedLog.entityId}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-gray-500">Timestamp:</span>
                          <span className="col-span-2 font-medium">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">User Information</h3>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-gray-500">User:</span>
                          <span className="col-span-2 font-medium">{selectedLog.user ? selectedLog.user.username : 'Unknown'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-gray-500">User ID:</span>
                          <span className="col-span-2 font-medium">{selectedLog.userId}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-gray-500">IP Address:</span>
                          <span className="col-span-2 font-medium">{selectedLog.ipAddress}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-gray-500">User Agent:</span>
                          <span className="col-span-2 font-medium text-xs overflow-hidden text-ellipsis">{selectedLog.userAgent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Event Details */}
                  {selectedLog.details && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Event Details</h3>
                      <div className="bg-gray-50 rounded-md p-4 overflow-auto max-h-60 border text-sm">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}