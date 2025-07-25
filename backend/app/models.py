from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship
import datetime

from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    role = Column(String, default="user") # e.g., 'user', 'manager', 'admin'
    is_active = Column(Boolean, default=True)
    department_id = Column(Integer, ForeignKey("departments.id"))

    department = relationship("Department", back_populates="users")
    assignments = relationship("Assignment", back_populates="user")

class PC(Base):
    __tablename__ = "pcs"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String, unique=True, index=True)
    model = Column(String)
    status = Column(String, default="available") # e.g., 'available', 'assigned', 'in_repair'
    
    assignments = relationship("Assignment", back_populates="pc")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    users = relationship("User", back_populates="department")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    pc_id = Column(Integer, ForeignKey("pcs.id"))
    assignment_date = Column(DateTime, default=datetime.datetime.utcnow)
    return_date = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="assignments")
    pc = relationship("PC", back_populates="assignments")
