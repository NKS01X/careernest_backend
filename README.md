<div align="center">

# 🐣 CareerNest

**AI-Powered Internship & Job Placement Platform**

_Connecting the right students to the right opportunities — intelligently._

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Redis-DC382D?logo=redis&logoColor=white)](https://bullmq.io/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

---

</div>

## ✨ Overview

**CareerNest** is a backend platform that uses **vector similarity search** to intelligently match students with job and internship opportunities. When a recruiter posts a job, the system automatically generates an embedding from the job description, compares it against candidate resume embeddings using **pgvector cosine similarity**, and notifies the top matches via WhatsApp — all asynchronously through a robust background worker pipeline.

> **Key idea:** Instead of keyword-based filtering, CareerNest understands the _semantic meaning_ of resumes and job descriptions to surface truly relevant matches.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (REST API)                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                     ┌─────────▼──────────┐
                     │   Express 5 Server  │
                     │   (JWT Auth Layer)   │
                     └─────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
   ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
   │  Auth Routes   │  │  Job Routes   │  │ Match Routes  │
   │ /login         │  │ /jobs         │  │ /jobs/:id/    │
   │ /register      │  │ /jobs/my      │  │   matches     │
   │ /logout        │  │ /jobs/:id     │  │               │
   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
           │                   │                   │
           └───────────────────┼───────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
   ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
   │   Prisma ORM   │  │  BullMQ Queue │  │ Grok/xAI API  │
   │  (PostgreSQL)  │  │ (Upstash Redis)│  │ (Embeddings)  │
   └───────┬───────┘  └───────┬───────┘  └───────────────┘
           │                   │
   ┌───────▼───────┐  ┌───────▼──────────────────┐
   │   pgvector     │  │  Background Workers       │
   │ (Vector Search)│  │  ┌─ Job Matching Worker   │
   └───────────────┘  │  └─ Notification Worker   │
                       └──────────────────────────┘
```

---

## 🚀 Features

### 🔐 Authentication & Authorization
- **JWT-based** cookie authentication with secure login/register/logout
- **Role-based access control** — `Student` and `Recruiter` roles
- **Password hashing** using bcrypt

### 📄 Smart Resume Parsing
- **PDF upload** support via Multer
- **AI-powered resume parsing** — extracts skills, projects, work experience, and achievements from uploaded PDFs using an LLM
- Automatically parses unstructured date formats from LLM output

### 💼 Job Management
- Recruiters can **create and manage** job postings
- Students can **browse all jobs** or view specific job details
- Each job stores a **vector embedding** of its description for semantic matching

### 🤖 AI-Powered Job Matching
- **Vector embeddings** generated via the xAI (Grok) Embeddings API
- **Cosine similarity search** powered by `pgvector` on PostgreSQL
- **Hard constraint filtering** (location, experience, role) applied _before_ ranking — ensuring efficient index usage
- Returns the **top N most relevant candidates** per job posting

### 📲 Notification Pipeline
- **BullMQ background workers** process matches asynchronously
- **WhatsApp notifications** sent to matched candidates (mock implementation, ready for Twilio/Meta API)
- **Rate-limited worker** with exponential backoff for production readiness
- Workers run via **Upstash Redis** for serverless-friendly queue management

### 🧪 Comprehensive Testing
- **Unit tests** for services, middleware, and utilities
- **Integration tests** for auth flows and API endpoints
- **Test coverage** reporting via `@vitest/coverage-v8`

---

## 📂 Project Structure

```
internship_placement/
├── prisma/
│   ├── schema.prisma          # Database schema (User, Resume, Job, Application)
│   └── seed-test-data.ts      # Database seeding script
├── src/
│   ├── index.ts               # Express app entry point & route definitions
│   ├── controllers/
│   │   ├── register.controller.ts   # User registration + resume upload
│   │   ├── login.controller.ts      # JWT login
│   │   ├── logout.controller.ts     # Session logout
│   │   ├── jobs.controller.ts       # CRUD for job postings
│   │   └── matches.controller.ts    # Trigger & retrieve top job matches
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification middleware
│   │   ├── role.ts            # Role-based access (isRecruiter, isStudent)
│   │   └── upload.ts          # Multer file upload configuration
│   ├── services/
│   │   ├── embedding.service.ts     # xAI/Grok vector embedding generation
│   │   ├── job.service.ts           # Job business logic
│   │   └── whatsapp.service.ts      # WhatsApp message sender (mock)
│   ├── workers/
│   │   ├── start.ts                 # Worker process entry point
│   │   ├── jobMatching.worker.ts    # pgvector similarity search worker
│   │   └── notification.worker.ts   # WhatsApp notification dispatch worker
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── queue.ts           # BullMQ queue definitions
│   │   └── redis.ts           # Upstash Redis connection
│   └── utils/
│       ├── resumeParser.ts    # AI-powered PDF resume parser
│       └── utils.ts           # bcrypt helpers
├── tests/
│   ├── unit/                  # Unit tests (services, middleware, utils)
│   ├── integration/           # Integration tests (auth, API flows)
│   └── helpers/               # Test utilities and mocks
├── vitest.config.ts           # Vitest test runner configuration
├── tsconfig.json              # TypeScript compiler options
└── package.json
```

---

## 🛠️ Tech Stack

| Layer          | Technology                           |
| -------------- | ------------------------------------ |
| **Runtime**    | Node.js + TypeScript 5.9             |
| **Framework**  | Express 5                            |
| **ORM**        | Prisma 6 (with preview `postgresqlExtensions`) |
| **Database**   | PostgreSQL + `pgvector` extension    |
| **Queue**      | BullMQ + Upstash Redis (`rediss://`) |
| **AI/ML**      | xAI (Grok) Embeddings API via OpenAI SDK |
| **Auth**       | JWT (`jsonwebtoken`) + bcrypt        |
| **File Upload**| Multer (PDF resume parsing)          |
| **PDF Parsing**| `pdf-parse`                          |
| **Testing**    | Vitest + Supertest + Coverage (V8)   |

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** with the [`pgvector`](https://github.com/pgvector/pgvector) extension enabled
- **Redis** instance (recommended: [Upstash](https://upstash.com/) for serverless)
- **xAI API key** for embedding generation

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/internship_placement.git
cd internship_placement
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/careernest"
DIRECT_URL="postgresql://user:password@host:5432/careernest"

# Redis (Upstash)
UPSTASH_REDIS_URL="rediss://default:your-token@your-endpoint.upstash.io:6379"

# AI Embeddings
GROK_API="your-xai-api-key"

# Auth
JWT_SECRET="your-jwt-secret"

# Server
PORT=3000
```

### 3. Set Up the Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed test data
npm run seed
```

### 4. Start the Server

```bash
# Development mode (hot-reload)
npm run dev

# Start background workers (in a separate terminal)
npm run workers
```

The API will be available at `http://localhost:3000`.

---

## 📡 API Reference

### Authentication

| Method | Endpoint    | Auth | Description                        |
| ------ | ----------- | ---- | ---------------------------------- |
| POST   | `/register` | ❌   | Register a new user (with resume for students) |
| POST   | `/login`    | ❌   | Login and receive JWT cookie       |
| POST   | `/logout`   | ✅   | Invalidate session                 |

### Jobs

| Method | Endpoint            | Auth | Role      | Description                     |
| ------ | ------------------- | ---- | --------- | ------------------------------- |
| GET    | `/jobs`             | ❌   | Any       | List all job postings           |
| GET    | `/jobs/:id`         | ❌   | Any       | Get a specific job by ID        |
| GET    | `/jobs/my`          | ✅   | Any       | List jobs created by the user   |
| POST   | `/jobs`             | ✅   | Recruiter | Create a new job posting        |
| GET    | `/jobs/:id/matches` | ✅   | Any       | Get top matching candidates     |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

The test suite includes:

- **Unit tests** — Embedding service, WhatsApp service, middleware (auth & role), resume parser
- **Integration tests** — Full auth flow, job CRUD via Supertest

---

## 🔄 How Matching Works

```mermaid
sequenceDiagram
    participant R as Recruiter
    participant API as Express API
    participant Q as BullMQ Queue
    participant JW as Job Matching Worker
    participant DB as PostgreSQL + pgvector
    participant NW as Notification Worker
    participant S as Student (WhatsApp)

    R->>API: POST /jobs (create job)
    API->>DB: Store job + generate embedding
    API->>Q: Enqueue job-matching task
    Q->>JW: Process job matching
    JW->>DB: Cosine similarity search (with hard filters)
    DB-->>JW: Top N candidates
    JW->>Q: Enqueue notifications for each match
    Q->>NW: Process notification
    NW->>S: Send WhatsApp message
```

1. **Recruiter creates a job** → An embedding is generated from the job description via xAI.
2. **Job Matching Worker** picks up the task, runs a **pgvector cosine similarity** query against all student resume embeddings, applying hard constraints (location, experience level) first.
3. **Top N matches** are enqueued as notification tasks.
4. **Notification Worker** sends WhatsApp messages to matched students with job details and a similarity score.

---

## 📜 Database Schema

The database is structured around five core models:

| Model              | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| **User**           | Students and Recruiters with auth credentials  |
| **Resume**         | Parsed resume data with vector embedding       |
| **Job**            | Job postings with vector embedding             |
| **Project**        | Student projects (linked to Resume)            |
| **WorkExperience** | Work history entries (linked to Resume)        |
| **Application**    | Tracks student applications to jobs            |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

_Built with ❤️ for smarter placements._

**[⬆ Back to Top](#-careernest)**

</div>
