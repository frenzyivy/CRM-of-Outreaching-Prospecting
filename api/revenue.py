"""Revenue & Expenses API endpoints."""

from fastapi import APIRouter, HTTPException

from core.supabase_client import (
    get_expenses,
    add_expense as db_add_expense,
    update_expense as db_update_expense,
    delete_expense as db_delete_expense,
)
from api.schemas import ExpenseCreate, ExpenseUpdate

router = APIRouter(prefix="/api/revenue", tags=["revenue"])


def _get_total(e: dict) -> float:
    return e.get("total_inr") or e.get("amount") or 0


@router.get("/summary")
def revenue_summary():
    """Return revenue, expenses, and computed ROI — all values in INR."""
    expenses = get_expenses()
    tool_spend = sum(_get_total(e) for e in expenses if e.get("category") == "tool")
    api_spend = sum(_get_total(e) for e in expenses if e.get("category") == "api")
    other_spend = sum(_get_total(e) for e in expenses if e.get("category") not in ("tool", "api"))
    total_spent = tool_spend + api_spend + other_spend

    # Revenue from closed_won deals (placeholder — extend with deal_value when available)
    revenue_generated = 0

    roi = round(((revenue_generated - total_spent) / total_spent * 100), 1) if total_spent else 0
    profit_loss = revenue_generated - total_spent

    return {
        "revenue_generated": revenue_generated,
        "total_spent": total_spent,
        "tool_spend": tool_spend,
        "api_spend": api_spend,
        "other_spend": other_spend,
        "roi": roi,
        "profit_loss": profit_loss,
        "expenses": expenses,
    }


@router.post("/expenses")
def add_expense(body: ExpenseCreate):
    if body.base_amount <= 0:
        raise HTTPException(status_code=400, detail="Base amount must be positive")
    if body.category not in ("tool", "api", "salary", "other"):
        raise HTTPException(status_code=400, detail="Invalid category")

    result = db_add_expense(
        name=body.name,
        category=body.category,
        base_amount=body.base_amount,
        tax=body.tax,
        commission=body.commission,
        period=body.period,
        original_usd=body.original_usd,
        payment_date=body.payment_date.isoformat() if body.payment_date else None,
    )
    return {"status": "ok", "expense": result}


@router.put("/expenses/{expense_id}")
def edit_expense(expense_id: str, body: ExpenseUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "base_amount" in updates and updates["base_amount"] <= 0:
        raise HTTPException(status_code=400, detail="Base amount must be positive")
    if "category" in updates and updates["category"] not in ("tool", "api", "salary", "other"):
        raise HTTPException(status_code=400, detail="Invalid category")
    if "payment_date" in updates and updates["payment_date"] is not None:
        updates["payment_date"] = updates["payment_date"].isoformat()

    result = db_update_expense(expense_id, updates)
    return {"status": "ok", "expense": result}


@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: str):
    db_delete_expense(expense_id)
    return {"status": "ok"}
