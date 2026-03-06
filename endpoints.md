# CareerNest API Endpoints

Base URL: `http://localhost:3000`

---

## Auth

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|:---:|------|-------------|
| `POST` | `/register` | ❌ | Any | Register a user. Students must upload a PDF resume (`multipart/form-data`). Recruiters do not need a resume. |
| `POST` | `/login` | ❌ | Any | Login with email + password. Sets a session cookie. |
| `POST` | `/logout` | ✅ | Any | Invalidates the session cookie. |

### `POST /register` — Body (multipart/form-data)
| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| `name` | string | ✅ | Full name |
| `email` | string | ✅ | Lowercased, must be unique |
| `pass` | string | ✅ | Min 6 characters |
| `phone` | string | ✅ | Must be unique |
| `role` | string | ✅ | `"Student"` or `"Recruiter"` |
| `resume` | file (PDF) | Students only | Parsed by Groq LLM; embedding stored in pgvector |

### `POST /login` — Body (JSON)
```json
{ "email": "user@example.com", "pass": "password" }
```

---

## Jobs

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|:---:|------|-------------|
| `GET` | `/jobs` | ❌ | Any | List all jobs, newest first. |
| `GET` | `/jobs/:id` | ❌ | Any | Get a specific job by ID. |
| `GET` | `/jobs/my` | ✅ | Any | Recruiters → their posted jobs. Students → their applications. |
| `POST` | `/jobs` | ✅ | Recruiter | Create a new job. Auto-generates a pgvector embedding. |
| `GET` | `/jobs/:id/matches` | ✅ | Any | Run cosine similarity search — returns top 5 matched student resumes. |

### `POST /jobs` — Body (JSON)
| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| `title` | string | ✅ | Job title |
| `company` | string | ✅ | Company name |
| `description` | string | ✅ | Used to generate the job embedding |
| `location` | string | ❌ | e.g. `"Remote"`, `"Bangalore"` |
| `salary` | string | ❌ | e.g. `"30-50 LPA"` |
| `requiredExperience` | number | ❌ | Minimum years of experience (default: 0) |

---

## Matches

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `GET` | `/jobs/:id/matches` | ✅ | Fetches top 5 student resumes by cosine similarity to the job embedding. Returns `resumeId`, `userId`, `name`, `email`, `similarity` (0–1). |

> **Note:** Both the job and student resumes must have embeddings generated. Embeddings are created automatically on job creation and student registration.

---

## Planned (Not Yet Implemented)

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|:---:|------|-------------|
| `POST` | `/jobs/:id/apply` | ✅ | Student | Apply to a job (form-based, future feature). |

---

## Error Responses

All errors follow this shape:
```json
{ "success": false, "message": "Descriptive error message" }
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request / missing fields |
| `401` | Not authenticated |
| `403` | Forbidden (wrong role) |
| `404` | Resource not found |
| `409` | Conflict (duplicate email/phone) |
| `500` | Internal server error |
