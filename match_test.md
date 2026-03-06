# Full Matching Test Script

Run these commands in order. The same `resume.pdf` is reused for all 3 students but with different names/phones.

---

## Step 1 — Register 3 Students

```bash
# Student 1 — Node.js backend developer
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=Nikhil Singh" \
  -F "email=alex@student.com" \
  -F "pass=123456" \
  -F "phone=917630030967" \
  -F "role=Student" \
  -F "resume=@nik.pdf"
```

```bash
# Student 2 — PostgreSQL focused developer
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=Anuj Yadav" \
  -F "email=priya@student.com" \
  -F "pass=123456" \
  -F "phone=919518860844" \
  -F "role=Student" \
  -F "resume=@anuj.pdf"
```

```bash
# Student 3 — Fullstack developer
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=James Fullstack" \
  -F "email=james@student.com" \
  -F "pass=123456" \
  -F "phone=9000000003" \
  -F "role=Student" \
  -F "resume=@resume.pdf"
```

---

## Step 2 — Register and Login as Recruiter

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=HR Manager" \
  -F "email=hr@company.com" \
  -F "pass=123456" \
  -F "phone=9111111111" \
  -F "role=Recruiter"
```

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@company.com","pass":"123456"}' \
  -c cookies-recruiter.txt
```

---

## Step 3 — Create a Job

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -b cookies-recruiter.txt \
  -d '{
    "title": "Backend Node.js Engineer",
    "company": "InnoTech",
    "description": "Expert Node.js backend engineer needed. Must know PostgreSQL, Prisma, and RESTful API design.",
    "location": "Remote",
    "salary": "18-25 LPA",
    "requiredExperience": 0
  }'
```

> Copy the `"id"` from the response and paste it below as `<JOB_ID>`

---

## Step 4 — Trigger Matching

```bash
curl http://localhost:3000/jobs/<JOB_ID>/matches \
  -b cookies-recruiter.txt
```

You should see the top matched students with their similarity scores! 🎯
