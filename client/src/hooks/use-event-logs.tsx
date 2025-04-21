import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EventLog } from "@shared/schema";

// Extended types for event log details
export interface EventLogDetails {
  // For task/entity data
  task?: Record<string, any>;
  board?: Record<string, any>;
  category?: Record<string, any>;
  user?: Record<string, any>;
  customField?: Record<string, any>;
  
  // For updates
  before?: Record<string, any>;
  after?: Record<string, any>;
  changedFields?: string[];
  
  // For any other details
  [key: string]: any;
}

// Extended EventLog type with user information which is joined from server
export interface EventLogWithUser extends Omit<EventLog, 'details'> {
  details: EventLogDetails;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    avatarColor?: string;
  };
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
  
  const endpoint = '/api/eventLogs/stats/counts';
  
  return useQuery<EventLogCounts>({
    queryKey: [endpoint],
    queryFn: getQueryFn({ on401: "throw" }),
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
  entityType = null,
  eventType = null
}: {
  page?: number;
  limit?: number;
  userId?: number | null;
  entityType?: string | null;
  eventType?: string | null;
}) {
  const { toast } = useToast();
  
  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('offset', ((page - 1) * limit).toString());
  if (userId) queryParams.append('userId', userId.toString());
  if (entityType) queryParams.append('entityType', entityType);
  if (eventType) queryParams.append('eventType', eventType);
  
  const endpoint = `/api/eventLogs?${queryParams.toString()}`;
  
  return useQuery<PaginatedEventLogs>({
    queryKey: [endpoint],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 1 * 60 * 1000 // 1 minute
  });
}

/**
 * Hook to fetch a single event log by ID
 */
export function useEventLog(id: number) {
  const { toast } = useToast();
  
  const endpoint = `/api/eventLogs/${id}`;
  
  return useQuery<EventLogWithUser>({
    queryKey: [endpoint],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}