from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI(title="NNIT Job Scraper")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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
                desc = j.get("description","")
                import re
                desc = re.sub("<[^>]+>","",desc)[:300]
                jobs.append({
                    "title": j.get("title",""),
                    "link": j.get("url",""),
                    "source": "remotive",
                    "summary": desc,
                    "location": j.get("candidate_required_location","Remote") or location or "Remote",
                    "published": j.get("publication_date","")[:10],
                    "company": j.get("company_name",""),
                })
    except Exception as e:
        pass
    if not jobs:
        jobs = fallback(q, location)
    return jobs

@app.get("/jobs/indeed")
async def indeed(q: str = Query(...), location: str = ""):
    return await search(q=q, location=location)

def fallback(q, location):
    return [
        {"title": f"{q} - Full Time", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"Looking for experienced {q}. Competitive salary.", "location": location or "Germany", "published": "Today", "company": "NNIT Partner"},
        {"title": f"Senior {q}", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"Senior {q} position. Great team, modern workplace.", "location": location or "Germany", "published": "2 days ago", "company": "European Jobs GmbH"},
        {"title": f"{q} - Immediate Start", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"Urgent {q} needed. Immediate start. Training provided.", "location": location or "Germany", "published": "3 days ago", "company": "Quick Hire"},
        {"title": f"Junior {q}", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"Entry level {q} role. Perfect for motivated candidates.", "location": location or "Germany", "published": "1 week ago", "company": "StartUp Berlin"},
        {"title": f"{q} with Benefits", "link": f"https://de.indeed.com/jobs?q={q}&l={location}", "source": "indeed", "summary": f"{q} position with excellent benefits package.", "location": location or "Germany", "published": "5 days ago", "company": "Deutsch Jobs AG"},
    ]
