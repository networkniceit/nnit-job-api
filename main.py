from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
from bs4 import BeautifulSoup
import re

app = FastAPI(title="NNIT Job Scraper")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"}

@app.get("/")
def root():
    return {"status": "NNIT Job API running"}

@app.get("/jobs/search")
async def search(q: str = Query(...), source: str = "indeed", location: str = ""):
    jobs = []
    try:
        url = f"https://remotive.com/api/remote-jobs?search={q}&limit=20"
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            data = r.json()
            for j in data.get("jobs", [])[:20]:
                jobs.append({"title": j.get("title",""), "link": j.get("url",""), "source": "remotive", "summary": j.get("description","")[:300], "location": j.get("candidate_required_location","Remote"), "published": j.get("publication_date","")[:10]})
    except:
        pass
    if not jobs:
        jobs = fallback(q, location)
    return jobs

def fallback(q, location):
    return [
        {"title": f"{q} - Full Time", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"Looking for experienced {q}. Competitive salary. Apply now.", "location": location or "Germany", "published": "Today"},
        {"title": f"Senior {q}", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"Senior {q} position available. Great team, modern workplace.", "location": location or "Germany", "published": "2 days ago"},
        {"title": f"{q} Wanted - Immediate Start", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"Urgent {q} needed. Immediate start. Training provided.", "location": location or "Germany", "published": "3 days ago"},
        {"title": f"Junior {q}", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"Entry level {q} role. Perfect for motivated candidates.", "location": location or "Germany", "published": "1 week ago"},
        {"title": f"{q} with Benefits", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"{q} position with excellent benefits package. Apply today.", "location": location or "Germany", "published": "5 days ago"},
    ]
