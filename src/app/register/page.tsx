
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';
import { LogIn } from 'lucide-react';

// Updated Acharya Logo SVG - Open Book
const AcharyaLogo = () => (
  <svg
    width="48" // Larger size for prominent display
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5" // Slightly thinner for elegance at larger size
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-primary mx-auto mb-2" // Centered and margin bottom
    aria-label="Acharya Logo"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);


const registerFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(50, 'Name cannot exceed 50 characters.'),
  age: z.coerce
    .number({ invalid_type_error: 'Age must be a number.' })
    .int('Age must be a whole number.')
    .min(5, 'Age must be at least 5.')
    .max(120, 'Please enter a realistic age.'),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      // age will default to undefined by RHF based on schema
    },
  });

  const onSubmit: SubmitHandler<RegisterFormValues> = (data) => {
    try {
      const existingProfileString = localStorage.getItem('acharya_userProfile');
      let profileToSave: UserProfile;

      if (existingProfileString) {
        const existingProfile = JSON.parse(existingProfileString) as UserProfile;
        profileToSave = {
          ...existingProfile,
          name: data.name,
          age: data.age,
        };
      } else {
        profileToSave = {
          name: data.name,
          age: data.age,
          email: 'guest@example.com', 
          profilePicUrl: `https://picsum.photos/seed/${data.name.replace(/\s+/g, '-')}/100/100`,
          examGoal: '', // Initialize optional fields
          preferredExam: '', // Initialize optional fields
        };
      }

      localStorage.setItem('acharya_userProfile', JSON.stringify(profileToSave));

      toast({
        title: 'Registration Successful!',
        description: `Welcome, ${data.name}!`,
      });
      router.replace('/home');
    } catch (error) {
      console.error('Error saving registration data:', error);
      toast({
        title: 'Registration Failed',
        description: 'Could not save your details. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <AcharyaLogo />
          <CardTitle className="text-2xl font-bold">Welcome to Acharya!</CardTitle>
          <CardDescription>Please tell us a bit about yourself to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Alex Doe" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Age</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 18"
                        {...field} 
                        value={field.value === undefined || field.value === null ? '' : String(field.value)} 
                        onChange={e => { 
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : Number(val)); 
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  'Saving...'
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" /> Continue to App
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Acharya. Your journey to success starts here.
      </footer>
    </div>
  );
}

