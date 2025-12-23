'use server';
/**
 * @fileOverview An AI flow to find nearby places of a certain type.
 *
 * - getNearbyPlaces - A function that returns a list of nearby places.
 * - GetNearbyPlacesInput - The input type for the getNearbyPlaces function.
 * - GetNearbyPlacesOutput - The return type for the getNearbyPlaces function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PlaceSchema = z.object({
  name: z.string().describe('The name of the place.'),
  address: z.string().describe('The full address of the place.'),
  latitude: z.number().describe('The latitude of the place.'),
  longitude: z.number().describe('The longitude of the place.'),
});

export const GetNearbyPlacesInputSchema = z.object({
  latitude: z.number().describe('The latitude of the user.'),
  longitude: z.number().describe('The longitude of the user.'),
  placeType: z.string().describe('The type of place to search for (e.g., "gas station", "hospital").'),
});
export type GetNearbyPlacesInput = z.infer<typeof GetNearbyPlacesInputSchema>;

export const GetNearbyPlacesOutputSchema = z.object({
  places: z.array(PlaceSchema).describe('A list of nearby places found.'),
});
export type GetNearbyPlacesOutput = z.infer<typeof GetNearbyPlacesOutputSchema>;

export async function getNearbyPlaces(input: GetNearbyPlacesInput): Promise<GetNearbyPlacesOutput> {
  return nearbyPlacesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getNearbyPlacesPrompt',
  input: { schema: GetNearbyPlacesInputSchema },
  output: { schema: GetNearbyPlacesOutputSchema },
  prompt: `You are a helpful assistant for drivers. Find a list of nearby places based on the user's location and the type of place they are looking for.

User Location:
Latitude: {{{latitude}}}
Longitude: {{{longitude}}}

Find nearby: {{{placeType}}}

Return a list of up to 10 places, including their name, full address, and precise latitude/longitude coordinates.`,
});

const nearbyPlacesFlow = ai.defineFlow(
  {
    name: 'nearbyPlacesFlow',
    inputSchema: GetNearbyPlacesInputSchema,
    outputSchema: GetNearbyPlacesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
