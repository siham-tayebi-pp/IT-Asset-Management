from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.app import crud, models, schemas
from backend.app.dependencies import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Assignment)
def create_assignment(assignment: schemas.AssignmentCreate, db: Session = Depends(get_db)):
    # Check if user and PC exist
    user = crud.get_user(db, user_id=assignment.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    pc = crud.get_pc(db, pc_id=assignment.pc_id)
    if not pc:
        raise HTTPException(status_code=404, detail="PC not found")
    if pc.status != "available":
        raise HTTPException(status_code=400, detail="PC is not available for assignment")
        
    return crud.create_assignment(db=db, assignment=assignment)

@router.get("/", response_model=List[schemas.Assignment])
def read_assignments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    assignments = crud.get_assignments(db, skip=skip, limit=limit)
    return assignments

@router.get("/{assignment_id}", response_model=schemas.Assignment)
def read_assignment(assignment_id: int, db: Session = Depends(get_db)):
    db_assignment = crud.get_assignment(db, assignment_id=assignment_id)
    if db_assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return db_assignment
