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
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

export function useUser(userId: number) {
  const { toast } = useToast();

  return useQuery<User>({
    queryKey: ["/api/users", userId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}