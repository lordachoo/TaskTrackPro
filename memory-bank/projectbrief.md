# Project Brief: Personal Task Management Application

## Project Overview
This project is a robust personal task management application designed to streamline workflow and enhance productivity through advanced collaboration and intelligent management tools. It provides a flexible, customizable platform for tracking and organizing tasks with drag-and-drop functionality similar to Trello or Monday.

## Core Requirements

### Task Management
- Create, edit, and delete tasks with detailed information
- Organize tasks into customizable categories
- Drag-and-drop interface for moving tasks between categories
- Task attributes: title, description, due date, priority, assignees, custom fields
- Support for markdown formatting in task descriptions
- Links in markdown open in new tabs with target="_blank"
- Proper inline code formatting in markdown descriptions

### Board Management
- Support for multiple boards
- Ability to archive and restore boards
- Customizable board settings

### Category Management
- Create, edit, and delete categories within boards
- Customize category colors
- Reorder categories as needed

### Custom Fields
- Add custom fields to tasks (text, number, URL, etc.)
- URL-type custom fields displayed as clickable links
- Field management through a centralized settings page

### User Management
- User authentication system
- Role-based access controls
- Admin interface for managing users

### Event Logging
- Comprehensive event logging system
- Track all user actions with timestamps
- Admin oversight of system activities

### UI/UX
- Clean, modern interface using Shadcn/ui components
- Responsive design that works on mobile and desktop
- Proper information architecture with logical navigation
- Dark mode support

## Technical Specifications
- Frontend: React with TypeScript
- UI Components: Shadcn/ui
- State Management: TanStack Query
- Database: PostgreSQL
- Authentication: Secure auth with role-based permissions
- Version Control: Git
- Hosting: Replit deployments

## Primary Goals
1. Create an intuitive, user-friendly task management system
2. Enable flexible customization through custom fields and categories
3. Provide robust event logging for accountability and tracking
4. Support collaboration through assignee functionality
5. Deliver a responsive, accessible interface that works across devices

## Scope Limitations
- No real-time collaborative editing (changes require refresh)
- No native mobile applications (web responsive only)
- Limited integration with external services