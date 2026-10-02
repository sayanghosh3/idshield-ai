# IDShield AI — AI-Assisted Identity & Document Screening

Presentation prototype for document screening and human review. Use synthetic/sample documents only. AI recommendations are advisory; the reviewing officer makes the final decision.

## Implemented capabilities

| Module | Live analysis | Demo / sample |
|---|---|---|
| OCR | Tesseract text/field extraction and MRZ parsing | Explicit scenario outcomes |
| Validation | Local field, date and MRZ checks | Scenario checklist |
| Forensics | OpenCV/Pillow ELA, noise, edges, texture, sharpness, entropy, metadata | Scenario findings |
| Face | Optional DeepFace/ArcFace with OpenCV detector | Simulated comparison |
| Risk | Weighted engine with returned contributors and explanations | Scenario scoring |
| Review, evidence, audit | Shared session case repository, explicit officer decision | Same workflow, clearly labelled |
| Reports | Case snapshot JSON | Labelled demo JSON |
| Government DB / watchlist | **NOT CONNECTED** | No real database hits |
| Liveness / anti-spoofing | **NOT IMPLEMENTED / NOT CHECKED** | Labelled simulated outcomes only |

Heuristic forensic indicators are not standalone proof of fraud. Face similarity is a normalized distance score, not an identity probability. The backend currently returns placeholder face-quality values; these are not measured quality estimates.

## Architecture

React + TypeScript + Vite frontend; FastAPI analysis endpoints; a shared in-memory case repository feeds Dashboard, Cases, Risk Cases, Result, Evidence, Reports and Audit. Live and demo runs use the same staged runner. Failed runs retain completed stage results and cannot produce a completed risk result or officer decision.

```mermaid
flowchart LR
    A[Document and selfie] --> B[Upload API]
    B --> C[OCR]
    C --> D[Validation / MRZ]
    D --> E[Image forensics]
    E --> F[Face comparison]
    F --> G[Explainable risk]
    G --> H[Case evidence]
    H --> I[Officer review]
    I --> J[Session audit / JSON report]
```

Package versions and required Node version are authoritative in `package.json` and `package-lock.json` (Node 24.x). Install the lockfile rather than copying obsolete version lists.

## Frontend setup

```sh
npm ci
# Copy .env.example to .env
npm run dev
```

Open http://localhost:5173. `VITE_API_BASE_URL` defaults to `http://127.0.0.1:8000`; set it to the FastAPI origin. Build-time variables require restarting Vite. Demo scenarios are selected explicitly in the UI; an environment flag cannot silently turn live analysis into simulated results. Other legacy feature flags do not establish backend availability.

## Backend setup

Use an isolated Python 3.11 environment, especially for optional TensorFlow/DeepFace dependencies:

```sh
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r backend/requirements.txt
# Optional, required for a complete live run:
python -m pip install -r ai-models/face-recognition/requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Install the **native Tesseract OCR executable**, including English language data, in addition to `pytesseract`. Add it to PATH or set `TESSERACT_CMD` to the executable path. The backend probes Tesseract in `/health`. Face dependencies are optional for startup; ArcFace weights must be available and the first inference may download them. Installed face packages alone are not reported as a verified live model: health remains NOT CHECKED until inference succeeds.

`backend/req.txt` remains a compatibility alias. Base requirements include FastAPI, multipart uploads, NumPy, OpenCV, Pillow and pytesseract. Dependency ranges are not a validated production lockfile.

The prototype analysis backend has local disk uploads and permissive local-development access. The separate `server/` document security prototype (`npm run dev:documents`) is not wired into the live analysis UI. Do not point the analysis UI at that server or claim authenticated encrypted storage, blockchain proofs or government access.

## Presentation workflows

**Live:** Dashboard → New Screening (LIVE ANALYSIS) → one synthetic PNG/JPEG passport and one synthetic selfie → Start Screening → OCR → Validation → Forensics → Face → Risk → Result/Evidence → Officer Review. Run the backend and install OCR/face dependencies first. Select each evidence tab to inspect returned values. Cases and audit entries remain linked by case ID.

**Offline backup:** New Screening → Demo scenario → Genuine Passport, Expired Passport, Tampered Passport, Face Mismatch or Cross-Document Mismatch → Start Screening. These scenarios work without the backend. Uploaded images in an explicit demo scenario are displayed only; outcomes remain simulated. Reset clears the selected scenario and returns to live analysis.

Dashboard health distinguishes backend reachability from module readiness, with a one-minute check interval. An offline backend leaves demo mode usable. Live analysis errors are shown, not replaced with sample results.

## Validation

```sh
npm run build
npm run lint
npm test
python -m pip install -r backend/requirements-dev.txt
python -m compileall -q backend/app
python -m unittest discover -s backend/tests -v
```

Frontend regression tests use synthetic fixtures and stubbed live-service responses; they do not prove real OCR or biometric accuracy. Backend checks cover API contracts and synthetic images. Real ArcFace inference requires optional dependencies, weights and an appropriate synthetic face pair.

## Limitations and future work

- Case results, officer decisions, audit and reports are shared **within the browser session only**; reload clears them. No sensitive case payloads or biometric images are written to browser persistent storage. Export JSON before reload if needed.
- Backend upload files are stored on local disk. This is not production identity-document storage; add authenticated access, retention/deletion controls and encrypted storage before any real deployment.
- The live UI supports one passport or Aadhaar image and one selfie. PDF forensics and live cross-document matching are not implemented.
- No genuine heatmaps are produced by the current live forensic endpoint. Signal cards show returned measurements.
- No liveness/anti-spoofing, government/watchlist access, production PDF reporting, production audit integrity or benchmarked accuracy claims.
- Officer identity is entered locally, not authenticated. Final decisions are locked against repeated review in this session.
- Future authorized integrations require secure APIs, access control and deployment agreements. No restricted government systems are contacted.
