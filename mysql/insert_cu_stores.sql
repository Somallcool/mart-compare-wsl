use mart_compare;

-- 기존 mart 데이터 조회 (id=1, 좌표 없는 행 확인)
select * from mart;

-- 기존 행을 실제 CU 서울시청점으로 업데이트
update mart set
    address = '서울 중구 을지로 6',
    latitude = 37.5658,
    longitude = 126.9776
where id = 1;

-- 주변 CU 매장 추가 등록
insert into mart (name, address, latitude, longitude) values
('CU', '서울 종로구 새문안로 103-1',  37.5710, 126.9766),   -- 광화문광장점
('CU', '서울 중구 퇴계로 127',         37.5608, 126.9860),   -- 명동역점
('CU', '서울 중구 충무로 53-1',       37.5662, 126.9820),   -- 을지로3가점
('CU', '서울 종로구 종로 지하 73',    37.5700, 126.9832);   -- 종각쇼핑센터점

-- 등록된 매장 확인
select * from mart;

-- (선택) 기존 80개 상품을 5개 매장에 분배
-- 아래는 예시: 각 매장에 16개씩 할당
update product set mart_id = 1 where id between 1 and 16;
update product set mart_id = 2 where id between 17 and 32;
update product set mart_id = 3 where id between 33 and 48;
update product set mart_id = 4 where id between 49 and 64;
update product set mart_id = 5 where id between 65 and 80;

-- (선택) 기존 80개 상품을 5개 매장에 분배
-- 아래는 예시: 각 매장에 16개씩 할당
update product set mart_id = 1 where id between 1 and 16;
update product set mart_id = 2 where id between 17 and 32;
update product set mart_id = 3 where id between 33 and 48;
update product set mart_id = 4 where id between 49 and 64;
update product set mart_id = 5 where id between 65 and 80;
