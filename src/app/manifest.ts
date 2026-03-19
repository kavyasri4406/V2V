import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'V2V AlertCast',
    short_name: 'V2V',
    description: 'Vehicle-to-Vehicle Real-time Alert System',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#35b0ff',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
