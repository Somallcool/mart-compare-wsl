import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    kakao: any
  }
}

interface Product {
  id: number
  martId: number
  name: string
  price: number
  eventType: string
  imageUrl: string
}

type Tab = 'all' | '1+1' | '2+1'

function App() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('all')

  // Spring Boot API 호출
  useEffect(() => {
    fetch('http://localhost:8081/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data)
        console.log('상품 데이터:', data)
      })
      .catch(err => console.error('API 호출 실패:', err))
  }, [])

  // 카카오맵 로딩
  useEffect(() => {
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false`
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return

        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 3
        }
        const map = new window.kakao.maps.Map(mapRef.current, options)

        // 임시 CU 마커 (서울시청 근처)
        const markerPosition = new window.kakao.maps.LatLng(37.5665, 126.9780)
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
          title: 'CU 서울시청점'
        })
        marker.setMap(map)

        // 마커 클릭 시 인포윈도우 표시
        const infowindow = new window.kakao.maps.InfoWindow({
          content: '<div style="padding:5px">CU 서울시청점</div>'
        })

        window.kakao.maps.event.addListener(marker, 'click', () => {
          infowindow.open(map, marker)
        })
      })
    }
  }, [])

  const filtered = activeTab === 'all'
    ? products
    : products.filter(p => p.eventType === activeTab)

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 지도 영역 */}
      <div ref={mapRef} style={{ flex: 1 }} />

      {/* 상품 리스트 영역 */}
      <div style={{ width: '300px', overflowY: 'auto', padding: '16px' }}>
        <h2>행사 상품 ({filtered.length}개)</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {(['all', '1+1', '2+1'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                backgroundColor: activeTab === tab ? '#ffeb3b' : '#fff',
              }}
            >
              {tab === 'all' ? '전체' : tab}
            </button>
          ))}
        </div>
        {filtered.map(product => (
          <div key={product.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0', display: 'flex', gap: '12px' }}>
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{ width: '80px', height: '80px', objectFit: 'contain', flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div>
              <div style={{ fontWeight: 'bold' }}>{product.name}</div>
              <div>{product.price.toLocaleString()}원</div>
              <div style={{ color: 'red' }}>{product.eventType}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App