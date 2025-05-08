
export interface Exam {
  value: string;
  label: string;
}

export interface Subject {
  value: string;
  label: string;
}

export type QuizDifficulty = 'easy' | 'medium' | 'high' | 'expert';

export interface QuizDifficultyLevel {
  value: QuizDifficulty;
  label: string;
}

export type TaskType = 'study' | 'meal' | 'break' | 'sleep' | 'other' | 'revision';

export interface TimetableTask {
  id: string;
  date: Date; // Added for multi-day timetable
  startTime: string; // e.g., "08:00 AM"
  endTime: string;   // e.g., "10:00 AM"
  activity: string;  // e.g., "Study Mathematics", "Breakfast", "Short Break"
  taskType: TaskType;
  isCompleted: boolean;
  subject?: string; // For study tasks, to help with pie chart
}

export interface GeneratedTimetable {
  id: string;
  examType: string; // Stores the value of the exam type
  examDate: Date;
  focusTopics: string[]; // Changed from string to string[] for checkbox values
  tasks: TimetableTask[]; // Flat list of tasks for all days up to examDate
  createdAt: Date;
  genericSuggestions?: string[];
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  subject?: string; 
  difficulty?: QuizDifficulty;
}

export interface QuizAttempt {
  id: string;
  examType: string;
  subject: string | 'All Subjects'; // subject value, not label
  difficulty: QuizDifficulty;
  questions: QuizQuestion[];
  answers: { questionId: string; selectedOptionId: string | null }[];
  score: number;
  totalQuestions: number;
  timestamp: Date;
}

export interface UserProfile {
  name: string;
  email: string;
  age?: number; 
  profilePicUrl?: string; 
  examGoal?: string; 
  preferredExam?: string; // stores value of exam type
}

export interface SubjectTimeAllocation {
  name: string; // Subject name
  value: number; // Hours allocated
}

