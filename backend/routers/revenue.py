"""Revenue & Expenses API endpoints."""

from fastapi import APIRouter, HTTPException

from core.supabase_client import get_expenses, add_expense as db_add_expense, delete_expense as db_delete_expense
from backend.schemas import ExpenseCreate

router = APIRouter(prefix="/api/revenue", tags=["revenue"])


@router.get("/summary")
def revenue_summary():
    """Return revenue, expenses, and computed ROI."""
    expenses = get_expenses()
    tool_spend = sum(e["amount"] for e in expenses if e.get("category") == "tool")
    api_spend = sum(e["amount"] for e in expenses if e.get("category") == "api")
    other_spend = sum(e["amount"] for e in expenses if e.get("category") not in ("tool", "api"))
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
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if body.category not in ("tool", "api", "salary", "other"):
        raise HTTPException(status_code=400, detail="Invalid category")

    result = db_add_expense(body.name, body.category, body.amount, body.period)
    return {"status": "ok", "expense": result}


@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: str):
    db_delete_expense(expense_id)
    return {"status": "ok"}
