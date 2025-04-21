import React from "react";
import { EventLogWithUser } from "@/hooks/use-event-logs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface EventLogDetailsProps {
  log: EventLogWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventLogDetails({ log, open, onOpenChange }: EventLogDetailsProps) {
  if (!log) {
    return null;
  }

  const getEventTypeDescription = (eventType: string): string => {
    // Map event types to human-readable descriptions
    const descriptions: Record<string, string> = {
      "board.created": "Board was created",
      "board.updated": "Board was updated",
      "board.deleted": "Board was deleted",
      "board.archived": "Board was archived",
      "board.restored": "Board was unarchived",
      "category.created": "Category was created",
      "category.updated": "Category was updated",
      "category.deleted": "Category was deleted",
      "category.reordered": "Category order was changed",
      "task.created": "Task was created",
      "task.updated": "Task was updated",
      "task.deleted": "Task was deleted",
      "task.archived": "Task was archived",
      "task.restored": "Task was unarchived",
      "task.moved": "Task was moved to another category",
      "customField.created": "Custom field was created",
      "customField.updated": "Custom field was updated",
      "customField.deleted": "Custom field was deleted",
      "user.created": "User was created",
      "user.updated": "User profile was updated",
      "user.deleted": "User was deleted",
      "user.login": "User logged in",
      "user.logout": "User logged out",
      "system.settingUpdated": "System setting was updated"
    };

    return descriptions[eventType] || eventType;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline">{log.eventType}</Badge>
            <span>Event Log #{log.id}</span>
          </DialogTitle>
          <DialogDescription>
            {getEventTypeDescription(log.eventType)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Timestamp</div>
            <div>{new Date(log.createdAt).toLocaleString()}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">User</div>
            <div className="flex items-center gap-2">
              {log.user ? (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback style={{ backgroundColor: log.user.avatarColor || '#cbd5e1' }}>
                      {log.user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{log.user.username}</span>
                  {log.user.fullName && (
                    <span className="text-muted-foreground text-xs">
                      ({log.user.fullName})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">Unknown user</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Entity Type</div>
            <Badge>{log.entityType}</Badge>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Entity ID</div>
            <div>{log.entityId}</div>
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="details" className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="details">Event Details</TabsTrigger>
            <TabsTrigger value="metadata">Request Metadata</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full max-h-[30vh] overflow-auto border rounded-md p-4">
              {log.details && Object.keys(log.details).length > 0 ? (
                <div className="space-y-4">
                  {/* Before/After view for update operations */}
                  {log.details.before && log.details.after && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Before</div>
                        <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">
                          {JSON.stringify(log.details.before, null, 2)}
                        </pre>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">After</div>
                        <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">
                          {JSON.stringify(log.details.after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Changed fields list */}
                  {log.details.changedFields && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Changed Fields</div>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(log.details.changedFields) && 
                          log.details.changedFields.map((field: string) => (
                            <Badge key={field} variant="outline">{field}</Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Simple details view for non-update operations */}
                  {!log.details.before && !log.details.after && (
                    <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No additional details available
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="metadata" className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full max-h-[30vh] overflow-auto border rounded-md p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">IP Address</div>
                    <div>{log.ipAddress || "Not available"}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">User Agent</div>
                    <div className="text-xs break-all">{log.userAgent || "Not available"}</div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}