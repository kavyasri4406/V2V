import { z } from 'zod';

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
