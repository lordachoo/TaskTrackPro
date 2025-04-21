import { pgSchema, pgTable, serial, text, timestamp, boolean, json } from 'drizzle-orm/pg-core';
import { users, type User, type InsertUser, tasks, type Task, type InsertTask, boards, type Board, type InsertBoard, categories, type Category, type InsertCategory, customFields, type CustomField, type InsertCustomField, systemSettings, type SystemSetting, eventLogs, type EventLog, type InsertEventLog } from '@shared/schema';
import { db } from './db';
import { eq, and, count, sql, isNull, ilike, or, asc, desc, inArray, not } from 'drizzle-orm';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { IStorage } from './storage';
import * as bcrypt from 'bcrypt';

const scryptAsync = promisify(scrypt);

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeSystemSettings();
  }

  async initializeSystemSettings() {
    try {
      // Create default system settings if they don't exist
      const allowRegistrations = await this.getSystemSetting('allow_registrations');
      if (!allowRegistrations) {
        await this.updateSystemSetting('allow_registrations', 'true');
      }
    } catch (error) {
      console.error('Error initializing system settings:', error);
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users);
      return allUsers;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      console.log('Attempting to verify password with strategies:');
      
      // Strategy 1: Direct string comparison (for development/testing)
      if (plainPassword === hashedPassword) {
        console.log('- Direct comparison: SUCCESS');
        return true;
      } else {
        console.log('- Direct comparison: failed');
      }
      
      // Strategy 2: Custom hash.salt format
      if (hashedPassword && hashedPassword.includes('.')) {
        console.log('- Custom hash.salt format detected');
        const [hash, salt] = hashedPassword.split('.');
        if (!hash || !salt) {
          console.log('  - Invalid format (missing hash or salt)');
        } else {
          try {
            const hashBuffer = Buffer.from(hash, 'hex');
            const derivedKey = await scryptAsync(plainPassword, salt, 64) as Buffer;
            const result = timingSafeEqual(hashBuffer, derivedKey);
            console.log(`  - Verification result: ${result ? 'SUCCESS' : 'failed'}`);
            if (result) return true;
          } catch (e) {
            console.log('  - Error in custom hash verification:', e);
          }
        }
      }
      
      // Strategy 3: bcrypt (most likely format for passwords starting with $2b$)
      if (hashedPassword && hashedPassword.startsWith('$2b$')) {
        console.log('- bcrypt format detected');
        try {
          const result = await bcrypt.compare(plainPassword, hashedPassword);
          console.log(`  - bcrypt verification result: ${result ? 'SUCCESS' : 'failed'}`);
          return result;
        } catch (e) {
          console.log('  - Error in bcrypt verification:', e);
        }
      } else {
        console.log('- Not a bcrypt hash');
      }
      
      // No strategy worked
      console.log('All verification strategies failed');
      return false;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error(`Error getting user with ID ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      console.error(`Error getting user with username ${username}:`, error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Generate avatar color if not provided
      const userData = {
        ...insertUser,
        avatarColor: insertUser.avatarColor || '#6366f1',
      };
      
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser || undefined;
    } catch (error) {
      console.error(`Error updating user with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting user with ID ${id}:`, error);
      return false;
    }
  }

  async getBoards(userId: number, showArchived: boolean = false): Promise<Board[]> {
    try {
      if (showArchived) {
        return await db.select().from(boards)
          .where(eq(boards.userId, userId))
          .orderBy(boards.createdAt);
      } else {
        return await db.select().from(boards)
          .where(and(
            eq(boards.userId, userId),
            eq(boards.isArchived, false)
          ))
          .orderBy(boards.createdAt);
      }
    } catch (error) {
      console.error(`Error getting boards for user ID ${userId}:`, error);
      return [];
    }
  }

  async getBoard(id: number): Promise<Board | undefined> {
    try {
      const [board] = await db.select().from(boards).where(eq(boards.id, id));
      return board || undefined;
    } catch (error) {
      console.error(`Error getting board with ID ${id}:`, error);
      return undefined;
    }
  }

  async createBoard(board: InsertBoard): Promise<Board> {
    try {
      const [newBoard] = await db.insert(boards).values(board).returning();
      return newBoard;
    } catch (error) {
      console.error('Error creating board:', error);
      throw error;
    }
  }

  async updateBoard(id: number, board: Partial<InsertBoard>): Promise<Board | undefined> {
    try {
      const [updatedBoard] = await db.update(boards)
        .set(board)
        .where(eq(boards.id, id))
        .returning();
      
      return updatedBoard || undefined;
    } catch (error) {
      console.error(`Error updating board with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteBoard(id: number): Promise<boolean> {
    try {
      await db.delete(boards).where(eq(boards.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting board with ID ${id}:`, error);
      return false;
    }
  }

  async getCategories(boardId: number): Promise<Category[]> {
    try {
      const result = await db.select().from(categories)
        .where(eq(categories.boardId, boardId))
        .orderBy(asc(categories.name));
      
      return result;
    } catch (error) {
      console.error(`Error getting categories for board ID ${boardId}:`, error);
      return [];
    }
  }

  async getCategory(id: number): Promise<Category | undefined> {
    try {
      const [category] = await db.select().from(categories).where(eq(categories.id, id));
      return category || undefined;
    } catch (error) {
      console.error(`Error getting category with ID ${id}:`, error);
      return undefined;
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      const [newCategory] = await db.insert(categories).values(category).returning();
      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    try {
      const [updatedCategory] = await db.update(categories)
        .set(category)
        .where(eq(categories.id, id))
        .returning();
      
      return updatedCategory || undefined;
    } catch (error) {
      console.error(`Error updating category with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      await db.delete(categories).where(eq(categories.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting category with ID ${id}:`, error);
      return false;
    }
  }

  async getCustomFields(boardId: number): Promise<CustomField[]> {
    try {
      const result = await db.select().from(customFields)
        .where(eq(customFields.boardId, boardId))
        .orderBy(asc(customFields.name));
      
      return result;
    } catch (error) {
      console.error(`Error getting custom fields for board ID ${boardId}:`, error);
      return [];
    }
  }

  async getCustomField(id: number): Promise<CustomField | undefined> {
    try {
      const [customField] = await db.select().from(customFields).where(eq(customFields.id, id));
      return customField || undefined;
    } catch (error) {
      console.error(`Error getting custom field with ID ${id}:`, error);
      return undefined;
    }
  }

  async createCustomField(field: InsertCustomField): Promise<CustomField> {
    try {
      const [newCustomField] = await db.insert(customFields).values(field).returning();
      return newCustomField;
    } catch (error) {
      console.error('Error creating custom field:', error);
      throw error;
    }
  }

  async updateCustomField(id: number, field: Partial<InsertCustomField>): Promise<CustomField | undefined> {
    try {
      const [updatedCustomField] = await db.update(customFields)
        .set(field)
        .where(eq(customFields.id, id))
        .returning();
      
      return updatedCustomField || undefined;
    } catch (error) {
      console.error(`Error updating custom field with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteCustomField(id: number): Promise<boolean> {
    try {
      await db.delete(customFields).where(eq(customFields.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting custom field with ID ${id}:`, error);
      return false;
    }
  }

  async getTasks(categoryId: number): Promise<Task[]> {
    try {
      const result = await db.select().from(tasks)
        .where(and(
          eq(tasks.categoryId, categoryId),
          eq(tasks.isArchived, false)
        ))
        .orderBy(asc(tasks.createdAt));
      
      return result;
    } catch (error) {
      console.error(`Error getting tasks for category ID ${categoryId}:`, error);
      return [];
    }
  }

  async getTask(id: number): Promise<Task | undefined> {
    try {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
      return task || undefined;
    } catch (error) {
      console.error(`Error getting task with ID ${id}:`, error);
      return undefined;
    }
  }

  async createTask(task: InsertTask): Promise<Task> {
    try {
      const [newTask] = await db.insert(tasks).values(task).returning();
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    try {
      const [updatedTask] = await db.update(tasks)
        .set(task)
        .where(eq(tasks.id, id))
        .returning();
      
      console.log(`Successfully updated task ${id}:`, updatedTask);
      
      return updatedTask || undefined;
    } catch (error) {
      console.error(`Error updating task with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      await db.delete(tasks).where(eq(tasks.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting task with ID ${id}:`, error);
      return false;
    }
  }

  async getArchivedTasks(boardId: number): Promise<Task[]> {
    try {
      // Get all categories of the board to find tasks
      const boardCategories = await this.getCategories(boardId);
      const categoryIds = boardCategories.map(cat => cat.id);
      
      if (categoryIds.length === 0) {
        return [];
      }
      
      // Get all archived tasks from those categories
      const archivedTasks = await db.select().from(tasks)
        .where(and(
          inArray(tasks.categoryId, categoryIds),
          eq(tasks.isArchived, true)
        ))
        .orderBy(desc(tasks.createdAt));
      
      return archivedTasks;
    } catch (error) {
      console.error(`Error getting archived tasks for board ID ${boardId}:`, error);
      return [];
    }
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    try {
      console.log(`Getting system setting for key: ${key}`);
      const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
      return setting || undefined;
    } catch (error) {
      console.error(`Error getting system setting with key ${key}:`, error);
      return undefined;
    }
  }

  async updateSystemSetting(key: string, value: string): Promise<SystemSetting | undefined> {
    try {
      // Try to update an existing setting
      const [updatedSetting] = await db.update(systemSettings)
        .set({ value })
        .where(eq(systemSettings.key, key))
        .returning();
      
      if (updatedSetting) {
        return updatedSetting;
      }
      
      // If no rows were updated, insert a new setting
      const [newSetting] = await db.insert(systemSettings)
        .values({ key, value })
        .returning();
      
      return newSetting;
    } catch (error) {
      console.error(`Error updating system setting with key ${key}:`, error);
      return undefined;
    }
  }

  async createEventLog(log: InsertEventLog): Promise<EventLog> {
    try {
      console.log('Creating event log:', {
        userId: log.userId,
        eventType: log.eventType,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      });
      
      const [eventLog] = await db.insert(eventLogs).values({
        userId: log.userId,
        eventType: log.eventType,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details || {},
        ipAddress: log.ipAddress || null,
        userAgent: log.userAgent || null
      }).returning();
      
      return eventLog;
    } catch (error) {
      console.error('Error creating event log:', error);
      throw error;
    }
  }
  
  async getEventLogs(options?: { limit?: number, offset?: number, userId?: number, entityType?: string, eventType?: string }): Promise<EventLog[]> {
    try {
      // Create a SQL query with LEFT JOIN to get user data directly
      let query = `
        SELECT 
          e.id, 
          e.event_type as "eventType", 
          e.entity_type as "entityType", 
          e.entity_id as "entityId", 
          e.user_id as "userId", 
          e.details, 
          e.ip_address as "ipAddress", 
          e.user_agent as "userAgent", 
          e.created_at as "createdAt",
          CASE WHEN u.id IS NOT NULL THEN 
            json_build_object(
              'id', u.id,
              'username', u.username,
              'email', u.email,
              'role', u.role,
              'avatarColor', u.avatar_color
            )
          ELSE NULL
          END as user_data
        FROM "event_logs" e
        LEFT JOIN "users" u ON e.user_id = u.id
      `;
      
      const whereClauses = [];
      if (options?.userId) {
        whereClauses.push(`e.user_id = ${options.userId}`);
      }
      
      if (options?.entityType) {
        whereClauses.push(`e.entity_type = '${options.entityType}'`);
      }
      
      if (options?.eventType) {
        whereClauses.push(`e.event_type = '${options.eventType}'`);
      }
      
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      
      // Add ordering and pagination
      query += ` ORDER BY e.created_at DESC`;
      
      if (options?.limit) {
        const offset = options.offset || 0;
        query += ` LIMIT ${options.limit} OFFSET ${offset}`;
      }
      
      console.log('Executing event logs query with JOIN');
      const result = await db.execute(sql.raw(query));
      console.log(`Retrieved ${result.rows.length} event logs`);
      
      // Format the result to match EventLog with user property
      const logs = result.rows.map((row: any) => {
        const log: EventLog = {
          id: Number(row.id),
          eventType: String(row.eventType),
          entityType: String(row.entityType), 
          entityId: Number(row.entityId),
          userId: Number(row.userId),
          details: row.details,
          ipAddress: row.ipAddress ? String(row.ipAddress) : null,
          userAgent: row.userAgent ? String(row.userAgent) : null,
          createdAt: typeof row.createdAt === 'string' ? new Date(row.createdAt) : 
                   row.createdAt instanceof Date ? row.createdAt : new Date()
        };
        
        // Add user data if present
        if (row.user_data) {
          // @ts-ignore
          log.user = row.user_data;
        }
        
        return log;
      });
      
      return logs;
    } catch (error) {
      console.error('Error getting event logs:', error);
      return [];
    }
  }
  
  async getEventLog(id: number): Promise<EventLog | undefined> {
    try {
      // Use SQL query with JOIN to get both log and user data
      const query = `
        SELECT 
          e.id, 
          e.event_type as "eventType", 
          e.entity_type as "entityType", 
          e.entity_id as "entityId", 
          e.user_id as "userId", 
          e.details, 
          e.ip_address as "ipAddress", 
          e.user_agent as "userAgent", 
          e.created_at as "createdAt",
          CASE WHEN u.id IS NOT NULL THEN 
            json_build_object(
              'id', u.id,
              'username', u.username,
              'email', u.email,
              'role', u.role,
              'avatarColor', u.avatar_color
            )
          ELSE NULL
          END as user_data
        FROM "event_logs" e
        LEFT JOIN "users" u ON e.user_id = u.id
        WHERE e.id = ${id}
      `;
      
      const result = await db.execute(sql.raw(query));
      
      if (!result.rows.length) {
        return undefined;
      }
      
      const row = result.rows[0];
      const log: EventLog = {
        id: Number(row.id),
        eventType: String(row.eventType),
        entityType: String(row.entityType),
        entityId: Number(row.entityId),
        userId: Number(row.userId),
        details: row.details,
        ipAddress: row.ipAddress ? String(row.ipAddress) : null,
        userAgent: row.userAgent ? String(row.userAgent) : null,
        createdAt: typeof row.createdAt === 'string' ? new Date(row.createdAt) : 
                 row.createdAt instanceof Date ? row.createdAt : new Date()
      };
      
      // Add user data if present
      if (row.user_data) {
        // @ts-ignore
        log.user = row.user_data;
      }
      
      return log;
    } catch (error) {
      console.error(`Error getting event log ${id}:`, error);
      return undefined;
    }
  }
  
  async getEventLogCount(filters?: { userId?: number, entityType?: string, eventType?: string }): Promise<number> {
    try {
      // Build SQL for count query with optional filters
      let query = `SELECT COUNT(*) as count FROM "event_logs"`;
      
      const whereClauses = [];
      if (filters?.userId) {
        whereClauses.push(`user_id = ${filters.userId}`);
      }
      
      if (filters?.entityType) {
        whereClauses.push(`entity_type = '${filters.entityType}'`);
      }
      
      if (filters?.eventType) {
        whereClauses.push(`event_type = '${filters.eventType}'`);
      }
      
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      
      console.log('Executing event logs count query');
      const result = await db.execute(sql.raw(query));
      const countResult = result.rows[0];
      const count = countResult && typeof countResult.count !== 'undefined' ? 
                   parseInt(String(countResult.count)) : 0;
      console.log(`Count result: ${count}`);
      
      return count;
    } catch (error) {
      console.error('Error counting event logs:', error);
      return 0;
    }
  }
}