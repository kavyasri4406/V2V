'use server';
/**
 * @fileOverview An AI flow to get the weather for a given location.
 *
 * - getWeather - A function that returns weather data.
 * - GetWeatherInput - The input type for the getWeather function.
 * - GetWeatherOutput - The return type for the getWeather function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetWeatherInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

const GetWeatherOutputSchema = z.object({
  locationName: z.string().describe("The city or area name for the given coordinates."),
  temperature: z.number().describe('The current temperature in Celsius.'),
  condition: z.string().describe('The weather condition (e.g., Clear, Clouds, Rain, Fog, Storm).'),
  humidity: z.number().describe('The humidity percentage.'),
  windSpeed: z.number().describe('The wind speed in km/h.'),
});
export type GetWeatherOutput = z.infer<typeof GetWeatherOutputSchema>;

export async function getWeather(input: GetWeatherInput): Promise<GetWeatherOutput> {
  return weatherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getWeatherPrompt',
  input: { schema: GetWeatherInputSchema },
  output: { schema: GetWeatherOutputSchema },
  prompt: `You are a weather service. Based on the user's location (latitude: {{{latitude}}}, longitude: {{{longitude}}}), provide the current weather conditions. Identify the location name, temperature in Celsius, a simple weather condition (Clear, Clouds, Rain, Fog, Storm), humidity, and wind speed in km/h.`,
});

const weatherFlow = ai.defineFlow(
  {
    name: 'weatherFlow',
    inputSchema: GetWeatherInputSchema,
    outputSchema: GetWeatherOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
