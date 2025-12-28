'use server';
/**
 * @fileOverview An AI flow to get a list of nearby places based on location and type.
 *
 * - getNearbyPlaces - A function that returns a list of places.
 * - GetNearbyPlacesInput - The input type for the getNearbyPlaces function.
 * - GetNearbyPlacesOutput - The return type for the getNearbyPlaces function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PlaceSchema = z.object({
  name: z.string().describe('The name of the place.'),
  address: z.string().describe('The address of the place.'),
  distance: z.string().describe('The approximate distance from the user (e.g., "5.2 km").'),
});

const GetNearbyPlacesInputSchema = z.object({
  latitude: z.number().describe('The latitude of the user\'s location.'),
  longitude: z.number().describe('The longitude of the user\'s location.'),
  placeType: z.enum(['petrol station', 'hospital', 'car repair', 'bike repair']).describe('The type of place to search for.'),
});
export type GetNearbyPlacesInput = z.infer<typeof GetNearbyPlacesInputSchema>;

const GetNearbyPlacesOutputSchema = z.object({
  places: z.array(PlaceSchema).describe('A list of nearby places.'),
});
export type GetNearbyPlacesOutput = z.infer<typeof GetNearbyPlacesOutputSchema>;

export async function getNearbyPlaces(input: GetNearbyPlacesInput): Promise<GetNearbyPlacesOutput> {
  return getNearbyPlacesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getNearbyPlacesPrompt',
  input: { schema: GetNearbyPlacesInputSchema },
  output: { schema: GetNearbyPlacesOutputSchema },
  prompt: `You are a local search assistant. Based on the user's location (latitude: {{{latitude}}}, longitude: {{{longitude}}}), find up to 5 nearby places of the type "{{{placeType}}}". For each place, provide its name, address, and approximate distance from the user.`,
});

const getNearbyPlacesFlow = ai.defineFlow(
  {
    name: 'getNearbyPlacesFlow',
    inputSchema: GetNearbyPlacesInputSchema,
    outputSchema: GetNearbyPlacesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
