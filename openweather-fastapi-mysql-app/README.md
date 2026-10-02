# OpenWeather + FastAPI + MySQL 실습

OpenWeather API에서 날씨 데이터를 가져오고, FastAPI 서버를 통해 MySQL에 저장한 뒤  
`JOIN`, `GROUP BY`, `COUNT`, `AVG`, `MAX`, `MIN`을 사용해 분석하는 학습용 프로젝트입니다.

## 학습 목표

```text
OpenWeather API
      ↓
FastAPI
      ↓
MySQL
      ↓
weather_observation
      ↓
news_article
      ↓
JOIN
      ↓
GROUP BY / 집계
      ↓
분석 결과
```

기존의 `userTBL ↔ buyTBL` 관계 실습을 실제 기상 데이터와 기사 데이터로 확장합니다.

---

## 프로젝트 구조

```text
openweather-fastapi-mysql-app/
├─ public/
│  └─ index.html
├─ .env.example
├─ requirements.txt
├─ server_db_lab.py
├─ README.md
└─ README_DB_LAB.md
```

- `server_db_lab.py` : FastAPI 서버, OpenWeather 조회, MySQL 저장 및 분석 API
- `public/index.html` : 날씨 수집, JOIN, 집계 결과 확인 화면
- `.env.example` : OpenWeather API Key와 MySQL 접속 정보 예시
- `requirements.txt` : Python 패키지 목록

---

# 1. MySQL 데이터베이스 준비

MySQL Workbench에서 다음 SQL을 실행합니다.

```sql
CREATE DATABASE IF NOT EXISTS weatherNewsDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE weatherNewsDB;

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
```

관계:

```text
weather_observation.weather_id (PK)
              ↓ 1:N
news_article.weather_id (FK)
```

---

# 2. 환경 변수 설정

```powershell
Copy-Item .env.example .env
```

`.env` 예시:

```env
OPENWEATHER_API_KEY=본인의_OpenWeather_API_KEY
PORT=8000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=본인의_MySQL_비밀번호
DB_NAME=weatherNewsDB
```

> `.env`에는 API Key와 DB 비밀번호가 있으므로 GitHub에 올리지 않습니다.

---

# 3. 가상환경 및 패키지 설치

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

# 4. 서버 실행

```powershell
uvicorn server_db_lab:app --reload
```

브라우저:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

# 5. API 실습

현재 날씨 조회:

```http
GET /api/weather?city=seoul
```

OpenWeather 데이터와 기사 초안 저장:

```http
POST /api/weather/collect?city=seoul
```

두 테이블 JOIN:

```http
GET /api/db/join
```

지역별 집계·분석:

```http
GET /api/db/summary
```

사용 가능한 도시:

```text
seoul
busan
jeju
gwangju
```

---

# 6. 핵심 JOIN SQL

```sql
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
```

핵심 조건:

```sql
ON w.weather_id = a.weather_id
```

같은 `weather_id`를 가진 기상 데이터와 기사를 연결합니다.

---

# 7. 지역별 집계·분석 SQL

```sql
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
```

| SQL | 의미 |
|---|---|
| `JOIN` | 여러 테이블 연결 |
| `GROUP BY` | 같은 지역끼리 묶기 |
| `COUNT()` | 데이터 개수 |
| `AVG()` | 평균 |
| `MAX()` | 최댓값 |
| `MIN()` | 최솟값 |
| `ORDER BY` | 결과 정렬 |

---

# 8. 추가 분석 SQL

평균 기온이 높은 지역:

```sql
SELECT
    region_name,
    ROUND(AVG(temperature), 1) AS avg_temperature,
    COUNT(*) AS observation_count
FROM weather_observation
GROUP BY region_name
ORDER BY avg_temperature DESC;
```

풍속이 강했던 관측값 TOP 5:

```sql
SELECT
    region_name,
    temperature,
    wind_speed,
    description,
    observed_at
FROM weather_observation
ORDER BY wind_speed DESC
LIMIT 5;
```

---

# 9. 학습 흐름 정리

```text
테이블 1개
→ CRUD

테이블 여러 개
→ 관계

관계
→ PRIMARY KEY / FOREIGN KEY

여러 테이블 연결
→ JOIN

데이터 묶기
→ GROUP BY

집계
→ COUNT / AVG / MAX / MIN

분석
→ 지역 비교 / 특징 발견

분석 결과
→ 기사거리 후보
```

---

# 10. 실습 결과물

다음 화면을 캡처합니다.

1. `weather_observation`, `news_article` 테이블 생성 화면
2. OpenWeather 데이터 저장 결과
3. 두 테이블 JOIN 결과
4. 지역별 GROUP BY + 집계 결과

추가 질문:

- 어떤 지역의 평균 기온이 가장 높은가?
- 어떤 관측값의 풍속이 가장 강한가?
- 지역별 데이터는 몇 건씩 저장되었는가?
- 특정 기사에 사용된 원본 기상 데이터는 무엇인가?

---

## 핵심 개념

> **데이터를 저장하는 것에서 끝나지 않고, 서로 다른 테이블을 관계로 연결하고 집계하여 분석 가능한 정보로 만드는 과정**을 학습합니다.
