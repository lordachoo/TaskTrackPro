import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertBoardSchema, 
  insertCategorySchema, 
  insertCustomFieldSchema, 
  insertTaskSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // Board endpoints
  apiRouter.get("/boards", async (req: Request, res: Response) => {
    try {
      // For demo purposes, always use userId 1
      const userId = 1;
      const boards = await storage.getBoards(userId);
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
      
      const updatedBoard = await storage.updateBoard(id, validatedData);
      
      if (!updatedBoard) {
        return res.status(404).json({ message: "Board not found" });
      }
      
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
      const success = await storage.deleteBoard(id);
      
      if (!success) {
        return res.status(404).json({ message: "Board not found" });
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
      const validatedData = insertTaskSchema.partial().parse(req.body);
      
      const updatedTask = await storage.updateTask(id, validatedData);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
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
      const success = await storage.deleteTask(id);
      
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
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

  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
