'use server';
/**
 * @fileOverview A weather-fetching AI flow.
 *
 * - getWeather - A function that returns weather data for given coordinates.
 * - GetWeatherInput - The input type for the getWeather function.
 * - GetWeatherOutput - The return type for the getWeather function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetWeatherInputSchema = z.object({
  latitude: z.number().describe('The latitude for the weather query.'),
  longitude: z.number().describe('The longitude for the weather query.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

const GetWeatherOutputSchema = z.object({
  temperature: z.number().describe('The current temperature in Celsius.'),
  condition: z
    .enum(['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm', 'Snow', 'Mist', 'Smoke', 'Haze', 'Dust', 'Fog', 'Sand', 'Ash', 'Squall', 'Tornado'])
    .describe('The current weather condition.'),
  humidity: z.number().describe('The current humidity percentage (e.g., 80).'),
  windSpeed: z.number().describe('The current wind speed in kilometers per hour (km/h).'),
  locationName: z
    .string()
    .describe('The closest and most specific locality, neighborhood, or city name for the given coordinates.'),
});
export type GetWeatherOutput = z.infer<typeof GetWeatherOutputSchema>;

export async function getWeather(input: GetWeatherInput): Promise<GetWeatherOutput> {
  return getWeatherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getWeatherPrompt',
  input: { schema: GetWeatherInputSchema },
  output: { schema: GetWeatherOutputSchema },
  prompt: `Provide the current weather conditions for the given latitude and longitude.

Latitude: {{{latitude}}}
Longitude: {{{longitude}}}

Return the temperature in Celsius.
Return the wind speed in km/h.
For the locationName, determine the most specific, granular, and closest geographical name you can find (e.g., a specific neighborhood, local landmark, or village) before falling back to a larger area like a city.
`,
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
