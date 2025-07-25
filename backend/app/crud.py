from sqlalchemy.orm import Session
from . import models, schemas

# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(email=user.email, username=user.username, full_name=user.full_name, department_id=user.department_id)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# PC CRUD
def get_pc(db: Session, pc_id: int):
    return db.query(models.PC).filter(models.PC.id == pc_id).first()

def get_pcs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.PC).offset(skip).limit(limit).all()

def create_pc(db: Session, pc: schemas.PCCreate):
    db_pc = models.PC(**pc.dict())
    db.add(db_pc)
    db.commit()
    db.refresh(db_pc)
    return db_pc

# Department CRUD
def get_department(db: Session, department_id: int):
    return db.query(models.Department).filter(models.Department.id == department_id).first()

def get_department_by_name(db: Session, name: str):
    return db.query(models.Department).filter(models.Department.name == name).first()

def get_departments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Department).offset(skip).limit(limit).all()

def create_department(db: Session, department: schemas.DepartmentCreate):
    db_department = models.Department(name=department.name)
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department

# Assignment CRUD
def get_assignment(db: Session, assignment_id: int):
    return db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()

def get_assignments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Assignment).offset(skip).limit(limit).all()

def create_assignment(db: Session, assignment: schemas.AssignmentCreate):
    db_assignment = models.Assignment(**assignment.dict())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    # Also update PC status
    db_pc = db.query(models.PC).filter(models.PC.id == assignment.pc_id).first()
    if db_pc:
        db_pc.status = "assigned"
        db.commit()
    return db_assignment
