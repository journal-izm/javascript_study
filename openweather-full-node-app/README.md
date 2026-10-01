# 🌤️ OpenWeather Full Node App

Node.js를 이용하여 **OpenWeather API에서 날씨 정보를 받아오는 실습 프로젝트**입니다.

이 프로젝트는 JavaScript에서 외부 REST API를 호출하고, Node.js 서버를 통해 데이터를 처리하는 기본적인 흐름을 학습하기 위한 예제입니다.

---

## 📌 프로젝트 소개

이 프로젝트에서는 사용자가 요청한 위치의 날씨 정보를 **OpenWeather API**를 통해 가져옵니다.

전체적인 데이터 흐름은 다음과 같습니다.

```text
사용자
  ↓
웹 브라우저
  ↓
Node.js 서버
  ↓
OpenWeather API
  ↓
날씨 데이터(JSON)
  ↓
Node.js 서버
  ↓
웹 브라우저
```

OpenWeather는 날씨 정보를 API 형태로 제공하며, 도시명이나 위도·경도 등의 위치 정보를 이용해 현재 날씨 데이터를 요청할 수 있습니다.

---

## ✨ 주요 기능

* OpenWeather API 연동
* Node.js 기반 서버 구성
* 외부 REST API 요청
* JSON 형식의 날씨 데이터 처리
* 날씨 API 응답 데이터 활용
* 클라이언트와 서버 간 데이터 통신 학습

---

## 🛠️ 사용 기술

| 기술              | 용도         |
| --------------- | ---------- |
| JavaScript      | 애플리케이션 로직  |
| Node.js         | 서버 실행 환경   |
| OpenWeather API | 날씨 데이터 제공  |
| HTTP / REST API | 외부 API 통신  |
| JSON            | API 데이터 형식 |

---

## 📂 프로젝트 구조

```text
openweather-full-node-app/
│
├── openweather-full-node-app/
│   ├── ...
│   └── ...
│
└── README.md
```

> 실제 파일 구성은 프로젝트 버전에 따라 달라질 수 있습니다.

---

## 🚀 실행 방법

### 1. Repository Clone

```bash
git clone https://github.com/journal-izm/javascript_study.git
```

프로젝트 폴더로 이동합니다.

```bash
cd javascript_study/openweather-full-node-app/openweather-full-node-app
```

---

### 2. 패키지 설치

```bash
npm install
```

---

### 3. OpenWeather API Key 발급

OpenWeather 서비스를 사용하려면 API Key가 필요합니다.

[OpenWeather 공식 사이트](https://openweathermap.org/?utm_source=chatgpt.com)

API Key를 발급받은 후 프로젝트에서 사용하는 환경변수 또는 설정 파일에 API Key를 등록합니다.

예:

```env
OPENWEATHER_API_KEY=YOUR_API_KEY
```

> ⚠️ API Key는 GitHub에 그대로 업로드하지 않는 것을 권장합니다.

`.env` 파일을 사용하는 경우 `.gitignore`에 추가하세요.

```gitignore
.env
```

---

### 4. 서버 실행

프로젝트의 `package.json`에 정의된 실행 명령에 따라 서버를 실행합니다.

일반적인 Node.js 프로젝트라면:

```bash
npm start
```

또는 프로젝트에서 `server.js`를 직접 실행하는 구조라면:

```bash
node server.js
```

---

## 🌦️ OpenWeather API 사용 예

OpenWeather의 현재 날씨 API는 다음과 같은 형태로 요청할 수 있습니다.

```text
https://api.openweathermap.org/data/2.5/weather
```

도시명을 이용하는 경우 예시는 다음과 같습니다.

```text
?q=Seoul
&units=metric
&lang=kr
&appid=YOUR_API_KEY
```

JavaScript에서는 다음과 같은 형태로 API를 요청할 수 있습니다.

```javascript
const url =
  `https://api.openweathermap.org/data/2.5/weather` +
  `?q=Seoul` +
  `&units=metric` +
  `&lang=kr` +
  `&appid=${API_KEY}`;
```

`units=metric`을 사용하면 온도를 섭씨 기준으로 받을 수 있습니다.

---

## 📡 API 응답 데이터

OpenWeather API는 JSON 형태로 데이터를 반환합니다.

예를 들어 응답 데이터에는 다음과 같은 정보가 포함될 수 있습니다.

```json
{
  "name": "Seoul",
  "main": {
    "temp": 20.5,
    "feels_like": 19.8,
    "humidity": 65
  },
  "weather": [
    {
      "main": "Clouds",
      "description": "overcast clouds"
    }
  ],
  "wind": {
    "speed": 3.5
  }
}
```

JavaScript에서는 객체의 속성을 이용하여 필요한 정보를 가져올 수 있습니다.

```javascript
data.main.temp
data.main.humidity
data.weather[0].description
data.wind.speed
```

---

## 🔄 동작 과정

### 1. 사용자 요청

사용자가 웹 페이지에서 날씨를 조회합니다.

### 2. Node.js 서버 요청

Node.js 서버가 요청을 받아 OpenWeather API에 HTTP 요청을 보냅니다.

### 3. OpenWeather API 응답

OpenWeather API가 현재 날씨 정보를 JSON 형태로 반환합니다.

### 4. 데이터 처리

Node.js에서 API 응답 데이터를 분석하고 필요한 정보를 추출합니다.

### 5. 결과 전달

처리된 날씨 정보를 다시 클라이언트에 전달합니다.

---

## 🎯 학습 목표

이 프로젝트를 통해 다음 내용을 학습할 수 있습니다.

* Node.js 기본 사용법
* 서버 프로그램의 기본 구조
* REST API의 개념
* 외부 API 호출 방법
* 비동기 JavaScript
* Promise / `async` / `await`
* JSON 데이터 처리
* API 응답 데이터 활용
* 클라이언트 ↔ 서버 통신
* API Key 관리 방법

---

## 🔐 API Key 보안

API Key를 JavaScript 프론트엔드 코드에 직접 작성하면 브라우저의 개발자 도구 등을 통해 노출될 수 있습니다.

따라서 실제 서비스에서는 API Key를 서버 측 환경변수 등에 저장하고, 서버가 OpenWeather API를 호출하도록 구성하는 방식을 권장합니다.

```text
Browser
   │
   │ 날씨 요청
   ▼
Node.js Server
   │
   │ API Key 포함
   ▼
OpenWeather API
   │
   │ Weather JSON
   ▼
Node.js Server
   │
   ▼
Browser
```

---

## 🧪 개발 목적

이 프로젝트는 실무용 날씨 서비스보다는 **Node.js와 외부 API 연동 과정을 이해하기 위한 학습용 프로젝트**입니다.

특히 다음과 같은 기본적인 웹 개발 흐름을 실습하는 데 목적이 있습니다.

> 사용자 요청 → 서버 처리 → 외부 API 호출 → JSON 응답 → 데이터 표시

---

## 📚 참고 자료

* [OpenWeather](https://openweathermap.org/?utm_source=chatgpt.com)
* [OpenWeather API 문서](https://openweathermap.org/api?utm_source=chatgpt.com)
* [Node.js 공식 사이트](https://nodejs.org/?utm_source=chatgpt.com)

---

## 👤 Repository

GitHub Repository:

[javascript_study](https://github.com/journal-izm/javascript_study?utm_source=chatgpt.com)

---

## 📄 License

학습 및 개인 프로젝트 목적으로 작성되었습니다.
