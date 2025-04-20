import { Request } from "express";
import { storage } from "./storage";
import { InsertEventLog } from "@shared/schema";

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
  } catch (error) {
    console.error("Error logging event:", error);
  }
}