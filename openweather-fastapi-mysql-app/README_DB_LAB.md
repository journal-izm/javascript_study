# OpenWeather + MySQL JOIN 실습

## 학습 흐름

OpenWeather API
→ FastAPI
→ `weather_observation` 저장
→ `news_article` 저장
→ JOIN
→ GROUP BY / COUNT / AVG / MAX / MIN
→ 분석 결과 확인

## 1. SQL 실행

MySQL Workbench에서 `weather_news_lab.sql`을 실행합니다.

## 2. `.env` 설정

`.env.example`을 참고하여 `.env`에 OpenWeather API Key와 MySQL 접속 정보를 설정합니다.

## 3. 패키지 설치

```powershell
pip install -r requirements.txt
```

## 4. 서버 실행

```powershell
uvicorn server_db_lab:app --reload
```

## 5. 브라우저 / Swagger 실습

- 기존 날씨 조회  
  `GET /api/weather?city=seoul`

- OpenWeather 조회 후 DB 저장  
  `POST /api/weather/collect?city=seoul`

- 두 테이블 JOIN 결과  
  `GET /api/db/join`

- JOIN + GROUP BY 집계 결과  
  `GET /api/db/summary`

Swagger:
`http://127.0.0.1:8000/docs`

## 핵심 질문

1. `weather_observation.weather_id`는 왜 PRIMARY KEY인가?
2. `news_article.weather_id`는 왜 FOREIGN KEY인가?
3. INNER JOIN의 `ON w.weather_id = a.weather_id`는 무엇을 의미하는가?
4. `GROUP BY w.region_name`을 하면 데이터가 어떻게 묶이는가?
5. `AVG`, `MAX`, `MIN`, `COUNT` 결과에서 기사거리 후보를 어떻게 찾을 수 있는가?

## Vercel 주의

로컬 MySQL의 `127.0.0.1`은 Vercel에서 접근할 수 없습니다.
Vercel까지 배포하려면 외부에서 접속 가능한 MySQL DB의 접속 정보를
Vercel Environment Variables에 등록해야 합니다.
