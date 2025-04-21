import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type User = {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  role: string;
  avatarColor: string | null;
  isActive: boolean;
  createdAt: string;
};

export function useUsers() {
  const { toast } = useToast();

  return useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn(),
    onError: (error: Error) => {
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUser(userId: number) {
  const { toast } = useToast();

  return useQuery<User>({
    queryKey: ["/api/users", userId],
    queryFn: getQueryFn({ customEndpoint: `/api/users/${userId}` }),
    enabled: !!userId,
    onError: (error: Error) => {
      toast({
        title: "Error fetching user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}