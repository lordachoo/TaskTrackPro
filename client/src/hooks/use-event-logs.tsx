import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export type EventLog = {
  id: number;
  userId: number;
  createdAt: string; // ISO date string
  entityType: string;
  eventType: string;
  entityId: number;
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
};

export type EventLogWithUser = EventLog & {
  user?: {
    username: string;
    fullName: string | null;
    avatarColor: string | null;
  };
};

export type PaginatedEventLogs = {
  logs: EventLog[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export type EventLogCounts = {
  taskCount: number;
  boardCount: number;
  categoryCount: number;
  customFieldCount: number;
  userCount: number;
  systemCount: number;
  totalCount: number;
};

export function useEventLogCounts() {
  const { toast } = useToast();

  return useQuery<EventLogCounts>({
    queryKey: ["/api/eventLogs/stats/counts"],
    queryFn: getQueryFn(),
    onError: (error: Error) => {
      toast({
        title: "Error fetching event log counts",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useEventLogs(page = 0, limit = 50, userId?: number, entityType?: string) {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    page,
    limit,
    userId,
    entityType,
  });

  const queryParams = new URLSearchParams();
  queryParams.append("limit", String(filters.limit));
  queryParams.append("offset", String(filters.page * filters.limit));
  if (filters.userId) queryParams.append("userId", String(filters.userId));
  if (filters.entityType) queryParams.append("entityType", filters.entityType);

  const queryKey = ["/api/eventLogs", filters];

  const query = useQuery<PaginatedEventLogs>({
    queryKey,
    queryFn: getQueryFn({ 
      customEndpoint: `/api/eventLogs?${queryParams.toString()}` 
    }),
    onError: (error: Error) => {
      toast({
        title: "Error fetching event logs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    ...query,
    filters,
    setFilters,
    updateFilters: (newFilters: Partial<typeof filters>) => {
      setFilters((prev) => ({
        ...prev,
        ...newFilters,
        // Reset to page 0 when filters change
        page: newFilters.hasOwnProperty('page') ? (newFilters.page as number) : 0
      }));
    },
  };
}

export function useEventLogDetails(eventLogId: number) {
  const { toast } = useToast();

  return useQuery<EventLog>({
    queryKey: ["/api/eventLogs", eventLogId],
    queryFn: getQueryFn({ 
      customEndpoint: `/api/eventLogs/${eventLogId}` 
    }),
    enabled: !!eventLogId,
    onError: (error: Error) => {
      toast({
        title: "Error fetching event log details",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}