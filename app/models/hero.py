from .base_entity import DotaEntity

class Hero(DotaEntity):
    """Клас Героя (Успадкування)"""
    primary_attr: str
    attack_type: str
    roles: list[str]
    win_rate: float = 0.0
    pick_rate: float = 0.0