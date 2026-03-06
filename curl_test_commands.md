# CareerNest API Test Commands (cURL)

This document contains automated cURL tests for all endpoints discovered in the CareerNest backend.

**Note:** For the `/register` endpoint (Student), you need a dummy PDF. You can just create a text file with `%PDF-` at the top and rename it to `sample_resume.pdf`, or use any real PDF you have.

## 1. AUTH

### 1.1 Register Student (Requires PDF)
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=John Doe" \
  -F "email=student@test.com" \
  -F "pass=123456" \
  -F "phone=9876543210" \
  -F "role=Student" \
  -F "resume=@sample_resume.pdf"
```

### 1.2 Register Recruiter (No PDF required)
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=Jane Recruiter" \
  -F "email=recruiter@test.com" \
  -F "pass=123456" \
  -F "phone=1234567890" \
  -F "role=Recruiter"
```

### 1.3 Login (Saves cookie to `cookies.txt`)
**Student Login:**
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"student@test.com",
    "pass":"123456"
  }' \
  -c cookies.txt
```

**Recruiter Login:**
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"recruiter@test.com",
    "pass":"123456"
  }' \
  -c cookies-recruiter.txt
```

### 1.4 Logout
```bash
curl -X POST http://localhost:3000/logout \
  -b cookies.txt
```

---

## 2. JOBS (Authenticated & Unauthenticated)

### 2.1 List All Jobs (Unauth)
```bash
curl -X GET http://localhost:3000/jobs
```
--------------------tested-----------------------
### 2.2 Create Job (Authenticated Recruiter)
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -b cookies-recruiter.txt \
  -d '{
    "title": "Backend Fullstack Developer",
    "company": "Tech Innovators",
    "description": "Looking for highly skilled backend engineer proficient in Node.js and PostgreSQL. We need experience in scalable real-time systems.",
    "location": "Remote",
    "salary": "30-50 LPA",
    "requiredExperience": 2
  }'
```

### 2.3 Fetch My Jobs (Authenticated via Token)
```bash
curl -X GET http://localhost:3000/jobs/my \
  -b cookies-recruiter.txt
```

### 2.4 Get Specific Job Details (Unauth)
```bash
# Note: Replace <JOB_ID> with the ID returned from the job creation endpoint
curl -X GET http://localhost:3000/jobs/<JOB_ID>
```

---

## 3. MATCHES

### 3.1 Trigger Resume Matching for a Job (Authenticated, likely admin/recruiter intent)
```bash
curl -X GET http://localhost:3000/jobs/<JOB_ID>/matches \
  -b cookies-recruiter.txt
```

---

## 4. NEGATIVE TESTS & EDGE CASES

### 4.1 Missing Fields on Registration
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "email=incomplete@test.com" \
  -F "pass=123456"
```

### 4.2 Duplicate Email/Phone Registration
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=Duplicate Test" \
  -F "email=student@test.com" \
  -F "pass=123456" \
  -F "phone=9876543210" \
  -F "role=Student" \
  -F "resume=@sample_resume.pdf"
```

### 4.3 Invalid Credentials Login
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"student@test.com",
    "pass":"wrongpassword1!"
  }'
```

### 4.4 Unauthorized Access to Protected Route (Missing Cookie)
```bash
curl -X GET http://localhost:3000/jobs/my
```

### 4.5 Unauthorized Role (Student attempting to Create Job)
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Hacker Job"
  }'
```

### 4.6 Invalid File Upload (Uploading PNG instead of PDF)
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=Invalid File" \
  -F "email=invalid@test.com" \
  -F "pass=123456" \
  -F "phone=5555555555" \
  -F "role=Student" \
  -F "resume=@image.png"
```

### 4.7 Invalid Job ID
```bash
curl -X GET http://localhost:3000/jobs/invalid-uuid-1234/matches \
  -b cookies-recruiter.txt
```
