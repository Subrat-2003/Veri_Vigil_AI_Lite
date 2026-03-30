# Veri-Vigil AI Lite

Veri-Vigil AI Lite is a Chrome Extension that analyzes YouTube videos and Shorts in real time and shows a trust score overlay directly on the page. When you open any YouTube video, the extension automatically extracts the title and description, sends it to a locally running FastAPI backend, and uses Groq AI (LLaMA 3.1) to evaluate the content for misinformation, clickbait, and sensational language. The result is displayed as a score from 0 to 100 along with a Safe or Suspicious status and a plain English explanation of why the video was flagged.

The backend is built with Python and FastAPI, and uses the Groq API on the free tier with no billing required. If the AI call fails for any reason, the system automatically falls back to a rule-based heuristic analyzer so the extension always shows a result. The Chrome extension is built using Manifest V3 and plain JavaScript, and works on both regular YouTube videos and YouTube Shorts.

This project was built to help users think critically about the content they watch online, by giving them an instant credibility signal before they invest time in a video.

---

## Tech Stack

- **Chrome Extension** — Manifest V3, Vanilla JavaScript
- **Backend** — Python, FastAPI
- **AI** — Groq API, LLaMA 3.1 8B Instant (free tier)

---

## Features

- Works on regular YouTube videos and YouTube Shorts
- Trust score from 0 to 100
- Safe / Suspicious status with plain English explanation
- AI-powered analysis using Groq (LLaMA 3.1)
- Automatic fallback to heuristic analysis if AI is unavailable
- Runs fully local — no data stored anywhere

---

## Setup

### 1. Get a free Groq API key
Go to [console.groq.com](https://console.groq.com), sign up free, and create an API key.

### 2. Run the backend
```cmd
cd backend
python -m venv venv311
venv311\Scripts\activate
pip install -r requirements.txt
set GROQ_API_KEY=gsk_your_key_here
uvicorn main:app --reload --reload-dir .
```

### 3. Load the Chrome extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder

### 4. Open any YouTube video or Short
The trust score overlay will appear automatically.

---

## How It Works
```
YouTube page
    └── content.js extracts title + description
            └── POST /analyze → FastAPI backend
                    ├── Groq AI analysis (LLaMA 3.1)
                    └── Heuristic fallback if AI unavailable
                            └── returns trust_score, status, explanation
                                    └── overlay displayed on YouTube
```

---

## Project Structure
```
veri-vigil-ai-lite/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── extension/
│   ├── manifest.json
│   ├── content.js
│   ├── background.js
│   └── styles.css
└── README.md
```
