
import re
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from auth import verify_password, create_access_token, get_current_staff
from database import Base, engine, get_db
from models import FAQEntry, Conversation, Staff

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Arc Lite FAQ Assistant", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://arc-lite-faq-assistant.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request models

class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)


class LoginRequest(BaseModel):
    email: str
    password: str

class RatingRequest(BaseModel):
    rating: str

class FAQCreate(BaseModel):
    category: str
    question: str = Field(min_length=3, max_length=300)
    trigger_keywords: str = Field(min_length=2)
    canonical_answer: str = Field(min_length=3)


class FAQUpdate(BaseModel):
    category: str | None = None
    question: str | None = Field(default=None, min_length=3, max_length=300)
    trigger_keywords: str | None = Field(default=None, min_length=2)
    canonical_answer: str | None = Field(default=None, min_length=3)
    is_active: bool | None = None


# FAQ matching using TF-IDF and cosine similarity

def find_best_faq(question: str, faqs: list[FAQEntry]):
    if not faqs:
        return None

    faq_texts = []

    for faq in faqs:
        combined_text = (
            f"{faq.question} {faq.trigger_keywords.replace(',', ' ')}"
        )
        faq_texts.append(combined_text)

    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2)
    )

    documents = faq_texts + [question]

    try:
        tfidf_matrix = vectorizer.fit_transform(documents)
    except ValueError:
        return None

    faq_vectors = tfidf_matrix[:-1]
    question_vector = tfidf_matrix[-1]

    similarities = cosine_similarity(
        question_vector,
        faq_vectors
    ).flatten()

    best_index = similarities.argmax()
    best_score = similarities[best_index]
    print(f"Best FAQ similarity score: {best_score:.3f}")

    if best_score < 0.25:
        return None

    return faqs[best_index]


# Classify questions that do not match an approved FAQ

def classify_unmatched_question(question: str) -> str:
    tokens = set(re.findall(r"[a-z0-9]+", question.lower()))

    explicit_refusal_terms = {
        "guarantee", "guaranteed", "guarantees",
        "promise", "promises", "assure"
    }

    if tokens & explicit_refusal_terms:
        return "Refused"

    supported_topic_terms = {
        "course", "courses", "enroll", "enrollment",
        "register", "registration", "lesson", "lessons",
        "learning", "study", "certificate", "certificates",
        "completion", "internship", "internships",
        "intern", "job", "jobs", "career", "careers",
        "application", "account", "login", "log",
        "password", "profile", "access",
        "email", "username", "update", "change",
        "download", "interview", "status", "support",
        "contact", "help", "team"
    }

    unrelated_topic_terms = {
        "weather", "forecast", "cricket", "football",
        "match", "movie", "recipe", "politics",
        "stock", "temperature", "celebrity"
    }

    if tokens & unrelated_topic_terms:
        return "Refused"

    if tokens & supported_topic_terms:
        return "Unclear"

    return "Refused"


# Health check

@app.get("/")
def health_check():
    return {"message": "Arc Lite API is running"}


# Public chat endpoint

@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    question = request.question.strip()

    faqs = db.query(FAQEntry).filter(FAQEntry.is_active.is_(True)).all()
    faq = find_best_faq(question, faqs)

    if faq:
        category = faq.category
        verdict = "Answered"
        answer = faq.canonical_answer
        faq_id = faq.id
    else:
        category = "Unclear"
        verdict = classify_unmatched_question(question)
        answer = (
            "I couldn't find a sufficiently reliable match in the approved FAQs. "
            "Please contact the support team for help."
        )
        faq_id = None

    elapsed_ms = round((time.perf_counter() - started_at) * 1000)

    conversation = Conversation(
        question=question,
        category=category,
        verdict=verdict,
        answer=answer,
        faq_id=faq_id,
        response_time_ms=elapsed_ms,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return {
        "category": category,
        "verdict": verdict,
        "answer": answer,
        "conversation_id": conversation.id,
        "response_time_ms": elapsed_ms,
    }


# Staff login

@app.post("/auth/login")
def staff_login(request: LoginRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()

    staff = db.query(Staff).filter(Staff.email == email).first()

    if (
        staff is None
        or not staff.is_active
        or not verify_password(request.password, staff.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(staff.id, staff.email)

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 28800,
    }


# Staff-only: list FAQs

@app.get("/admin/faq")
def list_faqs(
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    faqs = db.query(FAQEntry).order_by(FAQEntry.id).all()

    return [
        {
            "id": faq.id,
            "category": faq.category,
            "question": faq.question,
            "trigger_keywords": faq.trigger_keywords,
            "canonical_answer": faq.canonical_answer,
            "is_active": faq.is_active,
        }
        for faq in faqs
    ]


# Staff-only: create an FAQ

@app.post("/admin/faq", status_code=status.HTTP_201_CREATED)
def create_faq(
    request: FAQCreate,
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    allowed_categories = {"courses", "certificates", "jobs", "account",}
    category = request.category.strip().lower()
    question = request.question.strip()
    keywords = request.trigger_keywords.strip()
    answer = request.canonical_answer.strip()

    if category not in allowed_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category",
        )

    if not question or not keywords or not answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question, keywords, and answer cannot be blank",
        )

    existing = db.query(FAQEntry).filter(
        FAQEntry.question == question
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An FAQ with this question already exists",
        )

    faq = FAQEntry(
        category=category,
        question=question,
        trigger_keywords=keywords,
        canonical_answer=answer,
    )

    db.add(faq)
    db.commit()
    db.refresh(faq)

    return {
        "message": "FAQ created successfully",
        "id": faq.id,
        "category": faq.category,
        "question": faq.question,
        "trigger_keywords": faq.trigger_keywords,
        "canonical_answer": faq.canonical_answer,
        "is_active": faq.is_active,
    }


# Staff-only: update an FAQ

@app.put("/admin/faq/{faq_id}")
def update_faq(
    faq_id: int,
    request: FAQUpdate,
    db: Session = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    faq = db.get(FAQEntry, faq_id)

    if faq is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found",
        )

    updates = request.model_dump(exclude_unset=True)
    allowed_categories = {"courses", "certificates", "jobs", "account"}

    if "category" in updates and updates["category"] is not None:
        updates["category"] = updates["category"].strip().lower()

        if updates["category"] not in allowed_categories:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category",
            )

    for field in ("question", "trigger_keywords", "canonical_answer"):
        if field in updates and updates[field] is not None:
            updates[field] = updates[field].strip()

            if not updates[field]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{field} cannot be blank",
                )

    if "question" in updates and updates["question"] is not None:
        duplicate = db.query(FAQEntry).filter(
            FAQEntry.question == updates["question"],
            FAQEntry.id != faq_id,
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another FAQ already uses this question",
            )

    for field, value in updates.items():
        setattr(faq, field, value)

    db.commit()
    db.refresh(faq)

    return {
        "message": "FAQ updated successfully",
        "id": faq.id,
        "question": faq.question,
        "is_active": faq.is_active,
    }

@app.post("/chat/{conversation_id}/rate")
def rate_conversation(
    conversation_id: int,
    request: RatingRequest,
    db: Session = Depends(get_db)
):
    if request.rating not in ["up", "down"]:
        raise HTTPException(
            status_code=400,
            detail="Rating must be either 'up' or 'down'."
        )

    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found."
        )

    conversation.rating = request.rating
    db.commit()

    return {
        "message": "Rating saved successfully",
        "conversation_id": conversation_id,
        "rating": request.rating
    }
   
@app.get("/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    conversations = db.query(Conversation).all()

    categories = ["courses", "certificates", "jobs", "account","Unclear"]

    verdict_rate_by_category = {}
    average_response_time_by_category = {}

    for category in categories:
        category_conversations = [
            c for c in conversations if c.category == category
        ]

        total = len(category_conversations)

        verdict_counts = {
            "Answered": 0,
            "Refused": 0,
            "Unclear": 0
        }

        for conversation in category_conversations:
            if conversation.verdict in verdict_counts:
                verdict_counts[conversation.verdict] += 1

        verdict_rates = {
            verdict: round((count / total) * 100, 2) if total else 0
            for verdict, count in verdict_counts.items()
        }

        verdict_rate_by_category[category] = {
            "total_conversations": total,
            "verdict_counts": verdict_counts,
            "verdict_rates_percent": verdict_rates
        }

        average_response_time_by_category[category] = (
            round(
                sum(c.response_time_ms for c in category_conversations) / total,
                2
            ) if total else 0
        )
    answered_but_rated_down = [
        {
            "conversation_id": c.id,
            "question": c.question,
            "category": c.category,
            "answer": c.answer,
            "rating": c.rating,
            "response_time_ms": c.response_time_ms
        }
        for c in conversations
        if c.verdict == "Answered" and c.rating == "down"
    ]

    answered_but_rated_up = [
        {
            "conversation_id": c.id,
            "question": c.question,
            "category": c.category,
            "answer": c.answer,
            "rating": c.rating,
            "response_time_ms": c.response_time_ms
        }
        for c in conversations
        if c.verdict == "Answered" and c.rating == "up"
    ]

    return {
        "total_conversations": len(conversations),
        "verdict_rate_by_category": verdict_rate_by_category,
        "average_response_time_ms_by_category": average_response_time_by_category,
        "answered_but_rated_down": answered_but_rated_down,
        "answered_but_rated_up": answered_but_rated_up
    }       