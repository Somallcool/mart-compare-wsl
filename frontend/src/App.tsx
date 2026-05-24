import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    kakao: any
  }
}

function App() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false`
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return

        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 중심
          level: 3
        }
        new window.kakao.maps.Map(mapRef.current, options)
      })
    }
  }, [])

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />
  )
}

export default App