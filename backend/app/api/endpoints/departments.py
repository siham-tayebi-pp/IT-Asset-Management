from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.app import crud, models, schemas
from backend.app.dependencies import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Department)
def create_department(department: schemas.DepartmentCreate, db: Session = Depends(get_db)):
    db_department = crud.get_department_by_name(db, name=department.name)
    if db_department:
        raise HTTPException(status_code=400, detail="Department already exists")
    return crud.create_department(db=db, department=department)

@router.get("/", response_model=List[schemas.Department])
def read_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    departments = crud.get_departments(db, skip=skip, limit=limit)
    return departments

@router.get("/{department_id}", response_model=schemas.Department)
def read_department(department_id: int, db: Session = Depends(get_db)):
    db_department = crud.get_department(db, department_id=department_id)
    if db_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return db_department
