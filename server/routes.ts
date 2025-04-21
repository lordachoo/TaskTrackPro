import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import { 
  insertBoardSchema, 
  insertCategorySchema, 
  insertCustomFieldSchema, 
  insertTaskSchema,
  insertUserSchema,
  users
} from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { 
  logBoardEvent, 
  logCategoryEvent, 
  logTaskEvent, 
  logCustomFieldEvent,
  logUserEvent,
  logSystemEvent,
  EventTypes,
  EntityTypes
} from "./eventLogger";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  const apiRouter = express.Router();
  
  // Board endpoints
  apiRouter.get("/boards", async (req: Request, res: Response) => {
    try {
      // For demo purposes, always use userId 1
      const userId = 1;
      const showArchived = req.query.showArchived === 'true';
      const boards = await storage.getBoards(userId, showArchived);
      res.json(boards);
    } catch (error) {
      console.error("Error getting boards:", error);
      res.status(500).json({ message: "Failed to get boards" });
    }
  });

  apiRouter.get("/boards/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const board = await storage.getBoard(id);
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      res.json(board);
    } catch (error) {
      console.error("Error getting board:", error);
      res.status(500).json({ message: "Failed to get board" });
    }
  });

  apiRouter.post("/boards", async (req: Request, res: Response) => {
    try {
      // For demo purposes, always use userId 1
      req.body.userId = 1;
      
      const validatedData = insertBoardSchema.parse(req.body);
      const board = await storage.createBoard(validatedData);
      
      // Log the board creation event
      await logBoardEvent(req, EventTypes.BOARD_CREATED, board.id, {
        name: board.name,
        userId: board.userId
      });
      
      res.status(201).json(board);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid board data", errors: error.errors });
      }
      console.error("Error creating board:", error);
      res.status(500).json({ message: "Failed to create board" });
    }
  });

  apiRouter.put("/boards/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBoardSchema.partial().parse(req.body);
      
      // Get the original board for logging purposes
      const originalBoard = await storage.getBoard(id);
      if (!originalBoard) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      const updatedBoard = await storage.updateBoard(id, validatedData);
      
      if (!updatedBoard) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      // Log the board update event
      await logBoardEvent(req, EventTypes.BOARD_UPDATED, updatedBoard.id, {
        before: {
          name: originalBoard.name,
          description: originalBoard.description
        },
        after: {
          name: updatedBoard.name,
          description: updatedBoard.description
        },
        changedFields: Object.keys(validatedData)
      });
      
      res.json(updatedBoard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid board data", errors: error.errors });
      }
      console.error("Error updating board:", error);
      res.status(500).json({ message: "Failed to update board" });
    }
  });

  apiRouter.delete("/boards/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the board exists
      const board = await storage.getBoard(id);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      // Get all categories for this board
      const categories = await storage.getCategories(id);
      
      // Check if any categories have tasks - if so, don't allow deletion
      for (const category of categories) {
        const tasks = await storage.getTasks(category.id);
        if (tasks.length > 0) {
          return res.status(400).json({ 
            message: "Cannot delete board with tasks. Archive or delete all tasks first." 
          });
        }
      }
      
      // Get all custom fields for this board to delete later
      const customFields = await storage.getCustomFields(id);
      console.log(`Found ${customFields.length} custom fields to delete for board ${id}`);
      
      // Delete all categories first
      for (const category of categories) {
        await storage.deleteCategory(category.id);
      }
      
      // Delete all custom fields associated with this board
      for (const field of customFields) {
        await storage.deleteCustomField(field.id);
      }
      
      // Now delete the board
      const success = await storage.deleteBoard(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete board" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting board:", error);
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  // Category endpoints
  apiRouter.get("/boards/:boardId/categories", async (req: Request, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const categories = await storage.getCategories(boardId);
      res.json(categories);
    } catch (error) {
      console.error("Error getting categories:", error);
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  apiRouter.post("/categories", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  apiRouter.put("/categories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCategorySchema.partial().parse(req.body);
      
      const updatedCategory = await storage.updateCategory(id, validatedData);
      
      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  apiRouter.delete("/categories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCategory(id);
      
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Custom Field endpoints
  apiRouter.get("/boards/:boardId/customFields", async (req: Request, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const customFields = await storage.getCustomFields(boardId);
      res.json(customFields);
    } catch (error) {
      console.error("Error getting custom fields:", error);
      res.status(500).json({ message: "Failed to get custom fields" });
    }
  });

  apiRouter.post("/customFields", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCustomFieldSchema.parse(req.body);
      const customField = await storage.createCustomField(validatedData);
      res.status(201).json(customField);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid custom field data", errors: error.errors });
      }
      console.error("Error creating custom field:", error);
      res.status(500).json({ message: "Failed to create custom field" });
    }
  });

  apiRouter.put("/customFields/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCustomFieldSchema.partial().parse(req.body);
      
      const updatedCustomField = await storage.updateCustomField(id, validatedData);
      
      if (!updatedCustomField) {
        return res.status(404).json({ message: "Custom field not found" });
      }
      
      res.json(updatedCustomField);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid custom field data", errors: error.errors });
      }
      console.error("Error updating custom field:", error);
      res.status(500).json({ message: "Failed to update custom field" });
    }
  });

  apiRouter.delete("/customFields/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomField(id);
      
      if (!success) {
        return res.status(404).json({ message: "Custom field not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting custom field:", error);
      res.status(500).json({ message: "Failed to delete custom field" });
    }
  });

  // Task endpoints
  apiRouter.get("/categories/:categoryId/tasks", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const tasks = await storage.getTasks(categoryId);
      res.json(tasks);
    } catch (error) {
      console.error("Error getting tasks:", error);
      res.status(500).json({ message: "Failed to get tasks" });
    }
  });

  apiRouter.get("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error getting task:", error);
      res.status(500).json({ message: "Failed to get task" });
    }
  });

  apiRouter.post("/tasks", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      
      // Log the task creation event
      await logTaskEvent(req, EventTypes.TASK_CREATED, task.id, {
        title: task.title,
        categoryId: task.categoryId,
        priority: task.priority,
        dueDate: task.dueDate
      });
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  apiRouter.put("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // First, get the existing task to properly handle customData
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Validate the incoming data
      const validatedData = insertTaskSchema.partial().parse(req.body);
      
      // Special handling for customData
      if (validatedData.customData !== undefined) {
        console.log('Incoming customData:', validatedData.customData);
        console.log('Existing customData:', existingTask.customData);
        
        // Ensure customData is an object or empty object if it's null
        if (validatedData.customData === null) {
          console.log('customData is null, setting to empty object');
          validatedData.customData = {};
        } 
        // If customData is an object with no keys, set it as an empty object
        else if (typeof validatedData.customData === 'object' && 
                 Object.keys(validatedData.customData as object).length === 0) {
          console.log('customData is an empty object');
          validatedData.customData = {};
        }
      }
      
      console.log('Final data being sent to storage:', validatedData);
      
      // Update the task with the validated data
      const updatedTask = await storage.updateTask(id, validatedData);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task could not be updated" });
      }
      
      console.log('Task updated successfully:', updatedTask);
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  apiRouter.delete("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the task first to retrieve the category ID
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Store the category ID before deleting
      const categoryId = task.categoryId;
      
      // Log the task deletion event with task details for auditing
      try {
        await logTaskEvent(
          req,
          EventTypes.TASK_DELETED,
          id,
          {
            task: {
              title: task.title,
              description: task.description,
              categoryId: task.categoryId,
              priority: task.priority,
              dueDate: task.dueDate,
              assignees: task.assignees
            }
          }
        );
        console.log(`Logged task deletion event for task ${id}`);
      } catch (logError) {
        console.error("Error logging task deletion:", logError);
        // Continue with deletion even if logging fails
      }
      
      // Delete the task
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Include the category ID in the response header
      res.setHeader('X-Category-ID', categoryId.toString());
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Archive tasks
  apiRouter.put("/tasks/:id/archive", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const updatedTask = await storage.updateTask(id, { isArchived: true });
      res.json(updatedTask);
    } catch (error) {
      console.error("Error archiving task:", error);
      res.status(500).json({ message: "Failed to archive task" });
    }
  });

  // Get archived tasks
  apiRouter.get("/boards/:boardId/archivedTasks", async (req: Request, res: Response) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const archivedTasks = await storage.getArchivedTasks(boardId);
      res.json(archivedTasks);
    } catch (error) {
      console.error("Error getting archived tasks:", error);
      res.status(500).json({ message: "Failed to get archived tasks" });
    }
  });

  // Restore archived task
  apiRouter.put("/tasks/:id/restore", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const updatedTask = await storage.updateTask(id, { isArchived: false });
      res.json(updatedTask);
    } catch (error) {
      console.error("Error restoring task:", error);
      res.status(500).json({ message: "Failed to restore task" });
    }
  });

  // Archive board
  apiRouter.put("/boards/:id/archive", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const board = await storage.getBoard(id);
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      // Cast to any to bypass type checking since we know isArchived is valid
      const updatedBoard = await storage.updateBoard(id, { isArchived: true } as any);
      res.json(updatedBoard);
    } catch (error) {
      console.error("Error archiving board:", error);
      res.status(500).json({ message: "Failed to archive board" });
    }
  });

  // Restore archived board
  apiRouter.put("/boards/:id/restore", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const board = await storage.getBoard(id);
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      // Cast to any to bypass type checking since we know isArchived is valid
      const updatedBoard = await storage.updateBoard(id, { isArchived: false } as any);
      res.json(updatedBoard);
    } catch (error) {
      console.error("Error restoring board:", error);
      res.status(500).json({ message: "Failed to restore board" });
    }
  });

  // Get archived boards
  apiRouter.get("/users/:userId/archivedBoards", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const archivedBoards = await storage.getBoards(userId, true);
      res.json(archivedBoards);
    } catch (error) {
      console.error("Error getting archived boards:", error);
      res.status(500).json({ message: "Failed to get archived boards" });
    }
  });

  // System Settings endpoints
  apiRouter.get("/settings/:key", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const setting = await storage.getSystemSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: `Setting '${key}' not found` });
      }
      
      res.json(setting);
    } catch (error) {
      console.error(`Error getting setting ${req.params.key}:`, error);
      res.status(500).json({ message: "Failed to get system setting" });
    }
  });
  
  apiRouter.put("/settings/:key", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const { value } = req.body;
      
      if (typeof value !== 'string') {
        return res.status(400).json({ message: "Setting value must be a string" });
      }
      
      const updatedSetting = await storage.updateSystemSetting(key, value);
      res.json(updatedSetting);
    } catch (error) {
      console.error(`Error updating setting ${req.params.key}:`, error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });
  
  // User management endpoints
  apiRouter.get("/users", async (_req: Request, res: Response) => {
    try {
      // Use the storage interface to get all users with proper data
      const allUsers = await storage.getAllUsers();
      
      console.log("Retrieved users from database:", allUsers);
      
      // Remove password from response
      const sanitizedUsers = allUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      console.log("Sending users to client:", sanitizedUsers);
      
      // Add cache control headers to prevent browser caching
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  apiRouter.get("/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  apiRouter.post("/users", async (req: Request, res: Response) => {
    try {
      // First, check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      console.log("Creating user with data:", req.body);
      
      // Ensure explicit values for role and email
      const userData = {
        ...req.body,
        // Make sure to use the actual values provided by the form, not defaults or modifications
        role: req.body.role, 
        email: req.body.email
      };
      
      const validatedData = insertUserSchema.parse(userData);
      console.log("Validated user data:", validatedData);
      
      const user = await storage.createUser(validatedData);
      console.log("User created in database:", user);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  apiRouter.put("/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If username is being changed, make sure it's not already taken
      if (req.body.username && req.body.username !== user.username) {
        const existingUser = await storage.getUserByUsername(req.body.username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      
      console.log("Updating user with data:", req.body);
      
      // Ensure explicit values for role and email from request
      const userData = {
        ...req.body,
        // Make sure to use the values from the form as is
        role: req.body.role,
        email: req.body.email
      };
      
      const validatedData = insertUserSchema.partial().parse(userData);
      console.log("Validated update data:", validatedData);
      
      // Update the user
      const updatedUser = await storage.updateUser(id, validatedData);
      console.log("Updated user in database:", updatedUser);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  apiRouter.delete("/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only protect the built-in admin user with ID 1
      if (user.username === "admin" && id === 1) {
        return res.status(403).json({ message: "Cannot delete the primary admin user" });
      }
      
      // Delete the user
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Event Logs endpoints - Admin only
  apiRouter.get("/eventLogs/stats/counts", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      // Get counts for different entity types
      const taskCount = await storage.getEventLogCount({ entityType: 'task' });
      const boardCount = await storage.getEventLogCount({ entityType: 'board' });
      const categoryCount = await storage.getEventLogCount({ entityType: 'category' });
      const userCount = await storage.getEventLogCount({ entityType: 'user' });
      const customFieldCount = await storage.getEventLogCount({ entityType: 'customField' });
      
      res.json({
        task: taskCount,
        board: boardCount,
        category: categoryCount,
        user: userCount,
        customField: customFieldCount,
        total: taskCount + boardCount + categoryCount + userCount + customFieldCount
      });
    } catch (error) {
      console.error("Error fetching event log stats:", error);
      res.status(500).send("Error fetching event log statistics");
    }
  });
  
  apiRouter.get("/eventLogs", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.page ? parseInt(req.query.page as string) * limit : 0;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const entityType = req.query.entityType as string | undefined;
      
      const logs = await storage.getEventLogs({ limit, offset, userId, entityType });
      const total = await storage.getEventLogCount({ userId, entityType });
      
      res.json({
        logs,
        pagination: {
          total,
          page: offset / limit,
          pageSize: limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching event logs:", error);
      res.status(500).send("Error fetching event logs");
    }
  });
  
  apiRouter.get("/eventLogs/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const log = await storage.getEventLog(id);
      
      if (!log) {
        return res.status(404).send("Event log not found");
      }
      
      res.json(log);
    } catch (error) {
      console.error("Error fetching event log:", error);
      res.status(500).send("Error fetching event log");
    }
  });

  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
