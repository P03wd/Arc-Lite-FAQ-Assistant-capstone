
from database import Base, engine
import models


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Arc Lite database tables created successfully!")


if __name__ == "__main__":
    init_db()
