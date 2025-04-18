import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function useUsers() {
  const {
    data: users,
    isLoading,
    error
  } = useQuery<User[], Error>({
    queryKey: ['/api/users'],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      
      if (res.status === 401) {
        return [];
      }
      
      if (!res.ok) {
        throw new Error(`Error fetching users: ${res.statusText}`);
      }
      
      return res.json();
    }
  });

  return {
    users: users || [],
    isLoading,
    error
  };
}