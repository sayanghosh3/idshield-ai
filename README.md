# IDShield AI — AI-Powered Fake Identity & Document Screening System

Frontend MVP for Smart India Hackathon — a professional border-security/document-intelligence workstation.

## 📋 Project Overview

IDShield AI is a comprehensive document screening platform designed for border and security checkpoints. This frontend MVP demonstrates the complete screening workflow including:

- **Document Upload & Management** — Drag-and-drop with demo documents
- **OCR Extraction** — Simulated text extraction with confidence scores
- **Document Validation** — Multi-category validation checklist
- **Tampering/Forensics Detection** — Photo, text, stamp, compression, and metadata analysis
- **Face Verification** — Document face vs presented person comparison
- **Risk Assessment** — AI-powered scoring with explainable contributors
- **Case Management** — Full case lifecycle with audit trail
- **Report Generation** — Screening and forensic reports
- **Audit Logging** — Complete activity timeline

## ✨ Features Implemented

### Core Screening Workflow
- ✅ Multi-step screening (7 steps: Upload → Extraction → Validation → Forensics → Face → Risk → Result)
- ✅ Visual progress indicator with step completion tracking
- ✅ Drag-and-drop document upload (PNG, JPG, PDF up to 10MB)
- ✅ Demo document library (5 pre-configured scenarios)
- ✅ Image preview with zoom, rotate, fit-to-screen, reset

### Analysis Modules
- ✅ **OCR Screen** — Extracted fields with confidence bars, MRZ display with parsed fields
- ✅ **Validation** — 11 check categories with Pass/Warning/Fail/Not Checked status
- ✅ **Tampering/Forensics** — 6 analysis categories with anomaly region highlighting
- ✅ **Face Verification** — Dual panel with detection boxes, similarity score, liveness status
- ✅ **Risk Assessment** — Circular score display, contributor breakdown, explainable AI panel

### Case Management
- ✅ Cases table with filtering (status, risk level), search, sorting
- ✅ Case details with tabbed sections (Overview, Document, Evidence, Audit)
- ✅ Evidence viewer with finding-to-region linking
- ✅ Report generation (screening, forensic, summary templates)

### System Features
- ✅ Persistent sidebar navigation with collapsible state
- ✅ Top header with global search, notifications, demo mode selector, user menu
- ✅ Dark professional theme (border-security aesthetic)
- ✅ Full responsiveness (desktop, laptop, tablet, mobile)
- ✅ Accessibility (semantic HTML, keyboard nav, ARIA labels, contrast)
- ✅ Loading states with staged progress animation
- ✅ Error states with helpful messages

### Demo Mode
- ✅ 5 pre-configured scenarios:
  1. **Genuine Passport** — Risk: 8 (LOW)
  2. **Expired Passport** — Risk: 43 (REVIEW)
  3. **Tampered Passport** — Risk: 82 (HIGH)
  4. **Face Mismatch** — Risk: 91 (HIGH)
  5. **Cross-Document Mismatch** — Risk: 74 (HIGH)
- ✅ One-click scenario loading populates entire workflow consistently

## 🛠 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI Framework |
| TypeScript | 5.3 | Type Safety |
| Vite | 5.0 | Build Tool |
| Tailwind CSS | 3.4 | Styling |
| React Router | 6.20 | Routing |
| Lucide React | 0.294 | Icons |
| clsx + tailwind-merge | Latest | Class utilities |

## 📁 Folder Structure

```
src/
├── components/
│   ├── layout/          # Sidebar, Header, Layout
│   ├── common/          # Reusable UI components (Button, Card, Table, Modal, etc.)
│   ├── dashboard/       # Dashboard-specific components
│   ├── screening/       # Screening workflow components
│   ├── documents/       # Document management components
│   ├── validation/      # Validation components
│   ├── tampering/       # Forensics components
│   ├── face/            # Face verification components
│   ├── risk/            # Risk assessment components
│   ├── cases/           # Case management components
│   ├── reports/         # Report components
│   └── audit/           # Audit log components
├── pages/
│   ├── Dashboard.tsx           # Main dashboard with KPIs and recent cases
│   ├── NewScreening.tsx        # Multi-step screening workflow
│   ├── ScreeningResult.tsx     # Final result view
│   ├── Cases.tsx               # Cases list with filters
│   ├── CaseDetails.tsx         # Complete case detail view
│   ├── Documents.tsx           # Document library
│   ├── FaceVerification.tsx    # Face comparison tool
│   ├── Reports.tsx             # Report generation
│   ├── AuditLog.tsx            # Audit timeline
│   └── Settings.tsx            # System configuration
├── services/
│   ├── api.ts                  # Base API client with error handling
│   ├── screeningService.ts     # Screening workflow orchestration
│   ├── documentService.ts      # Document upload & OCR
│   ├── faceService.ts          # Face verification
│   └── reportService.ts        # Report generation
├── mocks/
│   ├── documents.ts            # Demo documents & OCR results
│   ├── screeningData.ts        # Screening cases, steps, progress
│   ├── cases.ts                # Case lists, audit events, reports
│   └── analysis.ts             # Evidence items, forensic overlays
├── types/
│   ├── document.ts             # Document, OCR, MRZ types
│   ├── screening.ts            # Screening, validation, tampering, face, risk types
│   ├── analysis.ts             # Evidence, report types
│   └── case.ts                 # Case, audit, report types
├── hooks/
│   ├── useScreening.ts         # Screening workflow state management
│   ├── useDemoMode.ts          # Demo scenario management
│   └── useFileUpload.ts        # File upload with drag-drop
├── utils/
│   ├── cn.ts                   # Class name utility
│   └── formatters.ts           # Date, file size, risk formatting
├── App.tsx                     # Routing & providers
├── main.tsx                    # Entry point
└── index.css                   # Global styles + Tailwind
```

## 🚀 Installation & Running

### Prerequisites
- Node.js 18+
- npm 9+

### Commands

```bash
# Navigate to project
cd idshield-ai

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:5173`

## 🎯 Demo Scenarios

Access via the **Demo Mode** button in the header or the "Demo Scenarios" button on the New Screening page:

| Scenario | Risk Score | Level | Key Findings |
|----------|------------|-------|--------------|
| Genuine Passport | 8 | LOW | All checks pass, face match |
| Expired Passport | 43 | REVIEW | Document expired, otherwise valid |
| Tampered Passport | 82 | HIGH | Photo manipulation, font anomalies, stamp issues, metadata mismatch |
| Face Mismatch | 91 | HIGH | 42% similarity, different person |
| Cross-Document Mismatch | 74 | HIGH | Visa passport number ≠ passport record |

Each scenario populates the entire workflow consistently — OCR, MRZ, Validation, Forensics, Face, Risk, and Final Result all reference the same case data.

## 🏗 Frontend Architecture

### State Management
- **ScreeningContext** (React Context + useReducer) — Manages complete screening workflow state:
  - `currentCase`, `uploadedDocuments`, `extractedData`
  - `validationResults`, `tamperingResults`, `faceResults`
  - `riskResult`, `auditEvents`, `screeningStatus`
  - `currentStep`, `progress`, `progressMessage`
- **DemoModeContext** — Demo scenario selection and loading

### Service Layer (Ready for Backend Integration)
Each service has a consistent interface that can be swapped from mock to real API:

```typescript
// Mock implementation (current)
const result = await screeningService.runScreening(caseId, onProgress);

// Future backend integration
const result = await apiScreeningService.runScreening(caseId, onProgress);
```

**Service Contracts:**
- `screeningService.createCase()` → `POST /api/screenings`
- `screeningService.runScreening()` → `POST /api/screenings/:id/run`
- `documentService.extractOCR()` → `POST /api/ocr`
- `documentService.validateDocument()` → `POST /api/validate`
- `tamperingService.analyzeDocument()` → `POST /api/tampering/analyze`
- `faceService.verifyFace()` → `POST /api/face/verify`
- `screeningService.calculateRisk()` → `POST /api/risk`
- `reportService.generateReport()` → `POST /api/reports`

### Type Safety
Strict TypeScript interfaces for all domain objects — no `any` types. Key interfaces:
- `ScreeningCase`, `OCRResult`, `ValidationResult`, `TamperingResult`
- `FaceVerificationResult`, `RiskResult`, `AuditEvent`, `Report`

## 🔌 Future Backend Integration

### API Endpoints to Implement

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/screenings` | POST | Create new screening case |
| `/api/screenings/:id` | GET | Get case details |
| `/api/screenings` | GET | List cases (paginated, filtered) |
| `/api/screenings/:id/run` | POST | Execute full screening pipeline |
| `/api/documents/upload` | POST | Upload document file |
| `/api/ocr` | POST | Extract text from document |
| `/api/validate` | POST | Validate document structure |
| `/api/tampering/analyze` | POST | Forensic tampering analysis |
| `/api/face/verify` | POST | Face comparison + liveness |
| `/api/risk` | POST | Calculate risk score |
| `/api/reports` | POST | Generate report |
| `/api/cases` | GET | List cases |
| `/api/cases/:id` | GET | Get case with full details |
| `/api/audit` | GET | Get audit events |

### AI Model Integration Points

| Module | Integration Point | Expected Input | Expected Output |
|--------|------------------|----------------|-----------------|
| OCR | `documentService.extractOCR()` | Document image/file | `OCRResult` with fields, confidence, MRZ |
| Validation | `documentService.validateDocument()` | OCR result + document | `ValidationResult` with checklist |
| Tampering | `tamperingService.analyzeDocument()` | Document image | `TamperingResult` with findings, overlay, heatmap |
| Face | `faceService.verifyFace()` | Document face + live capture | `FaceVerificationResult` with similarity, decision |
| Risk | `screeningService.calculateRisk()` | All analysis results | `RiskResult` with score, contributors, explanation |

### Database Schema Suggestions

```sql
-- Core tables
screenings (id, case_number, status, risk_level, risk_score, created_at, completed_at)
documents (id, screening_id, file_name, file_path, document_type, uploaded_at)
ocr_results (id, document_id, extracted_fields, mrz_data, confidence, raw_text)
validation_results (id, screening_id, checks_json, overall_status)
tampering_results (id, document_id, findings_json, overall_score, overlay_path, heatmap_path)
face_results (id, screening_id, similarity, decision, document_face_json, presented_face_json)
risk_results (id, screening_id, score, level, contributors_json, explanation_json, recommendation)
audit_events (id, screening_id, timestamp, event, category, status, actor, details_json)
reports (id, screening_id, type, format, status, file_path, generated_at)
```

## 🔒 Security Considerations

- **No real document uploads** — Demo mode only, files stay in browser memory
- **No external API calls** — All services mocked, no data leaves the browser
- **No government logos/affiliation** — Generic branding only
- **Demo environment notice** — Displayed in UI: "Demo environment. Do not upload real identity documents."
- **No persistent storage** — No localStorage, IndexedDB, or cookies used for sensitive data
- **No authentication in MVP** — User profile is simulated ("Security Operator")

## 🎨 Design System

### Color Palette
```css
Background:        #0B1120
Panels:            #111827
Secondary Panels:  #172033
Borders:           #263244
Primary Accent:    #38BDF8
Success:           #22C55E
Warning:           #F59E0B
Danger:            #EF4444
Text:              #F8FAFC
Muted Text:        #94A3B8
```

### Component Patterns
- **Cards** — `bg-panel border border-border rounded-xl p-6`
- **Buttons** — Primary (accent), Secondary (panel), Danger, Success, Ghost variants
- **Badges** — Semantic colors for status (success/warning/danger/info/neutral)
- **Tables** — Horizontal scroll on mobile, clickable rows
- **Progress** — Linear and circular variants with semantic colors
- **Modals** — Portal-based, focus-trapped, ESC to close

## ♿ Accessibility

- Semantic HTML5 elements (`<nav>`, `<main>`, `<aside>`, `<section>`, `<article>`)
- Keyboard navigation throughout (Tab, Enter, Escape, Arrow keys)
- Visible focus states (`focus:ring-2 focus:ring-primary-accent`)
- ARIA labels on icon-only buttons, tabs, dialogs
- Sufficient contrast ratios (WCAG AA)
- `prefers-reduced-motion` respected
- Screen reader friendly (proper headings, landmarks, live regions)

## 📱 Responsiveness

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1024px) | Full sidebar, multi-column layouts |
| Laptop (768-1023px) | Collapsible sidebar, adapted grids |
| Tablet (640-767px) | Single-column, stacked cards |
| Mobile (<640px) | Hidden sidebar (hamburger), touch-friendly, horizontal table scroll |

## ⚠️ Limitations & Known Issues

1. **Mock Data Only** — No real OCR, face recognition, or forensic analysis
2. **No Persistence** — Refreshing resets screening state (by design for demo)
3. **Simulated Liveness** — Shows "Backend integration required" — no real liveness detection
4. **No Authentication** — Single simulated user
5. **No Real File Processing** — Demo documents use placeholder images
6. **Print/PDF Generation** — Mock implementation only (returns minimal PDF blob)
7. **WebSocket/Real-time** — Not implemented (audit log is static)

## 📄 License

MIT License — Built for Smart India Hackathon 2026

## 🤝 Contributing

This is a hackathon prototype. For production use:
1. Replace mock services with real API implementations
2. Add authentication/authorization
3. Implement proper file upload to secure storage
4. Integrate validated AI models for OCR, face, tampering, risk
5. Add comprehensive test coverage
6. Conduct security audit
7. Ensure regulatory compliance for identity document handling

---

**Built with ❤️ for SIH 2026**

# Confidential document security

The frontend remains **DEMO / SIMULATED**. A separate development-only server
scaffold now provides tested security controls; uploads are blocked until document
inspection and malware scanning are configured. See [server/README.md](server/README.md)
for the API contract, setup, real-versus-development matrix and production gaps.
