from pydantic import BaseModel, Field
from typing import Literal

from app.core.categories import DEFAULT_COLOR, DEFAULT_ICON, Icon

# 6-digit hex color, e.g. "#10b981".
HEX_COLOR = r"^#[0-9a-fA-F]{6}$"


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    # Literal tells Pydantic to only accept exactly these two string values.
    # This gives us validation + IDE autocomplete for free.
    type: Literal["income", "expense"]
    color: str = Field(DEFAULT_COLOR, pattern=HEX_COLOR)
    # Only icons the frontend can render; anything else is a 422.
    icon: Icon = DEFAULT_ICON


class CategoryUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    type: Literal["income", "expense"]
    color: str = Field(DEFAULT_COLOR, pattern=HEX_COLOR)
    icon: Icon = DEFAULT_ICON


class CategoryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: str
    color: str
    icon: str

    model_config = {"from_attributes": True}
