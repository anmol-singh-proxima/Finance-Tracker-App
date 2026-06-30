"""
GraphQL Schema for Finance Tracker API
"""
import strawberry
from typing import List, Optional
from datetime import date, datetime
from resolvers import (
    Query,
    Mutation,
    resolve_expenses,
    resolve_investments,
    create_expense,
    update_expense,
    delete_expense,
    create_investment,
    update_investment,
    delete_investment,
)


@strawberry.type
class Expense:
    id: str
    user_id: str
    category: str
    amount: float
    date: date
    description: Optional[str] = None
    created_at: datetime


@strawberry.type
class Investment:
    id: str
    user_id: str
    name: str
    type: str
    amount: float
    current_value: float
    purchase_date: date
    notes: Optional[str] = None
    created_at: datetime


@strawberry.type
class DashboardSummary:
    total_expenses: float
    total_invested: float
    total_current_value: float
    total_returns: float
    net_worth: float
    expense_count: int
    investment_count: int
    roi: float


@strawberry.type
class Query:
    @strawberry.field
    def expenses(self, user_id: str) -> List[Expense]:
        """Get all expenses for a user"""
        return resolve_expenses(user_id)

    @strawberry.field
    def investments(self, user_id: str) -> List[Investment]:
        """Get all investments for a user"""
        return resolve_investments(user_id)

    @strawberry.field
    def dashboard_summary(self, user_id: str) -> DashboardSummary:
        """Get dashboard summary for a user"""
        from resolvers import get_dashboard_summary
        return get_dashboard_summary(user_id)


@strawberry.type
class ExpensePayload:
    success: bool
    expense: Optional[Expense] = None
    error: Optional[str] = None


@strawberry.type
class InvestmentPayload:
    success: bool
    investment: Optional[Investment] = None
    error: Optional[str] = None


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_expense(
        self,
        user_id: str,
        category: str,
        amount: float,
        date: date,
        description: Optional[str] = None,
    ) -> ExpensePayload:
        """Create a new expense"""
        result = create_expense(user_id, category, amount, date, description)
        return result

    @strawberry.mutation
    def update_expense(
        self,
        id: str,
        user_id: str,
        category: Optional[str] = None,
        amount: Optional[float] = None,
        date: Optional[date] = None,
        description: Optional[str] = None,
    ) -> ExpensePayload:
        """Update an expense"""
        result = update_expense(id, user_id, category, amount, date, description)
        return result

    @strawberry.mutation
    def delete_expense(self, id: str, user_id: str) -> ExpensePayload:
        """Delete an expense"""
        result = delete_expense(id, user_id)
        return result

    @strawberry.mutation
    def create_investment(
        self,
        user_id: str,
        name: str,
        type: str,
        amount: float,
        current_value: float,
        purchase_date: date,
        notes: Optional[str] = None,
    ) -> InvestmentPayload:
        """Create a new investment"""
        result = create_investment(user_id, name, type, amount, current_value, purchase_date, notes)
        return result

    @strawberry.mutation
    def update_investment(
        self,
        id: str,
        user_id: str,
        name: Optional[str] = None,
        type: Optional[str] = None,
        amount: Optional[float] = None,
        current_value: Optional[float] = None,
        purchase_date: Optional[date] = None,
        notes: Optional[str] = None,
    ) -> InvestmentPayload:
        """Update an investment"""
        result = update_investment(id, user_id, name, type, amount, current_value, purchase_date, notes)
        return result

    @strawberry.mutation
    def delete_investment(self, id: str, user_id: str) -> InvestmentPayload:
        """Delete an investment"""
        result = delete_investment(id, user_id)
        return result


# Create the schema
schema = strawberry.Schema(query=Query, mutation=Mutation)
