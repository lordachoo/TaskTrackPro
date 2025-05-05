import { 
  User, InsertUser, 
  Board, InsertBoard, 
  Category, InsertCategory, 
  CustomField, InsertCustomField,
  Task, InsertTask,
  SystemSetting,
  EventLog, InsertEventLog,
  users, boards, categories, customFields, tasks, systemSettings, eventLogs
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { and, eq, asc, desc, count, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize system settings
    this.initializeSystemSettings();
  }
  
  // Initialize required system settings
  async initializeSystemSettings() {
    try {
      // Check if allow_registrations setting exists
      const registerSetting = await this.getSystemSetting('allow_registrations');
      if (!registerSetting) {
        // Create initial setting if it doesn't exist
        await this.updateSystemSetting('allow_registrations', 'true');
        console.log('Initialized system setting: allow_registrations = true');
      }
    } catch (error) {
      console.error('Error initializing system settings:', error);
    }
  }
  
  // User methods
  async getAllUsers(): Promise<User[]> {
    console.log("Getting all users from database");
    const allUsers = await db.select().from(users);
    console.log("Retrieved users from database:", allUsers);
    return allUsers;
  }
  
  // Authentication helper methods
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Log the input data for debugging
    console.log("Creating user in database with data:", {
      ...insertUser,
      password: "***MASKED***" // Don't log plain passwords
    });
    
    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    console.log("Password hashed for security");
    
    // Create the user with all fields in the database - do not modify email
    const [user] = await db.insert(users).values({
      username: insertUser.username,
      password: hashedPassword, // Store the hashed password
      fullName: insertUser.fullName || null,
      // Preserve the exact email from the input
      email: insertUser.email,
      // Preserve the exact role from the input
      role: insertUser.role,
      avatarColor: insertUser.avatarColor || '#6366f1',
      isActive: insertUser.isActive !== undefined ? insertUser.isActive : true
    }).returning();
    
    console.log("User created in database, returned data:", {
      ...user,
      password: "***MASKED***" // Don't log passwords
    });
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // Log the input data for debugging (mask password)
    console.log(`Updating user ${id} in database with data:`, {
      ...userData,
      password: userData.password ? "***MASKED***" : undefined
    });
    
    // Make sure we're preserving email and role values exactly as provided
    const cleanedData = { ...userData };
    if (userData.email !== undefined) {
      cleanedData.email = userData.email; // Preserve email exactly as provided
    }
    if (userData.role !== undefined) {
      cleanedData.role = userData.role; // Preserve role exactly as provided
    }
    
    // If password is being updated, hash it
    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      cleanedData.password = hashedPassword;
      console.log(`User ${id} password hashed for security`);
    }
    
    const [updatedUser] = await db.update(users)
      .set(cleanedData)
      .where(eq(users.id, id))
      .returning();
    
    console.log(`User ${id} updated in database, returned data:`, {
      ...updatedUser,
      password: "***MASKED***" // Don't log passwords
    });
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Board methods
  async getBoards(userId: number, showArchived: boolean = false): Promise<Board[]> {
    try {
      console.log(`getBoards called with userId=${userId}, showArchived=${showArchived}`);
      
      // First get the user to check if they're an admin
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      console.log(`User role for userId=${userId}: ${user?.role || 'undefined'}`);
      
      let query = '';
      
      // If showing archived boards and user is an admin, show all archived boards
      if (showArchived && user && user.role === 'admin') {
        console.log(`Admin user ${userId} is requesting all archived boards`);
        
        // Use raw SQL to directly query archived boards
        query = `
          SELECT id, name, user_id as "userId", is_archived as "isArchived", created_at as "createdAt"
          FROM boards 
          WHERE is_archived = true
        `;
      } else {
        // Otherwise, only show boards belonging to this user
        console.log(`Showing ${showArchived ? 'archived' : 'non-archived'} boards for user ${userId}`);
        
        // Use raw SQL to query user's boards
        query = `
          SELECT id, name, user_id as "userId", is_archived as "isArchived", created_at as "createdAt"
          FROM boards 
          WHERE user_id = ${userId} 
          AND is_archived = ${showArchived}
        `;
      }
      
      // Execute the query
      const result = await db.execute(sql.raw(query));
      console.log('Raw SQL query result:', result);
      
      // Return the boards
      return result.rows.map(row => ({
        id: Number(row.id),
        name: String(row.name),
        userId: Number(row.userId),
        isArchived: Boolean(row.isArchived),
        createdAt: new Date(row.createdAt)
      }));
    } catch (error) {
      console.error('Error in getBoards:', error);
      throw error;
    }
  }

  async getBoard(id: number): Promise<Board | undefined> {
    const [board] = await db.select().from(boards).where(eq(boards.id, id));
    return board;
  }

  async createBoard(board: InsertBoard): Promise<Board> {
    const [newBoard] = await db.insert(boards).values(board).returning();
    return newBoard;
  }

  async updateBoard(id: number, board: Partial<InsertBoard>): Promise<Board | undefined> {
    const [updatedBoard] = await db
      .update(boards)
      .set(board)
      .where(eq(boards.id, id))
      .returning();
    
    return updatedBoard;
  }

  async deleteBoard(id: number): Promise<boolean> {
    try {
      // Delete associated tasks first
      const boardCategories = await db.select().from(categories).where(eq(categories.boardId, id));
      
      for (const category of boardCategories) {
        await db.delete(tasks).where(eq(tasks.categoryId, category.id));
      }
      
      // Then delete categories
      await db.delete(categories).where(eq(categories.boardId, id));
      
      // Delete custom fields associated with this board
      const boardCustomFields = await db.select().from(customFields).where(eq(customFields.boardId, id));
      console.log(`Deleting ${boardCustomFields.length} custom fields for board ${id}`);
      
      if (boardCustomFields.length > 0) {
        await db.delete(customFields).where(eq(customFields.boardId, id));
      }
      
      // Finally delete the board
      await db.delete(boards).where(eq(boards.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting board:", error);
      return false;
    }
  }

  // Category methods
  async getCategories(boardId: number): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.boardId, boardId))
      .orderBy(asc(categories.order));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      // Delete all tasks in this category first
      await db.delete(tasks).where(eq(tasks.categoryId, id));
      
      // Then delete the category
      await db.delete(categories).where(eq(categories.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting category:", error);
      return false;
    }
  }

  // Custom Field methods
  async getCustomFields(boardId: number): Promise<CustomField[]> {
    return await db.select().from(customFields).where(eq(customFields.boardId, boardId));
  }

  async getCustomField(id: number): Promise<CustomField | undefined> {
    const [customField] = await db.select().from(customFields).where(eq(customFields.id, id));
    return customField;
  }

  async createCustomField(field: InsertCustomField): Promise<CustomField> {
    const [newField] = await db.insert(customFields).values(field).returning();
    return newField;
  }

  async updateCustomField(id: number, field: Partial<InsertCustomField>): Promise<CustomField | undefined> {
    const [updatedField] = await db
      .update(customFields)
      .set(field)
      .where(eq(customFields.id, id))
      .returning();
    
    return updatedField;
  }

  async deleteCustomField(id: number): Promise<boolean> {
    try {
      await db.delete(customFields).where(eq(customFields.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting custom field:", error);
      return false;
    }
  }

  // Task methods
  async getTasks(categoryId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.categoryId, categoryId),
          eq(tasks.isArchived, false)
        )
      );
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    try {
      console.log(`Updating task ${id} with:`, task);
      
      // Explicitly handle customData field for better JSONB handling
      if (task.customData !== undefined) {
        console.log(`Task ${id} has customData update:`, task.customData);
        
        // Ensure the JSON is properly formatted for PostgreSQL
        // This is critical for JSONB fields
        if (typeof task.customData === 'object') {
          task.customData = task.customData as any;
        }
      }
      
      const [updatedTask] = await db
        .update(tasks)
        .set(task)
        .where(eq(tasks.id, id))
        .returning();
      
      console.log(`Successfully updated task ${id}:`, updatedTask);
      return updatedTask;
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      await db.delete(tasks).where(eq(tasks.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting task:", error);
      return false;
    }
  }

  async getArchivedTasks(boardId: number): Promise<Task[]> {
    // Get all categories belonging to this board
    const boardCategories = await db.select().from(categories).where(eq(categories.boardId, boardId));
    
    if (boardCategories.length === 0) {
      return [];
    }
    
    // Collect all archived tasks from all categories
    let allArchivedTasks: Task[] = [];
    
    for (const category of boardCategories) {
      const categoryTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.isArchived, true),
            eq(tasks.categoryId, category.id)
          )
        );
      
      allArchivedTasks = [...allArchivedTasks, ...categoryTasks];
    }
    
    return allArchivedTasks;
  }
  
  // System Settings methods
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    console.log(`Getting system setting for key: ${key}`);
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting;
  }
  
  async updateSystemSetting(key: string, value: string): Promise<SystemSetting | undefined> {
    console.log(`Updating system setting: ${key} = ${value}`);
    
    // Check if the setting exists first
    const existing = await this.getSystemSetting(key);
    
    if (existing) {
      // Update
      const [updated] = await db
        .update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();
      
      return updated;
    } else {
      // Insert
      const [newSetting] = await db
        .insert(systemSettings)
        .values({ 
          key, 
          value, 
          description: `Setting added on ${new Date().toISOString()}` 
        })
        .returning();
      
      return newSetting;
    }
  }

  // Event Logging methods
  async createEventLog(log: InsertEventLog): Promise<EventLog> {
    try {
      console.log('Creating event log:', {
        ...log,
        details: log.details ? '[Object]' : null // Don't log full details to console
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
  
  async getEventLogs(options?: { limit?: number, offset?: number, userId?: number, entityType?: string }): Promise<EventLog[]> {
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
              'avatarColor', u."avatarColor"
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
              'avatarColor', u."avatarColor"
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
  
  async getEventLogCount(filters?: { userId?: number, entityType?: string }): Promise<number> {
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