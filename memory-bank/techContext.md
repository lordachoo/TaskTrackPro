# Technical Context

## Technologies Used

### Frontend
- **React**: Core UI library for component-based development
- **TypeScript**: Static typing for enhanced code quality and developer experience
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Shadcn/ui**: Component library built on Radix UI primitives
- **TanStack Query**: Data fetching, caching, and state management
- **Wouter**: Lightweight routing library
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation library
- **React Beautiful DnD**: Drag-and-drop library for task movement
- **React Markdown**: Markdown rendering for task descriptions
- **Lucide React**: Icon library for UI elements

### Backend
- **Node.js**: JavaScript runtime for server-side code
- **Express**: Web framework for API routes and middleware
- **PostgreSQL**: Relational database
- **Drizzle ORM**: Type-safe database toolkit
- **Passport.js**: Authentication middleware
- **Express Session**: Session management
- **Bcrypt**: Password hashing for security
- **Connect-PG-Simple**: PostgreSQL session store

### Development Tools
- **Vite**: Fast development server and build tool
- **ESBuild**: JavaScript bundler used by Vite
- **TypeScript**: Type checking and developer tooling
- **Drizzle Kit**: Schema migration and database tools

## Development Setup

### Project Structure
```
/
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   ├── App.tsx       # Main application component
│   │   └── main.tsx      # Application entry point
│   └── index.html        # HTML template
├── server/               # Backend Express application
│   ├── auth.ts           # Authentication logic
│   ├── db.ts             # Database connection
│   ├── databaseStorage.ts # Database storage implementation
│   ├── eventLogger.ts    # Event logging system
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Storage interface
│   └── vite.ts           # Vite integration for development
├── shared/               # Shared code between frontend and backend
│   └── schema.ts         # Database schema and type definitions
└── drizzle.config.ts     # Drizzle ORM configuration
```

### Database Schema
The application uses PostgreSQL with Drizzle ORM. Core tables include:
- `users`: User accounts and authentication
- `boards`: Project or area containers
- `categories`: Task groupings within boards
- `tasks`: Individual work items
- `customFields`: Field definitions for extending tasks
- `eventLogs`: System activity tracking

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `NODE_ENV`: Environment setting (development/production)

## Technical Constraints

### Performance Considerations
- PostgreSQL query optimization for larger datasets
- Client-side caching strategy with TanStack Query
- Pagination for event logs and other large collections

### Security Requirements
- CSRF protection for API requests
- Secure password hashing with bcrypt
- Role-based access control for admin features
- Input validation with Zod schemas

### Compatibility Requirements
- Modern browser support (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile and desktop
- Accessibility compliance for keyboard navigation

## Dependencies

### Core Production Dependencies
- React ecosystem (react, react-dom)
- State management (TanStack Query)
- UI components (Shadcn/ui, Radix UI)
- Server framework (Express)
- Database tools (PostgreSQL, Drizzle ORM)
- Authentication (Passport.js, bcrypt)

### Development Dependencies
- Build tools (Vite, ESBuild)
- Type checking (TypeScript)
- Linting and formatting (ESLint, Prettier)
- Testing libraries (not currently implemented)

## Tool Usage Patterns

### API Communication
1. Frontend components use TanStack Query hooks for data fetching
2. API requests are sent to the Express backend
3. Backend validates requests and performs database operations
4. Responses are cached and managed by TanStack Query

### Database Interactions
1. Schema defined in `shared/schema.ts`
2. Drizzle ORM provides type-safe query building
3. DatabaseStorage class implements the storage interface
4. Transactions used for operations requiring consistency

### Authentication Flow
1. Login form submits credentials via TanStack Query mutation
2. Express backend validates with Passport.js
3. Session cookie established for authenticated state
4. Protected routes check session both client and server-side

### Deployment Workflow
1. Application hosted on Replit
2. PostgreSQL database provisioned
3. Environment variables configured
4. Build process compiles TypeScript and bundles assets
5. Server hosts both API and static frontend assets

## Technical Debt and Limitations

### Current Technical Debt
- Limited test coverage
- Some components could benefit from better abstraction
- Optimization needed for larger datasets
- Limited analytics capabilities

### Future Technical Considerations
- WebSocket integration for real-time updates
- Enhanced search capabilities
- API rate limiting
- Additional authentication methods
- Mobile application considerations