import React from "react";
import { EventLogCounts } from "@/hooks/use-event-logs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeInfo, Layout, Layers, Settings, User, ListTodo } from "lucide-react";

interface EventLogStatsProps {
  stats: EventLogCounts;
  isLoading: boolean;
  onSelectEntityType: (entityType: string | undefined) => void;
  selectedEntityType: string | undefined;
}

export function EventLogStats({
  stats,
  isLoading,
  onSelectEntityType,
  selectedEntityType,
}: EventLogStatsProps) {
  const statItems = [
    {
      label: "Tasks",
      value: stats?.taskCount || 0,
      icon: ListTodo,
      entityType: "task",
      color: "bg-amber-500",
    },
    {
      label: "Boards",
      value: stats?.boardCount || 0,
      icon: Layout,
      entityType: "board",
      color: "bg-blue-500",
    },
    {
      label: "Categories",
      value: stats?.categoryCount || 0,
      icon: Layers,
      entityType: "category",
      color: "bg-green-500",
    },
    {
      label: "Custom Fields",
      value: stats?.customFieldCount || 0,
      icon: BadgeInfo,
      entityType: "customField",
      color: "bg-purple-500",
    },
    {
      label: "Users",
      value: stats?.userCount || 0,
      icon: User,
      entityType: "user",
      color: "bg-rose-500",
    },
    {
      label: "System",
      value: stats?.systemCount || 0,
      icon: Settings,
      entityType: "system",
      color: "bg-gray-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-muted/30">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-lg h-6 bg-muted animate-pulse rounded"></CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {statItems.map((item) => {
        const isSelected = selectedEntityType === item.entityType;
        return (
          <Card
            key={item.label}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onSelectEntityType(isSelected ? undefined : item.entityType)}
          >
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <item.icon className="h-5 w-5" />
                {item.label}
              </CardTitle>
              <CardDescription>
                {isSelected ? "Filtered" : "Click to filter"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{item.value}</div>
              <div className={`w-full h-1 rounded-full mt-2 ${item.color}`}></div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}