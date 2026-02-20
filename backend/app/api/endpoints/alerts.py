"""
Price alerts and notifications API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.core.dependencies import get_current_user, get_db
from supabase import Client

router = APIRouter()


class PriceAlertCreate(BaseModel):
    """Create price alert request"""
    ticker: str = Field(..., description="Stock ticker symbol")
    condition: str = Field(..., description="Alert condition: 'above' or 'below'")
    target_price: float = Field(..., gt=0, description="Target price to trigger alert")


class PriceAlertResponse(BaseModel):
    """Price alert response"""
    id: str
    ticker: str
    condition: str
    target_price: float
    is_active: bool
    triggered_at: Optional[datetime] = None
    triggered_price: Optional[float] = None
    created_at: datetime


class NotificationResponse(BaseModel):
    """Notification response"""
    id: str
    type: str
    title: str
    message: str
    data: Optional[dict] = None
    is_read: bool
    created_at: datetime


@router.post("/alerts", response_model=PriceAlertResponse)
async def create_price_alert(
    alert: PriceAlertCreate,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Create a new price alert
    
    User will be notified when stock price crosses the target
    """
    # Validate condition
    if alert.condition not in ('above', 'below'):
        raise HTTPException(
            status_code=400,
            detail="Condition must be 'above' or 'below'"
        )
    
    # Validate ticker exists
    result = db.table('stocks').select('ticker').eq('ticker', alert.ticker.upper()).execute()
    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=f"Stock {alert.ticker} not found. Please search for it first."
        )
    
    try:
        # Create alert
        alert_data = {
            "user_id": current_user["id"],
            "ticker": alert.ticker.upper(),
            "condition": alert.condition,
            "target_price": alert.target_price,
            "is_active": True
        }
        
        result = db.table('price_alerts').insert(alert_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create alert")
        
        return result.data[0]
    
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="Alert already exists for this price and condition"
            )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts", response_model=List[PriceAlertResponse])
async def get_price_alerts(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Get all price alerts for current user"""
    try:
        query = db.table('price_alerts')\
            .select('*')\
            .eq('user_id', current_user["id"])\
            .order('created_at', desc=True)
        
        if is_active is not None:
            query = query.eq('is_active', is_active)
        
        result = query.execute()
        
        return result.data or []
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/{ticker}", response_model=List[PriceAlertResponse])
async def get_alerts_for_ticker(
    ticker: str,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Get all alerts for a specific ticker"""
    try:
        result = db.table('price_alerts')\
            .select('*')\
            .eq('user_id', current_user["id"])\
            .eq('ticker', ticker.upper())\
            .order('created_at', desc=True)\
            .execute()
        
        return result.data or []
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/alerts/{alert_id}")
async def delete_price_alert(
    alert_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Delete a price alert"""
    try:
        # Verify ownership
        result = db.table('price_alerts')\
            .select('user_id')\
            .eq('id', str(alert_id))\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        if result.data[0]['user_id'] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Delete alert
        db.table('price_alerts').delete().eq('id', str(alert_id)).execute()
        
        return {"message": "Alert deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/alerts/{alert_id}/toggle")
async def toggle_alert(
    alert_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Toggle alert active status"""
    try:
        # Get current status
        result = db.table('price_alerts')\
            .select('is_active, user_id')\
            .eq('id', str(alert_id))\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        if result.data[0]['user_id'] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Toggle status
        new_status = not result.data[0]['is_active']
        result = db.table('price_alerts')\
            .update({'is_active': new_status})\
            .eq('id', str(alert_id))\
            .execute()
        
        return {"is_active": new_status}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = Query(False, description="Get only unread notifications"),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Get user notifications"""
    try:
        query = db.table('notifications')\
            .select('*')\
            .eq('user_id', current_user["id"])\
            .order('created_at', desc=True)\
            .limit(limit)
        
        if unread_only:
            query = query.eq('is_read', False)
        
        result = query.execute()
        
        return result.data or []
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Mark a notification as read"""
    try:
        # Verify ownership
        result = db.table('notifications')\
            .select('user_id')\
            .eq('id', str(notification_id))\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        if result.data[0]['user_id'] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Mark as read
        db.table('notifications')\
            .update({'is_read': True})\
            .eq('id', str(notification_id))\
            .execute()
        
        return {"message": "Notification marked as read"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Mark all notifications as read"""
    try:
        db.table('notifications')\
            .update({'is_read': True})\
            .eq('user_id', current_user["id"])\
            .eq('is_read', False)\
            .execute()
        
        return {"message": "All notifications marked as read"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Delete a notification"""
    try:
        # Verify ownership
        result = db.table('notifications')\
            .select('user_id')\
            .eq('id', str(notification_id))\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        if result.data[0]['user_id'] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Delete notification
        db.table('notifications').delete().eq('id', str(notification_id)).execute()
        
        return {"message": "Notification deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Get count of unread notifications"""
    try:
        result = db.table('notifications')\
            .select('id', count='exact')\
            .eq('user_id', current_user["id"])\
            .eq('is_read', False)\
            .execute()
        
        return {"count": result.count or 0}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
