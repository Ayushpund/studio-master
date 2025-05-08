
'use client';

import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EXAM_TYPES, SUBJECTS_BY_EXAM, ALL_SUBJECTS_OPTION, QUIZ_DIFFICULTY_LEVELS } from '@/lib/constants';
import type { QuizQuestion, QuizAttempt, Subject as SubjectType, QuizDifficulty } from '@/types';
import { CheckCircle, HelpCircle, Lightbulb, MessageSquareWarning, RefreshCw, History, BarChart3, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/PageTitle';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { generateQuiz as generateRealQuizFlow, type GenerateQuizInput } from '@/ai/flows/generate-quiz-flow';


const quizSetupSchema = z.object({
  examType: z.string().min(1, 'Exam type is required.'),
  subject: z.string().min(1, 'Subject is required.'),
  difficulty: z.custom<QuizDifficulty>(val => QUIZ_DIFFICULTY_LEVELS.map(d => d.value).includes(val as QuizDifficulty), {
    message: "Please select a difficulty level."
  }),
});

type QuizSetupValues = z.infer<typeof quizSetupSchema>;

const QUIZ_LENGTH = 3; 
const QUIZ_TIME_SECONDS_PER_QUESTION = 90; // Increased time per question slightly

export default function QuizPage() {
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[] | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string | null>>({});
  const [quizResult, setQuizResult] = useState<QuizAttempt | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectType[]>([]);
  const [quizInProgress, setQuizInProgress] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUIZ_LENGTH * QUIZ_TIME_SECONDS_PER_QUESTION);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const { toast } = useToast();

  const form = useForm<QuizSetupValues>({
    resolver: zodResolver(quizSetupSchema),
    defaultValues: {
      examType: '',
      subject: '',
      difficulty: 'medium',
    },
  });

  useEffect(() => {
    const savedAttempts = localStorage.getItem('acharya_quizAttempts');
    if (savedAttempts) {
      const parsedAttempts = JSON.parse(savedAttempts) as QuizAttempt[];
      parsedAttempts.forEach(attempt => attempt.timestamp = new Date(attempt.timestamp));
      setPreviousAttempts(parsedAttempts);
    }
  }, []);

  const handleSubmitQuiz = useCallback(() => {
    if (!currentQuiz) return;
    setQuizInProgress(false);

    let score = 0;
    const answeredQuestions = currentQuiz.map(q => {
      const selectedOptionId = currentAnswers[q.id] || null;
      if (selectedOptionId === q.correctOptionId) {
        score++;
      }
      return { questionId: q.id, selectedOptionId };
    });

    const result: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      examType: form.getValues('examType'),
      subject: form.getValues('subject'),
      difficulty: form.getValues('difficulty'),
      questions: currentQuiz,
      answers: answeredQuestions,
      score,
      totalQuestions: currentQuiz.length,
      timestamp: new Date(),
    };
    setQuizResult(result);

    const updatedAttempts = [result, ...previousAttempts].slice(0, 10); 
    setPreviousAttempts(updatedAttempts);
    localStorage.setItem('acharya_quizAttempts', JSON.stringify(updatedAttempts));

    toast({
      title: 'Quiz Submitted!',
      description: `You scored ${score} out of ${currentQuiz.length}. Check your results below.`,
    });
  }, [currentQuiz, currentAnswers, form, previousAttempts, toast]);


  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizInProgress && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (quizInProgress && timeLeft === 0) {
      handleSubmitQuiz();
      toast({
        title: "Time's Up!",
        description: "Your quiz has been submitted automatically.",
        variant: "destructive"
      });
    }
    return () => clearTimeout(timer);
  }, [quizInProgress, timeLeft, handleSubmitQuiz, toast]);

  const handleExamTypeChange = (examTypeValue: string) => {
    form.setValue('examType', examTypeValue);
    form.setValue('subject', ''); 
    const subjects = SUBJECTS_BY_EXAM[examTypeValue] || [];
    setAvailableSubjects([ALL_SUBJECTS_OPTION, ...subjects]);
  };

  const onSetupSubmit: SubmitHandler<QuizSetupValues> = async (data) => {
    setQuizLoading(true);
    setCurrentQuiz(null);
    setQuizResult(null);
    setShowHistory(false);

    try {
      const examTypeLabel = EXAM_TYPES.find(e => e.value === data.examType)?.label || data.examType;
      const subjectLabel = data.subject === ALL_SUBJECTS_OPTION.value
        ? ALL_SUBJECTS_OPTION.label
        : (availableSubjects.find(s => s.value === data.subject)?.label || data.subject);
      
      const flowInput: GenerateQuizInput = {
        examTypeLabel,
        subjectLabel,
        numQuestions: QUIZ_LENGTH,
        difficulty: data.difficulty, 
      };

      const newQuiz = await generateRealQuizFlow(flowInput);

      if (newQuiz && newQuiz.length > 0) {
        setCurrentQuiz(newQuiz as QuizQuestion[]); // Type assertion
        setCurrentAnswers({});
        setQuizInProgress(true);
        setTimeLeft(newQuiz.length * QUIZ_TIME_SECONDS_PER_QUESTION);
        toast({
          title: 'Quiz Started!',
          description: `You have ${ (newQuiz.length * QUIZ_TIME_SECONDS_PER_QUESTION) / 60} minutes. Good luck!`,
        });
      } else {
        toast({
          title: 'Quiz Generation Failed',
          description: 'No questions were returned. Please try different options or try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      toast({
        title: 'Quiz Generation Error',
        description: 'An unexpected error occurred while generating the quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setCurrentAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (showHistory) {
    return (
      <div className="container mx-auto p-4">
        <PageTitle title="Quiz History" icon={History} actions={
          <Button variant="outline" onClick={() => setShowHistory(false)}>
            <Lightbulb className="mr-2 h-4 w-4" /> Back to Quiz
          </Button>
        } />
        {previousAttempts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquareWarning className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No quiz attempts recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4">
              {previousAttempts.map(attempt => (
                <Card key={attempt.id} className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {EXAM_TYPES.find(e => e.value === attempt.examType)?.label || attempt.examType} -
                      {attempt.subject === ALL_SUBJECTS_OPTION.value
                        ? ALL_SUBJECTS_OPTION.label
                        : (SUBJECTS_BY_EXAM[attempt.examType]?.find(s => s.value === attempt.subject)?.label || attempt.subject)}
                       {attempt.difficulty && (
                         <span className="text-sm font-normal ml-2">({QUIZ_DIFFICULTY_LEVELS.find(d => d.value === attempt.difficulty)?.label || attempt.difficulty})</span>
                       )}
                    </CardTitle>
                    <CardDescription>
                      Attempted on: {new Date(attempt.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} {new Date(attempt.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit'})}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">Score: {attempt.score} / {attempt.totalQuestions}</p>
                    <Progress value={(attempt.score / attempt.totalQuestions) * 100} className="mt-2 h-2" />
                  </CardContent>
                  <CardFooter>
                     <Button variant="outline" size="sm" onClick={() => {
                       setQuizResult(attempt); 
                       setShowHistory(false); 
                       setCurrentQuiz(null); 
                       setQuizInProgress(false);
                     }}>
                       View Details
                     </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4">
      <PageTitle title="AI Quiz Generator" icon={Lightbulb} actions={
         previousAttempts.length > 0 && !quizInProgress && !quizLoading && (
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History className="mr-2 h-4 w-4" /> View History
          </Button>
        )
      } />

      {!currentQuiz && !quizResult && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Setup Your Quiz</CardTitle>
            <CardDescription>Select exam type, subject, and difficulty to start an AI-generated quiz.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSetupSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="examType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam Type</FormLabel>
                      <Select onValueChange={(value) => {field.onChange(value); handleExamTypeChange(value);}} defaultValue={field.value}>
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
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.watch('examType')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSubjects.map(subject => (
                            <SelectItem key={subject.value} value={subject.value}>
                              {subject.label}
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
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {QUIZ_DIFFICULTY_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={quizLoading || form.formState.isSubmitting}>
                  {quizLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    'Start Quiz'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {currentQuiz && quizInProgress && (
        <Card className="shadow-lg">
          <CardHeader className="sticky top-0 bg-background z-10 border-b">
            <div className="flex justify-between items-center">
                <CardTitle>Quiz in Progress</CardTitle>
                <div className="text-lg font-semibold text-primary">{formatTime(timeLeft)}</div>
            </div>
             <Progress value={(timeLeft / (currentQuiz.length * QUIZ_TIME_SECONDS_PER_QUESTION)) * 100} className="w-full h-2 mt-2" />
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-300px)]"> 
            <CardContent className="p-6 space-y-6">
            <Form {...form}>
              {currentQuiz.map((question, index) => (
                <div key={question.id}>
                  <p className="font-semibold mb-2">
                    {index + 1}. {question.text}
                    {question.subject && <span className="ml-2 text-xs font-normal bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">{question.subject}</span>}
                     {question.difficulty && <span className="ml-2 text-xs font-normal bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded-full">{QUIZ_DIFFICULTY_LEVELS.find(d => d.value === question.difficulty)?.label || question.difficulty}</span>}
                  </p>
                  <RadioGroup
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                    value={currentAnswers[question.id] || ''}
                    className="space-y-2"
                  >
                    {question.options.map(option => (
                       <FormItem key={option.id} className="flex items-center space-x-3 space-y-0 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                          <FormControl>
                            <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                          </FormControl>
                        <FormLabel htmlFor={`${question.id}-${option.id}`} className="font-normal flex-1 cursor-pointer">
                          {option.text}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                  {index < currentQuiz.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
              </Form>
            </CardContent>
          </ScrollArea>
          <CardFooter className="border-t pt-4">
            <Button onClick={handleSubmitQuiz} className="w-full" disabled={quizLoading}>Submit Quiz</Button>
          </CardFooter>
        </Card>
      )}

      {quizResult && (
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Quiz Result</CardTitle>
                 <Button variant="outline" onClick={() => {setCurrentQuiz(null); setQuizResult(null); form.reset();}}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Start New Quiz
                </Button>
             </div>
            <CardDescription>
              You scored {quizResult.score} out of {quizResult.totalQuestions}.
              ({((quizResult.score / quizResult.totalQuestions) * 100).toFixed(1)}%)
              {quizResult.difficulty && ` on ${QUIZ_DIFFICULTY_LEVELS.find(d => d.value === quizResult.difficulty)?.label || quizResult.difficulty} difficulty.`}
            </CardDescription>
            <Progress value={(quizResult.score / quizResult.totalQuestions) * 100} className="mt-2 h-3" />
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-320px)]"> 
            <CardContent className="p-6 space-y-6">
              {quizResult.questions.map((q, index) => {
                const userAnswerId = quizResult.answers.find(a => a.questionId === q.id)?.selectedOptionId;
                const isCorrect = userAnswerId === q.correctOptionId;
                return (
                  <Alert key={q.id} variant={isCorrect ? 'default' : 'destructive'} className={cn("bg-card", isCorrect ? "border-accent" : "border-destructive")}>
                    <div className="flex items-start">
                      {isCorrect ? <CheckCircle className="h-5 w-5 text-accent mr-2 flex-shrink-0" /> : <MessageSquareWarning className="h-5 w-5 text-destructive mr-2 flex-shrink-0" />}
                      <div>
                        <AlertTitle className="font-semibold text-base">{index + 1}. {q.text}</AlertTitle>
                        {q.difficulty && <span className="text-xs font-normal bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded-full mt-1 inline-block">{QUIZ_DIFFICULTY_LEVELS.find(d=>d.value === q.difficulty)?.label || q.difficulty}</span>}
                      </div>
                    </div>
                    <AlertDescription className="mt-3 space-y-2 pl-1">
                      <ul className="space-y-1">
                        {q.options.map(opt => (
                          <li key={opt.id} className={cn(`
                            text-sm p-1.5 rounded-md border`,
                            opt.id === q.correctOptionId && 'border-accent bg-accent/10',
                            opt.id === userAnswerId && opt.id !== q.correctOptionId && 'border-destructive bg-destructive/10',
                            opt.id === userAnswerId && 'font-semibold'
                          )}>
                            {opt.text}
                            {opt.id === q.correctOptionId && <span className="text-xs text-accent ml-2">(Correct)</span>}
                            {opt.id === userAnswerId && opt.id !== q.correctOptionId && <span className="text-xs text-destructive ml-2">(Your Answer)</span>}
                          </li>
                        ))}
                      </ul>
                      {!isCorrect && userAnswerId && (
                        <p className="text-sm text-muted-foreground">Your answer: {q.options.find(o => o.id === userAnswerId)?.text || 'Not answered'}</p>
                      )}
                       {!userAnswerId && !isCorrect && (
                         <p className="text-sm text-destructive">You did not answer this question. The correct answer was: {q.options.find(o => o.id === q.correctOptionId)?.text}</p>
                       )}
                       {isCorrect && !userAnswerId && ( 
                         <p className="text-sm text-muted-foreground">Question not answered. Correct answer: {q.options.find(o => o.id === q.correctOptionId)?.text}</p>
                       )}
                      <p className="text-sm text-muted-foreground"><strong className="text-foreground">Explanation:</strong> {q.explanation}</p>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </CardContent>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
