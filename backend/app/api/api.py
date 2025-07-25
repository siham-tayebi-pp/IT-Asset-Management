from fastapi import APIRouter

from backend.app.api.endpoints import users, pcs, departments, assignments

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(pcs.router, prefix="/pcs", tags=["pcs"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(assignments.router, prefix="/assignments", tags=["assignments"])
