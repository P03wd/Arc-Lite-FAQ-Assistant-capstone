
import os

from dotenv import load_dotenv
from pwdlib import PasswordHash
from sqlalchemy import select

from database import Base, SessionLocal, engine
from models import FAQEntry, Staff

load_dotenv()
password_hasher = PasswordHash.recommended()

FAQS = [
    # Courses
    {
        "category": "courses",
        "question": "How can I enroll in a course?",
        "trigger_keywords": "enroll, enrollment, register, join course, course signup",
        "canonical_answer": "Browse the available courses in your LearnX account, select your preferred course, and follow the enrollment instructions shown on the course page.",
    },
    {
        "category": "courses",
        "question": "Can I study at my own pace?",
        "trigger_keywords": "self paced, own pace, study anytime, flexible learning",
        "canonical_answer": "Check the specific course page for its schedule and access conditions. Course pacing and deadlines may vary by program.",
    },
    {
        "category": "courses",
        "question": "Where can I find course materials?",
        "trigger_keywords": "course materials, lessons, learning materials, study resources",
        "canonical_answer": "Sign in to your learning account and open your enrolled course to find its available lessons and learning materials.",
    },
    # Certificates
    {
        "category": "certificates",
        "question": "How can I get my course certificate?",
        "trigger_keywords": "certificate, get certificate, download certificate, completion certificate",
        "canonical_answer": "Check your course dashboard for certificate eligibility and completion requirements. Certificate availability depends on the rules of your course.",
    },
    {
        "category": "certificates",
        "question": "When will my certificate be available?",
        "trigger_keywords": "certificate availability, certificate status, when certificate, certificate delay",
        "canonical_answer": "Review your course completion status and certificate section. If the certificate is still unavailable after meeting the stated requirements, contact the course support team.",
    },
    {
        "category": "certificates",
        "question": "What should I do if my certificate has an error?",
        "trigger_keywords": "certificate error, wrong name, incorrect certificate, certificate correction",
        "canonical_answer": "Contact the course support team with a description of the certificate error. Avoid sharing passwords or other sensitive account credentials.",
    },
    # Jobs
    {
        "category": "jobs",
        "question": "Where can I find internship opportunities?",
        "trigger_keywords": "internship, internships, internship opportunities, intern openings",
        "canonical_answer": "Check the official opportunities or careers section provided by your organization for current internship openings and application instructions.",
    },
    {
        "category": "jobs",
        "question": "How do I apply for a job?",
        "trigger_keywords": "job application, apply for job, job opening, careers, vacancy",
        "canonical_answer": "Open the official job listing, review its eligibility criteria, and follow the application instructions provided by the employer.",
    },
    {
        "category": "jobs",
        "question": "How can I check my application status?",
        "trigger_keywords": "application status, job status, interview status, application update",
        "canonical_answer": "Check the application portal or the official email communication from the recruiting organization for status updates.",
    },
    # Account
    {
        "category": "account",
        "question": "How can I reset my password?",
        "trigger_keywords": "reset password, forgot password, change password, password recovery",
        "canonical_answer": "Use the Forgot Password option on the official sign-in page and follow the instructions to reset your password.",
    },
    {
        "category": "account",
        "question": "I cannot log in to my account. What should I do?",
        "trigger_keywords": "cannot login, login problem, sign in issue, account access",
        "canonical_answer": "Check that your sign-in details are correct and try the official password recovery process if needed. If the issue continues, contact the account support team.",
    },
    {
        "category": "account",
        "question": "How can I update my account details?",
        "trigger_keywords": "update account, edit profile, change email, account details, profile information",
        "canonical_answer": "Sign in and open your profile or account settings to check which details you can update. Contact support if a detail cannot be changed.",
    },
]


def seed_database():
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        # Add FAQs only if their questions do not already exist.
        for item in FAQS:
            existing = db.scalar(
                select(FAQEntry).where(FAQEntry.question == item["question"])
            )
            if existing is None:
                db.add(FAQEntry(**item))

        # Create one staff account if it does not already exist.
        email = os.getenv("ADMIN_EMAIL")
        password = os.getenv("ADMIN_PASSWORD")

        if not email or not password:
            raise RuntimeError(
                "ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env"
            )

        staff = db.scalar(select(Staff).where(Staff.email == email))
        if staff is None:
            staff = Staff(
                email=email,
                password_hash=password_hasher.hash(password),
            )
            db.add(staff)

        db.commit()

    print("Seed completed: 12 FAQs and staff account checked.")


if __name__ == "__main__":
    seed_database()
