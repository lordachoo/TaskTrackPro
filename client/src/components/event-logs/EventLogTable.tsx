import React, { useState } from "react";
import { EventLogWithUser } from "@/hooks/use-event-logs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead,

  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EventLogTableProps {
  logs: EventLogWithUser[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onSelectLog: (log: EventLogWithUser) => void;
  isLoading: boolean;
}

export function EventLogTable({
  logs,
  pagination,
  onPageChange,
  onSelectLog,
  isLoading
}: EventLogTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof EventLogWithUser;
    direction: 'asc' | 'desc';
  }>({
    key: 'createdAt',
    direction: 'desc'
  });

  const getEntityTypeColor = (entityType: string): string => {
    const colors: Record<string, string> = {
      board: "bg-blue-500",
      category: "bg-green-500",
      task: "bg-amber-500", 
      customField: "bg-purple-500",
      user: "bg-rose-500",
      system: "bg-gray-500"
    };
    return colors[entityType] || "bg-gray-500";
  };

  const getEventTypeLabel = (eventType: string): string => {
    const parts = eventType.split('.');
    if (parts.length > 1) {
      return parts[1];
    }
    return eventType;
  };

  const handleSort = (key: keyof EventLogWithUser) => {
    setSortConfig({
      key,
      direction: 
        sortConfig.key === key && sortConfig.direction === 'asc' 
          ? 'desc' 
          : 'asc'
    });
  };

  const sortedLogs = [...logs].sort((a, b) => {
    if (sortConfig.key === 'createdAt') {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>No event logs found</p>
        <p className="text-sm">Try changing your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center gap-1"
                >
                  Time
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[140px]">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('userId')}
                  className="flex items-center gap-1"
                >
                  User
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[140px]">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('entityType')}
                  className="flex items-center gap-1"
                >
                  Entity Type
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="w-[100px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <span className="cursor-help">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-auto">
                      <div className="text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </TableCell>
                <TableCell>
                  {log.user ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback style={{ backgroundColor: log.user.avatarColor || '#cbd5e1' }}>
                          {log.user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{log.user.username}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unknown user</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${getEntityTypeColor(log.entityType)} hover:${getEntityTypeColor(log.entityType)}`}
                  >
                    {log.entityType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {getEventTypeLabel(log.eventType)}
                    </Badge>
                    <span className="text-sm">ID: {log.entityId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSelectLog(log)}
                  >
                    <Info className="h-4 w-4" />
                    <span className="sr-only">View details</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {pagination.page * pagination.pageSize + 1}-
          {Math.min((pagination.page + 1) * pagination.pageSize, pagination.total)}{" "}
          of {pagination.total} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {pagination.page + 1} of {pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}