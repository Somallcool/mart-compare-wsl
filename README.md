# Mart-Compare-wsl 프로젝트 분석 보고서

## 작업 환경

| 항목 | 내용 |
|------|------|
| **프로젝트명** | Mart Compare (CU 편의점 행사상품 비교 서비스) |
| **OS** | Windows (WSL2 Ubuntu) + IntelliJ IDEA |
| **프론트엔드** | React 19 + TypeScript 6 + Vite 8 + Kakao Map SDK |
| **백엔드** | Spring Boot 3.5 + Java 17 + Gradle + JPA |
| **DB** | MySQL 8 (로컬: `mart_compare`, charset: `utf8mb4`) |
| **크롤러** | Python 3 + requests + BeautifulSoup4 + Pandas |
| **Git 커밋** | 8개 (`7b035d2` ~ `64ef3b9`) |
| **포트** | Backend `8081`, Frontend `5173` |
| **문서** | `docs/` — 15개 마크다운 파일로 전체 개발 과정 기록 |

---

## 1. 어떤 사이트인가?

**CU 편의점의 1+1 / 2+1 행사상품을 지도 기반으로 조회하는 풀스택 웹 애플리케이션**이다.

사용자가 주소를 검색하면:
- 해당 위치를 중심으로 **카카오 지도**가 이동
- 주변 **CU 편의점 마커**가 표시됨
- 마커를 클릭하면 해당 지점의 **행사상품 목록(1+1/2+1)** 과 **재고**를 사이드바에서 확인 가능
- 상품은 행사 유형별로 **필터링** 가능

실제 CU 편의점 5곳이 DB에 시드 데이터로 등록되어 있고, 그 외 지역은 **동적 매장 생성(find-or-create)** 방식으로 Kakao Places API로 찾은 모든 CU 매장을 지원한다.

---

## 2. 주요 기능

### 2.1 데이터 수집 — 크롤러 (`crawler/`)

CU 공식 쇼핑몰의 `plusAjax.do` Ajax 엔드포인트에 POST 요청을 보내 HTML을 받아와 파싱한다.

| 파일 | 역할 |
|------|------|
| `cu_crawler.py` | requests + BeautifulSoup으로 1+1(40개) + 2+1(40개) = 80개 상품 수집, CSV 저장 + 이미지 다운로드 |
| `db_insert.py` | CSV를 읽어 MySQL `product` 테이블에 INSERT (`mart_id=1`) |
| `cu_products.csv` | 수집된 80개 상품 데이터 |
| `images/` | 80개 상품 이미지 파일 |
| `requirements.txt` | requests, beautifulsoup4, pandas, pymysql, selenium (미사용) |

**수집 항목:** 상품명(`div.name p`), 가격(`div.price strong`), 행사종류(`div.badge span`), 이미지URL(`.prod_img img[src]`)

### 2.2 데이터베이스 — MySQL (`mysql/`)

| 파일 | 역할 |
|------|------|
| `mart, product table create.sql` | DB + 테이블 생성 (`mart`, `product`), `image_url` 컬럼 추가 |
| `insert_cu_stores.sql` | CU 서울시청점 외 5개 매장 시드 데이터 + 상품 매장 분배 |
| `add_stock_column.sql` | `product` 테이블에 `stock` 컬럼 추가 + 랜덤 재고(3~50) 할당 |
| `catalog_and_redistribute.sql` | `catalog_product` 마스터 테이블 생성 + 모듈로 연산으로 1+1/2+1 골고루 분배 |

#### ERD

```
mart                         product                        catalog_product
┌──────────────┐            ┌─────────────────────┐        ┌──────────────────┐
│ id (PK)      │←──FK──────│ mart_id              │        │ id (PK)          │
│ name         │            │ id (PK)              │        │ name             │
│ address      │            │ name                 │        │ price            │
│ latitude     │            │ price                │        │ event_type       │
│ longitude    │            │ event_type           │        │ image_url        │
└──────────────┘            │ image_url            │        └──────────────────┘
                            │ stock                │
                            └─────────────────────┘
```

### 2.3 REST API — Spring Boot (`backend/`)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/products` | 전체 상품 조회 |
| `GET` | `/api/products?martId=X` | 특정 매장의 상품 조회 |
| `GET` | `/api/marts/nearby?lat=&lng=&radius=` | Haversine 공식으로 주변 CU 매장 검색 |
| `POST` | `/api/marts` | find-or-create: 100m 이내 기존 매장 반환 or 새 매장 생성 + 카탈로그 복제 |

#### 백엔드 계층 구조

```
controller/
├── MartController.java      # GET /nearby, POST / (find-or-create)
└── ProductController.java   # GET /products (전체 or martId 필터)

service/
├── MartService.java         # findOrCreate: 기존 매장 확인 → 없으면 생성 + catalog 복제
└── ProductService.java      # getAllProducts / getProductsByMartId

entity/
├── Mart.java                # @Entity(name="mart") — id, name, address, lat, lng
├── Product.java             # @Entity(name="product") — id, mart_id, name, price, event_type, image_url, stock
└── CatalogProduct.java      # @Entity(name="catalog_product") — 상품 마스터 (매장 공유)

repository/
├── MartRepository.java      # findNearbyCUs (Haversine + WHERE name='CU'), findNearby (no name filter)
├── ProductRepository.java   # findByMartId
└── CatalogProductRepository.java  # 기본 CRUD
```

### 2.4 프론트엔드 — React + Kakao Map (`frontend/`)

`App.tsx` (231줄, 단일 컴포넌트)에 모든 로직이 집중되어 있다.

| 상태 | 타입 | 설명 |
|------|------|------|
| `map` | `kakao.maps.Map` | 지도 인스턴스 |
| `keyword` | `string` | 검색어 |
| `marts` | `Mart[]` | Kakao Places로 찾은 주변 CU 목록 |
| `products` | `Product[]` | 선택된 매장의 상품 목록 |
| `selectedCu` | `Mart \| null` | 현재 선택된 CU 매장 |
| `activeTab` | `'all' \| '1+1' \| '2+1'` | 행사 필터 탭 |
| `markersRef` | `kakao.maps.Marker[]` | 지도 위 마커 참조 배열 |

**데이터 흐름:**
```
검색창 → Kakao Places.keywordSearch(키워드)
  → 지도 이동 + 검색 위치 마커
  → Kakao Places.keywordSearch('CU', { location, radius: 1000 })
    → CU 마커 표시 (호버 시 InfoWindow 주소, 클릭 시 상품 로딩)
    → 첫 번째 CU 자동 선택
      → POST /api/marts (find-or-create)
        → GET /api/products?martId=X
          → 사이드바에 상품 리스트 + 재고 표시
```

---

## 3. 기술 선택 이유

### 3.1 Selenium → requests + BeautifulSoup으로 변경

**`mart-compare` 버전에서는 Selenium을 사용했지만, `mart-compare-wsl`에서는 requests + BeautifulSoup으로 개선되었다.**

- CU 사이트는 실제로 서버 사이드 렌더링(SSR) 방식으로, `plusAjax.do`에 POST 요청을 보내면 HTML이 통째로 응답 온다
- 즉 **JavaScript 실행이 필요 없으므로** 무거운 Selenium(ChromeDriver 필요) 대신 가벼운 requests/BeautifulSoup으로 충분
- 크롤링 속도 10배 이상 향상, 의존성 경량화

### 3.2 Kakao Places API 실시간 검색 (DB 기반 → API 기반)

**초기:** DB에 5개 CU 매장을 박아두고 Haversine 쿼리로 검색
**최종:** Kakao Places API `keywordSearch('CU')`로 실시간 검색

- DB 기반은 "서울시청 근처"에서만 동작하고 다른 위치는 검색 불가능
- Kakao Places API는 **전국 모든 CU 매장**을 실시간으로 제공
- DB 조회 없이 Kakao가 직접 반환하므로 매장 데이터 유지보수가 필요 없음

### 3.3 find-or-create 패턴 (동적 매장 생성)

Kakao Places로 찾은 매장이 DB에 없으면 상품을 조회할 수 없음 → `POST /api/marts`로 최초 접근 시점에 동적 생성

- 100m 이내 중복 체크로 동일 매장 중복 생성 방지
- `catalog_product` 마스터 테이블에서 80개 상품을 복제 + 랜덤 재고 할당
- `@Transactional`로 묶어 80개 INSERT 원자성 보장

### 3.4 catalog_product 도입 (1+1/2+1 혼합 분배 문제 해결)

**문제:** ID 순서(1~40 1+1, 41~80 2+1)로 저장된 상품을 ID 범위로 매장에 분배하면 각 매장이 한 가지 행사 유형만 가지게 됨

**해결:** 마스터 테이블 `catalog_product`를 만들고, `MOD` 연산으로 모든 매장이 1+1과 2+1을 골고루 갖도록 재분배

```sql
UPDATE product SET mart_id = ((id - 1) % 5) + 1;
-- ID 1→mart1, 2→mart2, ..., 5→mart5, 6→mart1 (반복)
```

---

## 4. 주니어 개발자가 겪기 쉬운 문제와 해결 방법

### 4.1 2+1 상품이 전혀 보이지 않는 버그

**원인:** CSV 상품이 1+1 40개(ID 1~40) → 2+1 40개(ID 41~80) 순서로 저장되었고, `WHERE id BETWEEN 1 AND 16` 식으로 매장 분배 시 각 매장이 한 가지 행사 유형만 가지게 됨 (mart 1, 2는 1+1만 / mart 3, 4, 5는 2+1만 보유)

**해결:** `catalog_product` 마스터 테이블 생성 + `MOD` 연산 재분배로 각 매장이 1+1 8개 + 2+1 8개 = 16개씩 골고루 보유하도록 수정

### 4.2 Kakao Maps SDK와 React 라이프사이클 불일치

**원인:** `<script>` 태그로 SDK를 로드하는 시점(비동기)과 React 컴포넌트 마운트 시점이 달라 지도 객체 생성 실패

**해결:**
1. `autoload=false` 파라미터로 SDK 자동 로딩 차단
2. `script.onload` → `kakao.maps.load()` 콜백 체인으로 로딩 완료 보장
3. `useRef`로 DOM 참조 유지, null 체크 후 지도 생성

### 4.3 CORS 에러

**원인:** Vite(`:5173`) → Spring Boot(`:8081`)跨 출처 요청

**해결:** `CorsConfig.java`에서 특정 Origin(`http://localhost:5173`)만 허용

### 4.4 Kakao Places API의 try-catch 미처리로 인한 무응답

**원인:** `places.keywordSearch()` 콜백 내부에서 예외가 발생하면 아무 일도 일어나지 않고 UI가 빈 상태로 멈춤

**해결:** 콜백 전체를 `try-catch`로 감싸고, 오류 시 `setMarts([])`, `setProducts([])`로 UI 초기화

### 4.5 동적 매장 생성 시 findNearby가 매장을 못 찾음

**원인:** `findNearbyCUs()` 쿼리에 `WHERE m.name = 'CU'` 조건이 있어, 이름이 "CU 수원역점"인 동적 생성 매장이 검색되지 않음

**해결:** 이름 조건이 없는 `findNearby()` 네이티브 쿼리를 별도 추가

### 4.6 엔티티에 Setter 없어서 객체 생성 불가

**원인:** 초기 엔티티는 `@Getter`만 있어 새 Mart/Product 객체 생성 후 필드 설정 불가

**해결:** `@Setter` + `import lombok.Setter` 추가

### 4.7 크롤러 이미지 URL이 `//`로 시작하는 문제

**원인:** CU 사이트의 `img[src]`가 `//cdn...` 형태의 프로토콜 상대 경로

**해결:** `"https:" + src if src.startswith("//") else src`로 https: prefix 추가

### 4.8 한글 CSV Excel에서 깨짐

**원인:** UTF-8로 저장 시 Excel이 BOM 없이 UTF-8을 인식 못 함

**해결:** `encoding="utf-8-sig"` (BOM 추가)로 CSV 저장

### 4.9 마커 중복 생성으로 인한 메모리 누수

**원인:** 검색할 때마다 새 마커를 생성하고 이전 마커는 지도에 그대로 남음

**해결:** `clearMarkers()` 함수로 `markersRef.current`의 모든 마커를 `setMap(null)` 처리 후 재생성

### 4.10 fetch 실패 시 아무 일도 안 일어남

**원인:** `.catch()`가 없거나 `res.ok` 체크가 없어서 API 오류를 감지 못 함

**해결:** `.catch(() => setProducts([]))`와 `res.ok` 체크 추가 및 오류 시 UI 초기화

---

## 5. 프로젝트 구조

```
mart-compare/
├── crawler/
│   ├── cu_crawler.py          # 크롤러 (requests + BS4)
│   ├── db_insert.py           # CSV → MySQL 적재
│   ├── cu_products.csv        # 80개 상품 데이터
│   ├── requirements.txt       # Python 의존성
│   └── images/                # 80개 상품 이미지
├── mysql/
│   ├── mart, product table create.sql  # 스키마 생성
│   ├── insert_cu_stores.sql            # CU 5개 매장 시드
│   ├── add_stock_column.sql            # stock 컬럼 추가
│   └── catalog_and_redistribute.sql    # 카탈로그 + 재분배
├── backend/
│   └── src/main/java/com/martcompare/backend/
│       ├── BackendApplication.java
│       ├── config/CorsConfig.java
│       ├── entity/{Mart,Product,CatalogProduct}.java
│       ├── repository/{Mart,Product,CatalogProduct}Repository.java
│       ├── service/{Mart,Product}Service.java
│       └── controller/{Mart,Product}Controller.java
├── frontend/
│   ├── src/
│   │   ├── App.tsx (231줄)     # 모든 UI + 로직
│   │   └── main.tsx            # React 진입점
│   ├── .env                    # Kakao Map API 키
│   ├── package.json
│   └── vite.config.ts
└── docs/                       # 15개 문서로 개발 과정 기록
    ├── 00.check-projects.md
    ├── 01.filter-tabs.md
    ├── 02.address-search.md
    ├── 03.cu-real-time-search.md
    ├── 04.2plus1-fix-and-redistribution.md
    ├── 05.dynamic-mart-creation.md
    ├── 06.feature-crawler.md
    ├── 07.feature-database.md
    ├── 08.feature-backend-api.md
    ├── 09.feature-frontend-map.md
    ├── 10.feature-search-and-markers.md
    ├── 11.feature-product-list-and-filter.md
    ├── 12.feature-stock-system.md
    ├── 13.feature-dynamic-store-creation.md
    └── 14.project-overview-and-guide.md
```

---

## 6. 알려진 이슈 및 한계

### 버그
1. **`insert_cu_stores.sql` UPDATE 문 2번 중복** — 무해하지만 정리 필요
2. **최초 검색 시 중복 API 호출** — 첫 번째 CU 자동 선택 + 마커 클릭 이벤트 중복 실행
3. **Zone.Identifier 파일 다수** — Windows ADS 파일이 backend에 13개 존재

### 한계
1. **재고는 랜덤 값** (3~50) — CU는 실시간 재고 공개 API를 제공하지 않음
2. **크롤러 pageIndex=1 고정** — CU 사이트에 더 많은 상품이 있어도 누락
3. **단일 컴포넌트(App.tsx 231줄)** — 분할 필요 (SearchBar, MapView, ProductList 등)
4. **DTO/유효성 검사 없음** — 엔티티 직접 반환, `Map<String, Object>`로 입력 수신
5. **Docker 없음** — 모든 서비스 로컬 수동 실행
6. **CORS localhost 고정** — 운영 배포 시 수정 필요

### 향후 개선
- [ ] GS25, 세븐일레븐 등 타 편의점 크롤러 추가
- [ ] Docker / docker-compose 도입
- [ ] 상품 검색 기능
- [ ] 가격 비교 (동일 상품 다른 편의점 간)
- [ ] 컴포넌트 분할
- [ ] 로딩 스피너 / Skeleton UI
- [ ] 마커 클러스터링
- [ ] Pagination
- [ ] API 버저닝
