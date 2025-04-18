import { 
  User, InsertUser, 
  Board, InsertBoard, 
  Category, InsertCategory, 
  CustomField, InsertCustomField,
  Task, InsertTask,
  SystemSetting,
  users, boards, categories, customFields, tasks, systemSettings
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { and, eq, asc } from "drizzle-orm";
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
    return await db.select()
      .from(boards)
      .where(
        and(
          eq(boards.userId, userId),
          showArchived ? eq(boards.isArchived, true) : eq(boards.isArchived, false)
        )
      );
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
}