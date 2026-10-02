-- =========================================================
-- OpenWeather + Node.js + MySQL 학습용 SQL
-- 목표: 여러 Table → 관계 → JOIN → 집계 → 분석
-- =========================================================

CREATE DATABASE IF NOT EXISTS weatherNewsDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE weatherNewsDB;

-- 1. 기상 관측 데이터
CREATE TABLE IF NOT EXISTS weather_observation (
    weather_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    city_code VARCHAR(20) NOT NULL,
    region_name VARCHAR(30) NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    feels_like DECIMAL(5,2),
    humidity INT,
    wind_speed DECIMAL(6,2),
    description VARCHAR(100),
    observed_at DATETIME,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 기사 초안 데이터
CREATE TABLE IF NOT EXISTS news_article (
    article_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    weather_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    lead_text TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_news_weather
      FOREIGN KEY (weather_id)
      REFERENCES weather_observation(weather_id)
      ON DELETE CASCADE
);

-- 3. 각각의 테이블 확인
SELECT * FROM weather_observation ORDER BY weather_id DESC;
SELECT * FROM news_article ORDER BY article_id DESC;

-- 4. INNER JOIN
SELECT
    a.article_id,
    w.region_name,
    w.temperature,
    w.humidity,
    w.wind_speed,
    w.description,
    a.title,
    a.status,
    w.observed_at
FROM weather_observation AS w
INNER JOIN news_article AS a
    ON w.weather_id = a.weather_id
ORDER BY a.article_id DESC;

-- 5. 지역별 집계
SELECT
    w.region_name,
    COUNT(DISTINCT w.weather_id) AS observation_count,
    COUNT(a.article_id) AS article_count,
    ROUND(AVG(w.temperature), 1) AS avg_temperature,
    MAX(w.temperature) AS max_temperature,
    MIN(w.temperature) AS min_temperature,
    ROUND(AVG(w.humidity), 1) AS avg_humidity
FROM weather_observation AS w
LEFT JOIN news_article AS a
    ON w.weather_id = a.weather_id
GROUP BY w.region_name
ORDER BY avg_temperature DESC;

-- 6. 풍속 TOP 5
SELECT
    region_name,
    temperature,
    wind_speed,
    description,
    observed_at
FROM weather_observation
ORDER BY wind_speed DESC
LIMIT 5;

-- 7. 기사 생산 현황
SELECT
    w.region_name,
    a.status,
    COUNT(*) AS article_count
FROM weather_observation AS w
INNER JOIN news_article AS a
    ON w.weather_id = a.weather_id
GROUP BY w.region_name, a.status
ORDER BY w.region_name, a.status;

-- 8. 특정 기사의 근거 데이터 추적
SELECT
    a.article_id,
    a.title,
    w.weather_id,
    w.region_name,
    w.temperature,
    w.humidity,
    w.wind_speed,
    w.description,
    w.observed_at
FROM news_article AS a
INNER JOIN weather_observation AS w
    ON a.weather_id = w.weather_id
WHERE a.article_id = 1;

-- [선택] 초기화
-- DELETE FROM news_article;
-- DELETE FROM weather_observation;
-- DROP TABLE IF EXISTS news_article;
-- DROP TABLE IF EXISTS weather_observation;
-- DROP DATABASE IF EXISTS weatherNewsDB;
