from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class DotaEntity(BaseModel):
    """Абстрактний базовий клас для всіх сутностей гри"""
    id: int
    name: Optional[str] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        # Це дозволяє працювати з даними як з об'єктами
        from_attributes = True