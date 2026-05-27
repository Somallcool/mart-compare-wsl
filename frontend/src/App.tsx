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
  stock: number
}

interface Mart {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
}

type Tab = 'all' | '1+1' | '2+1'

function App() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [keyword, setKeyword] = useState('')
  const [marts, setMarts] = useState<Mart[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCu, setSelectedCu] = useState<Mart | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false&libraries=services`
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return
        const instance = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 3
        })
        setMap(instance)
      })
    }
  }, [])

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
  }

  const selectCuWithProducts = (cu: Mart) => {
    setSelectedCu(cu)
    fetch(`http://localhost:8081/api/marts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cu.name,
        address: cu.address,
        latitude: cu.latitude,
        longitude: cu.longitude
      })
    })
      .then(res => res.json())
      .then((mart: Mart) => fetch(`http://localhost:8081/api/products?martId=${mart.id}`))
      .then(res => res.json())
      .then((data: Product[]) => {
        if (Array.isArray(data)) setProducts(data)
        else setProducts([])
      })
      .catch(() => setProducts([]))
  }

  const searchAddress = () => {
    if (!map || !keyword.trim()) return

    const places = new window.kakao.maps.services.Places()

    places.keywordSearch(keyword, (results: any[], status: string) => {
      if (status !== window.kakao.maps.services.Status.OK) return

      const lat = parseFloat(results[0].y)
      const lng = parseFloat(results[0].x)
      const center = new window.kakao.maps.LatLng(lat, lng)

      map.setCenter(center)
      clearMarkers()

      const searchMarker = new window.kakao.maps.Marker({
        position: center,
        map,
        title: keyword
      })
      markersRef.current.push(searchMarker)

      places.keywordSearch('CU', (cuResults: any[], cuStatus: string) => {
        try {
          if (cuStatus !== window.kakao.maps.services.Status.OK) {
            setMarts([])
            setProducts([])
            return
          }

          const cuList: Mart[] = cuResults.map((r: any, i: number) => ({
            id: i,
            name: r.place_name,
            address: r.road_address_name || r.address_name,
            latitude: parseFloat(r.y),
            longitude: parseFloat(r.x)
          }))

          setMarts(cuList)

          cuList.forEach(cu => {
            const pos = new window.kakao.maps.LatLng(cu.latitude, cu.longitude)
            const marker = new window.kakao.maps.Marker({
              position: pos,
              map,
              title: cu.name
            })
            markersRef.current.push(marker)

            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="padding:5px;font-size:12px;white-space:nowrap">${cu.address}</div>`
            })

            window.kakao.maps.event.addListener(marker, 'mouseover', () => infowindow.open(map, marker))
            window.kakao.maps.event.addListener(marker, 'mouseout', () => infowindow.close())
            window.kakao.maps.event.addListener(marker, 'click', () => {
              selectCuWithProducts(cu)
            })
          })

          if (cuList.length > 0) {
            selectCuWithProducts(cuList[0])
          }
        } catch (e) {
          console.error('CU 검색 콜백 에러:', e)
        }
      }, {
        location: center,
        radius: 1000
      })
    })
  }

  const filtered = activeTab === 'all'
    ? products
    : products.filter(p => p.eventType === activeTab)

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <div style={{ display: 'flex', padding: '12px 16px', gap: '8px', borderBottom: '1px solid #ddd' }}>
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchAddress()}
          placeholder="주소 또는 장소를 입력하세요 (예: 서울시청)"
          style={{ flex: 1, padding: '10px 14px', fontSize: '15px', border: '1px solid #ccc', borderRadius: '6px' }}
        />
        <button
          onClick={searchAddress}
          style={{ padding: '10px 20px', background: '#ffeb3b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          검색
        </button>
      </div>
      <div style={{ display: 'flex', flex: 1 }}>
        <div ref={mapRef} style={{ flex: 1 }} />
        <div style={{ width: '300px', overflowY: 'auto', padding: '16px', borderLeft: '1px solid #ddd' }}>
          {marts.length > 0 && (
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              주변 CU 편의점 {marts.length}곳
            </div>
          )}
          <h2 style={{ fontSize: '16px' }}>
            {selectedCu ? selectedCu.name : 'CU 행사 상품'}
            {' '}({filtered.length}개)
          </h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {(['all', '1+1', '2+1'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '6px',
                  cursor: 'pointer', fontWeight: activeTab === tab ? 'bold' : 'normal',
                  background: activeTab === tab ? '#ffeb3b' : '#fff'
                }}
              >
                {tab === 'all' ? '전체' : tab}
              </button>
            ))}
          </div>
          {filtered.map(p => (
            <div key={p.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0', display: 'flex', gap: '12px' }}>
              {p.imageUrl && (
                <img src={p.imageUrl} alt={p.name}
                  style={{ width: '80px', height: '80px', objectFit: 'contain', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <div>
                <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                <div>{p.price.toLocaleString()}원</div>
                <div style={{ color: 'red', fontSize: '12px' }}>{p.eventType}</div>
                {p.stock != null && (
                  <div style={{ fontSize: '12px', color: p.stock > 10 ? '#2e7d32' : '#d32f2f' }}>
                    재고 {p.stock}개
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
