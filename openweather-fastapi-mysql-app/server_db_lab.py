"""OpenWeather + MySQL JOIN/집계/분석 실습용 FastAPI 예제.

기존 /api/weather 는 그대로 유지하고,
아래 3개 API를 추가하여 DB 실습과 연결합니다.

POST /api/weather/collect?city=seoul
GET  /api/db/join
GET  /api/db/summary
"""
import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

import httpx
import pymysql
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env")

CITIES = {
    "seoul": ("Seoul,KR", "서울"),
    "busan": ("Busan,KR", "부산"),
    "jeju": ("Jeju,KR", "제주"),
    "gwangju": ("Gwangju,KR", "광주"),
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(timeout=10.0) as client:
        app.state.weather_client = client
        yield


app = FastAPI(title="OpenWeather + MySQL 데이터 분석 실습", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=BASE / "public"), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(BASE / "public" / "index.html")


def get_db():
    """MySQL 연결 정보를 .env에서 읽습니다."""
    try:
        return pymysql.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "weatherNewsDB"),
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False,
        )
    except Exception as exc:
        raise HTTPException(
            503,
            detail="MySQL 연결 실패: .env의 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME을 확인하세요.",
        ) from exc


async def get_weather(city: str, client: httpx.AsyncClient) -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY", "").strip()
    if not api_key or api_key == "your_api_key_here":
        raise HTTPException(503, detail=".env에 OPENWEATHER_API_KEY를 설정하세요.")

    query, korean_name = CITIES[city]
    try:
        response = await client.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": query, "appid": api_key, "units": "metric", "lang": "kr"},
        )
    except httpx.RequestError:
        raise HTTPException(502, detail="날씨 서비스에 연결하지 못했습니다.") from None

    if response.status_code != 200:
        raise HTTPException(502, detail=f"날씨 서비스 응답 오류 ({response.status_code})")

    data = response.json()
    try:
        return {
            "cityCode": city,
            "regionName": korean_name,
            "cityName": data["name"],
            "temperature": data["main"]["temp"],
            "feelsLike": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "windSpeed": data["wind"]["speed"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "observedAt": data.get("dt"),
        }
    except (KeyError, IndexError, TypeError):
        raise HTTPException(502, detail="날씨 응답 형식을 확인할 수 없습니다.") from None


@app.get("/api/weather")
async def weather(city: str = Query("seoul", pattern="^(seoul|busan|jeju|gwangju)$")):
    """기존 OpenWeather 조회 실습."""
    return {"success": True, "data": await get_weather(city, app.state.weather_client)}


@app.post("/api/weather/collect")
async def collect_weather(
    city: str = Query("seoul", pattern="^(seoul|busan|jeju|gwangju)$")
):
    """OpenWeather 조회 → weather_observation 저장 → 기사 초안 저장."""
    item = await get_weather(city, app.state.weather_client)

    observed_at = None
    if item["observedAt"]:
        observed_at = datetime.fromtimestamp(item["observedAt"])

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO weather_observation
                (city_code, region_name, temperature, feels_like,
                 humidity, wind_speed, description, observed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    item["cityCode"],
                    item["regionName"],
                    item["temperature"],
                    item["feelsLike"],
                    item["humidity"],
                    item["windSpeed"],
                    item["description"],
                    observed_at,
                ),
            )
            weather_id = cursor.lastrowid

            # 외부 사실을 추가하지 않고 방금 수집한 데이터만 사용한 실습용 기사 초안
            title = (
                f"{item['regionName']} 현재 {item['description']}, "
                f"기온 {item['temperature']}℃"
            )
            lead = (
                f"{item['regionName']}의 현재 기온은 {item['temperature']}℃, "
                f"습도는 {item['humidity']}%, 풍속은 {item['windSpeed']}m/s입니다. "
                "OpenWeather에서 수집한 관측값을 바탕으로 만든 실습용 기사 초안입니다."
            )

            cursor.execute(
                """
                INSERT INTO news_article
                (weather_id, title, lead_text, status)
                VALUES (%s, %s, %s, 'DRAFT')
                """,
                (weather_id, title, lead),
            )
            article_id = cursor.lastrowid

        conn.commit()
        return {
            "success": True,
            "message": "날씨 데이터와 기사 초안을 DB에 저장했습니다.",
            "weatherId": weather_id,
            "articleId": article_id,
            "weather": item,
            "article": {"title": title, "lead": lead, "status": "DRAFT"},
        }
    except Exception as exc:
        conn.rollback()
        raise HTTPException(500, detail="DB 저장 중 오류가 발생했습니다.") from exc
    finally:
        conn.close()


@app.get("/api/db/join")
def db_join():
    """두 테이블의 관계를 INNER JOIN으로 확인합니다."""
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
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
                ORDER BY a.article_id DESC
                LIMIT 100
                """
            )
            rows = cursor.fetchall()
        return {"success": True, "count": len(rows), "data": rows}
    finally:
        conn.close()


@app.get("/api/db/summary")
def db_summary():
    """JOIN + GROUP BY + COUNT + AVG + MAX + MIN 집계 결과."""
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
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
                ORDER BY avg_temperature DESC
                """
            )
            rows = cursor.fetchall()
        return {"success": True, "count": len(rows), "data": rows}
    finally:
        conn.close()
