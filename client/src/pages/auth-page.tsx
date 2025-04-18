import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { InsertUser, insertUserSchema } from "@shared/schema";
import { AlertCircle, Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Registration form schema
const registerSchema = insertUserSchema
  .pick({
    username: true,
    password: true,
    fullName: true,
    email: true,
  })
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { toast } = useToast();
  const { user, loginMutation, registerMutation, isLoading } = useAuth();
  
  // Check if registrations are allowed
  const { data: registrationSetting, isLoading: isSettingLoading } = useQuery({
    queryKey: ['/api/settings', 'allow_registrations'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/settings/allow_registrations');
        if (!res.ok) {
          if (res.status === 404) {
            // If setting doesn't exist yet, return default
            return { key: 'allow_registrations', value: 'true' };
          }
          throw new Error('Failed to fetch registration setting');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching registration setting:', error);
        // Return a default if there's an error
        return { key: 'allow_registrations', value: 'true' };
      }
    },
    // Don't retry for 401 or 403 errors
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 3;
    }
  });
  
  const registrationsEnabled = registrationSetting?.value === 'true';
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      email: "",
    },
  });
  
  // Handle redirect if user is already logged in
  // This must come AFTER all hook calls to avoid violating rules of hooks
  if (user) {
    return <Redirect to="/" />;
  }

  // Handle login submission
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  // Handle registration submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    // If registrations are disabled, don't proceed
    if (!registrationsEnabled) {
      toast({
        title: "Registration disabled",
        description: "New user registration is currently disabled. Please contact an administrator.",
        variant: "destructive"
      });
      return;
    }
    
    // Remove confirmPassword as it's not part of the API request
    const { confirmPassword, ...userData } = data;

    // Add default values for required fields
    const userDataWithDefaults: InsertUser = {
      ...userData,
      role: "user",
      avatarColor: "#6366f1", // Default color
      isActive: true,
    };

    registerMutation.mutate(userDataWithDefaults);
  };

  return (
    <div className="flex h-screen">
      {/* Auth forms column */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8">
        <Tabs defaultValue="login" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <Card className={!registrationsEnabled ? "opacity-70" : ""}>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Register a new account to get started
                </CardDescription>
                {!registrationsEnabled && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Registration Disabled</AlertTitle>
                    <AlertDescription>
                      New user registration is currently disabled. Please contact an administrator.
                    </AlertDescription>
                  </Alert>
                )}
              </CardHeader>
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                  <CardContent className={`space-y-4 ${!registrationsEnabled ? "pointer-events-none" : ""}`}>
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Choose a username" 
                              {...field} 
                              disabled={!registrationsEnabled} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your full name" 
                              {...field} 
                              disabled={!registrationsEnabled} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your email" 
                              {...field} 
                              disabled={!registrationsEnabled} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Create a password" 
                              {...field} 
                              disabled={!registrationsEnabled} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm your password" 
                              {...field} 
                              disabled={!registrationsEnabled} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending || !registrationsEnabled}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : !registrationsEnabled ? (
                        "Registration Disabled"
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Hero section column */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary/20 to-primary/40 flex-col justify-center items-center p-8 text-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            Task Manager Pro
          </h1>
          <p className="text-xl mb-6">
            A powerful and flexible task management solution for individuals and teams
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-left">Organize tasks with customizable boards and categories</p>
            </div>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-left">Collaborate with team members and assign tasks</p>
            </div>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
              </div>
              <p className="text-left">Add custom fields to tailor tasks to your needs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}