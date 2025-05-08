
'use server';
/**
 * @fileOverview A Genkit flow for analyzing PDF documents.
 * It generates a summary and a quiz based on the PDF content.
 *
 * - analyzePdf - A function that handles the PDF analysis process.
 * - AnalyzePdfInput - The input type for the analyzePdf function.
 * - AnalyzePdfOutput - The return type for the analyzePdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { QuizQuestion } from '@/types'; // Re-using QuizQuestion type

// Define Zod schema for a single option within a quiz question (consistent with generate-quiz-flow)
const QuizOptionSchema = z.object({
  id: z.string().describe("A unique identifier for this option (e.g., 'opt_a', 'opt_b'). Must be unique within the question's options."),
  text: z.string().describe("The text content of the answer option."),
});

// Define Zod schema for a single quiz question (consistent with generate-quiz-flow)
const QuizQuestionSchema = z.object({
  id: z.string().describe("A unique identifier for the question (e.g., 'q1', 'q2'). Must be unique within the generated quiz."),
  text: z.string().describe("The main text or stem of the quiz question."),
  options: z.array(QuizOptionSchema).min(2).max(5).describe("An array of 2 to 5 possible answer options. Each option must have a unique 'id'."),
  correctOptionId: z.string().describe("The 'id' of the correct option from the 'options' array. This ID must match one of the option IDs provided."),
  explanation: z.string().describe("A concise explanation for why the correct answer is correct, and briefly, why other key distractors might be incorrect."),
  subject: z.string().optional().describe("The specific subject this question pertains to, if identifiable from the PDF section. This is especially useful if the PDF covers diverse topics."),
});


const AnalyzePdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The PDF document content as a data URI that must include a MIME type (application/pdf) and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
  fileName: z.string().describe('The name of the uploaded PDF file.'),
  numQuizQuestions: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('The desired number of quiz questions to generate (integer between 1 and 10).'),
});
export type AnalyzePdfInput = z.infer<typeof AnalyzePdfInputSchema>;

const AnalyzePdfOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the PDF document.'),
  quiz: z.array(QuizQuestionSchema).describe('An array of generated quiz questions based on the PDF content.'),
  fileName: z.string().describe('The name of the analyzed PDF file, passed through from input.'),
});
export type AnalyzePdfOutput = z.infer<typeof AnalyzePdfOutputSchema>;

export async function analyzePdf(input: AnalyzePdfInput): Promise<AnalyzePdfOutput> {
  return analyzePdfFlow(input);
}

const pdfAnalysisPrompt = ai.definePrompt({
  name: 'pdfAnalysisPrompt',
  input: { schema: AnalyzePdfInputSchema },
  output: { schema: AnalyzePdfOutputSchema },
  prompt: `You are an AI assistant specialized in document analysis and educational content generation.
You have been provided with a PDF document. Your tasks are:
1.  Generate a concise and informative summary of the entire PDF document. The summary should capture the main points and key information.
2.  Generate exactly {{{numQuizQuestions}}} multiple-choice quiz questions based on the content of the PDF. These questions should test understanding of important concepts from the document.

Document Details:
File Name: {{{fileName}}}
Content: {{media url=pdfDataUri}}

Instructions for Quiz Questions:
- Each question must strictly follow the QuizQuestionSchema:
  - 'id': A unique string identifier for the question (e.g., "q1", "q2", ... "q{{{numQuizQuestions}}}").
  - 'text': The question statement.
  - 'options': An array of 2 to 5 answer choices. Each option must have:
      - 'id': A unique string identifier for the option (e.g., "q1_opt_a", "q1_opt_b"). Ensure these IDs are unique within the options for a single question.
      - 'text': The text of the option.
  - 'correctOptionId': The 'id' of the option that is the correct answer. This ID *must* exactly match one of the 'id's provided in the 'options' array for that question.
  - 'explanation': A brief but clear explanation of why the correct answer is correct. If relevant, also explain common misconceptions or why other options are incorrect.
  - 'subject' (optional): If the PDF content clearly delineates different subjects or topics, provide a relevant subject for the question. If the PDF is monolithic, this can be omitted.

Please provide the output as a single JSON object containing:
- 'summary': (string) The generated summary.
- 'quiz': (array of QuizQuestion objects) The generated quiz questions.
- 'fileName': (string) The original file name: "{{{fileName}}}"

Ensure the entire response is a valid JSON object conforming to the specified output schema.
`,
});

const analyzePdfFlow = ai.defineFlow(
  {
    name: 'analyzePdfFlow',
    inputSchema: AnalyzePdfInputSchema,
    outputSchema: AnalyzePdfOutputSchema,
  },
  async (input: AnalyzePdfInput) => {
    const { output } = await pdfAnalysisPrompt(input);
    if (!output) {
      console.error('PDF analysis failed: LLM did not return valid output.');
      // Consider returning a structured error or a default AnalyzePdfOutput object
      // For now, throwing an error as per previous user preference.
      throw new Error('Failed to analyze PDF: No output from LLM.');
    }
    // The fileName is part of the output schema and should be populated by the LLM based on the prompt.
    // If the LLM fails to include it, we can add it back here, but ideally, the prompt enforces it.
    // For robustness:
    if (!output.fileName && input.fileName) {
        return { ...output, fileName: input.fileName };
    }
    return output;
  }
);

