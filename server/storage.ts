import { 
  User, InsertUser, 
  Board, InsertBoard, 
  Category, InsertCategory, 
  CustomField, InsertCustomField,
  Task, InsertTask,
  users, boards, categories, customFields, tasks
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Board methods
  getBoards(userId: number, showArchived?: boolean): Promise<Board[]>;
  getBoard(id: number): Promise<Board | undefined>;
  createBoard(board: InsertBoard): Promise<Board>;
  updateBoard(id: number, board: Partial<InsertBoard>): Promise<Board | undefined>;
  deleteBoard(id: number): Promise<boolean>;

  // Category methods
  getCategories(boardId: number): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Custom Field methods
  getCustomFields(boardId: number): Promise<CustomField[]>;
  getCustomField(id: number): Promise<CustomField | undefined>;
  createCustomField(customField: InsertCustomField): Promise<CustomField>;
  updateCustomField(id: number, customField: Partial<InsertCustomField>): Promise<CustomField | undefined>;
  deleteCustomField(id: number): Promise<boolean>;

  // Task methods
  getTasks(categoryId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  getArchivedTasks(boardId: number): Promise<Task[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private boards: Map<number, Board>;
  private categories: Map<number, Category>;
  private customFields: Map<number, CustomField>;
  private tasks: Map<number, Task>;
  
  private userId = 1;
  private boardId = 1;
  private categoryId = 1;
  private customFieldId = 1;
  private taskId = 1;

  constructor() {
    this.users = new Map();
    this.boards = new Map();
    this.categories = new Map();
    this.customFields = new Map();
    this.tasks = new Map();

    // Create a default user
    this.createUser({
      username: "demo",
      password: "password"
    });

    // Create a default board
    const board = {
      id: this.boardId++,
      name: "Marketing Campaign Board",
      userId: 1,
      isArchived: false,
      createdAt: new Date()
    };
    this.boards.set(board.id, board);

    // Create default categories
    this.createCategory({
      name: "To Do",
      color: "#6366f1", // primary (indigo)
      boardId: board.id,
      order: 0
    });

    this.createCategory({
      name: "In Progress",
      color: "#f59e0b", // warning (amber)
      boardId: board.id,
      order: 1
    });

    this.createCategory({
      name: "In Review",
      color: "#8b5cf6", // secondary (violet)
      boardId: board.id,
      order: 2
    });

    this.createCategory({
      name: "Completed",
      color: "#22c55e", // success (green)
      boardId: board.id,
      order: 3
    });

    // Create some sample tasks
    this.createTask({
      title: "Create social media strategy",
      description: "Define target audience and content themes for Q4",
      dueDate: "2023-10-15",
      priority: "medium",
      categoryId: 1,
      isArchived: false,
      assignees: ["AS", "JD"],
      customData: {},
      comments: 3
    });

    this.createTask({
      title: "Research competitors",
      description: "Analyze top 5 competitors' marketing strategies",
      dueDate: "2023-10-10",
      priority: "low",
      categoryId: 1,
      isArchived: false,
      assignees: ["TM"],
      customData: {},
      comments: 1
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Board methods
  async getBoards(userId: number, showArchived: boolean = false): Promise<Board[]> {
    return Array.from(this.boards.values()).filter(
      (board) => board.userId === userId && (showArchived ? board.isArchived : !board.isArchived)
    );
  }

  async getBoard(id: number): Promise<Board | undefined> {
    return this.boards.get(id);
  }

  async createBoard(board: InsertBoard): Promise<Board> {
    const id = this.boardId++;
    const now = new Date();
    const newBoard: Board = { 
      ...board, 
      id, 
      createdAt: now, 
      isArchived: false 
    };
    this.boards.set(id, newBoard);
    return newBoard;
  }

  async updateBoard(id: number, board: Partial<InsertBoard>): Promise<Board | undefined> {
    const existingBoard = this.boards.get(id);
    if (!existingBoard) return undefined;

    const updatedBoard = { ...existingBoard, ...board };
    this.boards.set(id, updatedBoard);
    return updatedBoard;
  }

  async deleteBoard(id: number): Promise<boolean> {
    return this.boards.delete(id);
  }

  // Category methods
  async getCategories(boardId: number): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter((category) => category.boardId === boardId)
      .sort((a, b) => a.order - b.order);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryId++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const existingCategory = this.categories.get(id);
    if (!existingCategory) return undefined;

    const updatedCategory = { ...existingCategory, ...category };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Custom Field methods
  async getCustomFields(boardId: number): Promise<CustomField[]> {
    return Array.from(this.customFields.values()).filter(
      (customField) => customField.boardId === boardId
    );
  }

  async getCustomField(id: number): Promise<CustomField | undefined> {
    return this.customFields.get(id);
  }

  async createCustomField(customField: InsertCustomField): Promise<CustomField> {
    const id = this.customFieldId++;
    const newCustomField: CustomField = { 
      ...customField, 
      id,
      options: customField.options || null
    };
    this.customFields.set(id, newCustomField);
    return newCustomField;
  }

  async updateCustomField(id: number, customField: Partial<InsertCustomField>): Promise<CustomField | undefined> {
    const existingCustomField = this.customFields.get(id);
    if (!existingCustomField) return undefined;

    const updatedCustomField = { ...existingCustomField, ...customField };
    this.customFields.set(id, updatedCustomField);
    return updatedCustomField;
  }

  async deleteCustomField(id: number): Promise<boolean> {
    return this.customFields.delete(id);
  }

  // Task methods
  async getTasks(categoryId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.categoryId === categoryId && !task.isArchived
    );
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskId++;
    const now = new Date();
    const newTask: Task = { 
      ...task, 
      id, 
      createdAt: now,
      isArchived: task.isArchived ?? false,
      description: task.description || null,
      dueDate: task.dueDate || null,
      priority: task.priority || null,
      assignees: task.assignees || null,
      customData: task.customData || {},
      comments: task.comments || 0
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;

    const updatedTask = { ...existingTask, ...task };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getArchivedTasks(boardId: number): Promise<Task[]> {
    // Get all categories in the board first
    const boardCategories = await this.getCategories(boardId);
    const categoryIds = boardCategories.map(cat => cat.id);
    
    // Filter tasks that are archived and belong to any of the board's categories
    return Array.from(this.tasks.values()).filter(
      (task) => task.isArchived && categoryIds.includes(task.categoryId)
    );
  }
}

export const storage = new MemStorage();
