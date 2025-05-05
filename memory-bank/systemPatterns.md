# System Patterns

## System Architecture

The task management application follows a modern full-stack architecture with clear separation of concerns:

```
Client (Frontend) <--> Server API <--> Database
```

### Client-Side Architecture
- React-based single-page application
- Component-based UI structure using Shadcn UI
- State management via TanStack Query with API integration
- Client-side routing with Wouter

### Server-Side Architecture
- Express.js REST API
- PostgreSQL database with Drizzle ORM
- Passport.js authentication
- Session-based user management

### Data Flow Architecture
1. UI components trigger API requests through TanStack Query hooks
2. API routes validate requests and delegate to storage interface
3. Storage layer interacts with database through Drizzle ORM
4. Data returns through the same path with appropriate transformations

## Key Technical Decisions

### Database Design
- PostgreSQL for relational data and transaction support
- JSON/JSONB storage for flexible custom fields
- Separate tables for core entities (users, boards, categories, tasks)
- Foreign key relationships for referential integrity

### Authentication & Authorization
- Session-based authentication with Passport.js
- Role-based access control (admin vs. regular users)
- Protected routes on both client and server
- Secure password handling with bcrypt

### State Management
- TanStack Query for server state management
- React's built-in state hooks for UI state
- URL parameters for shareable state (current board, etc.)
- Optimistic updates for improved UX

### UI Component Strategy
- Shadcn UI as the component foundation
- Custom components built on top of Shadcn primitives
- Consistent styling through Tailwind utility classes
- Modal dialogs for focused interactions

## Design Patterns

### Frontend Patterns

#### Container/Presentation Pattern
- Container components handle data fetching and business logic
- Presentation components focus on rendering and user interaction
- Example: Dashboard (container) vs. BoardCard (presentation)

#### Custom Hooks Pattern
- Encapsulate complex logic in custom hooks
- Promotes reusability across components
- Examples: `useAuth`, `useBoards`, `useCategories`, `useTasks`

#### Form Submission Pattern
- Forms managed with react-hook-form
- Zod validation schemas for type safety
- Consistent error handling and user feedback

#### Resource Loading Pattern
- Loading states during data fetching
- Error boundaries for graceful failure
- Empty states for zero-data scenarios

### Backend Patterns

#### Repository Pattern
- Storage interface abstracts database operations
- Consistent CRUD operations across entities
- Testable database interactions

#### Middleware Pattern
- Authentication middleware protects routes
- Validation middleware ensures data integrity
- Logging middleware tracks system activity

#### Event Logging Pattern
- Standardized event format
- User action tracking
- Admin visibility into system usage

## Component Relationships

### Core Entity Hierarchy
```
User
└── Board
    ├── Category
    │   └── Task
    │       └── Custom Field Data
    └── Custom Field Definition
```

### UI Component Hierarchy
```
App
├── Auth Pages
├── Dashboard
│   └── BoardCard
├── Board View
│   ├── CategoryColumn
│   │   └── TaskCard
│   └── TaskForm
└── Settings
    ├── User Management
    ├── Board Settings
    ├── Custom Field Management
    └── System Settings
```

## Critical Implementation Paths

### Task Creation/Editing Flow
1. User opens task form (new or edit)
2. Form loads with initial data (if editing)
3. User inputs task information
4. Form validates data with Zod
5. On submit, API request creates/updates task
6. UI optimistically updates
7. Success/error feedback is displayed
8. Form closes on success

### Drag and Drop Implementation
1. React Beautiful DnD provides drag capabilities
2. User drags task between categories
3. UI updates optimistically
4. API request updates task category
5. Backend logs the category change event
6. UI confirms success or reverts on error

### Authentication Flow
1. User accesses protected route
2. Auth check middleware intercepts
3. If not authenticated, redirect to login
4. User submits credentials
5. Server validates and creates session
6. UI updates with authenticated user context
7. User is redirected to original destination

### Custom Field Implementation
1. Admin creates custom field definitions in settings
2. Field definitions are stored in database
3. Task form dynamically renders custom fields
4. User inputs custom field data
5. Data is stored in JSON/JSONB column
6. TaskCard displays relevant custom field data

## Performance Considerations

### Data Loading Strategies
- Pagination for large data sets (event logs)
- Eager loading of related entities when appropriate
- Caching with TanStack Query staleTime configuration

### Optimization Techniques
- Memoization of expensive calculations
- Virtualization for long lists
- Debouncing user inputs
- Throttling API requests

### Resource Management
- Image optimization for avatars
- Lazy loading of non-critical components
- Code splitting for route-based chunks