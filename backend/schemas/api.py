"""Pydantic schemas for API requests/responses"""

from pydantic import BaseModel
from typing import Optional, Dict, Any


class ExecuteAgentRequest(BaseModel):
    """Request to execute an agent"""
    manifest_name: str
    input: str
    user_id: Optional[str] = None


class ApproveExecutionRequest(BaseModel):
    """Request to approve HITL execution"""
    execution_id: str
    approved: bool
    user_id: Optional[str] = None


class ExecutionStatusResponse(BaseModel):
    """Execution status response"""
    execution_id: str
    manifest_name: str
    status: str
    hitl_required: bool
    hitl_approved: bool
    response_text: str
    error: Optional[str] = None
    cost_summary: Dict[str, Any]


class ManifestMetadataResponse(BaseModel):
    """Manifest metadata for list/get"""
    name: str
    version: str
    description: str
    provider: str
    model: str
    compliance: Dict[str, Any]
    cost: Dict[str, Any]
    hitl_enabled: bool
    trust_tier: str


class UpdateManifestRequest(BaseModel):
    """Request to update an existing agent manifest"""
    description: Optional[str] = None
    role: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    compliance_frameworks: Optional[list[str]] = None
    data_classification: Optional[str] = None
    daily_spend_limit: Optional[float] = None
    token_budget_per_execution: Optional[int] = None
    hitl_enabled: Optional[bool] = None
    trust_tier: Optional[str] = None


class CreateManifestRequest(BaseModel):
    """Request to create a new agent manifest"""
    name: str
    description: str
    role: str
    provider: str = "gemini"
    model: str = "gemini-2.5-flash"
    temperature: float = 0.3
    max_tokens: int = 1024
    compliance_frameworks: list[str] = ["SOC2"]
    data_classification: str = "internal"
    daily_spend_limit: float = 1.0
    token_budget_per_execution: int = 2000
    hitl_enabled: bool = False
    trust_tier: str = "org-verified"
