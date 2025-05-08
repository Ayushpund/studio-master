
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { EXAM_TYPES, SUBJECTS_BY_EXAM } from '@/lib/constants';
import type { UserProfile, QuizAttempt, GeneratedTimetable } from '@/types';
import { Bell, Edit, Save, UserCircle, Settings, BarChartHorizontalBig, BookOpenCheck, ShoppingBag, Cake, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/PageTitle';
import { format, parseISO } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  age: z.coerce.number().int().min(1, 'Please enter a valid age.').max(120, 'Please enter a valid age.').optional(),
  profilePicUrl: z.string().url('Must be a valid image URL.').optional().or(z.literal('')),
  examGoal: z.string().max(100, 'Goal should be max 100 characters.').optional(),
  preferredExam: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const notificationSettingsSchema = z.object({
  dailyReminder: z.boolean().default(false),
  quizNotifications: z.boolean().default(false),
});
type NotificationSettingsValues = z.infer<typeof notificationSettingsSchema>;


export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savedTimetables, setSavedTimetables] = useState<GeneratedTimetable[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const [formattedDates, setFormattedDates] = useState<{ timetableDate: string | null, quizAttemptDates: { [id: string]: string } }>({ timetableDate: null, quizAttemptDates: {} });


  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  const notificationForm = useForm<NotificationSettingsValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: { 
        dailyReminder: false,
        quizNotifications: false,
    }
  });

  useEffect(() => {
    const savedProfile = localStorage.getItem('acharya_userProfile');
    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile) as UserProfile;
      setUserProfile(parsedProfile);
      profileForm.reset(parsedProfile);
    } else {
      // If no profile, redirect to register - this page should not be accessible
      router.replace('/register');
      return;
    }

    const savedNotifications = localStorage.getItem('acharya_notifications');
     if (savedNotifications) {
      notificationForm.reset(JSON.parse(savedNotifications));
    }

    const savedTimetableData = localStorage.getItem('acharya_timetable');
    if (savedTimetableData) {
      const parsedTimetable = JSON.parse(savedTimetableData) as GeneratedTimetable;
      parsedTimetable.examDate = typeof parsedTimetable.examDate === 'string' ? parseISO(parsedTimetable.examDate) : parsedTimetable.examDate;
      parsedTimetable.createdAt = typeof parsedTimetable.createdAt === 'string' ? parseISO(parsedTimetable.createdAt) : parsedTimetable.createdAt;
      setSavedTimetables([parsedTimetable]); 
      if (parsedTimetable.examDate instanceof Date && !isNaN(parsedTimetable.examDate.getTime())) {
         setFormattedDates(prev => ({ ...prev, timetableDate: format(parsedTimetable.examDate, 'PPP')}));
      }
    }

    const savedQuizAttemptsData = localStorage.getItem('acharya_quizAttempts');
    if(savedQuizAttemptsData){
      const parsedAttempts = JSON.parse(savedQuizAttemptsData) as QuizAttempt[];
      const newQuizAttemptDates: { [id: string]: string } = {};
      parsedAttempts.forEach(attempt => {
        attempt.timestamp = typeof attempt.timestamp === 'string' ? parseISO(attempt.timestamp) : new Date(attempt.timestamp);
        if (attempt.timestamp instanceof Date && !isNaN(attempt.timestamp.getTime())) {
          newQuizAttemptDates[attempt.id] = format(attempt.timestamp, 'PP p');
        }
      });
      setQuizAttempts(parsedAttempts);
      setFormattedDates(prev => ({...prev, quizAttemptDates: newQuizAttemptDates}));
    }
    
  }, [profileForm, notificationForm, router]);

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = (data) => {
    const updatedProfile = { ...userProfile, ...data } as UserProfile;
    setUserProfile(updatedProfile);
    localStorage.setItem('acharya_userProfile', JSON.stringify(updatedProfile));
    toast({ title: 'Profile Updated', description: 'Your information has been saved.' });
    setIsEditing(false);
  };

  const onNotificationSubmit: SubmitHandler<NotificationSettingsValues> = (data) => {
    localStorage.setItem('acharya_notifications', JSON.stringify(data));
    toast({ title: 'Settings Saved', description: 'Notification preferences updated.' });
  };

  const handleLogout = () => {
    localStorage.removeItem('acharya_userProfile');
    localStorage.removeItem('acharya_timetable');
    localStorage.removeItem('acharya_quizAttempts');
    localStorage.removeItem('acharya_notifications');
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    router.replace('/register');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'GU';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  if (!userProfile) { // Should be handled by useEffect redirect, but good for safety
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading profile or redirecting...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <PageTitle title="My Profile" icon={UserCircle} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader className="items-center text-center">
            <Avatar className="w-24 h-24 mb-4 border-2 border-primary shadow-md">
              <AvatarImage src={userProfile?.profilePicUrl || undefined} alt={userProfile?.name} data-ai-hint="profile picture"/>
              <AvatarFallback className="text-3xl bg-muted">
                {getInitials(userProfile?.name)}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{userProfile?.name || 'Guest User'}</CardTitle>
            <CardDescription>{userProfile?.email || 'No email'}</CardDescription>
             {userProfile?.age && (
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Cake className="h-4 w-4 mr-1.5" />
                <span>{userProfile.age} years old</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField control={profileForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={profileForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField
                    control={profileForm.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
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
                   <FormField control={profileForm.control} name="profilePicUrl" render={({ field }) => (
                      <FormItem><FormLabel>Profile Picture URL</FormLabel><FormControl><Input placeholder="https://example.com/image.jpg" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={profileForm.control} name="examGoal" render={({ field }) => (
                      <FormItem><FormLabel>Exam Goal</FormLabel><FormControl><Textarea placeholder="e.g., Crack JEE Mains 2025" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={profileForm.control} name="preferredExam" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Exam</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select your primary exam" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {EXAM_TYPES.map(exam => <SelectItem key={exam.value} value={exam.value}>{exam.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )}/>
                  <Button type="submit" className="w-full"><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => {setIsEditing(false); profileForm.reset(userProfile || {})}}>Cancel</Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-3">
                {userProfile?.examGoal && (
                  <div><p className="text-sm font-medium text-muted-foreground">Exam Goal:</p><p className="text-foreground">{userProfile.examGoal}</p></div>
                )}
                {userProfile?.preferredExam && (
                  <div><p className="text-sm font-medium text-muted-foreground">Preferred Exam:</p><p className="text-foreground">{EXAM_TYPES.find(e => e.value === userProfile.preferredExam)?.label || userProfile.preferredExam}</p></div>
                )}
                <Button onClick={() => setIsEditing(true)} className="w-full mt-4"><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </CardFooter>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader><CardTitle className="flex items-center"><BookOpenCheck className="mr-2 h-5 w-5 text-primary" /> Saved Timetables</CardTitle></CardHeader>
            <CardContent>
              {savedTimetables.length > 0 ? (
                savedTimetables.map(tt => (
                  <div key={tt.id} className="p-3 border rounded-md">
                    <p className="font-semibold">{tt.examType} - till {formattedDates.timetableDate || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{tt.tasks.length} tasks, {tt.tasks.filter(t=>t.isCompleted).length} completed.</p>
                     <Progress value={tt.tasks.length > 0 ? (tt.tasks.filter(t=>t.isCompleted).length / tt.tasks.length) * 100 : 0} className="h-2 mt-1" />
                  </div>
                ))
              ) : <p className="text-muted-foreground">No timetables saved yet.</p>}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader><CardTitle className="flex items-center"><BarChartHorizontalBig className="mr-2 h-5 w-5 text-primary" /> Quiz Performance</CardTitle></CardHeader>
            <CardContent>
              {quizAttempts.length > 0 ? (
                <ScrollArea className="h-48 pr-1">
                  <div className="space-y-3">
                  {quizAttempts.slice(0,5).map(attempt => (
                     <div key={attempt.id} className="p-3 border rounded-md">
                      <p className="font-semibold text-sm">
                        {EXAM_TYPES.find(e => e.value === attempt.examType)?.label || attempt.examType} -
                        {attempt.subject === 'all' ? 'All Subjects' : (SUBJECTS_BY_EXAM[attempt.examType]?.find(s=>s.value === attempt.subject)?.label || attempt.subject)}
                      </p>
                      <p className="text-xs text-muted-foreground">Scored: {attempt.score}/{attempt.totalQuestions} on {formattedDates.quizAttemptDates[attempt.id] || 'N/A'}</p>
                      <Progress value={(attempt.score / attempt.totalQuestions) * 100} className="h-1.5 mt-1" />
                    </div>
                  ))}
                   {quizAttempts.length > 5 && <p className="text-sm text-center text-primary hover:underline cursor-pointer mt-2">View all {quizAttempts.length} attempts...</p>}
                  </div>
                </ScrollArea>
              ) : <p className="text-muted-foreground">No quiz results recorded.</p>}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader><CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary" /> Notification Settings</CardTitle></CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4">
                  <FormField control={notificationForm.control} name="dailyReminder" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Daily Study Reminders</FormLabel><FormDescription>Get a notification to start your study session.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <FormField control={notificationForm.control} name="quizNotifications" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>New Quiz Alerts</FormLabel><FormDescription>Notify when new quizzes are available.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <Button type="submit" className="w-full sm:w-auto"><Save className="mr-2 h-4 w-4" /> Save Settings</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
