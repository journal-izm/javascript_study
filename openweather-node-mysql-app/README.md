# OpenWeather + Node.js + MySQL 학습 프로젝트

## 학습 목표

이 프로젝트는 기존 `openweather-full-node-app`에서 한 단계 확장하여 아래 흐름을 학습합니다.

```text
OpenWeather API
      ↓
Node.js / Express
      ↓
MySQL
      ↓
여러 Table
      ↓
관계
      ↓
JOIN
      ↓
GROUP BY / 집계
      ↓
분석
```

기존 `userTBL ↔ buyTBL` 관계를 다음 구조로 바꿔 실습합니다.

```text
weather_observation.weather_id
              ↓
news_article.weather_id
```

---

## 프로젝트 구조

```text
openweather-node-mysql-app/
├─ public/
│  └─ index.html
├─ .env.example
├─ .gitignore
├─ package.json
├─ server.js
├─ weather_news_lab.sql
└─ README.md
```

---

## 1. MySQL 준비

MySQL Workbench에서 `weather_news_lab.sql`을 실행합니다.

생성되는 테이블:

- `weather_observation`: OpenWeather에서 수집한 관측 데이터
- `news_article`: 관측값을 근거로 만든 실습용 기사 초안

### 관계

```text
weather_observation
weather_id (PK)
      │
      │ 1 : N
      ▼
news_article
weather_id (FK)
```

---

## 2. 환경변수 설정

`.env.example`을 복사하여 `.env`를 만듭니다.

```env
OPENWEATHER_API_KEY=본인_API_KEY
PORT=8081

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=본인_MySQL_비밀번호
DB_NAME=weatherNewsDB
```

> `.env`는 GitHub에 올리지 않습니다.

---

## 3. 패키지 설치

```powershell
npm install
```

---

## 4. 실행

```powershell
npm start
```

또는 개발 중 자동 재시작:

```powershell
npm run dev
```

브라우저:

```text
http://localhost:8081
```

---

## 5. API 학습 순서

### MySQL 연결 확인

```text
GET /api/health
```

### 날씨만 조회

```text
GET /api/weather?city=seoul
```

### 날씨 조회 + DB 저장

```text
POST /api/weather/collect?city=seoul
POST /api/weather/collect?city=busan
POST /api/weather/collect?city=jeju
POST /api/weather/collect?city=gwangju
```

이 API는 한 번의 요청에서 다음 작업을 수행합니다.

```text
OpenWeather 조회
     ↓
weather_observation INSERT
     ↓
weather_id 생성
     ↓
news_article INSERT
```

### JOIN 결과

```text
GET /api/db/join
```

핵심 SQL:

```sql
FROM weather_observation AS w
INNER JOIN news_article AS a
  ON w.weather_id = a.weather_id
```

### 지역별 집계

```text
GET /api/db/summary
```

사용 개념:

- `LEFT JOIN`
- `GROUP BY`
- `COUNT()`
- `AVG()`
- `MAX()`
- `MIN()`
- `ORDER BY`

### 풍속 TOP 5

```text
GET /api/db/wind-top5
```

### 기사 근거 데이터 추적

```text
GET /api/articles/1/source
```

질문:

> 이 기사는 어떤 기상 데이터를 근거로 작성되었는가?

---

## 6. 학생 확인 포인트

1. `PRIMARY KEY`는 왜 필요한가?
2. `FOREIGN KEY`는 왜 필요한가?
3. `JOIN`의 `ON` 조건은 무엇을 연결하는가?
4. `GROUP BY`를 하면 데이터가 어떻게 묶이는가?
5. `COUNT`, `AVG`, `MAX`, `MIN`은 어떤 질문에 답할 수 있는가?
6. API에서 받은 JSON이 MySQL의 행(Row)으로 어떻게 저장되는가?
7. 기사와 원본 기상 데이터를 다시 연결하면 무엇을 검증할 수 있는가?

---

## 7. 실습 결과물

다음 화면을 캡처합니다.

1. MySQL Workbench의 두 테이블
2. 브라우저에서 OpenWeather 데이터 저장 결과
3. JOIN 결과
4. GROUP BY 집계 결과
5. 기사 근거 데이터 확인 결과

---

## 학습 연결

```text
HTML / JavaScript fetch
        ↓
Node.js / Express
        ↓
OpenWeather API
        ↓
MySQL 저장
        ↓
JOIN
        ↓
GROUP BY
        ↓
데이터 분석
        ↓
기사거리 후보 탐색
```
