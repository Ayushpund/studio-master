
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types';

export default function RootRedirectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRegistration = () => {
      const savedProfileString = localStorage.getItem('acharya_userProfile');
      if (savedProfileString) {
        try {
          const savedProfile = JSON.parse(savedProfileString) as UserProfile;
          // Check if essential registration info (name and age) is present
          if (savedProfile.name && savedProfile.age) {
            router.replace('/home');
          } else {
            router.replace('/register');
          }
        } catch (error) {
          console.error("Error parsing user profile from localStorage", error);
          router.replace('/register'); // Fallback to registration if profile is malformed
        }
      } else {
        router.replace('/register'); // No profile found, go to registration
      }
      // setIsLoading(false); // Removed: let redirection complete fully
    };

    // Delay setting isLoading to false to allow redirection to fully complete, reducing flicker
    const timer = setTimeout(() => {
        checkRegistration();
        setIsLoading(false);
    }, 50); // Small delay, can be adjusted or removed if not needed


    return () => clearTimeout(timer);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Initializing Acharya...</p>
      </div>
    );
  }

  // This part should ideally not be reached if redirection is working correctly
  // but acts as a fallback or placeholder during the brief moment before redirection happens.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-foreground">Redirecting...</p>
    </div>
  );
}
