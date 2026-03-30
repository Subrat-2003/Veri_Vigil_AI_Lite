import json
import os
import re
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Veri-Vigil AI Lite Backend", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(default="")


class AnalyzeResponse(BaseModel):
    trust_score: int
    status: str
    explanation: str
    source: str


SUSPICIOUS_PATTERNS = [
    r"\b100%\s+guaranteed\b",
    r"\bmiracle\b",
    r"\bsecret\b",
    r"\bthey don.t want you to know\b",
    r"\bshocking\b",
    r"\bbreaking\b",
    r"\bcure for all\b",
    r"\bclick now\b",
    r"\bexposed\b",
    r"\bconspiracy\b",
    r"\bproof\b",
    r"\bmust watch\b",
]


def clamp_score(score: int) -> int:
    return max(0, min(100, score))


def analyze_with_mock(title: str, description: str) -> AnalyzeResponse:
    text = f"{title} {description}".lower()
    score = 78
    reasons = []

    if len(description.strip()) < 30:
        score -= 12
        reasons.append("The description is very short, which provides limited context.")

    hits = sum(1 for p in SUSPICIOUS_PATTERNS if re.search(p, text))
    if hits:
        score -= min(35, hits * 10)
        reasons.append(
            "The title or description contains sensational or certainty-heavy phrasing "
            "often seen in misleading content."
        )

    if any(t in text for t in ["official", "interview", "press release", "documentary", "education"]):
        score += 8
        reasons.append("The content appears to use more informative or structured framing.")

    if any(t in text for t in ["buy now", "limited time", "guaranteed results"]):
        score -= 15
        reasons.append("Promotional urgency language can be a red flag for low-trust content.")

    score = clamp_score(score)
    status = "Safe" if score >= 60 else "Suspicious"

    if not reasons:
        reasons.append("No strong misinformation signals were detected from the title and description alone.")

    explanation = (
        f"This is a lightweight heuristic analysis of the YouTube video's title and description. "
        f"Score: {score}/100. " + " ".join(reasons) +
        " This is an assistive signal, not a final fact-check."
    )

    return AnalyzeResponse(trust_score=score, status=status, explanation=explanation, source="mock")


def analyze_with_groq(title: str, description: str) -> Optional[AnalyzeResponse]:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("[Veri-Vigil] GROQ_API_KEY not set — falling back to mock.")
        return None

    model_name = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")

    try:
        from groq import Groq

        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a media-literacy AI that evaluates YouTube content trustworthiness. "
                        "Respond ONLY with a valid JSON object — no markdown, no extra text. "
                        'Schema: {"trust_score": <int 0-100>, "status": "Safe" or "Suspicious", '
                        '"explanation": "<1-2 sentence plain English>"}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Analyze this YouTube video for misinformation risk.\n\n"
                        f"Title: {title}\n"
                        f"Description: {description or '(none provided)'}"
                    ),
                },
            ],
            temperature=0.2,
            max_tokens=300,
        )

        raw = response.choices[0].message.content.strip()
        print(f"[Veri-Vigil] Groq raw response: {raw}")

        # Strip accidental markdown fences
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

        data = json.loads(raw)

        trust_score = clamp_score(int(data["trust_score"]))
        status = data["status"]
        explanation = data["explanation"]

        if status not in ("Safe", "Suspicious"):
            status = "Suspicious" if trust_score < 60 else "Safe"

        return AnalyzeResponse(
            trust_score=trust_score,
            status=status,
            explanation=explanation,
            source="groq-ai",
        )

    except json.JSONDecodeError as e:
        print(f"[Veri-Vigil] JSON parse error: {e}")
        return None
    except KeyError as e:
        print(f"[Veri-Vigil] Missing field in response: {e}")
        return None
    except Exception as e:
        print(f"[Veri-Vigil] Groq error [{type(e).__name__}]: {e}")
        return None


@app.get("/")
def root():
    key = os.environ.get("GROQ_API_KEY")
    return {
        "message": "Veri-Vigil AI Lite backend is running.",
        "endpoint": "POST /analyze",
        "ai_enabled": bool(key),
        "model": os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"),
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    result = analyze_with_groq(payload.title, payload.description)
    if result:
        return result

    mock_result = analyze_with_mock(payload.title, payload.description)
    if not os.environ.get("GROQ_API_KEY"):
        mock_result.explanation = "[Groq key not configured — heuristic only] " + mock_result.explanation
    else:
        mock_result.explanation = "[Groq call failed — heuristic fallback] " + mock_result.explanation
    return mock_result


@app.get("/debug")
def debug():
    key = os.environ.get("GROQ_API_KEY")
    return {
        "key_set": bool(key),
        "key_prefix": key[:10] + "..." if key else None,
        "model": os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"),
    }
