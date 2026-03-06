# Step-by-Step API Testing Guide 

I have verified the project architecture and logic based on the audit. Everything is fully functional for testing with some known limitations (e.g. vector indexes are missing, Multer runs in memory). 

I have automatically generated a valid 1-page `resume.pdf` for you to use in your tests.

### How to use this guide
Run these commands one-by-one in your terminal. They are ordered chronologically to simulate a full real-world scenario.

---

### Step 1: Register the Student (with `resume.pdf`)
*This creates the Student account and triggers the Grok API resume parser in the background.*

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=Alex Student" \
  -F "email=alex@student.com" \
  -F "pass=123456" \
  -F "phone=9876543210" \
  -F "role=Student" \
  -F "resume=@resume.pdf"
```

---

### Step 2: Register the Recruiter
*Creates the Recruiter account.*

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: multipart/form-data" \
  -F "name=TechCorp HR" \
  -F "email=hr@techcorp.com" \
  -F "pass=123456" \
  -F "phone=1112223333" \
  -F "role=Recruiter"
```

---

### Step 3: Login as Recruiter & Save Session Cookie
*Authenticates the recruiter and saves their session cookie to `cookie.txt` for future requests.*

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"hr@techcorp.com",
    "pass":"123456"
  }' \
  -c cookie.txt
```

---

### Step 4: Create a New Job
*The recruiter creates a job. This saves the job and queues BullMQ to generate Grok embeddings and matched candidates.*

```bash
curl -X POST http://localhost:3000/jobs \
  -b cookie.txt \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Backend Node.js Developer",
    "company": "TechCorp",
    "description": "Looking for Node.js developers with Prisma and PostgreSQL experience.",
    "location": "Remote",
    "salary": "20 LPA",
    "requiredExperience": 0
  }'
```

*(Note: The output from this request will contain `"id": "SOME-UUID"`. Copy that `id` to use in the next steps!)*

---

### Step 5: Check Recruiter's Posted Jobs
*Fetches all jobs created by this specific recruiter.*

```bash
curl -X GET http://localhost:3000/jobs/my \
  -b cookie.txt
```

---

### Step 6: Trigger the Job Matching Algorithm
*Replace `<YOUR_JOB_ID>` with the actual ID you got in Step 4. This will run the vector cosine similarity search comparing the job to the student resumes in the DB.*

```bash
curl -X GET http://localhost:3000/jobs/<YOUR_JOB_ID>/matches \
  -b cookie.txt
```

---

### Step 7: (Optional) Test Public Endpoints
*This does not require the cookie. It lists all jobs currently in the database.*

```bash
curl -X GET http://localhost:3000/jobs
```

---

### Step 8: Logout
*Clears the Recruiter's session.*

```bash
curl -X POST http://localhost:3000/logout \
  -b cookie.txt
```
