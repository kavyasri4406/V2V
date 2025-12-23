'use server';
/**
 * @fileOverview An air quality AI flow.
 *
 * - getPollution - A function that fetches air quality data for a given location.
 * - GetPollutionInput - The input type for the getPollution function.
 * - GetPollutionOutput - The return type for the getPollution function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetPollutionInputSchema = z.object({
  lat: z.number().describe('The latitude of the location.'),
  lon: z.number().describe('The longitude of the location.'),
});
export type GetPollutionInput = z.infer<typeof GetPollutionInputSchema>;

const GetPollutionOutputSchema = z.object({
  aqi: z.number().describe('The Air Quality Index (AQI) value.'),
  level: z.string().describe('The air quality level (e.g., "Good", "Moderate", "Unhealthy").'),
  dominantPollutant: z.string().describe('The main pollutant (e.g., "PM2.5", "O3").'),
  recommendations: z.string().describe('A brief, actionable health recommendation for the current conditions.'),
});
export type GetPollutionOutput = z.infer<typeof GetPollutionOutputSchema>;

export async function getPollution(input: GetPollutionInput): Promise<GetPollutionOutput> {
  return getPollutionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getPollutionPrompt',
  input: { schema: GetPollutionInputSchema },
  output: { schema: GetPollutionOutputSchema },
  prompt: `You are an air quality data provider. Based on the provided latitude and longitude, provide the current air quality index (AQI) and related information.
  
  Latitude: {{{lat}}}
  Longitude: {{{lon}}}
  
  Provide a concise description of the air quality level and a short recommendation.`,
});

const getPollutionFlow = ai.defineFlow(
  {
    name: 'getPollutionFlow',
    inputSchema: GetPollutionInputSchema,
    outputSchema: GetPollutionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
