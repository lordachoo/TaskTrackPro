import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EventLog } from "@shared/schema";

// Extended EventLog type with username field which is joined from server
export interface EventLogWithUser extends EventLog {
  username: string;
  timestamp: string; // The UI expects timestamp format
}

// Define types for event log data
export interface EventLogCounts {
  taskCount: number;
  boardCount: number;
  categoryCount: number;
  customFieldCount: number;
  userCount: number;
  systemCount: number;
  totalCount: number;
}

export interface PaginatedEventLogs {
  logs: EventLogWithUser[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch event log counts by entity type
 */
export function useEventLogCounts() {
  const { toast } = useToast();
  
  return useQuery<EventLogCounts>({
    queryKey: ['/api/eventLogs/stats/counts'],
    queryFn: getQueryFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch paginated event logs with optional filtering
 */
export function useEventLogs({
  page = 1,
  limit = 25,
  userId = null,
  entityType = null
}: {
  page?: number;
  limit?: number;
  userId?: number | null;
  entityType?: string | null;
}) {
  const { toast } = useToast();
  
  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('offset', ((page - 1) * limit).toString());
  if (userId) queryParams.append('userId', userId.toString());
  if (entityType) queryParams.append('entityType', entityType);
  
  const endpoint = `/api/eventLogs?${queryParams.toString()}`;
  
  return useQuery<PaginatedEventLogs>({
    queryKey: ['/api/eventLogs', page, limit, userId, entityType],
    queryFn: getQueryFn(),
    staleTime: 1 * 60 * 1000 // 1 minute
  });
}

/**
 * Hook to fetch a single event log by ID
 */
export function useEventLog(id: number) {
  const { toast } = useToast();
  
  return useQuery<EventLog>({
    queryKey: ['/api/eventLogs', id],
    queryFn: getQueryFn(),
    enabled: !!id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}