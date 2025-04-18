import { 
  User, InsertUser, 
  Board, InsertBoard, 
  Category, InsertCategory, 
  CustomField, InsertCustomField,
  Task, InsertTask,
  users, boards, categories, customFields, tasks
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { and, eq, asc } from "drizzle-orm";

// In-memory cache for user details that are not in the database
class UserExtendedDetailsCache {
  private cache: Map<number, {
    fullName?: string;
    email?: string;
    role?: string;
    avatarColor?: string;
    isActive?: boolean;
    createdAt?: Date;
  }>;

  constructor() {
    this.cache = new Map();
    
    // Set some defaults for the admin and user accounts
    this.cache.set(1, {
      fullName: 'Administrator',
      email: 'admin@example.com',
      role: 'admin',
      avatarColor: '#4f46e5',
      isActive: true,
      createdAt: new Date()
    });
    
    this.cache.set(2, {
      fullName: 'Regular User',
      email: 'user@example.com',
      role: 'user',
      avatarColor: '#10b981',
      isActive: true,
      createdAt: new Date()
    });
  }

  get(id: number) {
    return this.cache.get(id) || {};
  }

  set(id: number, details: {
    fullName?: string;
    email?: string;
    role?: string;
    avatarColor?: string;
    isActive?: boolean;
    createdAt?: Date;
  }) {
    this.cache.set(id, { ...this.get(id), ...details });
  }

  delete(id: number) {
    this.cache.delete(id);
  }
}

const userCache = new UserExtendedDetailsCache();

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [baseUser] = await db.select().from(users).where(eq(users.id, id));
    if (!baseUser) return undefined;
    
    // Add values from cache or defaults for extended properties
    return this.enhanceUserWithCachedDetails(baseUser);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [baseUser] = await db.select().from(users).where(eq(users.username, username));
    if (!baseUser) return undefined;
    
    // Add values from cache or defaults for extended properties
    return this.enhanceUserWithCachedDetails(baseUser);
  }

  async createUser(insertUser: InsertUser & {
    fullName?: string;
    email?: string;
    role?: string;
    avatarColor?: string;
    isActive?: boolean;
  }): Promise<User> {
    // Keep only the fields that exist in the database
    const dbUser = {
      username: insertUser.username,
      password: insertUser.password
    };
    
    const [baseUser] = await db.insert(users).values(dbUser).returning();
    
    // Store the extended details in the cache
    userCache.set(baseUser.id, {
      fullName: insertUser.fullName,
      email: insertUser.email,
      role: insertUser.role,
      avatarColor: insertUser.avatarColor,
      isActive: insertUser.isActive,
      createdAt: new Date()
    });
    
    // Return user with cached extended properties
    return this.enhanceUserWithCachedDetails(baseUser);
  }
  
  async updateUser(id: number, userData: Partial<InsertUser> & {
    fullName?: string;
    email?: string;
    role?: string;
    avatarColor?: string;
    isActive?: boolean;
  }): Promise<User | undefined> {
    // Keep only the fields that exist in the database
    const dbUserData: Partial<InsertUser> = {};
    if (userData.username) dbUserData.username = userData.username;
    if (userData.password) dbUserData.password = userData.password;
    
    const [baseUser] = await db.update(users)
      .set(dbUserData)
      .where(eq(users.id, id))
      .returning();
    
    if (!baseUser) return undefined;
    
    // Update the extended details in the cache
    const detailsToCache = {
      fullName: userData.fullName,
      email: userData.email,
      role: userData.role,
      avatarColor: userData.avatarColor,
      isActive: userData.isActive
    };
    
    // Only add fields that are actually provided (not undefined)
    const filteredDetails: Record<string, any> = {};
    Object.entries(detailsToCache).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredDetails[key] = value;
      }
    });
    
    userCache.set(baseUser.id, filteredDetails);
    
    // Return user with cached extended properties
    return this.enhanceUserWithCachedDetails(baseUser);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    if (result.length > 0) {
      // Also delete from cache
      userCache.delete(id);
      return true;
    }
    return false;
  }
  
  // Helper method to enhance user with cached or default values
  private enhanceUserWithCachedDetails(baseUser: typeof users.$inferSelect): User {
    const cachedDetails = userCache.get(baseUser.id);
    
    return {
      ...baseUser,
      fullName: cachedDetails.fullName || baseUser.username,  // Fallback to username 
      email: cachedDetails.email || `${baseUser.username}@example.com`, // Fallback email
      role: cachedDetails.role || (baseUser.username === 'admin' ? 'admin' : 'user'), // Fallback role
      avatarColor: cachedDetails.avatarColor || '#6366f1',  // Fallback color
      isActive: cachedDetails.isActive !== undefined ? cachedDetails.isActive : true, // Fallback active state
      createdAt: cachedDetails.createdAt || new Date() // Fallback date
    };
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
      
      // Delete custom fields
      await db.delete(customFields).where(eq(customFields.boardId, id));
      
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
}