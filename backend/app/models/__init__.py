"""Shared model helpers.

ORM model modules live under ``app.modules``. Avoid importing them here:
Python loads this package before ``app.models.base_model``, and eager model
imports create circular imports during FastAPI startup.
"""
