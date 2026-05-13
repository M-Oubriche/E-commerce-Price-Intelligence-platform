from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, desc
from typing import List
from uuid import UUID

from api import deps
from models.users import User, UserRole
from models.reseller import (
    SellerProduct, 
    SellerProductPriceHistory, 
    PriceAlert, 
    TrackedCompetitor,
    SellerStatus
)
from schemas.reseller import (
    SellerProductCreate, SellerProductUpdate, SellerProductOut, SellerProductListResponse, SellerProductResponse,
    PriceHistoryOut, PriceHistoryListResponse,
    PriceAlertCreate, PriceAlertUpdate, PriceAlertOut, PriceAlertListResponse, PriceAlertResponse,
    TrackedCompetitorCreate, TrackedCompetitorOut, TrackedCompetitorListResponse, TrackedCompetitorResponse
)

router = APIRouter()

def check_reseller_role(current_user: User):
    if current_user.role != UserRole.RESELLER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reseller access required"
        )

# --- Seller Products (Catalog) ---

@router.get("/products", response_model=SellerProductListResponse)
async def get_seller_products(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    query = select(SellerProduct).filter(SellerProduct.user_id == current_user.id).order_by(desc(SellerProduct.created_at))
    result = await db.execute(query)
    return {"data": result.scalars().all()}

@router.post("/products", response_model=SellerProductResponse)
async def create_seller_product(
    product_in: SellerProductCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    
    new_product = SellerProduct(
        **product_in.model_dump(),
        user_id=current_user.id,
        price_when_added=product_in.my_price
    )
    db.add(new_product)
    await db.flush() # To get the ID
    
    # Log initial price history
    history = SellerProductPriceHistory(
        seller_product_id=new_product.id,
        user_id=current_user.id,
        old_price=0.0,
        new_price=product_in.my_price
    )
    db.add(history)
    
    await db.commit()
    await db.refresh(new_product)
    return {"data": new_product}

@router.patch("/products/{id}", response_model=SellerProductResponse)
async def update_seller_product(
    id: UUID,
    product_in: SellerProductUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    
    query = select(SellerProduct).filter(SellerProduct.id == id, SellerProduct.user_id == current_user.id)
    result = await db.execute(query)
    product = result.scalars().first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_in.model_dump(exclude_unset=True)
    
    # If price is being updated, log history
    if "my_price" in update_data and update_data["my_price"] != product.my_price:
        history = SellerProductPriceHistory(
            seller_product_id=product.id,
            user_id=current_user.id,
            old_price=product.my_price,
            new_price=update_data["my_price"]
        )
        db.add(history)
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    await db.commit()
    await db.refresh(product)
    return {"data": product}

@router.delete("/products/{id}")
async def delete_seller_product(
    id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    query = delete(SellerProduct).where(SellerProduct.id == id, SellerProduct.user_id == current_user.id)
    result = await db.execute(query)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.commit()
    return {"data": {"message": "Product deleted"}}

@router.get("/products/{id}/history", response_model=PriceHistoryListResponse)
async def get_product_history(
    id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    # Ensure product belongs to user
    prod_query = select(SellerProduct).filter(SellerProduct.id == id, SellerProduct.user_id == current_user.id)
    prod_result = await db.execute(prod_query)
    if not prod_result.scalars().first():
        raise HTTPException(status_code=404, detail="Product not found")
        
    query = select(SellerProductPriceHistory).filter(SellerProductPriceHistory.seller_product_id == id).order_by(desc(SellerProductPriceHistory.recorded_at))
    result = await db.execute(query)
    return {"data": result.scalars().all()}

# --- Price Alerts ---

@router.get("/alerts", response_model=PriceAlertListResponse)
async def get_price_alerts(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    query = select(PriceAlert).filter(PriceAlert.user_id == current_user.id).order_by(desc(PriceAlert.created_at))
    result = await db.execute(query)
    return {"data": result.scalars().all()}

@router.post("/alerts", response_model=PriceAlertResponse)
async def create_price_alert(
    alert_in: PriceAlertCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    
    new_alert = PriceAlert(
        **alert_in.model_dump(),
        user_id=current_user.id
    )
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    return {"data": new_alert}

@router.patch("/alerts/{id}", response_model=PriceAlertResponse)
async def update_price_alert(
    id: UUID,
    alert_in: PriceAlertUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    query = select(PriceAlert).filter(PriceAlert.id == id, PriceAlert.user_id == current_user.id)
    result = await db.execute(query)
    alert = result.scalars().first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    update_data = alert_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)
    
    await db.commit()
    await db.refresh(alert)
    return {"data": alert}

@router.delete("/alerts/{id}")
async def delete_price_alert(
    id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    query = delete(PriceAlert).where(PriceAlert.id == id, PriceAlert.user_id == current_user.id)
    result = await db.execute(query)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.commit()
    return {"data": {"message": "Alert deleted"}}

# --- Competitors ---

@router.get("/competitors", response_model=TrackedCompetitorListResponse)
async def get_tracked_competitors(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    query = select(TrackedCompetitor).filter(TrackedCompetitor.user_id == current_user.id).order_by(desc(TrackedCompetitor.created_at))
    result = await db.execute(query)
    return {"data": result.scalars().all()}

@router.post("/competitors", response_model=TrackedCompetitorResponse)
async def create_tracked_competitor(
    comp_in: TrackedCompetitorCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    
    new_comp = TrackedCompetitor(
        **comp_in.model_dump(),
        user_id=current_user.id
    )
    db.add(new_comp)
    await db.commit()
    await db.refresh(new_comp)
    return {"data": new_comp}

@router.delete("/competitors/{id}")
async def delete_tracked_competitor(
    id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_reseller_role(current_user)
    query = delete(TrackedCompetitor).where(TrackedCompetitor.id == id, TrackedCompetitor.user_id == current_user.id)
    result = await db.execute(query)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Competitor not found")
    await db.commit()
    return {"data": {"message": "Competitor removed"}}
