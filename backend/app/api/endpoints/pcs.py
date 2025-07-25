from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.app import crud, models, schemas
from backend.app.dependencies import get_db

router = APIRouter()

@router.post("/", response_model=schemas.PC)
def create_pc(pc: schemas.PCCreate, db: Session = Depends(get_db)):
    return crud.create_pc(db=db, pc=pc)

@router.get("/", response_model=List[schemas.PC])
def read_pcs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    pcs = crud.get_pcs(db, skip=skip, limit=limit)
    return pcs

@router.get("/{pc_id}", response_model=schemas.PC)
def read_pc(pc_id: int, db: Session = Depends(get_db)):
    db_pc = crud.get_pc(db, pc_id=pc_id)
    if db_pc is None:
        raise HTTPException(status_code=404, detail="PC not found")
    return db_pc
