# Arc Lite – ArchintX FAQ Assistant

## Project Overview

Arc Lite is an AI-powered FAQ assistant developed as part of the ArchintX AI Engineer Internship capstone.

It provides answers to user questions using an approved FAQ knowledge base. The system follows the principle **"Refuse, Don't Guess."** If a question cannot be confidently matched with an approved FAQ, Arc Lite returns a Refused or Unclear response instead of inventing an answer.

## Live Application

- **Frontend:** https://arc-lite-faq-assistant-capstone.vercel.app
- **Backend API:** https://arc-lite-backend.onrender.com
- **GitHub Repository:** https://github.com/P03wd/Arc-Lite-FAQ-Assistant-capstone
- **Staff Dashboard:** https://arc-lite-faq-assistant-capstone.vercel.app/staff

## Features

### Public Chat Assistant

- Allows users to ask questions without logging in.
- Matches questions against approved FAQ entries.
- Displays the matched category: Courses, Certificates, Jobs, or Account.
- Returns Answered, Refused, or Unclear verdicts.
- Records every conversation in the database.
- Supports thumbs-up and thumbs-down feedback.

### Staff Dashboard

- Secure staff login using email and password.
- JWT-based authentication.
- Add and edit FAQ entries.
- View total conversation statistics.
- View verdict rates by category.
- View average response time by category.
- Review conversations marked Answered but rated down.
- Review conversations marked Answered but rated up.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL (Neon) |
| ORM | SQLAlchemy |
| Authentication | JWT |
| Password Security | Argon2 password hashing |
| FAQ Matching | TF-IDF and Cosine Similarity |
| Charts | Recharts |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Database Hosting | Neon |

## Project Structure

```text
Arc-Lite-FAQ-Assistant-capstone/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── .gitignore
├── vercel.json
└── README.md
```

## Database Schema

Arc Lite uses a PostgreSQL database hosted on Neon.

The database contains three main entities:

### 1. faq_entries

Stores approved FAQ knowledge-base entries.

- `id` – Unique FAQ identifier.
- `category` – Courses, Certificates, Jobs, or Account.
- `question` – Approved FAQ question.
- `keywords` – Trigger keywords used for matching.
- `answer` – Canonical approved answer.

### 2. conversations

Stores user interactions and assistant responses.

- `id` – Unique conversation identifier.
- `question` – User's submitted question.
- `answer` – Assistant response.
- `category` – Matched FAQ category or Unclear.
- `verdict` – Answered, Refused, or Unclear.
- `response_time_ms` – Actual response time in milliseconds.
- `rating` – User feedback (up or down, when provided).

### 3. staff

Stores authorized staff accounts.

- `id` – Unique staff identifier.
- `email` – Staff email address.
- `password_hash` – Securely hashed password.

Passwords are never stored in plain text.

## FAQ Matching Algorithm

Arc Lite uses TF-IDF (Term Frequency–Inverse Document Frequency) and cosine similarity to compare user questions with approved FAQ questions and trigger keywords.

### Matching Process

1. The user submits a question through the public chat interface.
2. The backend processes the question and compares it against the FAQ knowledge base.
3. TF-IDF converts the FAQ text and user question into numerical representations.
4. Cosine similarity calculates how closely the question matches the approved FAQ entries.
5. The backend checks the similarity score against the configured confidence threshold of `0.25`.
6. If a sufficiently confident match is found, Arc Lite returns the approved canonical answer and its category.
7. If no confident match is found, Arc Lite returns Refused or Unclear rather than generating an unsupported answer.
8. Every conversation and its actual response time are stored in the database.

The matching configuration uses lowercase text processing, English stop-word removal, and unigrams and bigrams.

## API Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/chat` | Public | Submit a question and receive an answer |
| POST | `/chat/{id}/rate` | Public | Submit thumbs-up or thumbs-down feedback |
| POST | `/auth/login` | Public | Staff authentication |
| GET | `/admin/faq` | Staff | Retrieve FAQ entries |
| POST | `/admin/faq` | Staff | Add an FAQ entry |
| PUT | `/admin/faq/{faq_id}` | Staff | Edit an FAQ entry |
| GET | `/admin/stats` | Staff | Retrieve conversation analytics |

Staff-only endpoints require valid authentication.

## Local Setup Instructions

### Prerequisites

- Python 3.13 or compatible Python version.
- Node.js and npm.
- PostgreSQL database.

### 1. Clone the Repository

```bash
git clone https://github.com/P03wd/Arc-Lite-FAQ-Assistant-capstone.git
cd Arc-Lite-FAQ-Assistant-capstone
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the backend folder with:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
ADMIN_EMAIL=your_staff_email
ADMIN_PASSWORD=your_staff_password
```

Use your own secure values. Do not commit the `.env` file.

Start the backend:

```bash
python -m uvicorn main:app --reload --port 8000
```

Backend local URL: `http://127.0.0.1:8000`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend folder:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

Frontend local URL: `http://localhost:5173`

## Deployment

- Frontend is deployed on Vercel.
- Backend is deployed on Render.
- PostgreSQL database is hosted on Neon.
- The deployed frontend communicates with the deployed backend using the `VITE_API_URL` environment variable.
- Backend CORS configuration allows the deployed frontend origin.

## Security

- Staff authentication uses JWT tokens.
- Passwords are hashed using Argon2.
- Staff-only endpoints require authentication.
- No public staff registration is provided.
- Environment variables are used for sensitive configuration.
- Unmatched questions are not answered with invented information.

## Capstone Objective

The objective of Arc Lite is to build a real, deployed FAQ-answering service that provides reliable answers from an approved knowledge base, records conversations, collects feedback, and generates live analytics.

**Core Principle: Refuse, Don't Guess.**