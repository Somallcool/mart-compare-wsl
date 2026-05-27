-- 데이터베이스 생성
create database mart_compare 
	default character set utf8mb4
	default collate utf8mb4_unicode_ci;

-- 생성 확인
show databases;

-- mart_compare 데이터베이스 사용
use mart_compare;

-- 편의점 테이블
create table mart (
	id bigint not null auto_increment, 
    name varchar(50) not null comment 'CU', 
    address varchar(200) comment '주소', 
    latitude double comment '위도', 
    longitude double comment '경도', 
    primary key (id)
);

-- 행사 상품 테이블
create table product (
	id bigint not null auto_increment, 
    mart_id bigint not null comment 'CU FK', 
    name varchar(100) not null comment '상품명', 
    price int not null comment '가격', 
    event_type varchar(10) not null comment '1+1 or 2+1', 
    image_url varchar(500) comment '이미지 URL', 
    primary key (id), 
    foreign key (mart_id) references mart (id)
);

-- image_url 컬럼 추가 (기존 테이블이 있는 경우)
alter table product add column image_url varchar(500) comment '이미지 URL';

-- CSV 데이터 DB에 넣기 전에 '편의점 기본 데이터(mart 테이블)를 먼저 넣기
use mart_compare;

insert into mart (name, address, latitude, longitude) values ('CU', null, null, null);

select * from mart;

-- CSV 데이터 잘 들어갔는지 확인하기.
select * from product limit 10;