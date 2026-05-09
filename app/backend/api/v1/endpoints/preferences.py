from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from api import deps
from models.users import User
from models.preferences import AlertPreference, DisplayPreference
from schemas.preferences import (
    AlertPreferencesUpdate, AlertPreferencesOut,
    DisplayPreferencesUpdate, DisplayPreferencesOut
)

router = APIRouter()

@router.get("/alerts", response_model=dict)
async def get_alert_preferences(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(AlertPreference).filter(AlertPreference.user_id == current_user.id)
    )
    prefs = result.scalars().first()
    
    if not prefs:
        prefs = AlertPreference(user_id=current_user.id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
        
    prefs_out = AlertPreferencesOut.model_validate(prefs)
    return {"data": prefs_out.model_dump()}

@router.patch("/alerts", response_model=dict)
async def update_alert_preferences(
    prefs_in: AlertPreferencesUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(AlertPreference).filter(AlertPreference.user_id == current_user.id)
    )
    prefs = result.scalars().first()
    
    if not prefs:
        prefs = AlertPreference(user_id=current_user.id)
        db.add(prefs)

    update_data = prefs_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)

    await db.commit()
    await db.refresh(prefs)
    prefs_out = AlertPreferencesOut.model_validate(prefs)
    return {"data": prefs_out.model_dump()}

@router.get("/display", response_model=dict)
async def get_display_preferences(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(DisplayPreference).filter(DisplayPreference.user_id == current_user.id)
    )
    prefs = result.scalars().first()
    
    if not prefs:
        prefs = DisplayPreference(user_id=current_user.id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
        
    prefs_out = DisplayPreferencesOut.model_validate(prefs)
    return {"data": prefs_out.model_dump()}

@router.patch("/display", response_model=dict)
async def update_display_preferences(
    prefs_in: DisplayPreferencesUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(DisplayPreference).filter(DisplayPreference.user_id == current_user.id)
    )
    prefs = result.scalars().first()
    
    if not prefs:
        prefs = DisplayPreference(user_id=current_user.id)
        db.add(prefs)

    update_data = prefs_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)

    await db.commit()
    await db.refresh(prefs)
    prefs_out = DisplayPreferencesOut.model_validate(prefs)
    return {"data": prefs_out.model_dump()}
