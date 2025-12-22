'use server';
/**
 * @fileOverview A weather retrieval AI flow.
 *
 * - getWeather - A function that fetches weather data for a given location.
 * - GetWeatherInput - The input type for the getWeather function.
 * - GetWeatherOutput - The return type for the getWeather function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetWeatherInputSchema = z.object({
  lat: z.number().describe('The latitude of the location.'),
  lon: z.number().describe('The longitude of the location.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

const GetWeatherOutputSchema = z.object({
  locationName: z.string().describe('The city and state, or other common name for the location.'),
  condition: z.string().describe('A single-word description of the weather (e.g., Clear, Clouds, Rain, Snow, Thunderstorm, etc.).'),
  temperature: z.number().describe('The temperature in Celsius.'),
  humidity: z.number().describe('The humidity percentage.'),
  windSpeed: z.number().describe('The wind speed in kilometers per hour.'),
});
export type GetWeatherOutput = z.infer<typeof GetWeatherOutputSchema>;

export async function getWeather(input: GetWeatherInput): Promise<GetWeatherOutput> {
  return getWeatherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getWeatherPrompt',
  input: { schema: GetWeatherInputSchema },
  output: { schema: GetWeatherOutputSchema },
  prompt: `You are a weather API. Based on the provided latitude and longitude, provide the current weather conditions.
  
  Latitude: {{{lat}}}
  Longitude: {{{lon}}}
  
  Provide a concise, single-word weather condition.`,
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
