from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    userID: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    password: str  # Will be hashed
    role: str  # "lawyer", "judge", "registrar"
    barID: Optional[str] = None  # Only for lawyers

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    barID: Optional[str] = None

class UserResponse(BaseModel):
    userID: str
    name: str
    email: str
    role: str
    barID: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

class Case(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cin: str = Field(default_factory=lambda: f"CIN-{uuid.uuid4().hex[:8].upper()}")
    defendantName: str
    defendantAddress: str
    crimeType: str
    crimeDate: str
    crimeLocation: str
    arrestingOfficer: str
    arrestDate: str
    presidingJudge: str
    publicProsecutor: str
    startDate: str
    expectedCompletionDate: str
    hearing: List[str] = []  # List of hearing dates
    judgementInfo: Optional[str] = None
    status: str = "Pending"  # Pending, In Progress, Resolved, Closed
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CaseCreate(BaseModel):
    defendantName: str
    defendantAddress: str
    crimeType: str
    crimeDate: str
    crimeLocation: str
    arrestingOfficer: str
    arrestDate: str
    presidingJudge: str
    publicProsecutor: str
    startDate: str
    expectedCompletionDate: str

class CaseUpdate(BaseModel):
    defendantName: Optional[str] = None
    defendantAddress: Optional[str] = None
    crimeType: Optional[str] = None
    crimeDate: Optional[str] = None
    crimeLocation: Optional[str] = None
    arrestingOfficer: Optional[str] = None
    arrestDate: Optional[str] = None
    presidingJudge: Optional[str] = None
    publicProsecutor: Optional[str] = None
    startDate: Optional[str] = None
    expectedCompletionDate: Optional[str] = None
    status: Optional[str] = None
    judgementInfo: Optional[str] = None

class HearingSchedule(BaseModel):
    cin: str
    hearingDate: str

class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    billID: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    generatedDate: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    lawyerID: str
    lawyerName: str
    status: str = "Unpaid"  # Unpaid, Paid
    description: str = "Case viewing charges"

class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reportID: str = Field(default_factory=lambda: str(uuid.uuid4()))
    generatedDate: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    reportType: str  # "pending", "resolved", "status"
    content: Dict[str, Any]

class ReportRequest(BaseModel):
    reportType: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    cin: Optional[str] = None

# ==================== AUTH UTILITIES ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        userID: str = payload.get("sub")
        if userID is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"userID": userID}, {"_id": 0, "password": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    # Check if username is email or actual username
    user = await db.users.find_one({"email": login_data.username}, {"_id": 0})
    
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token = create_access_token(data={"sub": user["userID"]})
    
    user_response = UserResponse(
        userID=user["userID"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        barID=user.get("barID")
    )
    
    return LoginResponse(token=access_token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ==================== CASE ROUTES ====================

@api_router.post("/cases", response_model=Case)
async def create_case(case_data: CaseCreate, current_user: dict = Depends(get_current_user)):
    # Only registrars can create cases
    if current_user["role"] != "registrar":
        raise HTTPException(status_code=403, detail="Only registrars can create cases")
    
    case_obj = Case(**case_data.model_dump())
    doc = case_obj.model_dump()
    await db.cases.insert_one(doc)
    return case_obj

@api_router.get("/cases", response_model=List[Case])
async def get_cases(
    status: Optional[str] = None,
    crimeType: Optional[str] = None,
    keyword: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if status:
        query["status"] = status
    if crimeType:
        query["crimeType"] = crimeType
    if keyword:
        query["$or"] = [
            {"cin": {"$regex": keyword, "$options": "i"}},
            {"defendantName": {"$regex": keyword, "$options": "i"}},
            {"crimeType": {"$regex": keyword, "$options": "i"}},
            {"crimeLocation": {"$regex": keyword, "$options": "i"}}
        ]
    
    cases = await db.cases.find(query, {"_id": 0}).to_list(1000)
    return cases

@api_router.get("/cases/{cin}", response_model=Case)
async def get_case(cin: str, current_user: dict = Depends(get_current_user)):
    case = await db.cases.find_one({"cin": cin}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Generate bill for lawyers viewing cases
    if current_user["role"] == "lawyer":
        # Check if bill already exists for this case and lawyer
        existing_bill = await db.bills.find_one({
            "lawyerID": current_user["userID"],
            "description": f"Viewing case {cin}"
        })
        
        if not existing_bill:
            bill = Bill(
                amount=100.0,
                lawyerID=current_user["userID"],
                lawyerName=current_user["name"],
                description=f"Viewing case {cin}"
            )
            await db.bills.insert_one(bill.model_dump())
    
    return case

@api_router.put("/cases/{cin}", response_model=Case)
async def update_case(cin: str, case_data: CaseUpdate, current_user: dict = Depends(get_current_user)):
    # Only registrars can update cases
    if current_user["role"] != "registrar":
        raise HTTPException(status_code=403, detail="Only registrars can update cases")
    
    update_data = {k: v for k, v in case_data.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.cases.update_one({"cin": cin}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    updated_case = await db.cases.find_one({"cin": cin}, {"_id": 0})
    return updated_case

@api_router.delete("/cases/{cin}")
async def delete_case(cin: str, current_user: dict = Depends(get_current_user)):
    # Only registrars can delete cases
    if current_user["role"] != "registrar":
        raise HTTPException(status_code=403, detail="Only registrars can delete cases")
    
    result = await db.cases.delete_one({"cin": cin})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    return {"message": "Case deleted successfully"}

@api_router.post("/cases/{cin}/hearing")
async def schedule_hearing(cin: str, hearing_data: HearingSchedule, current_user: dict = Depends(get_current_user)):
    # Only registrars can schedule hearings
    if current_user["role"] != "registrar":
        raise HTTPException(status_code=403, detail="Only registrars can schedule hearings")
    
    result = await db.cases.update_one(
        {"cin": cin},
        {"$push": {"hearing": hearing_data.hearingDate}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    return {"message": "Hearing scheduled successfully"}

# ==================== BILL ROUTES ====================

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(current_user: dict = Depends(get_current_user)):
    # Lawyers can only see their own bills
    if current_user["role"] == "lawyer":
        bills = await db.bills.find({"lawyerID": current_user["userID"]}, {"_id": 0}).to_list(1000)
    else:
        bills = await db.bills.find({}, {"_id": 0}).to_list(1000)
    
    return bills

@api_router.put("/bills/{billID}/pay")
async def pay_bill(billID: str, current_user: dict = Depends(get_current_user)):
    # Only lawyers can pay bills
    if current_user["role"] != "lawyer":
        raise HTTPException(status_code=403, detail="Only lawyers can pay bills")
    
    result = await db.bills.update_one(
        {"billID": billID, "lawyerID": current_user["userID"]},
        {"$set": {"status": "Paid"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    return {"message": "Bill paid successfully"}

# ==================== REPORT ROUTES ====================

@api_router.post("/reports", response_model=Report)
async def generate_report(report_data: ReportRequest, current_user: dict = Depends(get_current_user)):
    # Only registrars can generate reports
    if current_user["role"] != "registrar":
        raise HTTPException(status_code=403, detail="Only registrars can generate reports")
    
    content = {}
    
    if report_data.reportType == "pending":
        cases = await db.cases.find({"status": "Pending"}, {"_id": 0}).to_list(1000)
        content = {
            "totalPendingCases": len(cases),
            "cases": cases
        }
    
    elif report_data.reportType == "resolved":
        query = {"status": {"$in": ["Resolved", "Closed"]}}
        if report_data.startDate and report_data.endDate:
            query["updatedAt"] = {"$gte": report_data.startDate, "$lte": report_data.endDate}
        
        cases = await db.cases.find(query, {"_id": 0}).to_list(1000)
        content = {
            "totalResolvedCases": len(cases),
            "cases": cases,
            "dateRange": {
                "start": report_data.startDate,
                "end": report_data.endDate
            }
        }
    
    elif report_data.reportType == "status" and report_data.cin:
        case = await db.cases.find_one({"cin": report_data.cin}, {"_id": 0})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        content = {"case": case}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid report type or missing parameters")
    
    report = Report(
        reportType=report_data.reportType,
        content=content
    )
    
    doc = report.model_dump()
    await db.reports.insert_one(doc)
    
    return report

@api_router.get("/reports", response_model=List[Report])
async def get_reports(current_user: dict = Depends(get_current_user)):
    # Only registrars can view reports
    if current_user["role"] != "registrar":
        raise HTTPException(status_code=403, detail="Only registrars can view reports")
    
    reports = await db.reports.find({}, {"_id": 0}).sort("generatedDate", -1).to_list(100)
    return reports

# ==================== STATISTICS ====================

@api_router.get("/statistics")
async def get_statistics(current_user: dict = Depends(get_current_user)):
    total_cases = await db.cases.count_documents({})
    pending_cases = await db.cases.count_documents({"status": "Pending"})
    in_progress_cases = await db.cases.count_documents({"status": "In Progress"})
    resolved_cases = await db.cases.count_documents({"status": {"$in": ["Resolved", "Closed"]}})
    
    stats = {
        "totalCases": total_cases,
        "pendingCases": pending_cases,
        "inProgressCases": in_progress_cases,
        "resolvedCases": resolved_cases
    }
    
    if current_user["role"] == "lawyer":
        total_bills = await db.bills.count_documents({"lawyerID": current_user["userID"]})
        unpaid_bills = await db.bills.count_documents({"lawyerID": current_user["userID"], "status": "Unpaid"})
        stats["totalBills"] = total_bills
        stats["unpaidBills"] = unpaid_bills
    
    return stats

# Include the router
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

# ==================== SEED DATA ====================
@app.on_event("startup")
async def create_initial_data():
    # Create root user if not exists
    existing_root = await db.users.find_one({"email": "root@jis.local"})
    if not existing_root:
        root_user = User(
            name="Root Administrator",
            email="root@jis.local",
            password=hash_password("password"),
            role="registrar"
        )
        await db.users.insert_one(root_user.model_dump())
        logger.info("Root user created")
    
    # Create sample users
    sample_users = [
        User(name="John Smith", email="lawyer@test.com", password=hash_password("password"), role="lawyer", barID="BAR001"),
        User(name="Sarah Johnson", email="judge@test.com", password=hash_password("password"), role="judge"),
        User(name="Michael Brown", email="registrar@test.com", password=hash_password("password"), role="registrar"),
    ]
    
    for user in sample_users:
        existing = await db.users.find_one({"email": user.email})
        if not existing:
            await db.users.insert_one(user.model_dump())
    
    # Create sample cases
    existing_cases = await db.cases.count_documents({})
    if existing_cases == 0:
        sample_cases = [
            Case(
                defendantName="Robert Williams",
                defendantAddress="123 Main St, City A",
                crimeType="Theft",
                crimeDate="2024-01-15",
                crimeLocation="Downtown Mall",
                arrestingOfficer="Officer Davis",
                arrestDate="2024-01-16",
                presidingJudge="Hon. Sarah Johnson",
                publicProsecutor="Alex Turner",
                startDate="2024-02-01",
                expectedCompletionDate="2024-06-01",
                status="In Progress",
                hearing=["2024-02-15", "2024-03-10"]
            ),
            Case(
                defendantName="Emily Davis",
                defendantAddress="456 Oak Ave, City B",
                crimeType="Fraud",
                crimeDate="2024-02-20",
                crimeLocation="Bank of Commerce",
                arrestingOfficer="Officer Martinez",
                arrestDate="2024-02-21",
                presidingJudge="Hon. Sarah Johnson",
                publicProsecutor="Rachel Green",
                startDate="2024-03-01",
                expectedCompletionDate="2024-08-01",
                status="Pending",
                hearing=["2024-03-20"]
            ),
            Case(
                defendantName="James Wilson",
                defendantAddress="789 Pine Rd, City C",
                crimeType="Assault",
                crimeDate="2023-11-10",
                crimeLocation="City Park",
                arrestingOfficer="Officer Thompson",
                arrestDate="2023-11-11",
                presidingJudge="Hon. Sarah Johnson",
                publicProsecutor="David Lee",
                startDate="2023-12-01",
                expectedCompletionDate="2024-04-01",
                status="Resolved",
                hearing=["2023-12-15", "2024-01-20", "2024-02-25"],
                judgementInfo="Defendant found guilty. Sentenced to 2 years imprisonment."
            ),
        ]
        
        for case in sample_cases:
            await db.cases.insert_one(case.model_dump())
        
        logger.info("Sample data created successfully")
