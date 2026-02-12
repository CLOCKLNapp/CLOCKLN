from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

app = FastAPI(title="CLOCKLN API", version="1.0.0")
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyCreate(BaseModel):
    name: str
    timezone: str = "UTC"
    default_language: str = "en"
    weekly_hours: int = 40

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = UserRole.EMPLOYEE
    company_id: str
    pin: Optional[str] = None
    language: str = "en"
    timezone: str = "UTC"

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

class UpdateUser(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    pin: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

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

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register-company", response_model=dict)
async def register_company(company: CompanyCreate, user: UserCreate):
    """Register a new company with initial HR user"""
    # Check if company name exists
    existing = await db.companies.find_one({"name": company.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Company name already exists")
    
    # Check if email exists
    existing_user = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create company
    company_obj = Company(**company.model_dump())
    company_dict = company_obj.model_dump()
    company_dict['created_at'] = company_dict['created_at'].isoformat()
    await db.companies.insert_one(company_dict)
    
    # Create HR user
    user_obj = User(
        email=user.email,
        name=user.name,
        role=UserRole.HR,
        company_id=company_obj.id,
        language=user.language,
        timezone=user.timezone
    )
    user_dict = user_obj.model_dump()
    user_dict['password_hash'] = hash_password(user.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    if user.pin:
        user_dict['pin_hash'] = hash_pin(user.pin)
    await db.users.insert_one(user_dict)
    
    # Create token
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
    
    # Generate unique code
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
    
    # Delete old QR codes for this company
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

# ============== CLOCK ROUTES ==============

@api_router.post("/clock/scan", response_model=dict)
async def clock_via_qr(data: QRClockIn, current_user: dict = Depends(get_current_user)):
    """Clock in/out by scanning QR code"""
    # Verify QR code
    qr = await db.qr_codes.find_one({"code": data.qr_code}, {"_id": 0})
    if not qr:
        raise HTTPException(status_code=400, detail="Invalid QR code")
    
    # Check expiration
    expires_at = datetime.fromisoformat(qr['expires_at'].replace('Z', '+00:00')) if isinstance(qr['expires_at'], str) else qr['expires_at']
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="QR code expired")
    
    # Verify company match
    if qr['company_id'] != current_user['company_id']:
        raise HTTPException(status_code=400, detail="Invalid QR code for your company")
    
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
        
        # Get company for overtime calculation
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
            "message": "Clock out successful"
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
        
        return {
            "action": "clock_in",
            "time": now.isoformat(),
            "message": "Clock in successful"
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

# ============== DASHBOARD ROUTES ==============

@api_router.get("/dashboard/employee", response_model=dict)
async def employee_dashboard(current_user: dict = Depends(get_current_user)):
    """Get employee dashboard data"""
    user_id = current_user['id']
    now = datetime.now(timezone.utc)
    
    # Current month dates
    month_start = now.replace(day=1).strftime("%Y-%m-%d")
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
    
    # Calculate time bank (simplified: overtime accumulates)
    time_bank = overtime_hours
    
    # Current status
    status = await get_clock_status(current_user)
    
    return {
        "total_hours_month": round(total_hours, 2),
        "overtime_hours_month": round(overtime_hours, 2),
        "time_bank": round(time_bank, 2),
        "days_worked": days_worked,
        "weekly_hours": weekly_hours,
        "current_status": status,
        "recent_records": records[:7]
    }

@api_router.get("/dashboard/hr", response_model=dict)
async def hr_dashboard(current_user: dict = Depends(require_hr)):
    """Get HR dashboard data"""
    company_id = current_user['company_id']
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    month_start = now.replace(day=1).strftime("%Y-%m-%d")
    
    # Count active employees
    total_employees = await db.users.count_documents({
        "company_id": company_id,
        "is_active": True
    })
    
    # Count clocked in today
    clocked_in_today = await db.clock_records.count_documents({
        "company_id": company_id,
        "date": today,
        "clock_out": None
    })
    
    # Get all records this month
    records = await db.clock_records.find({
        "company_id": company_id,
        "date": {"$gte": month_start}
    }, {"_id": 0}).to_list(1000)
    
    total_overtime = sum(r.get("overtime_hours", 0) or 0 for r in records)
    
    # Get recent employees
    employees = await db.users.find({
        "company_id": company_id,
        "is_active": True
    }, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(100)
    
    return {
        "total_employees": total_employees,
        "clocked_in_today": clocked_in_today,
        "total_overtime_month": round(total_overtime, 2),
        "employees": employees[:10]
    }

# ============== USER MANAGEMENT ROUTES ==============

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_hr)):
    """Create a new user (HR only)"""
    # Check email exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Ensure same company
    if user_data.company_id != current_user['company_id']:
        raise HTTPException(status_code=403, detail="Cannot create user for another company")
    
    user_obj = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        company_id=user_data.company_id,
        language=user_data.language,
        timezone=user_data.timezone
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
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

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
