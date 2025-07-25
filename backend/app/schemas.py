from pydantic import BaseModel
import datetime
from typing import List, Optional

# Department Schemas
class DepartmentBase(BaseModel):
    name: str

class DepartmentCreate(DepartmentBase):
    pass

class Department(DepartmentBase):
    id: int
    
    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    department_id: Optional[int] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    is_active: bool
    role: str
    department: Optional[Department] = None

    class Config:
        from_attributes = True

# PC Schemas
class PCBase(BaseModel):
    serial_number: str
    model: str
    status: Optional[str] = "available"

class PCCreate(PCBase):
    pass

class PC(PCBase):
    id: int

    class Config:
        from_attributes = True

# Assignment Schemas
class AssignmentBase(BaseModel):
    user_id: int
    pc_id: int

class AssignmentCreate(AssignmentBase):
    pass

class Assignment(AssignmentBase):
    id: int
    assignment_date: datetime.datetime
    return_date: Optional[datetime.datetime] = None
    user: User
    pc: PC

    class Config:
        from_attributes = True
