"""
pagination.py - Reusable Pagination Utilities.

Provides:
  - PaginationParams: a Depends-injectable query param bundle.
  - PagedResponse: the standard envelope for paginated list responses.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel

from app.config import get_settings

settings = get_settings()

T = TypeVar("T")


# ── Query Parameter Bundle ─────────────────────────────────────────────────────
@dataclass
class PaginationParams:
    """
    Inject into route handlers as: params: PaginationParams = Depends().
    Automatically parsed from ?page=1&page_size=20 query strings.
    """
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Query(
        default=settings.DEFAULT_PAGE_SIZE,
        ge=1,
        le=settings.MAX_PAGE_SIZE,
        description="Number of items per page",
    )

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


# ── Response Envelope ──────────────────────────────────────────────────────────
class PagedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response wrapper.

    Example usage in a router:
        return PagedResponse(items=leads, total=100, page=1, page_size=20)
    """
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(
        cls,
        items: list[T],
        total: int,
        params: PaginationParams,
    ) -> "PagedResponse[T]":
        import math
        return cls(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=math.ceil(total / params.page_size) if params.page_size else 0,
        )
