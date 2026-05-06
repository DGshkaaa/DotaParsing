from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    steam_id: str


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    is_admin: bool


class UserResponse(UserBase):
    id: str = Field(..., alias="_id")
    is_admin: bool = Field(default=False)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True
