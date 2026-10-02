require('dotenv').config();

const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 8081;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// 1. OpenWeather에서 사용할 도시 목록
// -----------------------------------------------------------------------------
const TARGET_CITIES = {
  seoul: { query: 'Seoul,KR', name: '서울' },
  busan: { query: 'Busan,KR', name: '부산' },
  jeju: { query: 'Jeju,KR', name: '제주' },
  gwangju: { query: 'Gwangju,KR', name: '광주' }
};

// -----------------------------------------------------------------------------
// 2. MySQL Connection Pool
//    여러 요청이 들어와도 매번 연결을 새로 만드는 대신 연결 풀을 사용합니다.
// -----------------------------------------------------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'weatherNewsDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

function getApiKey() {
  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('.env 파일에 OPENWEATHER_API_KEY를 설정하세요.');
  }
  return apiKey;
}

function normalizeCity(cityKey) {
  const key = String(cityKey || 'seoul').toLowerCase();
  if (!TARGET_CITIES[key]) {
    const error = new Error('city는 seoul, busan, jeju, gwangju 중 하나여야 합니다.');
    error.statusCode = 400;
    throw error;
  }
  return { key, ...TARGET_CITIES[key] };
}

function formatWeatherData(cityKey, cityInfo, data) {
  return {
    cityCode: cityKey,
    regionName: cityInfo.name,
    cityName: data.name,
    temperature: data.main.temp,
    feelsLike: data.main.feels_like,
    humidity: data.main.humidity,
    windSpeed: data.wind.speed,
    description: data.weather[0]?.description || '정보 없음',
    icon: data.weather[0]?.icon || '01d',
    observedAt: data.dt || null
  };
}

async function fetchWeather(cityKey) {
  const cityInfo = normalizeCity(cityKey);
  const apiKey = getApiKey();

  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('q', cityInfo.query);
  url.searchParams.set('appid', apiKey);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('lang', 'kr');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenWeather 응답 오류: HTTP ${response.status}`);
  }

  const data = await response.json();
  return formatWeatherData(cityInfo.key, cityInfo, data);
}

// -----------------------------------------------------------------------------
// 3. 서버 상태 확인
// -----------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ success: true, mysql: rows[0].ok === 1 });
  } catch (error) {
    res.status(503).json({ success: false, error: 'MySQL 연결을 확인하세요.' });
  }
});

// -----------------------------------------------------------------------------
// 4. 기존 OpenWeather 조회
//    DB에는 저장하지 않고 API 결과만 확인합니다.
// -----------------------------------------------------------------------------
app.get('/api/weather', async (req, res) => {
  try {
    const data = await fetchWeather(req.query.city || 'seoul');
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// 5. OpenWeather → MySQL 저장
//    weather_observation INSERT 후 news_article INSERT
//    두 테이블은 weather_id로 관계를 맺습니다.
// -----------------------------------------------------------------------------
app.post('/api/weather/collect', async (req, res) => {
  let connection;

  try {
    const weather = await fetchWeather(req.query.city || 'seoul');
    connection = await pool.getConnection();

    // 두 INSERT가 하나의 작업처럼 성공/실패하도록 트랜잭션 사용
    await connection.beginTransaction();

    const observedAt = weather.observedAt
      ? new Date(weather.observedAt * 1000)
      : null;

    const [weatherResult] = await connection.execute(
      `INSERT INTO weather_observation
       (city_code, region_name, temperature, feels_like,
        humidity, wind_speed, description, observed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        weather.cityCode,
        weather.regionName,
        weather.temperature,
        weather.feelsLike,
        weather.humidity,
        weather.windSpeed,
        weather.description,
        observedAt
      ]
    );

    const weatherId = weatherResult.insertId;

    // 실습용 기사 초안: 방금 수집한 데이터 값만 사용합니다.
    const title = `${weather.regionName} 현재 ${weather.description}, 기온 ${weather.temperature}℃`;
    const leadText = `${weather.regionName}의 현재 기온은 ${weather.temperature}℃, 습도는 ${weather.humidity}%, 풍속은 ${weather.windSpeed}m/s입니다.`;

    const [articleResult] = await connection.execute(
      `INSERT INTO news_article
       (weather_id, title, lead_text, status)
       VALUES (?, ?, ?, 'DRAFT')`,
      [weatherId, title, leadText]
    );

    await connection.commit();

    res.json({
      success: true,
      message: '날씨 데이터와 기사 초안을 MySQL에 저장했습니다.',
      weatherId,
      articleId: articleResult.insertId,
      weather,
      article: {
        title,
        leadText,
        status: 'DRAFT'
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// -----------------------------------------------------------------------------
// 6. INNER JOIN
//    weather_observation + news_article
// -----------------------------------------------------------------------------
app.get('/api/db/join', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         a.article_id,
         w.weather_id,
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
       LIMIT 100`
    );

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// 7. JOIN + GROUP BY + 집계 함수
// -----------------------------------------------------------------------------
app.get('/api/db/summary', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
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
       ORDER BY avg_temperature DESC`
    );

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// 8. 풍속 TOP 5
// -----------------------------------------------------------------------------
app.get('/api/db/wind-top5', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         region_name,
         temperature,
         humidity,
         wind_speed,
         description,
         observed_at
       FROM weather_observation
       ORDER BY wind_speed DESC
       LIMIT 5`
    );

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// 9. 기사 1개의 근거 데이터 추적
// -----------------------------------------------------------------------------
app.get('/api/articles/:articleId/source', async (req, res) => {
  try {
    const articleId = Number(req.params.articleId);
    if (!Number.isInteger(articleId) || articleId <= 0) {
      return res.status(400).json({ success: false, error: '올바른 articleId를 입력하세요.' });
    }

    const [rows] = await pool.execute(
      `SELECT
         a.article_id,
         a.title,
         a.status,
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
       WHERE a.article_id = ?`,
      [articleId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '기사를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(' OpenWeather + Node.js + MySQL 학습 서버 실행');
  console.log(` http://localhost:${PORT}`);
  console.log('====================================================');
});
