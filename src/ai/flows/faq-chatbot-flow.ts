
'use server';
/**
 * @fileOverview A Genkit flow for an FAQ chatbot.
 *
 * - faqChatbot - A function that handles chatbot queries.
 * - FaqChatbotInput - The input type for the faqChatbot function.
 * - FaqChatbotOutput - The return type for the faqChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FaqChatbotInputSchema = z.object({
  question: z.string().describe('The user_s question for the FAQ chatbot.'),
});
export type FaqChatbotInput = z.infer<typeof FaqChatbotInputSchema>;

const FaqChatbotOutputSchema = z.object({
  answer: z.string().describe('The chatbot_s answer to the user_s question.'),
});
export type FaqChatbotOutput = z.infer<typeof FaqChatbotOutputSchema>;

export async function faqChatbot(input: FaqChatbotInput): Promise<FaqChatbotOutput> {
  return faqChatbotFlow(input);
}

const faqPrompt = ai.definePrompt({
  name: 'faqChatbotPrompt',
  input: {schema: FaqChatbotInputSchema},
  output: {schema: FaqChatbotOutputSchema},
  prompt: `You are Arjuna, a friendly and helpful FAQ chatbot for an application called "Acharya".
Your goal is to answer user questions based on the information provided below.
If the user's question is not covered by the FAQs, try to provide a helpful general answer if possible, or politely state that you don't have specific information on that topic.
Keep your answers concise and to the point.

Here are some Frequently Asked Questions about Acharya:

Q: What is Acharya?
A: Acharya is your personal AI-powered study companion designed to help you ace your exams. It offers features like personalized study timetables, AI-generated quizzes with difficulty levels, and PDF analysis with quiz generation.

Q: How do I create a study timetable?
A: On the 'Home' page, you can find a form to "Create Your Study Plan". Enter your exam type, exam date, and the number of topics you need to cover. Click "Generate Timetable", and a personalized plan will be created for you.

Q: Can I customize my timetable?
A: Yes! After a timetable is generated, you can add new tasks, edit existing task descriptions, mark tasks as complete, and delete tasks directly on the Home page.

Q: How does the AI Quiz Generator work?
A: Go to the 'Quiz' page. Select your exam type, subject, and desired difficulty level (Easy, Medium, High, Expert), then click "Start Quiz". Our AI will generate a set of multiple-choice questions tailored to your selections. After completing the quiz, you'll get your score and explanations for each question.

Q: What can the PDF Analyzer do?
A: On the 'PDF Analyzer' page, you can upload a PDF document (up to 10MB). The AI will then generate a concise summary of the PDF content and a multiple-choice quiz based on the information in the document. This is great for quickly understanding and testing your knowledge on study materials.

Q: How is my data stored?
A: Your profile information (name, age, preferences), timetable data, and quiz attempts are currently stored in your browser's local storage. This means your data is saved on your device.

Q: Is Acharya free?
A: Acharya is currently offered as a free-to-use platform.

Q: How do I update my profile?
A: Navigate to the 'Profile' page. Here you can view your current details and click the "Edit Profile" button to update your name, email, age, profile picture URL, exam goal, and preferred exam. You can also manage notification settings and logout from this page.

Q: What kind of exams does Acharya support?
A: Acharya supports a wide range of exams including JEE, NEET, various SSC exams (CGL, CHSL, MTS), CBSE grades (5th to 12th), UPSC, MPSC, GATE, CAT, Engineering specializations (Computer Science, Electronics & Telecom, AI & Data Science, Electrical, Mechanical, Civil), and a general 'Other Competitive Exams' category. You can select your specific exam type when generating quizzes or setting up your profile.

Q: Who developed Acharya?
A: Acharya is an innovative AI-driven application designed to assist students in their exam preparations.

User's question: "{{{question}}}"

Your answer:
`,
});

const faqChatbotFlow = ai.defineFlow(
  {
    name: 'faqChatbotFlow',
    inputSchema: FaqChatbotInputSchema,
    outputSchema: FaqChatbotOutputSchema,
  },
  async (input: FaqChatbotInput) => {
    const {output} = await faqPrompt(input);
    if (!output) {
      return {answer: "I'm sorry, I couldn't process your request at the moment. Please try again."};
    }
    return output;
  }
);
