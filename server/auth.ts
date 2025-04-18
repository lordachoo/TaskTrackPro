import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Create PostgreSQL session store
const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'task-manager-secret-key';
const isProduction = process.env.NODE_ENV === 'production';

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // Use secure cookies in production
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      sameSite: isProduction ? 'none' : 'lax'
    },
    store: isProduction
      ? new PostgresSessionStore({
          pool,
          tableName: 'session', // Custom table name for sessions
          createTableIfMissing: true
        })
      : new MemoryStore({
          checkPeriod: 86400000 // Prune expired entries every 24h
        })
  };

  if (isProduction) {
    app.set('trust proxy', 1); // Trust first proxy
  }
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        
        // Find user by username
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        // Verify password
        const isPasswordValid = await storage.verifyPassword(
          password,
          user.password
        );
        
        if (!isPasswordValid) {
          console.log(`Invalid password for user: ${username}`);
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        // Check if user is active
        if (!user.isActive) {
          console.log(`User account is inactive: ${username}`);
          return done(null, false, { message: "Account is inactive" });
        }
        
        console.log(`Login successful for user: ${username}`);
        
        // Don't return the password hash
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword as SelectUser);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    })
  );

  // Serialize/deserialize user for session
  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.username}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        return done(null, false);
      }
      
      // Don't return the password hash
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword as SelectUser);
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(error, null);
    }
  });

  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    console.log('Login route called with body:', {
      ...req.body,
      password: req.body.password ? '***MASKED***' : undefined
    });
    
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Login failed:', info?.message || 'Unknown reason');
        return res.status(401).json({ 
          error: 'Authentication failed',
          message: info?.message || 'Invalid username or password'
        });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('Session login error:', err);
          return next(err);
        }
        
        console.log(`User logged in successfully: ${user.username}`);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = (req.user as Express.User)?.username || 'Unknown';
    console.log(`Logout request for user: ${username}`);
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      
      console.log(`User logged out successfully: ${username}`);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('User session check: Not authenticated');
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    console.log(`User session check: Authenticated as ${(req.user as Express.User).username}`);
    res.status(200).json(req.user);
  });

  // Registration route
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Register route called with body:', {
        ...req.body,
        password: req.body.password ? '***MASKED***' : undefined
      });
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      
      if (existingUser) {
        console.log(`Registration failed: Username already exists - ${req.body.username}`);
        return res.status(400).json({
          error: 'Registration failed',
          message: 'Username already exists'
        });
      }
      
      // Create new user
      const newUser = await storage.createUser({
        ...req.body,
        // Default to 'user' role if not specified
        role: req.body.role || 'user',
        // Default to active if not specified
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
      });
      
      console.log(`User registered successfully: ${newUser.username}`);
      
      // Log user in automatically after registration
      req.login(newUser, (err) => {
        if (err) {
          console.error('Auto-login after registration error:', err);
          return next(err);
        }
        
        // Don't return the password hash to the client
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'An unexpected error occurred during registration'
      });
    }
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: "Authentication required" });
}

// Middleware to check if user is admin
export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  
  res.status(403).json({ error: "Admin privileges required" });
}