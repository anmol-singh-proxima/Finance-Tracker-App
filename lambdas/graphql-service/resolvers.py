"""
GraphQL Resolvers for Finance Tracker Lambda
"""
import uuid
from datetime import date, datetime
from typing import List, Optional

# In-memory storage for demo purposes
# In production, use AWS DynamoDB or RDS
expenses_db = {}
investments_db = {}


def resolve_expenses(user_id: str) -> List:
    """Get all expenses for a user"""
    user_expenses = [exp for exp in expenses_db.values() if exp['user_id'] == user_id]
    return user_expenses


def resolve_investments(user_id: str) -> List:
    """Get all investments for a user"""
    user_investments = [inv for inv in investments_db.values() if inv['user_id'] == user_id]
    return user_investments


def create_expense(
    user_id: str,
    category: str,
    amount: float,
    date_value: date,
    description: Optional[str] = None,
) -> dict:
    """Create a new expense"""
    try:
        expense_id = str(uuid.uuid4())
        expense = {
            'id': expense_id,
            'user_id': user_id,
            'category': category,
            'amount': amount,
            'date': date_value,
            'description': description,
            'created_at': datetime.now(),
        }
        expenses_db[expense_id] = expense
        return {
            'success': True,
            'expense': expense,
            'error': None,
        }
    except Exception as e:
        return {
            'success': False,
            'expense': None,
            'error': str(e),
        }


def update_expense(
    expense_id: str,
    user_id: str,
    category: Optional[str] = None,
    amount: Optional[float] = None,
    date_value: Optional[date] = None,
    description: Optional[str] = None,
) -> dict:
    """Update an expense"""
    try:
        expense = expenses_db.get(expense_id)
        
        if not expense or expense['user_id'] != user_id:
            return {
                'success': False,
                'expense': None,
                'error': 'Expense not found',
            }
        
        # Update fields if provided
        if category is not None:
            expense['category'] = category
        if amount is not None:
            expense['amount'] = amount
        if date_value is not None:
            expense['date'] = date_value
        if description is not None:
            expense['description'] = description
        
        expense['updated_at'] = datetime.now()
        expenses_db[expense_id] = expense
        
        return {
            'success': True,
            'expense': expense,
            'error': None,
        }
    except Exception as e:
        return {
            'success': False,
            'expense': None,
            'error': str(e),
        }


def delete_expense(expense_id: str, user_id: str) -> dict:
    """Delete an expense"""
    try:
        expense = expenses_db.get(expense_id)
        
        if not expense or expense['user_id'] != user_id:
            return {
                'success': False,
                'expense': None,
                'error': 'Expense not found',
            }
        
        del expenses_db[expense_id]
        
        return {
            'success': True,
            'expense': None,
            'error': None,
        }
    except Exception as e:
        return {
            'success': False,
            'expense': None,
            'error': str(e),
        }


def create_investment(
    user_id: str,
    name: str,
    type_val: str,
    amount: float,
    current_value: float,
    purchase_date: date,
    notes: Optional[str] = None,
) -> dict:
    """Create a new investment"""
    try:
        investment_id = str(uuid.uuid4())
        investment = {
            'id': investment_id,
            'user_id': user_id,
            'name': name,
            'type': type_val,
            'amount': amount,
            'current_value': current_value,
            'purchase_date': purchase_date,
            'notes': notes,
            'created_at': datetime.now(),
        }
        investments_db[investment_id] = investment
        return {
            'success': True,
            'investment': investment,
            'error': None,
        }
    except Exception as e:
        return {
            'success': False,
            'investment': None,
            'error': str(e),
        }


def update_investment(
    investment_id: str,
    user_id: str,
    name: Optional[str] = None,
    type_val: Optional[str] = None,
    amount: Optional[float] = None,
    current_value: Optional[float] = None,
    purchase_date: Optional[date] = None,
    notes: Optional[str] = None,
) -> dict:
    """Update an investment"""
    try:
        investment = investments_db.get(investment_id)
        
        if not investment or investment['user_id'] != user_id:
            return {
                'success': False,
                'investment': None,
                'error': 'Investment not found',
            }
        
        # Update fields if provided
        if name is not None:
            investment['name'] = name
        if type_val is not None:
            investment['type'] = type_val
        if amount is not None:
            investment['amount'] = amount
        if current_value is not None:
            investment['current_value'] = current_value
        if purchase_date is not None:
            investment['purchase_date'] = purchase_date
        if notes is not None:
            investment['notes'] = notes
        
        investment['updated_at'] = datetime.now()
        investments_db[investment_id] = investment
        
        return {
            'success': True,
            'investment': investment,
            'error': None,
        }
    except Exception as e:
        return {
            'success': False,
            'investment': None,
            'error': str(e),
        }


def delete_investment(investment_id: str, user_id: str) -> dict:
    """Delete an investment"""
    try:
        investment = investments_db.get(investment_id)
        
        if not investment or investment['user_id'] != user_id:
            return {
                'success': False,
                'investment': None,
                'error': 'Investment not found',
            }
        
        del investments_db[investment_id]
        
        return {
            'success': True,
            'investment': None,
            'error': None,
        }
    except Exception as e:
        return {
            'success': False,
            'investment': None,
            'error': str(e),
        }


def get_dashboard_summary(user_id: str) -> dict:
    """Get dashboard summary for a user"""
    user_expenses = [exp for exp in expenses_db.values() if exp['user_id'] == user_id]
    user_investments = [inv for inv in investments_db.values() if inv['user_id'] == user_id]
    
    total_expenses = sum(exp['amount'] for exp in user_expenses)
    total_invested = sum(inv['amount'] for inv in user_investments)
    total_current_value = sum(inv['current_value'] for inv in user_investments)
    total_returns = total_current_value - total_invested
    net_worth = total_current_value - total_expenses
    
    roi = (total_returns / total_invested * 100) if total_invested > 0 else 0
    
    return {
        'total_expenses': total_expenses,
        'total_invested': total_invested,
        'total_current_value': total_current_value,
        'total_returns': total_returns,
        'net_worth': net_worth,
        'expense_count': len(user_expenses),
        'investment_count': len(user_investments),
        'roi': roi,
    }
