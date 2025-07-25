import csv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.api import api_router
from backend.app.database import engine, SessionLocal
from backend.app import models, crud, schemas

# This will create the tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PC Management System API")

# Set up CORS
origins = [
    "http://localhost:3000",  # The default Next.js dev port
    # You might need to add other origins here for production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    # Check if departments are already populated
    if not crud.get_departments(db, limit=1):
        print("Populating departments table...")
        try:
            # Path is relative to the project root where uvicorn is run
            with open('scripts/departments.csv', 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # The CSV header is 'name'
                    dept_name = row.get('name')
                    if dept_name:
                        # Check if department already exists
                        db_department = crud.get_department_by_name(db, name=dept_name)
                        if not db_department:
                            department = schemas.DepartmentCreate(name=dept_name)
                            crud.create_department(db=db, department=department)
            print("Departments table populated.")
        except FileNotFoundError:
            print("Could not find scripts/departments.csv, skipping population.")
        except Exception as e:
            print(f"An error occurred during department population: {e}")
    db.close()


app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the PC Management System API"}