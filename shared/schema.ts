import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Define board schema
export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(),
});

export const insertBoardSchema = createInsertSchema(boards).pick({
  name: true,
  userId: true,
});

// Define category schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  boardId: integer("board_id").notNull(),
  order: integer("order").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  color: true,
  boardId: true,
  order: true,
});

// Define custom field schema
export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // text, number, date, select, checkbox, url
  options: text("options"), // comma-separated options for select type
  boardId: integer("board_id").notNull(),
});

export const insertCustomFieldSchema = createInsertSchema(customFields).pick({
  name: true,
  type: true,
  options: true,
  boardId: true,
});

// Define task schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  priority: text("priority"), // low, medium, high
  categoryId: integer("category_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  assignees: text("assignees").array(), // array of user ids or initials
  customData: jsonb("custom_data"), // JSON to store custom field data
  comments: integer("comments").default(0),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boards.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomField = typeof customFields.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
