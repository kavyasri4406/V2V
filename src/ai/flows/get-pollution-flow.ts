'use server';
/**
 * @fileOverview An AI flow to get the air quality for a given location.
 *
 * - getPollution - A function that returns air quality data.
 * - GetPollutionInput - The input type for the getPollution function.
 * - GetPollutionOutput - The return type for the getPollution function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetPollutionInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type GetPollutionInput = z.infer<typeof GetPollutionInputSchema>;

const GetPollutionOutputSchema = z.object({
  locationName: z.string().describe("The city or area name for the given coordinates."),
  aqi: z.number().describe('The Air Quality Index (AQI) value.'),
  dominantPollutant: z.string().describe('The main pollutant (e.g., PM2.5, O3).'),
  healthAdvisory: z.string().describe('A brief health advisory based on the AQI level.'),
});
export type GetPollutionOutput = z.infer<typeof GetPollutionOutputSchema>;

export async function getPollution(input: GetPollutionInput): Promise<GetPollutionOutput> {
  return pollutionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getPollutionPrompt',
  input: { schema: GetPollutionInputSchema },
  output: { schema: GetPollutionOutputSchema },
  prompt: `You are an environmental data provider. Based on the user's location (latitude: {{{latitude}}}, longitude: {{{longitude}}}), provide the current air quality information. Identify the location name, the Air Quality Index (AQI), the dominant pollutant, and provide a concise health advisory.`,
});

const pollutionFlow = ai.defineFlow(
  {
    name: 'pollutionFlow',
    inputSchema: GetPollutionInputSchema,
    outputSchema: GetPollutionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
