import logging
from datetime import datetime, date
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from .budget import BudgetService
from .notification import NotificationService
from ..models.category import Category
from ..schemas.notification import BudgetNotificationData

logger = logging.getLogger(__name__)


class BudgetMonitorService:
    """Service for monitoring budgets and triggering notifications."""
    
    def __init__(self, db: Session):
        self.db = db
        self.budget_service = BudgetService(db)
        self.notification_service = NotificationService(db)

    def check_user_budget_alerts(self, user_id: int) -> List[Dict[str, Any]]:
        """Check budget alerts for a specific user and send notifications if needed."""
        alerts = self.budget_service.check_budget_alerts(user_id)
        notifications_sent = []

        for alert in alerts:
            # Get category name for the notification
            category = self.db.query(Category).filter(Category.id == alert['category_id']).first()
            category_name = category.name if category else f"Category {alert['category_id']}"

            # Get the budget to calculate proper amounts
            budget = self.budget_service.get_budget_with_spending(alert['budget_id'], user_id)
            if not budget:
                continue
                
            # Create notification data
            notification_data = BudgetNotificationData(
                budget_id=alert['budget_id'],
                category_id=alert['category_id'],
                category_name=category_name,
                current_spending=float(budget.current_spending or 0),
                budget_amount=float(budget.amount),
                percentage_used=alert['percentage_used'],
                notification_type='budget_exceeded' if alert['type'] == 'over_budget' else 'budget_warning'
            )

            # Send notification
            sent_count = self.notification_service.send_budget_notification(user_id, notification_data)
            
            notifications_sent.append({
                'alert': alert,
                'notifications_sent': sent_count,
                'notification_data': notification_data.dict()
            })

        return notifications_sent

    def check_all_users_budget_alerts(self) -> Dict[str, Any]:
        """Check budget alerts for all users with active budgets."""
        # Get all users with active budgets
        from ..models.user import User
        from ..models.budget import Budget
        
        users_with_budgets = self.db.query(User.id).join(Budget).filter(
            Budget.start_date <= date.today(),
            Budget.end_date >= date.today()
        ).distinct().all()

        total_users_checked = 0
        total_notifications_sent = 0
        user_results = []

        for (user_id,) in users_with_budgets:
            try:
                user_notifications = self.check_user_budget_alerts(user_id)
                user_notification_count = sum(result['notifications_sent'] for result in user_notifications)
                
                user_results.append({
                    'user_id': user_id,
                    'alerts_found': len(user_notifications),
                    'notifications_sent': user_notification_count,
                    'details': user_notifications
                })
                
                total_users_checked += 1
                total_notifications_sent += user_notification_count
                
                logger.info(f"Checked budget alerts for user {user_id}: {len(user_notifications)} alerts, {user_notification_count} notifications sent")
                
            except Exception as e:
                logger.error(f"Error checking budget alerts for user {user_id}: {str(e)}")
                user_results.append({
                    'user_id': user_id,
                    'error': str(e)
                })

        logger.info(f"Budget monitoring completed: {total_users_checked} users checked, {total_notifications_sent} notifications sent")
        
        return {
            'total_users_checked': total_users_checked,
            'total_notifications_sent': total_notifications_sent,
            'timestamp': datetime.utcnow().isoformat(),
            'user_results': user_results
        }

    def get_budget_status_for_user(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive budget status for a user without sending notifications."""
        budgets_with_spending = self.budget_service.get_budgets_with_spending(user_id, active_only=True)
        budget_summary = self.budget_service.get_budget_summary(user_id)
        
        budget_statuses = []
        for budget in budgets_with_spending:
            # Get category name
            category = self.db.query(Category).filter(Category.id == budget.category_id).first()
            category_name = category.name if category else f"Category {budget.category_id}"
            
            status = "normal"
            if budget.percentage_used >= 100:
                status = "exceeded"
            elif budget.percentage_used >= 80:
                status = "warning"
            
            budget_statuses.append({
                'budget_id': budget.id,
                'category_id': budget.category_id,
                'category_name': category_name,
                'amount': float(budget.amount),
                'current_spending': float(budget.current_spending or 0),
                'remaining_amount': float(budget.remaining_amount or 0),
                'percentage_used': budget.percentage_used or 0,
                'period_type': budget.period_type,
                'start_date': budget.start_date.isoformat(),
                'end_date': budget.end_date.isoformat(),
                'status': status
            })

        return {
            'user_id': user_id,
            'summary': {
                'total_budgets': budget_summary.total_budgets,
                'total_budget_amount': float(budget_summary.total_budget_amount),
                'total_spending': float(budget_summary.total_spending),
                'total_remaining': float(budget_summary.total_remaining),
                'budgets_over_limit': budget_summary.budgets_over_limit,
                'budgets_near_limit': budget_summary.budgets_near_limit
            },
            'budgets': budget_statuses,
            'timestamp': datetime.utcnow().isoformat()
        }