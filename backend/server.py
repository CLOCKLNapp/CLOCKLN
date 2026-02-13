from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import hashlib
import io
import base64
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# SendGrid
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@clockln.app')

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Logging
logger = logging.getLogger(__name__)

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
    subscription_plan: str = "free"  # free, pro, business
    subscription_status: str = "active"  # active, cancelled, expired
    subscription_end_date: Optional[str] = None  # YYYY-MM-DD
    max_employees: int = 5  # Limit based on plan
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyCreate(BaseModel):
    name: str
    timezone: str = "UTC"
    default_language: str = "en"
    weekly_hours: int = 40
    vacation_days_per_year: int = 30
    daily_work_hours: float = 8.0  # Hours per day

class OvertimeRequest(BaseModel):
    """Request for overtime approval"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    clock_record_id: str
    date: str  # YYYY-MM-DD
    regular_hours: float
    overtime_hours: float
    status: str = "pending"  # pending, approved, rejected
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    notes: Optional[str] = None

class TimeBank(BaseModel):
    """Time bank balance for employee"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    balance_hours: float = 0.0  # Can be negative (debt) or positive (credit)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TimeBankTransaction(BaseModel):
    """Time bank transaction history"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    hours: float  # Positive = credit, Negative = debit
    type: str  # overtime, compensation, adjustment, expired
    description: str
    reference_id: Optional[str] = None  # clock_record_id or overtime_request_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubscriptionPlan:
    FREE = "free"
    PRO = "pro"
    BUSINESS = "business"

# Plan details - defined on server only (security)
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free",
        "price": 0.0,
        "max_employees": 5,
        "features": ["QR Code clock-in", "Basic reports", "5 employees max"]
    },
    "pro": {
        "name": "Pro",
        "price": 29.0,
        "max_employees": 50,
        "features": ["All Free features", "Geolocation clock-in", "Remote map", "50 employees max", "Priority support"]
    },
    "business": {
        "name": "Business",
        "price": 99.0,
        "max_employees": 500,
        "features": ["All Pro features", "Manager roles", "Advanced reports", "500 employees max", "Dedicated support", "Custom branding"]
    }
}

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str
    plan: str
    amount: float
    currency: str = "usd"
    session_id: str
    payment_status: str = "pending"  # pending, paid, failed, expired
    metadata: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    manager_id: Optional[str] = None

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
    manager_id: Optional[str] = None

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
        
        # Auto-create overtime request if there are extra hours
        if overtime > 0:
            overtime_req = OvertimeRequest(
                user_id=user_id,
                company_id=company_id,
                clock_record_id=open_record['id'],
                date=today,
                regular_hours=min(total_hours, daily_hours),
                overtime_hours=round(overtime, 2)
            )
            req_dict = overtime_req.model_dump()
            req_dict['requested_at'] = req_dict['requested_at'].isoformat()
            await db.overtime_requests.insert_one(req_dict)
        
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
            "user_name": current_user['name'],
            "overtime_request_created": overtime > 0
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
        
        # Auto-create overtime request if there are extra hours
        if overtime > 0:
            overtime_req = OvertimeRequest(
                user_id=user_id,
                company_id=company_id,
                clock_record_id=open_record['id'],
                date=today,
                regular_hours=min(total_hours, daily_hours),
                overtime_hours=round(overtime, 2)
            )
            req_dict = overtime_req.model_dump()
            req_dict['requested_at'] = req_dict['requested_at'].isoformat()
            await db.overtime_requests.insert_one(req_dict)
        
        return {
            "action": "clock_out",
            "time": now.isoformat(),
            "total_hours": round(total_hours, 2),
            "overtime_hours": round(overtime, 2),
            "message": "Remote clock out successful",
            "method": "geolocation",
            "distance_from_home": int(distance),
            "outside_radius": is_outside_radius,
            "overtime_request_created": overtime > 0
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

@api_router.get("/dashboard/manager", response_model=dict)
async def manager_dashboard(current_user: dict = Depends(get_current_user)):
    """Get manager dashboard data - shows only managed team"""
    if current_user.get("role") != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    manager_id = current_user['id']
    company_id = current_user['company_id']
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    month_start = now.replace(day=1).strftime("%Y-%m-%d")
    
    # Get team members
    team = await db.users.find({
        "company_id": company_id,
        "manager_id": manager_id,
        "is_active": True
    }, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(100)
    
    team_ids = [u['id'] for u in team]
    
    # Stats for team only
    clocked_in_today = await db.clock_records.count_documents({
        "user_id": {"$in": team_ids},
        "date": today,
        "clock_out": None
    })
    
    records = await db.clock_records.find({
        "user_id": {"$in": team_ids},
        "date": {"$gte": month_start}
    }, {"_id": 0}).to_list(1000)
    
    total_overtime = sum(r.get("overtime_hours", 0) or 0 for r in records)
    
    # Pending vacation requests from team
    pending_vacations = await db.vacation_requests.count_documents({
        "user_id": {"$in": team_ids},
        "status": "pending"
    })
    
    return {
        "total_team_members": len(team),
        "clocked_in_today": clocked_in_today,
        "total_overtime_month": round(total_overtime, 2),
        "team": team,
        "pending_vacation_requests": pending_vacations
    }

@api_router.get("/manager/team", response_model=List[dict])
async def get_manager_team(current_user: dict = Depends(get_current_user)):
    """Get list of employees managed by current user"""
    if current_user.get("role") != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    team = await db.users.find({
        "company_id": current_user['company_id'],
        "manager_id": current_user['id']
    }, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(100)
    
    return team

@api_router.get("/managers", response_model=List[dict])
async def list_managers(current_user: dict = Depends(require_hr)):
    """List all managers in company (HR only)"""
    managers = await db.users.find({
        "company_id": current_user['company_id'],
        "role": UserRole.MANAGER,
        "is_active": True
    }, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(100)
    
    # Count team members for each manager
    for manager in managers:
        team_count = await db.users.count_documents({
            "manager_id": manager['id'],
            "is_active": True
        })
        manager['team_count'] = team_count
    
    return managers

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

# ============== SUBSCRIPTION & PAYMENT ROUTES ==============

class SubscriptionUpgradeRequest(BaseModel):
    plan: str
    origin_url: str

class CheckoutStatusRequest(BaseModel):
    session_id: str

@api_router.get("/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        "plans": [
            {"id": plan_id, **details}
            for plan_id, details in SUBSCRIPTION_PLANS.items()
        ]
    }

@api_router.get("/subscription/current")
async def get_current_subscription(current_user: dict = Depends(require_hr)):
    """Get current company subscription details"""
    company = await db.companies.find_one(
        {"id": current_user['company_id']},
        {"_id": 0}
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    plan_id = company.get('subscription_plan', 'free')
    plan_details = SUBSCRIPTION_PLANS.get(plan_id, SUBSCRIPTION_PLANS['free'])
    
    # Get employee count
    employee_count = await db.users.count_documents({
        "company_id": current_user['company_id'],
        "is_active": True
    })
    
    return {
        "plan": plan_id,
        "plan_name": plan_details['name'],
        "price": plan_details['price'],
        "features": plan_details['features'],
        "max_employees": plan_details['max_employees'],
        "current_employees": employee_count,
        "status": company.get('subscription_status', 'active'),
        "end_date": company.get('subscription_end_date')
    }

@api_router.post("/subscription/checkout")
async def create_checkout_session(
    request: Request,
    data: SubscriptionUpgradeRequest,
    current_user: dict = Depends(require_hr)
):
    """Create Stripe checkout session for plan upgrade"""
    if data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan = SUBSCRIPTION_PLANS[data.plan]
    if plan['price'] == 0:
        raise HTTPException(status_code=400, detail="Cannot checkout free plan")
    
    company_id = current_user['company_id']
    user_id = current_user['id']
    
    # Build URLs from origin
    success_url = f"{data.origin_url}/subscription?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/subscription"
    
    # Initialize Stripe
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=float(plan['price']),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "company_id": company_id,
            "user_id": user_id,
            "plan": data.plan
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        company_id=company_id,
        user_id=user_id,
        plan=data.plan,
        amount=plan['price'],
        currency="usd",
        session_id=session.session_id,
        payment_status="pending",
        metadata={"plan_name": plan['name']}
    )
    tx_dict = transaction.model_dump()
    tx_dict['created_at'] = tx_dict['created_at'].isoformat()
    await db.payment_transactions.insert_one(tx_dict)
    
    return {
        "checkout_url": session.url,
        "session_id": session.session_id
    }

@api_router.get("/subscription/status/{session_id}")
async def check_payment_status(
    request: Request,
    session_id: str,
    current_user: dict = Depends(require_hr)
):
    """Check payment status and update subscription if paid"""
    # Find transaction
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction['company_id'] != current_user['company_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Already processed?
    if transaction['payment_status'] == 'paid':
        return {
            "status": "completed",
            "payment_status": "paid",
            "plan": transaction['plan'],
            "message": "Subscription already active"
        }
    
    # Check with Stripe
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": status.payment_status}}
    )
    
    # If paid, update company subscription
    if status.payment_status == 'paid':
        plan = transaction['plan']
        plan_details = SUBSCRIPTION_PLANS[plan]
        
        # Calculate subscription end date (1 month from now)
        end_date = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
        
        await db.companies.update_one(
            {"id": transaction['company_id']},
            {"$set": {
                "subscription_plan": plan,
                "subscription_status": "active",
                "subscription_end_date": end_date,
                "max_employees": plan_details['max_employees']
            }}
        )
        
        return {
            "status": "completed",
            "payment_status": "paid",
            "plan": plan,
            "plan_name": plan_details['name'],
            "message": f"Successfully upgraded to {plan_details['name']} plan!"
        }
    elif status.status == 'expired':
        return {
            "status": "expired",
            "payment_status": status.payment_status,
            "message": "Payment session expired. Please try again."
        }
    else:
        return {
            "status": "pending",
            "payment_status": status.payment_status,
            "message": "Payment is being processed..."
        }

@api_router.get("/subscription/history")
async def get_payment_history(current_user: dict = Depends(require_hr)):
    """Get payment transaction history"""
    transactions = await db.payment_transactions.find(
        {"company_id": current_user['company_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return transactions

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == 'paid':
            session_id = webhook_response.session_id
            
            # Find transaction
            transaction = await db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0}
            )
            
            if transaction and transaction['payment_status'] != 'paid':
                plan = transaction['plan']
                plan_details = SUBSCRIPTION_PLANS[plan]
                end_date = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
                
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid"}}
                )
                
                # Update company
                await db.companies.update_one(
                    {"id": transaction['company_id']},
                    {"$set": {
                        "subscription_plan": plan,
                        "subscription_status": "active",
                        "subscription_end_date": end_date,
                        "max_employees": plan_details['max_employees']
                    }}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

# ============== REPORTS (PDF/EXCEL) ==============

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
import xlsxwriter

@api_router.get("/reports/attendance/pdf")
async def generate_attendance_pdf(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(require_hr)
):
    """Generate PDF attendance report"""
    company_id = current_user['company_id']
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    
    # Get records
    records = await db.clock_records.find({
        "company_id": company_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).sort("date", 1).to_list(1000)
    
    # Get user names
    users = await db.users.find({"company_id": company_id}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    user_map = {u['id']: u['name'] for u in users}
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, spaceAfter=20)
    elements.append(Paragraph(f"Relatório de Ponto - {company.get('name', 'CLOCKLN')}", title_style))
    elements.append(Paragraph(f"Período: {start_date} a {end_date}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Table data
    data = [['Funcionário', 'Data', 'Entrada', 'Saída', 'Total', 'Método']]
    for record in records:
        user_name = user_map.get(record['user_id'], 'Desconhecido')
        clock_in = record.get('clock_in', '')[:16].replace('T', ' ') if record.get('clock_in') else '-'
        clock_out = record.get('clock_out', '')[:16].replace('T', ' ') if record.get('clock_out') else '-'
        total = f"{record.get('total_hours', 0):.1f}h" if record.get('total_hours') else '-'
        method = 'QR' if record.get('clock_method') == 'qr' else 'GPS'
        data.append([user_name[:20], record.get('date', ''), clock_in[-8:], clock_out[-8:], total, method])
    
    if len(data) > 1:
        table = Table(data, colWidths=[120, 80, 70, 70, 50, 50])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8fafc'), colors.HexColor('#f1f5f9')]),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("Nenhum registro encontrado no período.", styles['Normal']))
    
    # Summary
    elements.append(Spacer(1, 20))
    total_records = len(records)
    total_hours = sum(r.get('total_hours', 0) or 0 for r in records)
    elements.append(Paragraph(f"Total de Registros: {total_records}", styles['Normal']))
    elements.append(Paragraph(f"Total de Horas: {total_hours:.1f}h", styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"relatorio_ponto_{start_date}_{end_date}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/reports/attendance/excel")
async def generate_attendance_excel(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(require_hr)
):
    """Generate Excel attendance report"""
    company_id = current_user['company_id']
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    
    # Get records
    records = await db.clock_records.find({
        "company_id": company_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).sort("date", 1).to_list(1000)
    
    # Get user info
    users = await db.users.find({"company_id": company_id}, {"_id": 0}).to_list(500)
    user_map = {u['id']: u for u in users}
    
    # Create Excel
    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {'in_memory': True})
    
    # Styles
    header_fmt = workbook.add_format({'bold': True, 'bg_color': '#2563eb', 'font_color': 'white', 'border': 1})
    cell_fmt = workbook.add_format({'border': 1})
    number_fmt = workbook.add_format({'border': 1, 'num_format': '0.00'})
    
    # Sheet 1: Attendance Details
    ws1 = workbook.add_worksheet('Registros de Ponto')
    headers = ['Funcionário', 'Email', 'Data', 'Entrada', 'Saída', 'Total Horas', 'Horas Extra', 'Método', 'Fora do Raio']
    for col, header in enumerate(headers):
        ws1.write(0, col, header, header_fmt)
    
    row = 1
    for record in records:
        user = user_map.get(record['user_id'], {})
        ws1.write(row, 0, user.get('name', 'Desconhecido'), cell_fmt)
        ws1.write(row, 1, user.get('email', ''), cell_fmt)
        ws1.write(row, 2, record.get('date', ''), cell_fmt)
        ws1.write(row, 3, record.get('clock_in', '')[:19] if record.get('clock_in') else '', cell_fmt)
        ws1.write(row, 4, record.get('clock_out', '')[:19] if record.get('clock_out') else '', cell_fmt)
        ws1.write(row, 5, record.get('total_hours', 0) or 0, number_fmt)
        ws1.write(row, 6, record.get('overtime_hours', 0) or 0, number_fmt)
        ws1.write(row, 7, 'QR Code' if record.get('clock_method') == 'qr' else 'Geolocalização', cell_fmt)
        ws1.write(row, 8, 'Sim' if record.get('outside_radius') else 'Não', cell_fmt)
        row += 1
    
    ws1.set_column('A:A', 25)
    ws1.set_column('B:B', 30)
    ws1.set_column('C:C', 12)
    ws1.set_column('D:E', 20)
    ws1.set_column('F:G', 12)
    
    # Sheet 2: Summary by Employee
    ws2 = workbook.add_worksheet('Resumo por Funcionário')
    headers2 = ['Funcionário', 'Total Dias', 'Total Horas', 'Horas Extras', 'Modo de Trabalho']
    for col, header in enumerate(headers2):
        ws2.write(0, col, header, header_fmt)
    
    # Aggregate by user
    user_summary = {}
    for record in records:
        uid = record['user_id']
        if uid not in user_summary:
            user_summary[uid] = {'days': 0, 'hours': 0, 'overtime': 0}
        user_summary[uid]['days'] += 1
        user_summary[uid]['hours'] += record.get('total_hours', 0) or 0
        user_summary[uid]['overtime'] += record.get('overtime_hours', 0) or 0
    
    row = 1
    for uid, summary in user_summary.items():
        user = user_map.get(uid, {})
        ws2.write(row, 0, user.get('name', 'Desconhecido'), cell_fmt)
        ws2.write(row, 1, summary['days'], cell_fmt)
        ws2.write(row, 2, summary['hours'], number_fmt)
        ws2.write(row, 3, summary['overtime'], number_fmt)
        ws2.write(row, 4, user.get('work_mode', 'onsite'), cell_fmt)
        row += 1
    
    ws2.set_column('A:A', 25)
    ws2.set_column('B:E', 15)
    
    workbook.close()
    buffer.seek(0)
    
    filename = f"relatorio_ponto_{start_date}_{end_date}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/reports/employees/pdf")
async def generate_employees_pdf(current_user: dict = Depends(require_hr)):
    """Generate PDF employee roster report"""
    company_id = current_user['company_id']
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    
    # Get employees
    employees = await db.users.find(
        {"company_id": company_id, "is_active": True},
        {"_id": 0, "password_hash": 0, "pin_hash": 0}
    ).sort("name", 1).to_list(500)
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, spaceAfter=20)
    elements.append(Paragraph(f"Lista de Funcionários - {company.get('name', 'CLOCKLN')}", title_style))
    elements.append(Paragraph(f"Gerado em: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Table
    data = [['Nome', 'Email', 'Cargo', 'Modo Trabalho', 'Férias Restantes']]
    for emp in employees:
        role = 'RH' if emp.get('role') == 'hr' else ('Gerente' if emp.get('role') == 'manager' else 'Funcionário')
        work_mode = {'onsite': 'Presencial', 'remote': 'Remoto', 'hybrid': 'Híbrido'}.get(emp.get('work_mode'), 'Presencial')
        vacation_left = emp.get('vacation_days_total', 30) - emp.get('vacation_days_used', 0)
        data.append([emp.get('name', '')[:25], emp.get('email', '')[:30], role, work_mode, str(vacation_left)])
    
    table = Table(data, colWidths=[100, 130, 70, 80, 70])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
    ]))
    elements.append(table)
    
    # Summary
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Total de Funcionários Ativos: {len(employees)}", styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=funcionarios_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"}
    )

# ============== OVERTIME & TIME BANK ROUTES ==============

class OvertimeApprovalRequest(BaseModel):
    status: str  # approved, rejected
    notes: Optional[str] = None

class TimeBankAdjustment(BaseModel):
    hours: float
    description: str

@api_router.get("/overtime/pending")
async def get_pending_overtime(current_user: dict = Depends(get_current_user)):
    """Get pending overtime requests - HR sees all, Manager sees team"""
    company_id = current_user['company_id']
    role = current_user.get('role')
    
    if role == UserRole.HR:
        # HR sees all pending
        requests = await db.overtime_requests.find({
            "company_id": company_id,
            "status": "pending"
        }, {"_id": 0}).sort("requested_at", -1).to_list(100)
    elif role == UserRole.MANAGER:
        # Manager sees only team
        team_ids = await get_managed_users(current_user['id'], company_id)
        requests = await db.overtime_requests.find({
            "company_id": company_id,
            "user_id": {"$in": team_ids},
            "status": "pending"
        }, {"_id": 0}).sort("requested_at", -1).to_list(100)
    else:
        raise HTTPException(status_code=403, detail="HR or Manager access required")
    
    # Enrich with user names
    for req in requests:
        user = await db.users.find_one({"id": req['user_id']}, {"_id": 0, "name": 1, "email": 1})
        if user:
            req['user_name'] = user.get('name', 'Unknown')
            req['user_email'] = user.get('email', '')
    
    return requests

@api_router.get("/overtime/history")
async def get_overtime_history(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get overtime request history"""
    company_id = current_user['company_id']
    role = current_user.get('role')
    user_id = current_user['id']
    
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    query = {"company_id": company_id}
    
    if role == UserRole.EMPLOYEE:
        query["user_id"] = user_id
    elif role == UserRole.MANAGER:
        team_ids = await get_managed_users(user_id, company_id)
        team_ids.append(user_id)  # Include manager's own
        query["user_id"] = {"$in": team_ids}
    # HR sees all
    
    requests = await db.overtime_requests.find(
        query, {"_id": 0}
    ).sort("requested_at", -1).to_list(200)
    
    # Enrich
    for req in requests:
        user = await db.users.find_one({"id": req['user_id']}, {"_id": 0, "name": 1})
        if user:
            req['user_name'] = user.get('name', 'Unknown')
        if req.get('reviewed_by'):
            reviewer = await db.users.find_one({"id": req['reviewed_by']}, {"_id": 0, "name": 1})
            if reviewer:
                req['reviewer_name'] = reviewer.get('name', 'Unknown')
    
    return requests

@api_router.patch("/overtime/{request_id}")
async def review_overtime(
    request_id: str,
    data: OvertimeApprovalRequest,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject overtime request"""
    role = current_user.get('role')
    if role not in [UserRole.HR, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="HR or Manager access required")
    
    request = await db.overtime_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request['company_id'] != current_user['company_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Manager can only approve their team
    if role == UserRole.MANAGER:
        team_ids = await get_managed_users(current_user['id'], current_user['company_id'])
        if request['user_id'] not in team_ids:
            raise HTTPException(status_code=403, detail="Can only approve your team's overtime")
    
    if data.status not in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    # Update request
    now = datetime.now(timezone.utc)
    await db.overtime_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": data.status,
            "reviewed_by": current_user['id'],
            "reviewed_at": now.isoformat(),
            "notes": data.notes
        }}
    )
    
    # If approved, add to time bank
    if data.status == 'approved':
        overtime_hours = request['overtime_hours']
        
        # Create or update time bank
        time_bank = await db.time_banks.find_one(
            {"user_id": request['user_id']},
            {"_id": 0}
        )
        
        if time_bank:
            new_balance = time_bank['balance_hours'] + overtime_hours
            await db.time_banks.update_one(
                {"user_id": request['user_id']},
                {"$set": {"balance_hours": new_balance, "last_updated": now.isoformat()}}
            )
        else:
            new_bank = TimeBank(
                user_id=request['user_id'],
                company_id=request['company_id'],
                balance_hours=overtime_hours
            )
            bank_dict = new_bank.model_dump()
            bank_dict['last_updated'] = bank_dict['last_updated'].isoformat()
            await db.time_banks.insert_one(bank_dict)
        
        # Create transaction
        transaction = TimeBankTransaction(
            user_id=request['user_id'],
            company_id=request['company_id'],
            hours=overtime_hours,
            type="overtime",
            description=f"Horas extras aprovadas ({request['date']})",
            reference_id=request_id
        )
        tx_dict = transaction.model_dump()
        tx_dict['created_at'] = tx_dict['created_at'].isoformat()
        await db.time_bank_transactions.insert_one(tx_dict)
        
        # Create notification for user
        notif = Notification(
            company_id=request['company_id'],
            user_id=request['user_id'],
            title="Horas extras aprovadas!",
            message=f"Suas {overtime_hours:.1f}h extras de {request['date']} foram aprovadas e adicionadas ao banco de horas.",
            type="success",
            created_by=current_user['id']
        )
        notif_dict = notif.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        await db.notifications.insert_one(notif_dict)
    else:
        # Rejected - notify user
        notif = Notification(
            company_id=request['company_id'],
            user_id=request['user_id'],
            title="Horas extras rejeitadas",
            message=f"Suas horas extras de {request['date']} foram rejeitadas. {data.notes or ''}",
            type="warning",
            created_by=current_user['id']
        )
        notif_dict = notif.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        await db.notifications.insert_one(notif_dict)
    
    return {"message": f"Overtime request {data.status}"}

@api_router.get("/timebank/balance")
async def get_timebank_balance(current_user: dict = Depends(get_current_user)):
    """Get current user's time bank balance"""
    time_bank = await db.time_banks.find_one(
        {"user_id": current_user['id']},
        {"_id": 0}
    )
    
    if not time_bank:
        return {"balance_hours": 0.0, "last_updated": None}
    
    return {
        "balance_hours": time_bank.get('balance_hours', 0),
        "last_updated": time_bank.get('last_updated')
    }

@api_router.get("/timebank/transactions")
async def get_timebank_transactions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get time bank transaction history for current user"""
    transactions = await db.time_bank_transactions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return transactions

@api_router.get("/timebank/all")
async def get_all_timebanks(current_user: dict = Depends(require_hr)):
    """Get all time bank balances for company (HR only)"""
    company_id = current_user['company_id']
    
    time_banks = await db.time_banks.find(
        {"company_id": company_id},
        {"_id": 0}
    ).to_list(500)
    
    # Enrich with user names
    for tb in time_banks:
        user = await db.users.find_one({"id": tb['user_id']}, {"_id": 0, "name": 1, "email": 1})
        if user:
            tb['user_name'] = user.get('name', 'Unknown')
            tb['user_email'] = user.get('email', '')
    
    return time_banks

@api_router.post("/timebank/{user_id}/adjust")
async def adjust_timebank(
    user_id: str,
    data: TimeBankAdjustment,
    current_user: dict = Depends(require_hr)
):
    """Manually adjust time bank balance (HR only)"""
    # Verify user exists and belongs to company
    user = await db.users.find_one(
        {"id": user_id, "company_id": current_user['company_id']},
        {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc)
    
    # Get or create time bank
    time_bank = await db.time_banks.find_one({"user_id": user_id}, {"_id": 0})
    
    if time_bank:
        new_balance = time_bank['balance_hours'] + data.hours
        await db.time_banks.update_one(
            {"user_id": user_id},
            {"$set": {"balance_hours": new_balance, "last_updated": now.isoformat()}}
        )
    else:
        new_bank = TimeBank(
            user_id=user_id,
            company_id=current_user['company_id'],
            balance_hours=data.hours
        )
        bank_dict = new_bank.model_dump()
        bank_dict['last_updated'] = bank_dict['last_updated'].isoformat()
        await db.time_banks.insert_one(bank_dict)
        new_balance = data.hours
    
    # Create transaction
    tx_type = "adjustment" if data.hours > 0 else "compensation"
    transaction = TimeBankTransaction(
        user_id=user_id,
        company_id=current_user['company_id'],
        hours=data.hours,
        type=tx_type,
        description=data.description
    )
    tx_dict = transaction.model_dump()
    tx_dict['created_at'] = tx_dict['created_at'].isoformat()
    await db.time_bank_transactions.insert_one(tx_dict)
    
    return {
        "message": "Time bank adjusted",
        "new_balance": new_balance,
        "adjustment": data.hours
    }

@api_router.post("/timebank/use")
async def use_timebank_hours(
    hours: float,
    date: str,
    current_user: dict = Depends(get_current_user)
):
    """Use time bank hours for time off (employee request)"""
    if hours <= 0:
        raise HTTPException(status_code=400, detail="Hours must be positive")
    
    # Get current balance
    time_bank = await db.time_banks.find_one(
        {"user_id": current_user['id']},
        {"_id": 0}
    )
    
    if not time_bank or time_bank['balance_hours'] < hours:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Available: {time_bank['balance_hours'] if time_bank else 0:.1f}h"
        )
    
    now = datetime.now(timezone.utc)
    new_balance = time_bank['balance_hours'] - hours
    
    # Update balance
    await db.time_banks.update_one(
        {"user_id": current_user['id']},
        {"$set": {"balance_hours": new_balance, "last_updated": now.isoformat()}}
    )
    
    # Create transaction
    transaction = TimeBankTransaction(
        user_id=current_user['id'],
        company_id=current_user['company_id'],
        hours=-hours,
        type="compensation",
        description=f"Compensação de {hours:.1f}h em {date}"
    )
    tx_dict = transaction.model_dump()
    tx_dict['created_at'] = tx_dict['created_at'].isoformat()
    await db.time_bank_transactions.insert_one(tx_dict)
    
    return {
        "message": "Hours deducted from time bank",
        "used_hours": hours,
        "new_balance": new_balance
    }

# ============== EMAIL SERVICE ==============

async def send_email_async(to_email: str, subject: str, html_content: str):
    """Send email via SendGrid"""
    if not SENDGRID_API_KEY:
        logger.warning("SendGrid API key not configured, skipping email")
        return False
    
    try:
        message = Mail(
            from_email=Email(SENDER_EMAIL, "CLOCKLN"),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Email sent to {to_email}, status: {response.status_code}")
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def get_email_template(template_type: str, data: dict) -> tuple:
    """Get email subject and HTML content based on template type"""
    
    templates = {
        "overtime_approved": {
            "subject": "✅ Horas Extras Aprovadas - CLOCKLN",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #fff;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #333;">
                    <h1 style="color: #3b82f6; margin: 0;">CLOCKLN</h1>
                </div>
                <div style="padding: 30px 0;">
                    <h2 style="color: #10b981;">Horas Extras Aprovadas!</h2>
                    <p>Olá <strong>{data.get('user_name', 'Funcionário')}</strong>,</p>
                    <p>Suas horas extras foram aprovadas e adicionadas ao seu banco de horas.</p>
                    <div style="background: #2d2d44; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Data:</strong> {data.get('date', 'N/A')}</p>
                        <p><strong>Horas extras:</strong> {data.get('overtime_hours', 0):.1f}h</p>
                        <p><strong>Aprovado por:</strong> {data.get('approver_name', 'RH')}</p>
                    </div>
                    <p>Acesse o app para ver seu saldo atualizado no banco de horas.</p>
                </div>
                <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666;">
                    <p>© 2026 CLOCKLN - Controle de Ponto Inteligente</p>
                </div>
            </div>
            """
        },
        "overtime_rejected": {
            "subject": "❌ Horas Extras Rejeitadas - CLOCKLN",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #fff;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #333;">
                    <h1 style="color: #3b82f6; margin: 0;">CLOCKLN</h1>
                </div>
                <div style="padding: 30px 0;">
                    <h2 style="color: #ef4444;">Horas Extras Rejeitadas</h2>
                    <p>Olá <strong>{data.get('user_name', 'Funcionário')}</strong>,</p>
                    <p>Infelizmente, sua solicitação de horas extras foi rejeitada.</p>
                    <div style="background: #2d2d44; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Data:</strong> {data.get('date', 'N/A')}</p>
                        <p><strong>Horas solicitadas:</strong> {data.get('overtime_hours', 0):.1f}h</p>
                        <p><strong>Motivo:</strong> {data.get('notes', 'Não especificado')}</p>
                    </div>
                    <p>Em caso de dúvidas, entre em contato com o RH.</p>
                </div>
                <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666;">
                    <p>© 2026 CLOCKLN - Controle de Ponto Inteligente</p>
                </div>
            </div>
            """
        },
        "location_alert": {
            "subject": "⚠️ Alerta de Localização - CLOCKLN",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #fff;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #333;">
                    <h1 style="color: #3b82f6; margin: 0;">CLOCKLN</h1>
                </div>
                <div style="padding: 30px 0;">
                    <h2 style="color: #f59e0b;">⚠️ Alerta de Localização</h2>
                    <p>Um funcionário registrou ponto fora do raio permitido.</p>
                    <div style="background: #2d2d44; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Funcionário:</strong> {data.get('user_name', 'N/A')}</p>
                        <p><strong>Data/Hora:</strong> {data.get('datetime', 'N/A')}</p>
                        <p><strong>Distância:</strong> {data.get('distance', 0)}m do local cadastrado</p>
                        <p><strong>Limite permitido:</strong> {data.get('limit', 100)}m</p>
                    </div>
                    <p>Acesse o mapa de pontos remotos para mais detalhes.</p>
                </div>
                <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666;">
                    <p>© 2026 CLOCKLN - Controle de Ponto Inteligente</p>
                </div>
            </div>
            """
        },
        "notification": {
            "subject": f"📢 {data.get('title', 'Notificação')} - CLOCKLN",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #fff;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #333;">
                    <h1 style="color: #3b82f6; margin: 0;">CLOCKLN</h1>
                </div>
                <div style="padding: 30px 0;">
                    <h2 style="color: #3b82f6;">{data.get('title', 'Notificação')}</h2>
                    <p>Olá <strong>{data.get('user_name', 'Funcionário')}</strong>,</p>
                    <div style="background: #2d2d44; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p>{data.get('message', '')}</p>
                    </div>
                    <p>Acesse o app para mais detalhes.</p>
                </div>
                <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666;">
                    <p>© 2026 CLOCKLN - Controle de Ponto Inteligente</p>
                </div>
            </div>
            """
        },
        "welcome": {
            "subject": "🎉 Bem-vindo ao CLOCKLN!",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #fff;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #333;">
                    <h1 style="color: #3b82f6; margin: 0;">CLOCKLN</h1>
                </div>
                <div style="padding: 30px 0;">
                    <h2 style="color: #10b981;">Bem-vindo ao CLOCKLN!</h2>
                    <p>Olá <strong>{data.get('user_name', 'Funcionário')}</strong>,</p>
                    <p>Sua conta foi criada com sucesso na empresa <strong>{data.get('company_name', '')}</strong>.</p>
                    <div style="background: #2d2d44; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Email:</strong> {data.get('email', '')}</p>
                        <p><strong>Modo de trabalho:</strong> {data.get('work_mode', 'Presencial')}</p>
                    </div>
                    <p>Acesse o app para começar a registrar seu ponto.</p>
                </div>
                <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666;">
                    <p>© 2026 CLOCKLN - Controle de Ponto Inteligente</p>
                </div>
            </div>
            """
        }
    }
    
    template = templates.get(template_type, templates['notification'])
    return template['subject'], template['html']

class EmailRequest(BaseModel):
    to_email: EmailStr
    template_type: str
    data: dict = {}

@api_router.post("/email/send")
async def send_email_endpoint(
    request: EmailRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_hr)
):
    """Send email using template (HR only)"""
    subject, html = get_email_template(request.template_type, request.data)
    background_tasks.add_task(send_email_async, request.to_email, subject, html)
    return {"message": "Email queued for delivery"}

@api_router.get("/email/test")
async def test_email(
    to_email: str,
    current_user: dict = Depends(require_hr)
):
    """Test email delivery (HR only)"""
    subject, html = get_email_template("notification", {
        "title": "Teste de Email",
        "user_name": current_user['name'],
        "message": "Este é um email de teste do sistema CLOCKLN. Se você recebeu este email, a configuração está funcionando corretamente!"
    })
    
    success = await send_email_async(to_email, subject, html)
    
    if success:
        return {"message": "Test email sent successfully"}
    else:
        return {"message": "Email sending failed or not configured", "configured": bool(SENDGRID_API_KEY)}

@api_router.get("/email/config")
async def get_email_config(current_user: dict = Depends(require_hr)):
    """Check email configuration status (HR only)"""
    return {
        "configured": bool(SENDGRID_API_KEY),
        "sender_email": SENDER_EMAIL if SENDGRID_API_KEY else None
    }

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
