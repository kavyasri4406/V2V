import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          background: 'black',
          color: 'hsl(350, 85%, 70%)',
          fontSize: '14px',
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          padding: '2px',
        }}
      >
        V2V
      </div>
    ),
    {
      ...size,
    }
  )
}
