'use server';
/**
 * @fileOverview An AI flow to find nearby places of a certain type.
 *
 * - getNearbyPlaces - A function that returns a list of nearby places.
 */

import { ai } from '@/ai/genkit';
import {
  GetNearbyPlacesInputSchema,
  GetNearbyPlacesOutputSchema,
  type GetNearbyPlacesInput,
  type GetNearbyPlacesOutput,
} from './nearby-places-types';

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
