import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 512,
  height: 512,
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
          borderRadius: '128px',
          background: 'black',
          color: 'hsl(350, 85%, 70%)',
          fontSize: '180px',
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          padding: '40px',
          border: '24px solid hsl(350, 85%, 70%)'
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
