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
  prompt: `You are an expert reverse geocoding assistant. Your primary goal is to identify the most specific and closest named location for a given set of coordinates.

You will be given a latitude: {{{latitude}}} and a longitude: {{{longitude}}}.

1.  **Prioritize Specificity:** First, try to identify the name of the immediate neighborhood, locality, landmark, or sub-district. This is the most important requirement.
2.  **Fallback to City:** If and only if a more specific name is not available, fall back to the name of the city.
3.  **Weather Information:** Alongside the location, determine the current weather conditions.
    *   Provide the temperature in Celsius.
    *   Keep the weather condition description brief (e.g., "Partly Cloudy").`,
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
