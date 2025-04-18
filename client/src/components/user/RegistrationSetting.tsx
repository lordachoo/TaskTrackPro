import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface SystemSetting {
  key: string;
  value: string;
}

export default function RegistrationSetting() {
  const { toast } = useToast();
  
  // Fetch the registration setting
  const { data: registrationSetting, isLoading } = useQuery({
    queryKey: ['/api/settings', 'allow_registrations'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/settings/allow_registrations');
        if (!res.ok) {
          if (res.status === 404) {
            // If setting doesn't exist yet, return default
            return { key: 'allow_registrations', value: 'false' };
          }
          throw new Error('Failed to fetch registration setting');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching registration setting:', error);
        // Return a default if there's an error
        return { key: 'allow_registrations', value: 'false' };
      }
    },
  });

  // Update the registration setting
  const updateSettingMutation = useMutation({
    mutationFn: async ({ value }: { value: string }) => {
      const res = await apiRequest('PUT', '/api/settings/allow_registrations', { value });
      return res.json();
    },
    onSuccess: (updatedSetting: SystemSetting) => {
      // Update the cache
      queryClient.setQueryData(['/api/settings', 'allow_registrations'], updatedSetting);
      
      toast({
        title: "Setting updated",
        description: `User registration is now ${updatedSetting.value === 'true' ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: (error) => {
      console.error('Error updating registration setting:', error);
      toast({
        title: "Failed to update setting",
        description: "There was an error updating the registration setting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleRegistration = (checked: boolean) => {
    updateSettingMutation.mutate({ value: checked ? 'true' : 'false' });
  };

  const isRegistrationEnabled = registrationSetting?.value === 'true';

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Registration Settings</CardTitle>
        <CardDescription>
          Control whether new users can register accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Switch
            id="allow-registration"
            checked={isRegistrationEnabled}
            onCheckedChange={handleToggleRegistration}
            disabled={isLoading || updateSettingMutation.isPending}
          />
          <Label htmlFor="allow-registration" className="font-medium">
            {isLoading 
              ? "Loading..." 
              : `Allow new user registration (currently ${isRegistrationEnabled ? 'enabled' : 'disabled'})`}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}