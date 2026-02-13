from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import hashlib
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

app = FastAPI(title="CLOCKLN API", version="2.0.0")
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class UserRole:
    EMPLOYEE = "employee"
    HR = "hr"
    MANAGER = "manager"

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    timezone: str = "UTC"
    default_language: str = "en"
    weekly_hours: int = 40
    vacation_days_per_year: int = 30  # Default vacation days
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyCreate(BaseModel):
    name: str
    timezone: str = "UTC"
    default_language: str = "en"
    weekly_hours: int = 40
    vacation_days_per_year: int = 30

class WorkMode:
    ONSITE = "onsite"  # Presencial - só pode bater ponto no totem
    REMOTE = "remote"  # Remoto - pode bater ponto por geolocalização
    HYBRID = "hybrid"  # Híbrido - pode usar ambos

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = UserRole.EMPLOYEE
    company_id: str
    pin: Optional[str] = None
    language: str = "en"
    timezone: str = "UTC"
    is_active: bool = True
    vacation_days_total: int = 30  # Total vacation days entitled
    vacation_days_used: int = 0    # Vacation days already used
    hire_date: Optional[str] = None  # YYYY-MM-DD
    work_mode: str = WorkMode.ONSITE  # onsite, remote, hybrid
    home_location: Optional[dict] = None  # {"lat": x, "lng": y} for remote workers
    location_radius_meters: int = 100  # Allowed radius from home location
    manager_id: Optional[str] = None  # ID of the manager for this employee
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = UserRole.EMPLOYEE
    company_id: Optional[str] = None  # Optional for initial registration
    pin: Optional[str] = None
    language: str = "en"
    timezone: str = "UTC"
    vacation_days_total: int = 30
    hire_date: Optional[str] = None
    work_mode: str = WorkMode.ONSITE
    home_location: Optional[dict] = None
    location_radius_meters: int = 100
    manager_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PinLogin(BaseModel):
    pin: str
    company_id: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    company_id: str
    language: str
    timezone: str
    is_active: bool
    vacation_days_total: int = 30
    vacation_days_used: int = 0
    work_mode: str = "onsite"
    home_location: Optional[dict] = None
    location_radius_meters: int = 100

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ClockRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    clock_in: datetime
    clock_out: Optional[datetime] = None
    total_hours: Optional[float] = None
    overtime_hours: float = 0
    date: str  # YYYY-MM-DD
    status: str = "present"  # present, absent, vacation, sick
    clock_method: str = "qr"  # qr, geolocation
    location: Optional[dict] = None  # {"lat": x, "lng": y} for geolocation clock-ins
    outside_radius: bool = False  # Flag for alerts
    distance_from_home: Optional[int] = None  # Distance in meters
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QRCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    code: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QRClockIn(BaseModel):
    qr_code: str

class GeoClockIn(BaseModel):
    latitude: float
    longitude: float

class UpdateUser(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    pin: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None
    vacation_days_total: Optional[int] = None
    vacation_days_used: Optional[int] = None
    work_mode: Optional[str] = None
    home_location: Optional[dict] = None
    location_radius_meters: Optional[int] = None

# Phase 2 Models
class Absence(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    date: str  # YYYY-MM-DD
    type: str  # absent, vacation, sick, holiday
    reason: Optional[str] = None
    approved: bool = False
    approved_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AbsenceCreate(BaseModel):
    date: str
    type: str
    reason: Optional[str] = None

class VacationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    start_date: str
    end_date: str
    days_count: int
    reason: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VacationRequestCreate(BaseModel):
    start_date: str
    end_date: str
    reason: Optional[str] = None

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: Optional[str] = None  # None = all employees
    title: str
    message: str
    type: str = "info"  # info, warning, success, error
    read: bool = False
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    user_id: Optional[str] = None
    title: str
    message: str
    type: str = "info"

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    filename: str
    file_type: str
    file_data: str  # Base64 encoded
    doc_type: str  # medical_certificate, justification, other
    description: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TotemClockEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str
    user_name: str
    action: str  # clock_in, clock_out
    time: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in meters using Haversine formula"""
    import math
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_hr(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in [UserRole.HR, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="HR or Manager access required")
    return current_user

async def require_hr_only(current_user: dict = Depends(get_current_user)):
    """Require HR role only (not manager)"""
    if current_user.get("role") != UserRole.HR:
        raise HTTPException(status_code=403, detail="HR access required")
    return current_user

async def get_managed_users(manager_id: str, company_id: str) -> List[str]:
    """Get list of user IDs managed by a manager"""
    users = await db.users.find({
        "company_id": company_id,
        "manager_id": manager_id
    }, {"_id": 0, "id": 1}).to_list(500)
    return [u['id'] for u in users]

def calculate_work_days(start_date: str, end_date: str) -> int:
    """Calculate number of work days between two dates (excluding weekends)"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    days = 0
    current = start
    while current <= end:
        if current.weekday() < 5:  # Monday to Friday
            days += 1
        current += timedelta(days=1)
    return days

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register-company", response_model=dict)
async def register_company(company: CompanyCreate, user: UserCreate):
    """Register a new company with initial HR user"""
    existing = await db.companies.find_one({"name": company.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Company name already exists")
    
    existing_user = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    company_obj = Company(**company.model_dump())
    company_dict = company_obj.model_dump()
    company_dict['created_at'] = company_dict['created_at'].isoformat()
    await db.companies.insert_one(company_dict)
    
    user_obj = User(
        email=user.email,
        name=user.name,
        role=UserRole.HR,
        company_id=company_obj.id,
        language=user.language,
        timezone=user.timezone,
        vacation_days_total=company.vacation_days_per_year
    )
    user_dict = user_obj.model_dump()
    user_dict['password_hash'] = hash_password(user.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    if user.pin:
        user_dict['pin_hash'] = hash_pin(user.pin)
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user_obj.id, "company_id": company_obj.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user_obj.model_dump()).model_dump(),
        "company": {"id": company_obj.id, "name": company_obj.name}
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    access_token = create_access_token(data={"sub": user["id"], "company_id": user["company_id"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**user)
    )

@api_router.post("/auth/pin-login", response_model=TokenResponse)
async def pin_login(credentials: PinLogin):
    """Login with PIN (for totem/quick access)"""
    pin_hash = hash_pin(credentials.pin)
    user = await db.users.find_one({
        "pin_hash": pin_hash,
        "company_id": credentials.company_id
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    access_token = create_access_token(data={"sub": user["id"], "company_id": user["company_id"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(**current_user)

# ============== QR CODE ROUTES ==============

@api_router.post("/qr/generate", response_model=dict)
async def generate_qr(current_user: dict = Depends(require_hr)):
    """Generate a new QR code for totem (HR only)"""
    company_id = current_user["company_id"]
    
    code = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=30)
    
    qr = QRCode(
        company_id=company_id,
        code=code,
        expires_at=expires_at
    )
    
    qr_dict = qr.model_dump()
    qr_dict['expires_at'] = qr_dict['expires_at'].isoformat()
    qr_dict['created_at'] = qr_dict['created_at'].isoformat()
    
    await db.qr_codes.delete_many({"company_id": company_id})
    await db.qr_codes.insert_one(qr_dict)
    
    return {
        "code": code,
        "expires_at": expires_at.isoformat(),
        "expires_in_seconds": 30
    }

@api_router.get("/qr/current", response_model=dict)
async def get_current_qr(current_user: dict = Depends(require_hr)):
    """Get current active QR code for totem display"""
    company_id = current_user["company_id"]
    
    qr = await db.qr_codes.find_one({"company_id": company_id}, {"_id": 0})
    if not qr:
        return await generate_qr(current_user)
    
    expires_at = datetime.fromisoformat(qr['expires_at'].replace('Z', '+00:00')) if isinstance(qr['expires_at'], str) else qr['expires_at']
    if expires_at < datetime.now(timezone.utc):
        return await generate_qr(current_user)
    
    remaining = (expires_at - datetime.now(timezone.utc)).total_seconds()
    return {
        "code": qr['code'],
        "expires_at": qr['expires_at'],
        "expires_in_seconds": max(0, int(remaining))
    }

# ============== TOTEM EVENTS (for real-time feedback) ==============

@api_router.get("/totem/recent-events", response_model=List[dict])
async def get_recent_totem_events(current_user: dict = Depends(require_hr)):
    """Get recent clock events for totem display"""
    company_id = current_user["company_id"]
    
    # Get events from last 30 seconds
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
    
    events = await db.totem_events.find({
        "company_id": company_id,
        "created_at": {"$gte": cutoff}
    }, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    return events

# ============== CLOCK ROUTES ==============

@api_router.post("/clock/scan", response_model=dict)
async def clock_via_qr(data: QRClockIn, current_user: dict = Depends(get_current_user)):
    """Clock in/out by scanning QR code"""
    qr = await db.qr_codes.find_one({"code": data.qr_code}, {"_id": 0})
    if not qr:
        raise HTTPException(status_code=400, detail="Invalid QR code")
    
    expires_at = datetime.fromisoformat(qr['expires_at'].replace('Z', '+00:00')) if isinstance(qr['expires_at'], str) else qr['expires_at']
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="QR code expired")
    
    if qr['company_id'] != current_user['company_id']:
        raise HTTPException(status_code=400, detail="Invalid QR code for your company")
    
    user_id = current_user['id']
    company_id = current_user['company_id']
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    
    open_record = await db.clock_records.find_one({
        "user_id": user_id,
        "date": today,
        "clock_out": None
    }, {"_id": 0})
    
    if open_record:
        # Clock out
        clock_in_time = datetime.fromisoformat(open_record['clock_in'].replace('Z', '+00:00')) if isinstance(open_record['clock_in'], str) else open_record['clock_in']
        total_hours = (now - clock_in_time).total_seconds() / 3600
        
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        daily_hours = (company.get("weekly_hours", 40) / 5) if company else 8
        overtime = max(0, total_hours - daily_hours)
        
        await db.clock_records.update_one(
            {"id": open_record['id']},
            {"$set": {
                "clock_out": now.isoformat(),
                "total_hours": round(total_hours, 2),
                "overtime_hours": round(overtime, 2)
            }}
        )
        
        # Create totem event for real-time display
        event = TotemClockEvent(
            company_id=company_id,
            user_id=user_id,
            user_name=current_user['name'],
            action="clock_out",
            time=now
        )
        event_dict = event.model_dump()
        event_dict['time'] = event_dict['time'].isoformat()
        event_dict['created_at'] = event_dict['created_at'].isoformat()
        await db.totem_events.insert_one(event_dict)
        
        return {
            "action": "clock_out",
            "time": now.isoformat(),
            "total_hours": round(total_hours, 2),
            "overtime_hours": round(overtime, 2),
            "message": "Clock out successful",
            "user_name": current_user['name']
        }
    else:
        # Clock in
        record = ClockRecord(
            user_id=user_id,
            company_id=company_id,
            clock_in=now,
            date=today
        )
        record_dict = record.model_dump()
        record_dict['clock_in'] = record_dict['clock_in'].isoformat()
        record_dict['created_at'] = record_dict['created_at'].isoformat()
        await db.clock_records.insert_one(record_dict)
        
        # Create totem event
        event = TotemClockEvent(
            company_id=company_id,
            user_id=user_id,
            user_name=current_user['name'],
            action="clock_in",
            time=now
        )
        event_dict = event.model_dump()
        event_dict['time'] = event_dict['time'].isoformat()
        event_dict['created_at'] = event_dict['created_at'].isoformat()
        await db.totem_events.insert_one(event_dict)
        
        return {
            "action": "clock_in",
            "time": now.isoformat(),
            "message": "Clock in successful",
            "user_name": current_user['name']
        }

@api_router.post("/clock/geolocation", response_model=dict)
async def clock_via_geolocation(data: GeoClockIn, current_user: dict = Depends(get_current_user)):
    """Clock in/out by geolocation (remote/hybrid workers only)"""
    work_mode = current_user.get('work_mode', 'onsite')
    
    # Check if user is allowed to use geolocation
    if work_mode not in [WorkMode.REMOTE, WorkMode.HYBRID]:
        raise HTTPException(
            status_code=403, 
            detail="Geolocation clock-in is only available for remote or hybrid workers. Please use the QR code totem."
        )
    
    # Check if user has home location configured
    home_location = current_user.get('home_location')
    if not home_location or 'lat' not in home_location or 'lng' not in home_location:
        raise HTTPException(
            status_code=400, 
            detail="Home location not configured. Please contact HR to set up your remote work location."
        )
    
    # Calculate distance from home location
    distance = calculate_distance(
        data.latitude, data.longitude,
        home_location['lat'], home_location['lng']
    )
    
    allowed_radius = current_user.get('location_radius_meters', 100)
    is_outside_radius = distance > allowed_radius
    
    # Allow clock-in but create alert if outside radius
    if is_outside_radius:
        # Create alert notification for HR
        alert = Notification(
            company_id=current_user['company_id'],
            user_id=None,  # Send to all HR
            title="⚠️ Alerta: Ponto fora do raio",
            message=f"{current_user['name']} registrou ponto a {int(distance)}m do local cadastrado (limite: {allowed_radius}m)",
            type="warning",
            created_by="system"
        )
        alert_dict = alert.model_dump()
        alert_dict['created_at'] = alert_dict['created_at'].isoformat()
        await db.notifications.insert_one(alert_dict)
    
    user_id = current_user['id']
    company_id = current_user['company_id']
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    
    # Check for existing open record today
    open_record = await db.clock_records.find_one({
        "user_id": user_id,
        "date": today,
        "clock_out": None
    }, {"_id": 0})
    
    if open_record:
        # Clock out
        clock_in_time = datetime.fromisoformat(open_record['clock_in'].replace('Z', '+00:00')) if isinstance(open_record['clock_in'], str) else open_record['clock_in']
        total_hours = (now - clock_in_time).total_seconds() / 3600
        
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        daily_hours = (company.get("weekly_hours", 40) / 5) if company else 8
        overtime = max(0, total_hours - daily_hours)
        
        await db.clock_records.update_one(
            {"id": open_record['id']},
            {"$set": {
                "clock_out": now.isoformat(),
                "total_hours": round(total_hours, 2),
                "overtime_hours": round(overtime, 2)
            }}
        )
        
        return {
            "action": "clock_out",
            "time": now.isoformat(),
            "total_hours": round(total_hours, 2),
            "overtime_hours": round(overtime, 2),
            "message": "Remote clock out successful",
            "method": "geolocation",
            "distance_from_home": int(distance),
            "outside_radius": is_outside_radius
        }
    else:
        # Clock in
        record = ClockRecord(
            user_id=user_id,
            company_id=company_id,
            clock_in=now,
            date=today,
            clock_method="geolocation",
            location={"lat": data.latitude, "lng": data.longitude},
            outside_radius=is_outside_radius,
            distance_from_home=int(distance)
        )
        record_dict = record.model_dump()
        record_dict['clock_in'] = record_dict['clock_in'].isoformat()
        record_dict['created_at'] = record_dict['created_at'].isoformat()
        await db.clock_records.insert_one(record_dict)
        
        warning_msg = " ⚠️ Fora do raio permitido!" if is_outside_radius else ""
        
        return {
            "action": "clock_in",
            "time": now.isoformat(),
            "message": f"Remote clock in successful{warning_msg}",
            "method": "geolocation",
            "distance_from_home": int(distance),
            "outside_radius": is_outside_radius
        }

@api_router.get("/clock/status", response_model=dict)
async def get_clock_status(current_user: dict = Depends(get_current_user)):
    """Get current clock status for user"""
    user_id = current_user['id']
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    open_record = await db.clock_records.find_one({
        "user_id": user_id,
        "date": today,
        "clock_out": None
    }, {"_id": 0})
    
    if open_record:
        clock_in_time = datetime.fromisoformat(open_record['clock_in'].replace('Z', '+00:00')) if isinstance(open_record['clock_in'], str) else open_record['clock_in']
        elapsed = (datetime.now(timezone.utc) - clock_in_time).total_seconds() / 3600
        return {
            "status": "clocked_in",
            "clock_in_time": open_record['clock_in'],
            "elapsed_hours": round(elapsed, 2)
        }
    
    return {"status": "clocked_out", "clock_in_time": None, "elapsed_hours": 0}

@api_router.get("/clock/history", response_model=List[dict])
async def get_clock_history(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get clock history for current user"""
    user_id = current_user['id']
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    records = await db.clock_records.find({
        "user_id": user_id,
        "date": {"$gte": start_date}
    }, {"_id": 0}).sort("date", -1).to_list(100)
    
    return records

# ============== ABSENCE & VACATION ROUTES ==============

@api_router.get("/absences/my", response_model=dict)
async def get_my_absences(current_user: dict = Depends(get_current_user)):
    """Get current user's absences and vacation info"""
    user_id = current_user['id']
    now = datetime.now(timezone.utc)
    year_start = now.replace(month=1, day=1).strftime("%Y-%m-%d")
    
    # Get absences this year
    absences = await db.absences.find({
        "user_id": user_id,
        "date": {"$gte": year_start}
    }, {"_id": 0}).to_list(365)
    
    # Count by type
    absent_days = len([a for a in absences if a['type'] == 'absent'])
    sick_days = len([a for a in absences if a['type'] == 'sick'])
    vacation_days = len([a for a in absences if a['type'] == 'vacation' and a.get('approved', False)])
    
    # Get vacation requests
    vacation_requests = await db.vacation_requests.find({
        "user_id": user_id
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return {
        "vacation_days_total": current_user.get("vacation_days_total", 30),
        "vacation_days_used": current_user.get("vacation_days_used", 0),
        "vacation_days_remaining": current_user.get("vacation_days_total", 30) - current_user.get("vacation_days_used", 0),
        "absent_days": absent_days,
        "sick_days": sick_days,
        "absences": absences[:20],
        "vacation_requests": vacation_requests[:10]
    }

@api_router.post("/vacation/request", response_model=dict)
async def request_vacation(request: VacationRequestCreate, current_user: dict = Depends(get_current_user)):
    """Request vacation days"""
    days_count = calculate_work_days(request.start_date, request.end_date)
    
    remaining = current_user.get("vacation_days_total", 30) - current_user.get("vacation_days_used", 0)
    if days_count > remaining:
        raise HTTPException(status_code=400, detail=f"Not enough vacation days. You have {remaining} days remaining.")
    
    vacation = VacationRequest(
        user_id=current_user['id'],
        company_id=current_user['company_id'],
        start_date=request.start_date,
        end_date=request.end_date,
        days_count=days_count,
        reason=request.reason
    )
    
    vacation_dict = vacation.model_dump()
    vacation_dict['created_at'] = vacation_dict['created_at'].isoformat()
    await db.vacation_requests.insert_one(vacation_dict)
    
    return {"message": "Vacation request submitted", "days_requested": days_count, "request_id": vacation.id}

@api_router.get("/vacation/requests", response_model=List[dict])
async def get_vacation_requests(current_user: dict = Depends(require_hr)):
    """Get all vacation requests for company (HR only)"""
    company_id = current_user['company_id']
    
    requests = await db.vacation_requests.find({
        "company_id": company_id
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with user names
    for req in requests:
        user = await db.users.find_one({"id": req['user_id']}, {"_id": 0, "name": 1, "email": 1})
        if user:
            req['user_name'] = user.get('name', 'Unknown')
            req['user_email'] = user.get('email', '')
    
    return requests

@api_router.patch("/vacation/requests/{request_id}", response_model=dict)
async def review_vacation_request(request_id: str, approved: bool, current_user: dict = Depends(require_hr)):
    """Approve or reject vacation request (HR only)"""
    vacation = await db.vacation_requests.find_one({"id": request_id}, {"_id": 0})
    if not vacation:
        raise HTTPException(status_code=404, detail="Request not found")
    
    status = "approved" if approved else "rejected"
    now = datetime.now(timezone.utc).isoformat()
    
    await db.vacation_requests.update_one(
        {"id": request_id},
        {"$set": {"status": status, "reviewed_by": current_user['id'], "reviewed_at": now}}
    )
    
    if approved:
        # Update user's vacation days used
        await db.users.update_one(
            {"id": vacation['user_id']},
            {"$inc": {"vacation_days_used": vacation['days_count']}}
        )
        
        # Create absence records for each vacation day
        start = datetime.strptime(vacation['start_date'], "%Y-%m-%d")
        end = datetime.strptime(vacation['end_date'], "%Y-%m-%d")
        current = start
        while current <= end:
            if current.weekday() < 5:
                absence = Absence(
                    user_id=vacation['user_id'],
                    company_id=vacation['company_id'],
                    date=current.strftime("%Y-%m-%d"),
                    type="vacation",
                    approved=True,
                    approved_by=current_user['id']
                )
                absence_dict = absence.model_dump()
                absence_dict['created_at'] = absence_dict['created_at'].isoformat()
                await db.absences.insert_one(absence_dict)
            current += timedelta(days=1)
    
    return {"message": f"Request {status}", "status": status}

# ============== NOTIFICATIONS ROUTES ==============

@api_router.post("/notifications", response_model=dict)
async def create_notification(notif: NotificationCreate, current_user: dict = Depends(require_hr)):
    """Create a notification (HR only)"""
    notification = Notification(
        company_id=current_user['company_id'],
        user_id=notif.user_id,
        title=notif.title,
        message=notif.message,
        type=notif.type,
        created_by=current_user['id']
    )
    
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return {"message": "Notification created", "id": notification.id}

@api_router.get("/notifications/my", response_model=List[dict])
async def get_my_notifications(current_user: dict = Depends(get_current_user)):
    """Get notifications for current user"""
    company_id = current_user['company_id']
    user_id = current_user['id']
    
    notifications = await db.notifications.find({
        "company_id": company_id,
        "$or": [
            {"user_id": user_id},
            {"user_id": None}  # Company-wide notifications
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return notifications

@api_router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"id": notif_id},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

@api_router.get("/notifications/all", response_model=List[dict])
async def get_all_notifications(current_user: dict = Depends(require_hr)):
    """Get all notifications for the company (HR only)"""
    company_id = current_user['company_id']
    
    notifications = await db.notifications.find({
        "company_id": company_id
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with user names
    for notif in notifications:
        if notif.get('user_id'):
            user = await db.users.find_one({"id": notif['user_id']}, {"_id": 0, "name": 1})
            if user:
                notif['recipient_name'] = user.get('name', 'Unknown')
        else:
            notif['recipient_name'] = 'Todos'
    
    return notifications

@api_router.get("/notifications/alerts", response_model=List[dict])
async def get_location_alerts(current_user: dict = Depends(require_hr)):
    """Get location-related alerts (HR only)"""
    company_id = current_user['company_id']
    
    alerts = await db.notifications.find({
        "company_id": company_id,
        "type": "warning",
        "created_by": "system"
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return alerts

@api_router.delete("/notifications/{notif_id}")
async def delete_notification(notif_id: str, current_user: dict = Depends(require_hr)):
    """Delete a notification (HR only)"""
    result = await db.notifications.delete_one({
        "id": notif_id,
        "company_id": current_user['company_id']
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

@api_router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read for current user"""
    company_id = current_user['company_id']
    user_id = current_user['id']
    
    await db.notifications.update_many(
        {
            "company_id": company_id,
            "$or": [{"user_id": user_id}, {"user_id": None}],
            "read": False
        },
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ============== DOCUMENTS ROUTES ==============

@api_router.post("/documents/upload", response_model=dict)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = "other",
    description: str = "",
    current_user: dict = Depends(get_current_user)
):
    """Upload a document (medical certificate, justification, etc.)"""
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    file_data = base64.b64encode(content).decode('utf-8')
    
    document = Document(
        user_id=current_user['id'],
        company_id=current_user['company_id'],
        filename=file.filename,
        file_type=file.content_type,
        file_data=file_data,
        doc_type=doc_type,
        description=description
    )
    
    doc_dict = document.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    await db.documents.insert_one(doc_dict)
    
    return {"message": "Document uploaded", "id": document.id}

@api_router.get("/documents/my", response_model=List[dict])
async def get_my_documents(current_user: dict = Depends(get_current_user)):
    """Get user's documents"""
    docs = await db.documents.find({
        "user_id": current_user['id']
    }, {"_id": 0, "file_data": 0}).sort("created_at", -1).to_list(50)
    return docs

@api_router.get("/documents/pending", response_model=List[dict])
async def get_pending_documents(current_user: dict = Depends(require_hr)):
    """Get pending documents for review (HR only)"""
    docs = await db.documents.find({
        "company_id": current_user['company_id'],
        "status": "pending"
    }, {"_id": 0, "file_data": 0}).sort("created_at", -1).to_list(100)
    
    for doc in docs:
        user = await db.users.find_one({"id": doc['user_id']}, {"_id": 0, "name": 1, "email": 1})
        if user:
            doc['user_name'] = user.get('name', 'Unknown')
    
    return docs

@api_router.patch("/documents/{doc_id}/review", response_model=dict)
async def review_document(doc_id: str, approved: bool, current_user: dict = Depends(require_hr)):
    """Approve or reject document (HR only)"""
    status = "approved" if approved else "rejected"
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.documents.update_one(
        {"id": doc_id, "company_id": current_user['company_id']},
        {"$set": {"status": status, "reviewed_by": current_user['id'], "reviewed_at": now}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": f"Document {status}"}

# ============== REPORTS ROUTES ==============

@api_router.get("/reports/attendance", response_model=dict)
async def get_attendance_report(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(require_hr)
):
    """Generate attendance report (HR only)"""
    company_id = current_user['company_id']
    
    # Get all employees
    employees = await db.users.find({
        "company_id": company_id,
        "is_active": True
    }, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(500)
    
    # Get all clock records in range
    records = await db.clock_records.find({
        "company_id": company_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Get absences
    absences = await db.absences.find({
        "company_id": company_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Build report data
    report_data = []
    for emp in employees:
        emp_records = [r for r in records if r['user_id'] == emp['id']]
        emp_absences = [a for a in absences if a['user_id'] == emp['id']]
        
        total_hours = sum(r.get('total_hours', 0) or 0 for r in emp_records)
        overtime_hours = sum(r.get('overtime_hours', 0) or 0 for r in emp_records)
        days_worked = len([r for r in emp_records if r.get('total_hours')])
        absent_days = len([a for a in emp_absences if a['type'] == 'absent'])
        vacation_days = len([a for a in emp_absences if a['type'] == 'vacation'])
        sick_days = len([a for a in emp_absences if a['type'] == 'sick'])
        
        report_data.append({
            "employee_id": emp['id'],
            "employee_name": emp['name'],
            "employee_email": emp['email'],
            "total_hours": round(total_hours, 2),
            "overtime_hours": round(overtime_hours, 2),
            "days_worked": days_worked,
            "absent_days": absent_days,
            "vacation_days": vacation_days,
            "sick_days": sick_days
        })
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "employees": report_data
    }

@api_router.get("/reports/export/csv")
async def export_report_csv(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(require_hr)
):
    """Export attendance report as CSV"""
    report = await get_attendance_report(start_date, end_date, current_user)
    
    csv_content = "Employee Name,Email,Total Hours,Overtime Hours,Days Worked,Absent Days,Vacation Days,Sick Days\n"
    for emp in report['employees']:
        csv_content += f"{emp['employee_name']},{emp['employee_email']},{emp['total_hours']},{emp['overtime_hours']},{emp['days_worked']},{emp['absent_days']},{emp['vacation_days']},{emp['sick_days']}\n"
    
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_report_{start_date}_{end_date}.csv"}
    )

# ============== DASHBOARD ROUTES ==============

@api_router.get("/dashboard/employee", response_model=dict)
async def employee_dashboard(current_user: dict = Depends(get_current_user)):
    """Get employee dashboard data"""
    user_id = current_user['id']
    now = datetime.now(timezone.utc)
    
    month_start = now.replace(day=1).strftime("%Y-%m-%d")
    year_start = now.replace(month=1, day=1).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")
    
    # Get monthly records
    records = await db.clock_records.find({
        "user_id": user_id,
        "date": {"$gte": month_start, "$lte": today}
    }, {"_id": 0}).to_list(100)
    
    # Calculate totals
    total_hours = sum(r.get("total_hours", 0) or 0 for r in records)
    overtime_hours = sum(r.get("overtime_hours", 0) or 0 for r in records)
    days_worked = len([r for r in records if r.get("total_hours")])
    
    # Get company for expected hours
    company = await db.companies.find_one({"id": current_user['company_id']}, {"_id": 0})
    weekly_hours = company.get("weekly_hours", 40) if company else 40
    
    time_bank = overtime_hours
    
    # Current status
    status = await get_clock_status(current_user)
    
    # Get absences this year
    absences = await db.absences.find({
        "user_id": user_id,
        "date": {"$gte": year_start}
    }, {"_id": 0}).to_list(365)
    
    absent_days = len([a for a in absences if a['type'] == 'absent'])
    sick_days = len([a for a in absences if a['type'] == 'sick'])
    vacation_days_used = len([a for a in absences if a['type'] == 'vacation'])
    
    # Vacation info
    vacation_total = current_user.get("vacation_days_total", 30)
    vacation_used = current_user.get("vacation_days_used", 0)
    
    # Pending vacation requests
    pending_vacations = await db.vacation_requests.count_documents({
        "user_id": user_id,
        "status": "pending"
    })
    
    # Unread notifications
    unread_notifications = await db.notifications.count_documents({
        "company_id": current_user['company_id'],
        "$or": [{"user_id": user_id}, {"user_id": None}],
        "read": False
    })
    
    return {
        "total_hours_month": round(total_hours, 2),
        "overtime_hours_month": round(overtime_hours, 2),
        "time_bank": round(time_bank, 2),
        "days_worked": days_worked,
        "weekly_hours": weekly_hours,
        "current_status": status,
        "recent_records": records[:7],
        # Absences & Vacation
        "absent_days": absent_days,
        "sick_days": sick_days,
        "vacation_days_total": vacation_total,
        "vacation_days_used": vacation_used,
        "vacation_days_remaining": vacation_total - vacation_used,
        "pending_vacation_requests": pending_vacations,
        "unread_notifications": unread_notifications
    }

@api_router.get("/dashboard/hr", response_model=dict)
async def hr_dashboard(current_user: dict = Depends(require_hr)):
    """Get HR dashboard data"""
    company_id = current_user['company_id']
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    month_start = now.replace(day=1).strftime("%Y-%m-%d")
    
    total_employees = await db.users.count_documents({
        "company_id": company_id,
        "is_active": True
    })
    
    clocked_in_today = await db.clock_records.count_documents({
        "company_id": company_id,
        "date": today,
        "clock_out": None
    })
    
    records = await db.clock_records.find({
        "company_id": company_id,
        "date": {"$gte": month_start}
    }, {"_id": 0}).to_list(1000)
    
    total_overtime = sum(r.get("overtime_hours", 0) or 0 for r in records)
    
    employees = await db.users.find({
        "company_id": company_id,
        "is_active": True
    }, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(100)
    
    # Pending items
    pending_documents = await db.documents.count_documents({
        "company_id": company_id,
        "status": "pending"
    })
    
    pending_vacations = await db.vacation_requests.count_documents({
        "company_id": company_id,
        "status": "pending"
    })
    
    return {
        "total_employees": total_employees,
        "clocked_in_today": clocked_in_today,
        "total_overtime_month": round(total_overtime, 2),
        "employees": employees[:10],
        "pending_documents": pending_documents,
        "pending_vacation_requests": pending_vacations
    }

@api_router.get("/reports/remote-clocks", response_model=List[dict])
async def get_remote_clock_records(
    days: int = 7,
    current_user: dict = Depends(require_hr)
):
    """Get remote clock records with location data for map visualization (HR only)"""
    company_id = current_user['company_id']
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # Get records with geolocation method
    records = await db.clock_records.find({
        "company_id": company_id,
        "clock_method": "geolocation",
        "date": {"$gte": start_date},
        "location": {"$exists": True, "$ne": None}
    }, {"_id": 0}).sort("clock_in", -1).to_list(200)
    
    # Enrich with user info
    for record in records:
        user = await db.users.find_one({"id": record['user_id']}, {"_id": 0, "name": 1, "home_location": 1})
        if user:
            record['user_name'] = user.get('name', 'Unknown')
            record['home_location'] = user.get('home_location')
            # Calculate distance from home
            if record.get('location') and user.get('home_location'):
                distance = calculate_distance(
                    record['location']['lat'], record['location']['lng'],
                    user['home_location']['lat'], user['home_location']['lng']
                )
                record['distance_from_home'] = int(distance)
    
    return records

@api_router.get("/reports/remote-workers", response_model=List[dict])
async def get_remote_workers_locations(current_user: dict = Depends(require_hr)):
    """Get all remote/hybrid workers with their home locations for map"""
    company_id = current_user['company_id']
    
    workers = await db.users.find({
        "company_id": company_id,
        "is_active": True,
        "work_mode": {"$in": ["remote", "hybrid"]},
        "home_location": {"$exists": True, "$ne": None}
    }, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(100)
    
    # Get today's clock status for each worker
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for worker in workers:
        clock_record = await db.clock_records.find_one({
            "user_id": worker['id'],
            "date": today,
            "clock_method": "geolocation"
        }, {"_id": 0})
        worker['clocked_today'] = clock_record is not None
        worker['today_location'] = clock_record.get('location') if clock_record else None
    
    return workers

# ============== USER MANAGEMENT ROUTES ==============

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_hr)):
    """Create a new user (HR only)"""
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user_data.company_id != current_user['company_id']:
        raise HTTPException(status_code=403, detail="Cannot create user for another company")
    
    company = await db.companies.find_one({"id": current_user['company_id']}, {"_id": 0})
    vacation_days = company.get("vacation_days_per_year", 30) if company else 30
    
    user_obj = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        company_id=user_data.company_id,
        language=user_data.language,
        timezone=user_data.timezone,
        vacation_days_total=user_data.vacation_days_total or vacation_days,
        hire_date=user_data.hire_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        work_mode=user_data.work_mode,
        home_location=user_data.home_location,
        location_radius_meters=user_data.location_radius_meters
    )
    
    user_dict = user_obj.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    if user_data.pin:
        user_dict['pin_hash'] = hash_pin(user_data.pin)
    
    await db.users.insert_one(user_dict)
    return UserResponse(**user_obj.model_dump())

@api_router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(require_hr)):
    """List all users in company (HR only)"""
    users = await db.users.find({
        "company_id": current_user['company_id']
    }, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(500)
    return [UserResponse(**u) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(require_hr)):
    """Get user details (HR only)"""
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_user['company_id']
    }, {"_id": 0, "password_hash": 0, "pin_hash": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

@api_router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, updates: UpdateUser, current_user: dict = Depends(require_hr)):
    """Update user (HR only)"""
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_user['company_id']
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if 'pin' in update_data:
        update_data['pin_hash'] = hash_pin(update_data.pop('pin'))
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0, "pin_hash": 0})
    return UserResponse(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_hr)):
    """Deactivate user (HR only)"""
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.update_one(
        {"id": user_id, "company_id": current_user['company_id']},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deactivated"}

# ============== COMPANY ROUTES ==============

@api_router.get("/company", response_model=dict)
async def get_company(current_user: dict = Depends(get_current_user)):
    """Get company details"""
    company = await db.companies.find_one({"id": current_user['company_id']}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

# ============== SETTINGS ROUTES ==============

@api_router.patch("/settings/language", response_model=UserResponse)
async def update_language(language: str, current_user: dict = Depends(get_current_user)):
    """Update user language"""
    await db.users.update_one({"id": current_user['id']}, {"$set": {"language": language}})
    updated = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "password_hash": 0, "pin_hash": 0})
    return UserResponse(**updated)

@api_router.patch("/settings/pin")
async def update_pin(pin: str, current_user: dict = Depends(get_current_user)):
    """Update user PIN"""
    if len(pin) < 4 or len(pin) > 6:
        raise HTTPException(status_code=400, detail="PIN must be 4-6 digits")
    
    pin_hash = hash_pin(pin)
    await db.users.update_one({"id": current_user['id']}, {"$set": {"pin_hash": pin_hash}})
    return {"message": "PIN updated successfully"}

# ============== HEALTH CHECK ==============

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
