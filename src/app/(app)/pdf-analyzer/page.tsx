
'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormItem, FormLabel, FormMessage, FormField } from '@/components/ui/form'; // Added Form related imports
import { useForm } from 'react-hook-form'; // Added for form handling within quiz
import type { QuizQuestion } from '@/types';
import { FileText, Loader2, UploadCloud, CheckCircle, MessageSquareWarning, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/PageTitle';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { analyzePdf as analyzePdfFlow, type AnalyzePdfInput, type AnalyzePdfOutput } from '@/ai/flows/analyze-pdf-flow';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function PdfAnalyzerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePdfOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string | null>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const { toast } = useToast();
  const form = useForm(); // Dummy form for RadioGroup context if needed, or manage answers directly

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Invalid file type. Please upload a PDF.');
        toast({ title: 'Invalid File Type', description: 'Please upload a PDF document.', variant: 'destructive' });
        setSelectedFile(null);
        setFilePreview(null);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB. Please upload a smaller PDF.`);
        toast({ title: 'File Too Large', description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
        setSelectedFile(null);
        setFilePreview(null);
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file)); // For simple preview, actual PDF rendering is complex
      setError(null);
      setAnalysisResult(null); // Reset previous analysis
      setCurrentAnswers({});
      setQuizSubmitted(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast({ title: 'No File Selected', description: 'Please select a PDF file to analyze.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setCurrentAnswers({});
    setQuizSubmitted(false);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        const base64Pdf = reader.result as string;
        
        const input: AnalyzePdfInput = {
          pdfDataUri: base64Pdf,
          fileName: selectedFile.name,
          numQuizQuestions: 5, // Or make this configurable
        };

        const result = await analyzePdfFlow(input);
        setAnalysisResult(result);
        toast({ title: 'Analysis Complete!', description: 'Summary and quiz generated successfully.' });
      };
      reader.onerror = () => {
        throw new Error('Error reading file.');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze PDF. Please try again.');
      toast({ title: 'Analysis Failed', description: err.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, optionId: string) => {
    if (quizSubmitted) return;
    setCurrentAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmitQuiz = () => {
    if (!analysisResult || !analysisResult.quiz) return;
    setQuizSubmitted(true);
    // Calculate score or show feedback (already done in result display)
    let score = 0;
    analysisResult.quiz.forEach(q => {
      if (currentAnswers[q.id] === q.correctOptionId) score++;
    });
    toast({
        title: "Quiz Submitted!",
        description: `You scored ${score} out of ${analysisResult.quiz.length}. Review your answers below.`
    });
  };

  return (
    <div className="container mx-auto p-4">
      <PageTitle title="PDF Analyzer & Quiz Generator" icon={FileText} />

      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><UploadCloud className="mr-2 h-6 w-6 text-primary" /> Upload PDF</CardTitle>
          <CardDescription>Select a PDF document to generate a summary and a quiz.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept="application/pdf" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
          {filePreview && selectedFile && (
            <div className="p-2 border rounded-md bg-muted/50">
              <p className="text-sm font-medium text-foreground">Selected: {selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button onClick={handleAnalyze} disabled={!selectedFile || isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze PDF & Generate Quiz'
            )}
          </Button>
        </CardFooter>
      </Card>

      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Processing your PDF, please wait...</p>
          <Progress value={undefined} className="w-1/2 mx-auto mt-4 h-2" /> {/* Indeterminate progress */}
        </div>
      )}

      {analysisResult && !isLoading && (
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Analysis for: {analysisResult.fileName}</CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2 text-primary">Summary</h3>
              <ScrollArea className="h-40 rounded-md border p-3 bg-muted/30">
                <p className="text-sm whitespace-pre-wrap">{analysisResult.summary}</p>
              </ScrollArea>
            </CardContent>
          </Card>

          {analysisResult.quiz && analysisResult.quiz.length > 0 && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-6 w-6 text-primary" /> Quiz based on PDF</CardTitle>
                <CardDescription>Test your understanding of the document.</CardDescription>
              </CardHeader>
              <ScrollArea className="h-[calc(100vh-480px)] md:h-[calc(100vh-420px)]"> {/* Adjust height as needed */}
                <CardContent className="p-6 space-y-6">
                <Form {...form}> {/* Form provider for RadioGroup context */}
                  {analysisResult.quiz.map((question, index) => (
                    <div key={question.id}>
                      <p className="font-semibold mb-2">
                        {index + 1}. {question.text}
                        {question.subject && <span className="ml-2 text-xs font-normal bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">{question.subject}</span>}
                      </p>
                      <RadioGroup
                        onValueChange={(value) => handleAnswerChange(question.id, value)}
                        value={currentAnswers[question.id] || ''}
                        className="space-y-2"
                        disabled={quizSubmitted}
                      >
                        {question.options.map(option => (
                           <FormItem key={option.id} className={cn("flex items-center space-x-3 space-y-0 p-2 border rounded-md hover:bg-muted/50 transition-colors", quizSubmitted && option.id === question.correctOptionId && "bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-700", quizSubmitted && option.id === currentAnswers[question.id] && option.id !== question.correctOptionId && "bg-red-100 dark:bg-red-900 border-red-400 dark:border-red-700" )}>
                              <FormControl>
                                <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} disabled={quizSubmitted}/>
                              </FormControl>
                            <FormLabel htmlFor={`${question.id}-${option.id}`} className="font-normal flex-1 cursor-pointer">
                              {option.text}
                               {quizSubmitted && option.id === question.correctOptionId && <span className="text-xs text-green-700 dark:text-green-400 ml-2">(Correct)</span>}
                               {quizSubmitted && option.id === currentAnswers[question.id] && option.id !== question.correctOptionId && <span className="text-xs text-red-700 dark:text-red-400 ml-2">(Your Answer)</span>}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                      {quizSubmitted && (
                        <Alert className={cn("mt-3 text-sm", currentAnswers[question.id] === question.correctOptionId ? "bg-accent/10 border-accent" : "bg-destructive/10 border-destructive")}>
                           <div className="flex items-start">
                             {currentAnswers[question.id] === question.correctOptionId ? <CheckCircle className="h-4 w-4 text-accent mr-2 mt-0.5" /> : <MessageSquareWarning className="h-4 w-4 text-destructive mr-2 mt-0.5" />}
                             <div>
                                <AlertTitle className="font-semibold text-sm">Explanation</AlertTitle>
                                <AlertDescription className="text-xs">{question.explanation}</AlertDescription>
                             </div>
                           </div>
                        </Alert>
                      )}
                      {index < analysisResult.quiz.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                  </Form>
                </CardContent>
              </ScrollArea>
              {!quizSubmitted && (
                <CardFooter className="border-t pt-4">
                    <Button onClick={handleSubmitQuiz} className="w-full">Submit Quiz</Button>
                </CardFooter>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
