# 🛡️ Veri-Vigil AI Lite

> **Stop before you watch. Know before you share.**

Veri-Vigil AI Lite is a Chrome Extension that analyzes YouTube videos and Shorts in **real time** and shows a trust score overlay directly on the page. The moment you open any YouTube video, it silently extracts the title and description, sends it to a locally running FastAPI backend, and uses **Groq AI (LLaMA 3.1)** to evaluate the content for misinformation, clickbait, and sensational language.

The result? A **0–100 trust score**, a **Safe / Suspicious verdict**, and a plain English explanation — all before you press play.

---

## ⚡ Why This Exists

Every day, millions of people watch misleading videos, share harmful content, and make decisions based on manipulated information without a single warning signal. Veri-Vigil puts that signal right where it matters: **on the page, in real time, before the damage is done.**

---

## 🎯 Features

| Feature | Details |
|---|---|
| 🎬 YouTube + Shorts | Works on both regular videos and YouTube Shorts |
| 📊 Trust Score | Instant 0–100 credibility score on every video |
| 🟢🔴 Status Verdict | Clear **Safe** or **Suspicious** classification |
| 🤖 AI-Powered | Groq API with LLaMA 3.1 8B Instant (free tier) |
| 🔁 Smart Fallback | Auto-switches to heuristic engine if AI is unavailable |
| 🔒 100% Local | No data stored, no tracking, no accounts needed |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Chrome Extension | Manifest V3, Vanilla JavaScript |
| Backend | Python, FastAPI |
| AI Engine | Groq API — LLaMA 3.1 8B Instant (free tier) |
| Fallback Engine | Rule-based heuristic analyzer (12 signal patterns) |
| Server | Uvicorn (ASGI) |

---

## 🔧 Setup

### Step 1 — Get a free Groq API key

Go to [console.groq.com](https://console.groq.com), sign up for free, and create an API key. No billing required.

---

### Step 2 — Run the backend
```cmd
cd backend
python -m venv venv311
venv311\Scripts\activate
pip install -r requirements.txt
set GROQ_API_KEY=gsk_your_key_here
uvicorn main:app --reload --reload-dir .
```

> ⚠️ **Important:** Never paste your API key directly into the code. Always use the environment variable as shown above.

Backend runs at: `http://127.0.0.1:8000`

---

### Step 3 — Load the Chrome extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder

---

### Step 4 — Open any YouTube video or Short

The trust score overlay appears **automatically**. No clicks needed.

---

## 🔁 How It Works
```
YouTube Page
    └── content.js extracts title + description
            └── POST /analyze → FastAPI backend
                    ├── 🤖 Groq AI analysis (LLaMA 3.1)  ← Primary path
                    └── 📐 Heuristic fallback             ← If AI unavailable
                            └── returns:
                                    ├── trust_score (0–100)
                                    ├── status (Safe / Suspicious)
                                    └── explanation (plain English)
                                            └── 🛡️ Overlay displayed on YouTube
```

## 🏆 Built For

**ET AI Hackathon 2026** — Problem Statement 8: AI-Native News Experience
Organized by Economic Times × Avataar.ai × Unstop

---

> *Veri-Vigil doesn't censor. It doesn't block. It simply informs — and that one second of informed hesitation is worth everything.*
