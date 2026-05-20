from pydantic import BaseModel
from typing import Literal


class CategoryCreate(BaseModel):
    name: str
    # Literal tells Pydantic to only accept exactly these two string values.
    # This gives us validation + IDE autocomplete for free.
    type: Literal["income", "expense"]
    color: str = "#000000"
    icon: str = "default"


class CategoryUpdate(BaseModel):
    name: str
    type: Literal["income", "expense"]
    color: str = "#000000"
    icon: str = "default"


class CategoryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: str
    color: str
    icon: str

    model_config = {"from_attributes": True}
