import React, { useState } from "react";
import { useEventLogs, useEventLogCounts, type EventLogWithUser } from "@/hooks/use-event-logs";
import { useUsers, type User } from "@/hooks/use-users";
import { EventLogTable } from "@/components/event-logs/EventLogTable";
import { EventLogDetails } from "@/components/event-logs/EventLogDetails";
import { EventLogStats } from "@/components/event-logs/EventLogStats";
import { EventLogFilters } from "@/components/event-logs/EventLogFilters";
import { Separator } from "@/components/ui/separator";

export default function EventLogsPage() {
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { data: eventStats, isLoading: isLoadingStats } = useEventLogCounts();
  const { data: users } = useUsers();

  const {
    data: eventLogsData,
    isLoading: isLoadingLogs,
    filters,
    updateFilters,
  } = useEventLogs();

  // Create a map of users by ID for quick lookup
  const usersMap = React.useMemo(() => {
    if (!users) return {};
    return users.reduce<Record<number, User>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [users]);

  // If we have user data, enhance the event logs with user info
  const enhancedLogs = React.useMemo(() => {
    if (!eventLogsData?.logs) return [];
    return eventLogsData.logs.map(log => ({
      ...log,
      user: usersMap[log.userId]
    }));
  }, [eventLogsData?.logs, usersMap]);

  // Find the selected log for details view
  const selectedLog = enhancedLogs.find(log => log.id === selectedLogId) || null;

  const handleSelectLog = (log: EventLogWithUser) => {
    setSelectedLogId(log.id);
    setDetailsOpen(true);
  };

  const handleResetFilters = () => {
    updateFilters({
      userId: undefined,
      entityType: undefined,
      page: 0,
      limit: 50
    });
  };

  return (
    <div className="container py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Event Logs</h1>
        <p className="text-muted-foreground">
          View and analyze all system events and user actions
        </p>
      </div>

      <EventLogStats 
        stats={eventStats || {
          taskCount: 0,
          boardCount: 0,
          categoryCount: 0, 
          customFieldCount: 0,
          userCount: 0,
          systemCount: 0,
          totalCount: 0
        }}
        isLoading={isLoadingStats}
        onSelectEntityType={(entityType) => updateFilters({ entityType, page: 0 })}
        selectedEntityType={filters.entityType}
      />

      <Separator />

      <EventLogFilters 
        filters={filters}
        onUpdateFilters={updateFilters}
        onResetFilters={handleResetFilters}
      />

      <EventLogTable 
        logs={enhancedLogs}
        pagination={eventLogsData?.pagination || { 
          total: 0, 
          page: 0, 
          pageSize: 50, 
          totalPages: 0 
        }}
        onPageChange={(page) => updateFilters({ page })}
        onSelectLog={handleSelectLog}
        isLoading={isLoadingLogs}
      />

      <EventLogDetails 
        log={selectedLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}