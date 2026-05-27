-- 1. 상품 카탈로그 테이블 생성
CREATE TABLE IF NOT EXISTS catalog_product (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    event_type VARCHAR(10) NOT NULL,
    image_url VARCHAR(500)
);

-- 2. 기존 상품으로 카탈로그 채우기 (중복 제거)
INSERT INTO catalog_product (name, price, event_type, image_url)
SELECT DISTINCT name, price, event_type, image_url FROM product;

-- 3. 각 매장이 1+1과 2+1을 골고루 갖도록 재분배
UPDATE product SET mart_id = ((id - 1) % 5) + 1;
