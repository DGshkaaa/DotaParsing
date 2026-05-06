from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class NewsBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=5000)
    image_url: Optional[str] = Field(None, max_length=500)


class NewsCreate(NewsBase):
    pass


class NewsUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1, max_length=5000)
    image_url: Optional[str] = Field(None, max_length=500)


class NewsResponse(NewsBase):
    id: str = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
