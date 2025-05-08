
'use server';
/**
 * @fileOverview A Genkit flow for generating quiz questions.
 *
 * - generateQuiz - A function that handles the quiz generation process.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function (an array of QuizQuestion).
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit'; 
import type { QuizQuestion, QuizDifficulty } from '@/types'; 
import { QUIZ_DIFFICULTY_LEVELS } from '@/lib/constants';

const QuizDifficultyEnum = z.enum(QUIZ_DIFFICULTY_LEVELS.map(d => d.value) as [QuizDifficulty, ...QuizDifficulty[]]);

const QuizOptionSchema = z.object({
  id: z.string().describe("A unique identifier for this option (e.g., 'opt_a', 'opt_b'). Must be unique within the question's options."),
  text: z.string().describe("The text content of the answer option."),
});

const QuizQuestionSchema = z.object({
  id: z.string().describe("A unique identifier for the question (e.g., 'q1', 'q2'). Must be unique within the generated quiz."),
  text: z.string().describe("The main text or stem of the quiz question."),
  options: z.array(QuizOptionSchema).min(2).max(5).describe("An array of 2 to 5 possible answer options. Each option must have a unique 'id'."),
  correctOptionId: z.string().describe("The 'id' of the correct option from the 'options' array. This ID must match one of the option IDs provided."),
  explanation: z.string().describe("A concise explanation for why the correct answer is correct, and briefly, why other key distractors might be incorrect."),
  subject: z.string().optional().describe("The specific subject this question pertains to (e.g., 'Physics', 'Algebra'). This is especially useful if the overall quiz is for 'All Subjects'."),
  difficulty: QuizDifficultyEnum.optional().describe("The assessed difficulty of the question (easy, medium, high, expert). This should align with the requested difficulty level if provided.")
});
export type QuizQuestionOutput = z.infer<typeof QuizQuestionSchema>; 

const GenerateQuizInputSchema = z.object({
  examTypeLabel: z.string().describe("The display label of the exam for which the quiz is being generated (e.g., 'JEE (Main & Advanced)', 'NEET (UG)')."),
  subjectLabel: z.string().describe("The display label of the subject for the quiz (e.g., 'Physics', 'Biology', 'All Subjects')."),
  numQuestions: z.number().int().min(1).max(10).describe("The desired number of questions to generate for the quiz (integer between 1 and 10)."),
  difficulty: QuizDifficultyEnum.describe("The desired difficulty level for the quiz questions (easy, medium, high, expert).")
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.array(QuizQuestionSchema).describe("An array of generated quiz questions.");
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;


export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const quizPrompt = ai.definePrompt({
  name: 'quizGenerationPrompt',
  input: { schema: GenerateQuizInputSchema },
  output: { schema: GenerateQuizOutputSchema },
  prompt: `You are an expert quiz question writer for various competitive exams.
Your task is to generate a set of high-quality multiple-choice questions based on the provided exam type, subject, and difficulty level.

Exam Type: {{{examTypeLabel}}}
Subject: {{{subjectLabel}}}
Number of Questions to Generate: {{{numQuestions}}}
Difficulty Level: {{{difficulty}}}

Please generate exactly {{{numQuestions}}} questions.
Each question must strictly follow this structure:
1.  'id': A unique string identifier for the question (e.g., "q1", "q2", ... "q{{{numQuestions}}}").
2.  'text': The question statement.
3.  'options': An array of 2 to 5 answer choices. Each option must have:
    a.  'id': A unique string identifier for the option (e.g., "q1_opt_a", "q1_opt_b"). Ensure these IDs are unique within the options for a single question.
    b.  'text': The text of the option.
4.  'correctOptionId': The 'id' of the option that is the correct answer. This ID *must* exactly match one of the 'id's provided in the 'options' array for that question.
5.  'explanation': A brief but clear explanation of why the correct answer is correct. If relevant, also explain common misconceptions or why other options are incorrect.
6.  'subject' (optional but highly recommended, especially if 'Subject' above is 'All Subjects'): The specific topic or sub-subject the question relates to (e.g., "Thermodynamics", "Indian History - Ancient").
7.  'difficulty': The assessed difficulty of the generated question (e.g., "easy", "medium", "high", "expert"). This should match the requested difficulty level: "{{{difficulty}}}".

Ensure the questions are appropriate for the specified exam type, subject, and difficulty level.
If the subject is "All Subjects", try to cover a diverse range of relevant topics for the given exam, maintaining the requested difficulty.
Maintain a professional and academic tone.
The output must be a JSON array of question objects conforming to the schema.
`,
});


const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async (input) => {
    const { output } = await quizPrompt(input);
    if (!output) {
        console.error('Quiz generation failed: LLM did not return valid output.');
        return [];
    }
    return output;
  }
);
