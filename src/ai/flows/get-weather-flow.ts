'use server';
/**
 * @fileOverview A weather fetching AI agent.
 *
 * - getWeather - A function that handles fetching weather for given coordinates.
 * - GetWeatherInput - The input type for the getWeather function.
 * - GetWeatherOutput - The return type for the getWeather function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetWeatherInputSchema = z.object({
  latitude: z.number().describe('The latitude for the weather query.'),
  longitude: z.number().describe('The longitude for the weather query.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

const GetWeatherOutputSchema = z.object({
  temperature: z.number().describe('The current temperature in Celsius.'),
  condition: z.string().describe('A brief description of the current weather conditions (e.g., "Sunny", "Partly Cloudy").'),
  location: z.string().describe('The city or area name for the given coordinates.'),
});
export type GetWeatherOutput = z.infer<typeof GetWeatherOutputSchema>;

export async function getWeather(
  input: GetWeatherInput
): Promise<GetWeatherOutput> {
  return getWeatherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getWeatherPrompt',
  input: { schema: GetWeatherInputSchema },
  output: { schema: GetWeatherOutputSchema },
  prompt: `You are a weather assistant. Based on the provided latitude: {{{latitude}}} and longitude: {{{longitude}}}, determine the current weather conditions.

  Provide the temperature in Celsius.
  Keep the condition description concise.
  Determine the closest neighborhood, locality, or city for the coordinates. Be as specific as possible.`,
});

const getWeatherFlow = ai.defineFlow(
  {
    name: 'getWeatherFlow',
    inputSchema: GetWeatherInputSchema,
    outputSchema: GetWeatherOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
