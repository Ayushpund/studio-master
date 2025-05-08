
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { EXAM_TYPES, SUBJECTS_BY_EXAM } from '@/lib/constants';
import type { GeneratedTimetable, TimetableTask, SubjectTimeAllocation, TaskType, Subject } from '@/types';
import { format, differenceInDays, addDays, parseISO, startOfDay, isBefore } from 'date-fns';
import { CalendarIcon, Edit3, ListChecks, Save, PlusCircle, Trash2, BarChart2, Activity, Utensils, Bed, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/PageTitle';
import { Chatbot } from '@/components/chatbot/Chatbot';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';

const timetableFormSchema = z.object({
  examType: z.string().min(1, 'Exam type is required.'),
  examDate: z.date({ required_error: 'Exam date is required.' }),
  focusTopics: z.array(z.string()).min(1, 'Please select at least one focus topic.'),
});

type TimetableFormValues = z.infer<typeof timetableFormSchema>;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
const MAX_STUDY_SLOTS_PER_DAY = 4; // Number of dedicated study blocks per day


const generateDailyScheduleForDate = (
  currentDate: Date,
  allExamSubjects: Subject[],
  focusSubjectValues: string[],
  dayNumberInPeriod: number, // 1-indexed
  studySlotCounterState: { counter: number} // Pass counter as a mutable object
): TimetableTask[] => {
  const focusTopicsFull = allExamSubjects.filter(s => focusSubjectValues.includes(s.value));
  const otherTopicsFull = allExamSubjects.filter(s => !focusSubjectValues.includes(s.value));

  const getTopicForStudySlot = (): Subject | null => {
      if (allExamSubjects.length === 0) return null;

      const currentSlotIndexInDay = studySlotCounterState.counter % MAX_STUDY_SLOTS_PER_DAY;
      // Use a combination of day and slot index for topic cycling to ensure variety
      // dayNumberInPeriod is 1-indexed, currentSlotIndexInDay is 0-indexed
      const combinedTopicRotationIndex = (dayNumberInPeriod - 1) * MAX_STUDY_SLOTS_PER_DAY + currentSlotIndexInDay;
      

      const hasFocusTopics = focusTopicsFull.length > 0;
      const hasOtherTopics = otherTopicsFull.length > 0;

      // Prioritize focus topics for ~60% of slots, other topics for ~40%
      // This is a simplified approach. A more robust one might track total time allocated per subject.
      // With 4 slots, this aims for 2-3 focus, 1-2 other.
      // Let's try assigning focus to ~60% of slots (approx 2.4 out of 4).
      // If counter mod 5 is 0,1,2 -> focus. if 3,4 -> other
      // This gives 3 focus, 2 other if we look at a cycle of 5 slots.
      // For a 4 slot day, it's a bit trickier to get exact %.
      // Let's say slots 0 and 1 are focus, slot 2 is other, slot 3 alternates.
      
      let topicToAssign: Subject | null = null;

      if (currentSlotIndexInDay < 2) { // First two slots attempt focus
          if (hasFocusTopics) topicToAssign = focusTopicsFull[combinedTopicRotationIndex % focusTopicsFull.length];
          else if (hasOtherTopics) topicToAssign = otherTopicsFull[combinedTopicRotationIndex % otherTopicsFull.length]; // Fallback
      } else if (currentSlotIndexInDay === 2) { // Third slot attempts other
          if (hasOtherTopics) topicToAssign = otherTopicsFull[combinedTopicRotationIndex % otherTopicsFull.length];
          else if (hasFocusTopics) topicToAssign = focusTopicsFull[combinedTopicRotationIndex % focusTopicsFull.length]; // Fallback
      } else { // Fourth slot, can be either, let's try to balance based on overall counter
          // If even overall slots, prefer focus, if odd, prefer other - this aims for a general mix.
           if (studySlotCounterState.counter % 2 === 0) {
             if(hasFocusTopics) topicToAssign = focusTopicsFull[combinedTopicRotationIndex % focusTopicsFull.length];
             else if (hasOtherTopics) topicToAssign = otherTopicsFull[combinedTopicRotationIndex % otherTopicsFull.length];
           } else {
             if(hasOtherTopics) topicToAssign = otherTopicsFull[combinedTopicRotationIndex % otherTopicsFull.length];
             else if (hasFocusTopics) topicToAssign = focusTopicsFull[combinedTopicRotationIndex % focusTopicsFull.length];
           }
      }
      
      studySlotCounterState.counter++; // Increment after deciding logic

      if (topicToAssign) return topicToAssign;

      // Fallback to general rotation if specific logic didn't assign (e.g. one category is empty)
      if (hasFocusTopics && hasOtherTopics) {
        // Simple alternation if both exist and specific slots didn't cover
        return (studySlotCounterState.counter % 2 === 1 && hasFocusTopics) 
            ? focusTopicsFull[Math.floor(studySlotCounterState.counter / 2) % focusTopicsFull.length]
            : otherTopicsFull[Math.floor(studySlotCounterState.counter / 2) % otherTopicsFull.length];
      } else if (hasFocusTopics) {
        return focusTopicsFull[combinedTopicRotationIndex % focusTopicsFull.length];
      } else if (hasOtherTopics) {
        return otherTopicsFull[combinedTopicRotationIndex % otherTopicsFull.length];
      }
      
      return allExamSubjects.length > 0 ? allExamSubjects[combinedTopicRotationIndex % allExamSubjects.length] : null;
    };
  
  const dayId = `day${format(currentDate, 'yyyyMMdd')}`;

  const createStudyTask = (startTime: string, endTime: string): TimetableTask => {
      const topic = getTopicForStudySlot();
      return {
        id: `${dayId}-study-${startTime.replace(/[:\s]/g, '')}`,
        date: currentDate,
        startTime,
        endTime,
        activity: `Study: ${topic ? topic.label : 'General Revision'}`,
        taskType: 'study',
        subject: topic ? topic.label : 'General Revision',
        isCompleted: false,
      };
  };

  return [
    { id: `${dayId}-task1`, date: currentDate, startTime: "07:00 AM", endTime: "07:30 AM", activity: "Wake Up & Hydrate", taskType: 'other', isCompleted: false },
    { id: `${dayId}-task2`, date: currentDate, startTime: "07:30 AM", endTime: "08:30 AM", activity: "Breakfast & Morning Routine", taskType: 'meal', isCompleted: false },
    createStudyTask("08:30 AM", "10:30 AM"),
    { id: `${dayId}-task4`, date: currentDate, startTime: "10:30 AM", endTime: "11:00 AM", activity: "Short Break / Quick Revision", taskType: 'break', isCompleted: false },
    createStudyTask("11:00 AM", "01:00 PM"),
    { id: `${dayId}-task6`, date: currentDate, startTime: "01:00 PM", endTime: "02:00 PM", activity: "Lunch Break", taskType: 'meal', isCompleted: false },
    createStudyTask("02:00 PM", "04:00 PM"),
    { id: `${dayId}-task8`, date: currentDate, startTime: "04:00 PM", endTime: "04:30 PM", activity: "Revision of Morning Topics", taskType: 'revision', isCompleted: false },
    createStudyTask("04:30 PM", "06:00 PM"),
    { id: `${dayId}-task10`, date: currentDate, startTime: "06:00 PM", endTime: "07:00 PM", activity: "Exercise / Free Time", taskType: 'other', isCompleted: false },
    { id: `${dayId}-task11`, date: currentDate, startTime: "07:00 PM", endTime: "08:00 PM", activity: "Dinner", taskType: 'meal', isCompleted: false },
    { id: `${dayId}-task12`, date: currentDate, startTime: "08:00 PM", endTime: "09:30 PM", activity: "Light Study / Problem Solving / Review Day", taskType: 'study', subject: "Mixed Revision", isCompleted: false },
    { id: `${dayId}-task13`, date: currentDate, startTime: "09:30 PM", endTime: "10:30 PM", activity: "Plan for Next Day / Wind Down", taskType: 'other', isCompleted: false },
    { id: `${dayId}-task14`, date: currentDate, startTime: "10:30 PM", endTime: "07:00 AM", activity: "Sleep", taskType: 'sleep', isCompleted: false },
  ];
};

const generateTimetable = (data: TimetableFormValues): GeneratedTimetable => {
  const allTasks: TimetableTask[] = [];
  const today = startOfDay(new Date());
  const examDate = startOfDay(data.examDate);
  
  let totalDays = differenceInDays(examDate, today);
  if (totalDays < 0) totalDays = 0; 
  totalDays +=1; 

  const examSubjects = SUBJECTS_BY_EXAM[data.examType] || [];
  const selectedFocusSubjectValues = data.focusTopics || [];
  
  const studySlotCounterState = { counter: 0 }; // Initialize shared counter

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(today, i);
    const dailyTasks = generateDailyScheduleForDate(
      currentDate,
      examSubjects,
      selectedFocusSubjectValues,
      i + 1, // dayNumberInPeriod (1-indexed)
      studySlotCounterState // Pass the counter state
    );
    allTasks.push(...dailyTasks);
  }

  return {
    id: Date.now().toString(),
    examType: data.examType,
    examDate: data.examDate,
    focusTopics: selectedFocusSubjectValues,
    tasks: allTasks,
    createdAt: new Date(),
    genericSuggestions: [
      'Stay hydrated throughout the day.',
      'Take short breaks every 60-90 minutes of study.',
      'Aim for 7-8 hours of quality sleep.',
      'Review notes from the previous day before starting new topics.',
      'Practice past papers regularly.',
    ],
  };
};

const TaskIcon = ({ taskType }: { taskType: TaskType }) => {
  switch (taskType) {
    case 'study': return <Activity className="h-4 w-4 text-primary" />;
    case 'meal': return <Utensils className="h-4 w-4 text-green-500" />;
    case 'break': return <Coffee className="h-4 w-4 text-yellow-500" />;
    case 'sleep': return <Bed className="h-4 w-4 text-purple-500" />;
    case 'revision': return <ListChecks className="h-4 w-4 text-blue-500" />;
    default: return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};


export default function HomePage() {
  const [timetable, setTimetable] = useState<GeneratedTimetable | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editedTaskActivity, setEditedTaskActivity] = useState<string>('');
  const [availableSubjectsForExam, setAvailableSubjectsForExam] = useState<Subject[]>([]);
  const { toast } = useToast();

  const form = useForm<TimetableFormValues>({
    resolver: zodResolver(timetableFormSchema),
    defaultValues: {
      examType: '',
      focusTopics: [],
    },
  });

  const examTypeValue = form.watch('examType');
  useEffect(() => {
    if (examTypeValue) {
      const subjects = SUBJECTS_BY_EXAM[examTypeValue] || [];
      setAvailableSubjectsForExam(subjects);
      form.setValue('focusTopics', []); 
    } else {
      setAvailableSubjectsForExam([]);
    }
  }, [examTypeValue, form]);

  useEffect(() => {
    const savedTimetable = localStorage.getItem('acharya_timetable'); 
    if (savedTimetable) {
      try {
        const parsedTimetable = JSON.parse(savedTimetable) as GeneratedTimetable;
        parsedTimetable.examDate = parseISO(parsedTimetable.examDate as unknown as string);
        parsedTimetable.createdAt = parseISO(parsedTimetable.createdAt as unknown as string);
        parsedTimetable.tasks = parsedTimetable.tasks.map(task => ({
          ...task,
          date: parseISO(task.date as unknown as string),
        }));
        setTimetable(parsedTimetable);
      } catch (e) {
        console.error("Failed to parse timetable from localStorage", e);
        localStorage.removeItem('acharya_timetable');
      }
    }
  }, []);

  const onSubmit: SubmitHandler<TimetableFormValues> = (data) => {
    const today = startOfDay(new Date());
    if (isBefore(data.examDate, today)) {
      toast({
        title: "Invalid Date",
        description: "Exam date must be today or in the future.",
        variant: "destructive",
      });
      return;
    }
    const newTimetable = generateTimetable(data);
    setTimetable(newTimetable);
    localStorage.setItem('acharya_timetable', JSON.stringify(newTimetable));
    toast({
      title: "Study Plan Generated!",
      description: `Your plan until ${format(data.examDate, 'PPP')} is ready.`,
    });
  };

  const handleTaskToggle = (taskId: string) => {
    if (!timetable) return;
    const updatedTasks = timetable.tasks.map(task =>
      task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
    );
    const updatedTimetable = { ...timetable, tasks: updatedTasks };
    setTimetable(updatedTimetable);
    localStorage.setItem('acharya_timetable', JSON.stringify(updatedTimetable));
  };

  const handleEditTask = (task: TimetableTask) => {
    setEditingTaskId(task.id);
    setEditedTaskActivity(task.activity);
  };

  const handleSaveTaskEdit = (taskId: string) => {
    if (!timetable) return;
    const updatedTasks = timetable.tasks.map(task =>
      task.id === taskId ? { ...task, activity: editedTaskActivity } : task
    );
    const updatedTimetable = { ...timetable, tasks: updatedTasks };
    setTimetable(updatedTimetable);
    localStorage.setItem('acharya_timetable', JSON.stringify(updatedTimetable));
    setEditingTaskId(null);
    toast({ title: "Task Updated", description: "Your changes have been saved." });
  };

  const handleAddTask = () => {
    if (!timetable || timetable.tasks.length === 0) {
        toast({ title: "Cannot Add Task", description: "Generate a timetable first.", variant: "destructive"});
        return;
    };
    
    const firstDate = timetable.tasks.reduce((earliest, current) => 
        current.date < earliest ? current.date : earliest, timetable.tasks[0].date);

    const newTaskId = `task-custom-${Date.now()}`;
    const newTask: TimetableTask = {
      id: newTaskId,
      date: firstDate, 
      startTime: "N/A", 
      endTime: "N/A",
      activity: "New custom task",
      taskType: 'other',
      isCompleted: false,
    };
    const updatedTimetable = { ...timetable, tasks: [...timetable.tasks, newTask].sort((a,b) => a.date.getTime() - b.date.getTime() || a.startTime.localeCompare(b.startTime)) };
    setTimetable(updatedTimetable);
    localStorage.setItem('acharya_timetable', JSON.stringify(updatedTimetable));
    setEditingTaskId(newTaskId); 
    setEditedTaskActivity(newTask.activity);
    toast({ title: "Task Added", description: `A new task has been added to ${format(firstDate, 'PPP')}. Edit details as needed.`});
  };

  const handleDeleteTask = (taskId: string) => {
    if (!timetable) return;
    const updatedTasks = timetable.tasks.filter(task => task.id !== taskId);
    const updatedTimetable = { ...timetable, tasks: updatedTasks };
    setTimetable(updatedTimetable);
    localStorage.setItem('acharya_timetable', JSON.stringify(updatedTimetable));
    toast({ title: "Task Deleted", description: "The task has been removed.", variant: "destructive" });
  };

  const getSubjectTimeAllocation = (): SubjectTimeAllocation[] => {
    if (!timetable) return [];
    const allocation: Record<string, number> = {};
    timetable.tasks.forEach(task => {
      if (task.taskType === 'study' && task.subject) {
        const parseTime = (timeStr: string): Date | null => {
            try {
                if (timeStr === "N/A") return null;
                const [time, modifier] = timeStr.split(' ');
                if(!modifier) return null;
                let [hours, minutes] = time.split(':').map(Number);
                if (hours === undefined || minutes === undefined) return null;
                if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0; // Midnight case
                const date = new Date(task.date); 
                date.setHours(hours, minutes, 0, 0);
                return date;
            } catch (e) { return null; }
        };
        const start = parseTime(task.startTime);
        const end = parseTime(task.endTime);

        if (start && end) {
            let diffMillis = end.getTime() - start.getTime();
             // Handle overnight tasks (e.g. sleep from 10:30 PM to 07:00 AM)
            if (diffMillis < 0 && task.taskType === 'sleep') { // specifically for sleep or adjust if needed
                const endNextDay = new Date(end);
                endNextDay.setDate(endNextDay.getDate() + 1);
                diffMillis = endNextDay.getTime() - start.getTime();
            } else if (diffMillis < 0) { // If end time is on the next day (but not a designated overnight task)
                 // This case should be rare for study blocks if timetable is per day
                 // For now, assuming study blocks are within the same day. If not, this needs adjustment.
                 // Or, if a study block could span midnight (e.g. 11PM - 1AM), this needs handling
            }

            if (diffMillis > 0) { // Only add if duration is positive
              const hours = diffMillis / (1000 * 60 * 60);
              allocation[task.subject] = (allocation[task.subject] || 0) + hours;
            }
        }
      }
    });
    return Object.entries(allocation).map(([name, value]) => ({ name, value })).filter(item => item.value > 0);
  };


  const completedTasks = timetable?.tasks.filter(task => task.isCompleted).length || 0;
  const totalTasks = timetable?.tasks.length || 0;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const groupedTasksByDate = timetable?.tasks.reduce((acc, task) => {
    const dateStr = format(task.date, 'yyyy-MM-dd');
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(task);
    return acc;
  }, {} as Record<string, TimetableTask[]>);

  const sortedDates = groupedTasksByDate ? Object.keys(groupedTasksByDate).sort((a,b) => new Date(a).getTime() - new Date(b).getTime()) : [];


  return (
    <div className="container mx-auto p-4">
      <PageTitle title="Study Plan Scheduler" icon={ListChecks} />

      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle>Create Your Study Plan</CardTitle>
          <CardDescription>Fill in your exam details and select focus areas to generate a personalized study schedule until your exam date.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="examType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Type</FormLabel>
                    <Select onValueChange={(value) => {field.onChange(value); }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an exam" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXAM_TYPES.map(exam => (
                          <SelectItem key={exam.value} value={exam.value}>
                            {exam.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="examDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Exam Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                           disabled={(date) => date < startOfDay(new Date())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription> Select the date of your examination. A schedule will be generated up to this date.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {examTypeValue && availableSubjectsForExam.length > 0 && (
                <FormField
                  control={form.control}
                  name="focusTopics"
                  render={() => (
                    <FormItem>
                      <FormLabel>Select Focus Topics/Subjects</FormLabel>
                      <FormDescription>
                        Select subjects you want to prioritize. These will get slightly more allocation. Other relevant subjects for your exam will also be included.
                      </FormDescription>
                      <ScrollArea className="h-40 rounded-md border p-2">
                        <div className="space-y-2">
                          {availableSubjectsForExam.map((subject) => (
                            <FormField
                              key={subject.value}
                              control={form.control}
                              name="focusTopics"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={subject.value}
                                    className="flex flex-row items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(subject.value)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), subject.value])
                                            : field.onChange(
                                                (field.value || []).filter(
                                                  (value) => value !== subject.value
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {subject.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Generating...' : 'Generate Study Plan'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {timetable && (
         <>
         <div className="bg-card p-4 md:p-6 rounded-lg">
            <Card className="shadow-lg mb-6 border-0">
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <CardTitle className="text-xl md:text-2xl">Your Study Plan for {EXAM_TYPES.find(e=>e.value === timetable.examType)?.label}</CardTitle>
                    <CardDescription>
                      Exam Date: {timetable.examDate ? format(timetable.examDate, 'PPP') : 'N/A'} | Focus: {timetable.focusTopics.map(ft => availableSubjectsForExam.find(s=>s.value===ft)?.label || ft).join(', ') || 'None selected'}
                    </CardDescription>
                </div>
                <div className="mt-3 md:mt-0 flex space-x-2">
                    <Button onClick={handleAddTask} size="sm" variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                    </Button>
                </div>
                </div>
            </CardHeader>
            <CardContent>
                {timetable.genericSuggestions && timetable.genericSuggestions.length > 0 && (
                <div className="mb-4 p-3 bg-secondary/50 rounded-md">
                    <h3 className="text-sm font-semibold text-primary mb-1 flex items-center">
                    <BarChart2 className="h-4 w-4 mr-2"/> General Tips:
                    </h3>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                    {timetable.genericSuggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                    ))}
                    </ul>
                </div>
                )}

                {totalTasks > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-foreground">Overall Plan Progress</span>
                    <span className="text-sm text-muted-foreground">{completedTasks} / {totalTasks} tasks completed</span>
                    </div>
                    <Progress value={progressPercentage} className="w-full h-3" />
                    <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercentage.toFixed(0)}% Complete</p>
                </div>
                )}
                <Separator className="my-4" />
                
                <ScrollArea className="h-[500px] pr-3"> 
                  {sortedDates.map(dateStr => (
                    <div key={dateStr} className="mb-6">
                      <h3 className="text-lg font-semibold my-3 text-primary sticky top-0 bg-card py-2 z-10">
                        Schedule for: {format(parseISO(dateStr), 'EEEE, PPP')}
                      </h3>
                      <div className="space-y-2">
                      {groupedTasksByDate && groupedTasksByDate[dateStr]?.sort((a,b)=> a.startTime.localeCompare(b.startTime)).map((task) => (
                          <Card key={task.id} className={cn("transition-all duration-200", task.isCompleted ? 'bg-muted/50' : 'bg-card border')}>
                          <CardContent className="p-3">
                              <div className="flex items-start space-x-3">
                              <Checkbox
                                  id={`task-${task.id}`}
                                  checked={task.isCompleted}
                                  onCheckedChange={() => handleTaskToggle(task.id)}
                                  className="mt-1"
                              />
                              <TaskIcon taskType={task.taskType} />
                              <div className="flex-1">
                                  {editingTaskId === task.id ? (
                                  <Textarea
                                      value={editedTaskActivity}
                                      onChange={(e) => setEditedTaskActivity(e.target.value)}
                                      className="mb-2 text-sm"
                                      rows={1}
                                  />
                                  ) : (
                                  <label
                                      htmlFor={`task-${task.id}`}
                                      className={cn(
                                      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                                      task.isCompleted && "line-through text-muted-foreground"
                                      )}
                                  >
                                      {task.activity}
                                  </label>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                  {task.startTime} - {task.endTime}
                                  {task.subject && task.taskType === 'study' && (
                                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                                      {task.subject}
                                      </span>
                                  )}
                                  </p>
                              </div>
                              <div className="flex flex-col space-y-1">
                                  {editingTaskId === task.id ? (
                                  <Button onClick={() => handleSaveTaskEdit(task.id)} size="icon" variant="ghost" className="h-7 w-7">
                                      <Save className="h-4 w-4 text-primary" />
                                  </Button>
                                  ) : (
                                  <Button onClick={() => handleEditTask(task)} size="icon" variant="ghost" className="h-7 w-7">
                                      <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                  </Button>
                                  )}
                                  <Button onClick={() => handleDeleteTask(task.id)} size="icon" variant="ghost" className="h-7 w-7">
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                              </div>
                              </div>
                          </CardContent>
                          </Card>
                      ))}
                      </div>
                       {dateStr !== sortedDates[sortedDates.length -1] && <Separator className="my-6"/>}
                    </div>
                  ))}
                </ScrollArea>

            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2 text-primary">Overall Subject Time Distribution (Study Hours)</h3>
                {getSubjectTimeAllocation().length > 0 ? (
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                        <Pie
                            data={getSubjectTimeAllocation()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {getSubjectTimeAllocation().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number, name: string) => [`${value.toFixed(1)} hours`, name]} />
                        <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ): (
                    <p className="text-sm text-muted-foreground">No study tasks with subjects found to display chart. Ensure study tasks have assigned subjects and valid start/end times.</p>
                )}
            </div>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">Schedule generated on: {timetable.createdAt ? format(timetable.createdAt, 'PPP p') : 'N/A'}</p>
            </CardFooter>
            </Card>
         </div>
         </>
      )}
      <Chatbot /> 
    </div>
  );
}
