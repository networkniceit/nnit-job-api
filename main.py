from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import asyncio
import base64
import html
import logging
import re
import httpx

app = FastAPI(title="NNIT Job Scraper")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

logger = logging.getLogger("nnit.jobs")

USER_AGENT = "NNIT-Jobs/1.0"
BA_SEARCH_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs"
BA_DETAIL_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails/"
BA_JOB_PAGE = "https://www.arbeitsagentur.de/jobsuche/jobdetail/"
# Public client id used by the official Bundesagentur Jobsuche web app (not a personal key).
BA_CLIENT_ID = "jobboerse-jobsuche"

# Common English job words -> German, so English searches also work on German sources.
GERMAN_TERMS = {
    "forklift driver": "Staplerfahrer",
    "forklift operator": "Staplerfahrer",
    "forklift": "Gabelstaplerfahrer",
    "warehouse worker": "Lagerarbeiter",
    "warehouse": "Lager",
    "truck driver": "Lkw-Fahrer",
    "delivery driver": "Auslieferungsfahrer",
    "driver": "Fahrer",
    "cleaner": "Reinigungskraft",
    "electrician": "Elektriker",
    "welder": "Schweisser",
    "mechanic": "Mechaniker",
    "nurse": "Krankenpfleger",
    "cook": "Koch",
    "chef": "Koch",
    "waiter": "Servicekraft",
    "security guard": "Sicherheitsmitarbeiter",
    "accountant": "Buchhalter",
    "software developer": "Softwareentwickler",
    "developer": "Entwickler",
    "teacher": "Lehrer",
}

BA_CONTRACT = {"UNBEFRISTET": "Permanent contract", "BEFRISTET": "Fixed-term contract"}
BA_REGIONS = {
    "BADEN_WUERTTEMBERG": "Baden-Württemberg", "BAYERN": "Bayern", "BERLIN": "Berlin",
    "BRANDENBURG": "Brandenburg", "BREMEN": "Bremen", "HAMBURG": "Hamburg", "HESSEN": "Hessen",
    "MECKLENBURG_VORPOMMERN": "Mecklenburg-Vorpommern", "NIEDERSACHSEN": "Niedersachsen",
    "NORDRHEIN_WESTFALEN": "Nordrhein-Westfalen", "RHEINLAND_PFALZ": "Rheinland-Pfalz",
    "SAARLAND": "Saarland", "SACHSEN": "Sachsen", "SACHSEN_ANHALT": "Sachsen-Anhalt",
    "SCHLESWIG_HOLSTEIN": "Schleswig-Holstein", "THUERINGEN": "Thüringen",
}

BA_OFFER_TYPES = {
    "ARBEIT": "Job", "SELBSTAENDIGKEIT": "Self-employment",
    "AUSBILDUNG": "Apprenticeship", "PRAKTIKUM_TRAINEE": "Internship / trainee",
}
BA_SALARY_UNITS = {"JAHRESGEHALT": "per year", "MONATSGEHALT": "per month", "STUNDENLOHN": "per hour"}

SOURCE_LABELS = {
    "remotive": ("Remotive", "https://remotive.com"),
    "remoteok": ("Remote OK", "https://remoteok.com"),
    "jobicy": ("Jobicy", "https://jobicy.com"),
    "himalayas": ("Himalayas", "https://himalayas.app"),
    "arbeitnow": ("Arbeitnow", "https://www.arbeitnow.com"),
    "arbeitsagentur": ("Bundesagentur für Arbeit", "https://www.arbeitsagentur.de"),
}


@app.get("/")
def root():
    return {"status": "NNIT Job API running"}


def make_client():
    return httpx.AsyncClient(timeout=15, follow_redirects=True, headers={"User-Agent": USER_AGENT})


def clean_text(value):
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def clean_multiline(value):
    """Like clean_text but keeps paragraphs and list items readable."""
    text = re.sub(r"(?i)<br\s*/?>|</p>|</li>|</div>|</h[1-6]>", "\n", value or "")
    text = re.sub(r"(?i)<li[^>]*>", "• ", text)
    text = html.unescape(re.sub(r"<[^>]+>", "", text))
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = "\n".join(line.strip() for line in text.split("\n"))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def tidy_markdown(text):
    """Some employers write descriptions in markdown; show them as plain readable text."""
    lines = []
    for line in text.replace("​", "").replace("\\*", "*").split("\n"):
        line = line.strip()
        line = re.sub(r"^#{1,6}\s*", "", line)
        line = re.sub(r"^[-*]\s+", "• ", line)
        line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
        lines.append(line.strip())
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def shorten(text, limit=400):
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def to_date(value):
    if not value:
        return ""
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc).strftime("%Y-%m-%d")
    return str(value)[:10]


def split_terms(text):
    return [term for term in re.findall(r"[a-z0-9+#.]+", text.casefold()) if len(term) > 1]


def german_query(query):
    lowered = query.casefold()
    for english, german in GERMAN_TERMS.items():
        if english in lowered:
            return re.sub(re.escape(english), german, query, flags=re.IGNORECASE)
    return ""


COUNTRY_WORDS = {"germany", "deutschland", "de", "europe"}


def place_term(requested_location):
    """Reduce a typed location such as '32427 minden germany' to the place the German sources understand."""
    words = [w for w in re.findall(r"[^\W\d_][\w'-]*|\d{5}", requested_location.casefold()) if w not in COUNTRY_WORDS]
    names = [w for w in words if not w.isdigit()]
    if names:
        return " ".join(names)
    return " ".join(words)  # only a postcode was typed


def text_matches(term_sets, text):
    haystack = text.casefold()
    return any(terms and all(term in haystack for term in terms) for terms in term_sets)


def remote_location_ok(requested_location, job_location):
    """Location rule for remote-only sources (same rule the API already used for Remotive)."""
    if not requested_location:
        return True
    normalized_job_location = job_location.casefold()
    exact_or_global = (
        requested_location in normalized_job_location
        or "worldwide" in normalized_job_location
        or "anywhere" in normalized_job_location
    )
    germany_in_europe = (
        requested_location in ("germany", "deutschland")
        and "europe" in normalized_job_location
    )
    unrestricted_remote = (
        "remote" in normalized_job_location
        and not any(region in normalized_job_location for region in (
            "usa", "united states", "canada", "australia",
            "asia", "latin america"
        ))
    )
    return exact_or_global or germany_in_europe or unrestricted_remote


def make_job(source, title, link, description, location, published, company, work_type, employment_type=""):
    label, source_url = SOURCE_LABELS[source]
    description = clean_text(description)
    employment_type = ", ".join(
        part[:1].upper() + part[1:] for part in (p.strip().replace("_", " ") for p in employment_type.split(",")) if part
    )
    return {
        "title": clean_text(title),
        "link": link or "",
        "source": source,
        "source_label": label,
        "source_url": source_url,
        "summary": shorten(description),
        "description": description[:6000],
        "location": location,
        "published": published,
        "company": clean_text(company),
        "work_type": work_type,
        "employment_type": employment_type,
    }


async def remotive_jobs(client, query, term_sets, requested_location):
    response = await client.get(
        "https://remotive.com/api/remote-jobs",
        params={"search": query, "limit": 100},
    )
    response.raise_for_status()
    jobs = []
    for job in response.json().get("jobs", []):
        title = job.get("title", "")
        description = clean_text(job.get("description", ""))
        if not text_matches(term_sets[:1], f"{title} {description}"):
            continue
        job_location = (job.get("candidate_required_location", "") or "Remote").strip()
        if not remote_location_ok(requested_location, job_location):
            continue
        jobs.append(make_job(
            "remotive", title, job.get("url", ""), description, job_location,
            job.get("publication_date", "")[:10], job.get("company_name", ""),
            "remote", job.get("job_type", "") or "",
        ))
    return jobs


async def remoteok_jobs(client, query, term_sets, requested_location):
    response = await client.get("https://remoteok.com/api")
    response.raise_for_status()
    jobs = []
    for job in response.json():
        if not isinstance(job, dict) or not job.get("position"):
            continue  # first element is a legal notice, not a job
        description = clean_text(job.get("description", ""))
        text = f"{job.get('position', '')} {description} {' '.join(job.get('tags') or [])} {job.get('company', '')}"
        if not text_matches(term_sets[:1], text):
            continue
        job_location = (job.get("location", "") or "Remote").strip()
        if not remote_location_ok(requested_location, job_location):
            continue
        jobs.append(make_job(
            "remoteok", job.get("position", ""), job.get("url") or job.get("apply_url", ""),
            description, job_location, to_date(job.get("date")), job.get("company", ""), "remote",
        ))
    return jobs


async def jobicy_jobs(client, query, term_sets, requested_location):
    response = await client.get(
        "https://jobicy.com/api/v2/remote-jobs",
        params={"count": 50, "tag": query},
    )
    response.raise_for_status()
    jobs = []
    for job in response.json().get("jobs", []):
        title = job.get("jobTitle", "")
        description = clean_text(job.get("jobDescription") or job.get("jobExcerpt") or "")
        if not text_matches(term_sets[:1], f"{title} {description}"):
            continue
        job_location = (job.get("jobGeo", "") or "Remote").strip()
        if not remote_location_ok(requested_location, job_location):
            continue
        job_type = job.get("jobType") or []
        if isinstance(job_type, str):
            job_type = [job_type]
        jobs.append(make_job(
            "jobicy", title, job.get("url", ""), description, job_location,
            to_date(job.get("pubDate")), job.get("companyName", ""), "remote", ", ".join(job_type),
        ))
    return jobs


async def himalayas_jobs(client, query, term_sets, requested_location):
    response = await client.get("https://himalayas.app/jobs/api/search", params={"q": query})
    response.raise_for_status()
    jobs = []
    for job in response.json().get("jobs", []):
        title = job.get("title", "")
        description = clean_text(job.get("description") or job.get("excerpt") or "")
        if not text_matches(term_sets[:1], f"{title} {description}"):
            continue
        restrictions = job.get("locationRestrictions") or []
        job_location = ", ".join(restrictions) if restrictions else "Worldwide"
        if not remote_location_ok(requested_location, job_location):
            continue
        jobs.append(make_job(
            "himalayas", title, job.get("applicationLink") or job.get("guid", ""), description,
            job_location, to_date(job.get("pubDate")), job.get("companyName", ""),
            "remote", job.get("employmentType", "") or "",
        ))
    return jobs


async def arbeitnow_jobs(client, query, term_sets, requested_location):
    responses = await asyncio.gather(*(
        client.get("https://www.arbeitnow.com/api/job-board-api", params={"page": page})
        for page in (1, 2, 3)
    ), return_exceptions=True)
    jobs = []
    reachable = False
    for response in responses:
        if isinstance(response, Exception) or response.status_code != 200:
            continue
        reachable = True
        for job in response.json().get("data", []):
            title = job.get("title", "")
            description = clean_text(job.get("description", ""))
            text = f"{title} {description} {' '.join(job.get('tags') or [])}"
            if not text_matches(term_sets, text):
                continue
            job_location = (job.get("location", "") or "").strip()
            is_remote = bool(job.get("remote"))
            place = place_term(requested_location)
            if place:
                if place not in job_location.casefold():
                    continue
            jobs.append(make_job(
                "arbeitnow", title, job.get("url", ""), description,
                job_location or ("Remote" if is_remote else "Germany"),
                to_date(job.get("created_at")), job.get("company_name", ""),
                "remote" if is_remote else "onsite", ", ".join(job.get("job_types") or []),
            ))
    if not reachable:
        raise httpx.HTTPError("Arbeitnow could not be reached")
    return jobs


async def arbeitsagentur_jobs(client, query, term_sets, requested_location):
    german = german_query(query)
    params = {"was": german or query, "angebotsart": 1, "size": 50, "page": 1}
    place = place_term(requested_location)
    if place:
        params["wo"] = place
    response = await client.get(
        BA_SEARCH_URL, params=params,
        headers={"X-API-Key": BA_CLIENT_ID, "Accept": "application/json"},
    )
    if response.status_code in (400, 404):
        return []  # unknown place or no match
    response.raise_for_status()
    data = response.json()
    items = data.get("ergebnisliste") or data.get("stellenangebote") or []
    jobs = []
    for item in items:
        title = item.get("stellenangebotsTitel") or item.get("titel") or item.get("beruf") or ""
        company = item.get("firma") or item.get("arbeitgeber") or ""
        reference = item.get("referenznummer") or item.get("refnr") or ""
        place = item.get("arbeitsort") or {}
        locations = item.get("stellenlokationen") or []
        if locations:
            place = (locations[0] or {}).get("adresse") or place
        region = place.get("region") or ""
        region = BA_REGIONS.get(region, region.replace("_", "-").title())
        job_location = ", ".join(part for part in (place.get("ort"), region) if part) or "Germany"
        period = item.get("veroeffentlichungszeitraum") or {}
        published = to_date(period.get("von") or item.get("aktuelleVeroeffentlichungsdatum"))
        home_office = bool(item.get("homeofficemoeglich"))
        details = [item.get("beruf") if item.get("beruf") != title else "",
                   BA_CONTRACT.get(item.get("vertragsdauer") or "", "")]
        if home_office:
            details.append("Home office possible")
        salary_from, salary_to = item.get("gehaltsspanneVon"), item.get("gehaltsspanneBis")
        if salary_from or salary_to:
            details.append(f"Salary {salary_from or '?'} - {salary_to or '?'}")
        summary = ". ".join(part for part in details if part) or "Open “View full job details” below to read the full description."
        job = make_job(
            "arbeitsagentur", title, f"{BA_JOB_PAGE}{reference}" if reference else "",
            summary, job_location, published, company,
            "hybrid" if home_office else "onsite",
            "Full-time" if item.get("arbeitszeitVollzeit") else "",
        )
        job["reference"] = reference  # lets the app load the full description inside NNIT
        jobs.append(job)
    return jobs


# name -> (fetch function, work types the source can contain)
SOURCES = {
    "remotive": (remotive_jobs, ("remote",)),
    "remoteok": (remoteok_jobs, ("remote",)),
    "jobicy": (jobicy_jobs, ("remote",)),
    "himalayas": (himalayas_jobs, ("remote",)),
    "arbeitnow": (arbeitnow_jobs, ("remote", "onsite")),
    "arbeitsagentur": (arbeitsagentur_jobs, ("hybrid", "onsite")),
}


@app.get("/jobs/search")
async def search(q: str = Query(...), source: str = "indeed", location: str = "",
                 work_type: str = "", limit: int = 30):
    query = q.strip()
    terms = split_terms(query)
    if not terms:
        return []

    requested_location = location.strip().casefold()
    wanted_type = work_type.strip().casefold().replace("-", "").replace(" ", "")
    if wanted_type not in ("remote", "hybrid", "onsite"):
        wanted_type = ""  # "any" or empty: all work types
    limit = max(1, min(int(limit), 60))

    german = german_query(query)
    term_sets = [terms] + ([split_terms(german)] if german else [])

    # "source" is kept for compatibility: a known source name limits the search to it.
    names = [source] if source in SOURCES else list(SOURCES)
    names = [name for name in names if not wanted_type or wanted_type in SOURCES[name][1]]

    async with make_client() as client:
        results = await asyncio.gather(*(
            asyncio.wait_for(SOURCES[name][0](client, query, term_sets, requested_location), timeout=25)
            for name in names
        ), return_exceptions=True)

    per_source = []
    failed = []
    for name, result in zip(names, results):
        if isinstance(result, BaseException):
            failed.append(name)
            logger.warning("Job source %s failed: %r", name, result)
        else:
            per_source.append([job for job in result if not wanted_type or job["work_type"] == wanted_type])

    if names and len(failed) == len(names):
        raise HTTPException(
            status_code=502,
            detail="The job sources could not be reached."
        )

    # Mix sources so no single source fills the whole page; drop duplicate links.
    jobs, seen = [], set()
    for rank in range(max((len(jobs_) for jobs_ in per_source), default=0)):
        for source_jobs in per_source:
            if rank < len(source_jobs):
                job = source_jobs[rank]
                key = job["link"] or f"{job['title']}|{job['company']}"
                if key not in seen:
                    seen.add(key)
                    jobs.append(job)

    return jobs[:limit]


def ba_facts(data):
    """Key facts of a Bundesagentur vacancy, as shown at a glance on the original page."""
    place = ((data.get("stellenlokationen") or [{}])[0] or {}).get("adresse") or {}
    region = place.get("region") or ""
    region = BA_REGIONS.get(region, region.replace("_", "-").title())
    town = " ".join(part for part in (place.get("plz"), place.get("ort")) if part)
    location = ", ".join(part for part in (town, region) if part)

    employment = []
    if data.get("arbeitszeitVollzeit"):
        employment.append("Full-time")
    if any(key.startswith("arbeitszeitTeilzeit") and value for key, value in data.items()):
        employment.append("Part-time")
    if data.get("istGeringfuegigeBeschaeftigung"):
        employment.append("Mini-job")

    special = []
    if data.get("arbeitszeitSchichtNachtWochenende"):
        special.append("Shift / night / weekend work")
    if data.get("istArbeitnehmerUeberlassung"):
        special.append("Temporary employment agency position")
    if data.get("quereinstiegGeeignet"):
        special.append("Suitable for career changers")

    salary = ""
    salary_from, salary_to = data.get("gehaltsspanneVon"), data.get("gehaltsspanneBis")
    if salary_from or salary_to or data.get("festgehalt"):
        amount = data.get("festgehalt") or f"{salary_from or '?'} - {salary_to or '?'}"
        salary = f"{amount} {BA_SALARY_UNITS.get(data.get('verguetungsangabe') or '', '')}".strip()

    offer = data.get("stellenangebotsart") or ""
    published = (data.get("veroeffentlichungszeitraum") or {}).get("von") or data.get("datumErsteVeroeffentlichung")
    rows = [
        ("Job title", clean_text(data.get("hauptberuf") or "")),
        ("Type of offer", BA_OFFER_TYPES.get(offer, offer.replace("_", " ").title())),
        ("Employment", ", ".join(employment)),
        ("Contract", BA_CONTRACT.get(data.get("vertragsdauer") or "", "")),
        ("Start", to_date((data.get("eintrittszeitraum") or {}).get("von"))),
        ("Special features", "; ".join(special)),
        ("Salary", salary),
        ("Work location", location),
        ("Employer", clean_text(data.get("firma") or data.get("arbeitgeber") or "")),
        ("Employer website", clean_text(data.get("allianzpartnerUrl") or "")),
        ("Published", to_date(published)),
        ("Reference no.", data.get("referenznummer") or ""),
    ]
    return [{"label": label, "value": value} for label, value in rows if value]


@app.get("/jobs/detail")
async def detail(ref: str = Query(...)):
    """Full description of a Bundesagentur vacancy, so it can be read inside NNIT."""
    reference = ref.strip()
    if not reference:
        raise HTTPException(status_code=400, detail="A vacancy reference is required.")
    encoded = base64.b64encode(reference.encode("utf-8")).decode("ascii")
    try:
        async with make_client() as client:
            response = await client.get(
                f"{BA_DETAIL_URL}{encoded}",
                headers={"X-API-Key": BA_CLIENT_ID, "Accept": "application/json"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="The vacancy details could not be reached.") from exc
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="This vacancy is no longer listed.")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="The vacancy details could not be loaded.")
    data = response.json()
    return {
        "reference": reference,
        "source": "arbeitsagentur",
        "title": clean_text(data.get("stellenangebotsTitel") or data.get("titel") or ""),
        "facts": ba_facts(data),
        "description": tidy_markdown(clean_multiline(data.get("stellenangebotsBeschreibung") or ""))[:12000],
    }


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
