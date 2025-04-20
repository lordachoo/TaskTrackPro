import { Request } from "express";
import { storage } from "./storage";
import { InsertEventLog } from "@shared/schema";

/**
 * Event types for entity operations
 */
export const EventTypes = {
  // Board events
  BOARD_CREATED: "board.created",
  BOARD_UPDATED: "board.updated",
  BOARD_DELETED: "board.deleted",
  BOARD_ARCHIVED: "board.archived",
  BOARD_RESTORED: "board.restored",
  
  // Category events
  CATEGORY_CREATED: "category.created",
  CATEGORY_UPDATED: "category.updated",
  CATEGORY_DELETED: "category.deleted",
  CATEGORY_REORDERED: "category.reordered",
  
  // Task events
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_DELETED: "task.deleted",
  TASK_ARCHIVED: "task.archived",
  TASK_RESTORED: "task.restored",
  TASK_MOVED: "task.moved", // When a task is moved between categories
  
  // Custom field events
  CUSTOM_FIELD_CREATED: "customField.created",
  CUSTOM_FIELD_UPDATED: "customField.updated",
  CUSTOM_FIELD_DELETED: "customField.deleted",
  
  // User events
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  
  // System events
  SYSTEM_SETTING_UPDATED: "system.settingUpdated"
};

/**
 * Entity types for logging
 */
export const EntityTypes = {
  BOARD: "board",
  CATEGORY: "category",
  TASK: "task",
  CUSTOM_FIELD: "customField",
  USER: "user",
  SYSTEM: "system"
};

/**
 * Logs an event in the system with details about the user and operation
 * 
 * @param req Express Request object (needed for user info, IP, user agent)
 * @param eventType Type of event in format "entity.action" (e.g., "task.created")
 * @param entityType Type of entity affected (e.g., "task", "board", "category")
 * @param entityId ID of the affected entity
 * @param details Optional details about the event (e.g., before/after values)
 * @returns Promise that resolves when event is logged
 */
export async function logEvent(
  req: Request, 
  eventType: string, 
  entityType: string, 
  entityId: number, 
  details?: Record<string, any>
): Promise<void> {
  try {
    if (!req.user) {
      console.warn("Attempted to log event without authenticated user");
      return;
    }
    
    const log: InsertEventLog = {
      userId: req.user.id,
      eventType,
      entityType,
      entityId,
      details: details || {},
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "",
    };
    
    await storage.createEventLog(log);
    console.log(`Event logged: ${eventType} for ${entityType} #${entityId} by user #${req.user.id}`);
  } catch (error) {
    console.error("Error logging event:", error);
  }
}

/**
 * Helper function to log a board event
 */
export async function logBoardEvent(
  req: Request,
  eventType: string,
  boardId: number,
  details?: Record<string, any>
): Promise<void> {
  return logEvent(req, eventType, EntityTypes.BOARD, boardId, details);
}

/**
 * Helper function to log a category event
 */
export async function logCategoryEvent(
  req: Request,
  eventType: string,
  categoryId: number,
  details?: Record<string, any>
): Promise<void> {
  return logEvent(req, eventType, EntityTypes.CATEGORY, categoryId, details);
}

/**
 * Helper function to log a task event
 */
export async function logTaskEvent(
  req: Request,
  eventType: string,
  taskId: number,
  details?: Record<string, any>
): Promise<void> {
  return logEvent(req, eventType, EntityTypes.TASK, taskId, details);
}

/**
 * Helper function to log a custom field event
 */
export async function logCustomFieldEvent(
  req: Request,
  eventType: string,
  customFieldId: number,
  details?: Record<string, any>
): Promise<void> {
  return logEvent(req, eventType, EntityTypes.CUSTOM_FIELD, customFieldId, details);
}

/**
 * Helper function to log a user event
 */
export async function logUserEvent(
  req: Request,
  eventType: string,
  userId: number,
  details?: Record<string, any>
): Promise<void> {
  return logEvent(req, eventType, EntityTypes.USER, userId, details);
}

/**
 * Helper function to log a system event
 * For system events, we use a placeholder ID (0)
 */
export async function logSystemEvent(
  req: Request,
  eventType: string,
  details?: Record<string, any>
): Promise<void> {
  return logEvent(req, eventType, EntityTypes.SYSTEM, 0, details);
}