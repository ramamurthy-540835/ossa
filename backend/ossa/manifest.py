"""OSSA Manifest parser - Load and validate YAML manifest files"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
import yaml
from pathlib import Path


@dataclass
class LLMConfig:
    """LLM configuration from manifest"""
    provider: str
    model: str
    temperature: float = 0.7
    maxTokens: int = 1024


@dataclass
class ComplianceConfig:
    """Compliance requirements"""
    frameworks: List[str] = field(default_factory=list)
    dataClassification: str = "public"
    retentionPolicy: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CostBudget:
    """Cost tracking budgets"""
    perExecution: int = 2000
    daily: int = 10000


@dataclass
class CostConfig:
    """Cost governance"""
    tokenBudget: CostBudget = field(default_factory=CostBudget)
    spendLimits: Dict[str, float] = field(default_factory=lambda: {"daily": 1.0})


@dataclass
class InterventionPoint:
    """HITL intervention configuration"""
    id: str
    trigger: Dict[str, Any]
    mode: str = "NEVER"
    approvers: List[str] = field(default_factory=list)


@dataclass
class HITLConfig:
    """Human-In-The-Loop configuration"""
    enabled: bool = False
    interventionPoints: List[InterventionPoint] = field(default_factory=list)


@dataclass
class TrustConfig:
    """Trust and verification metadata"""
    tier: str = "unverified"
    verificationDate: Optional[str] = None
    verifiedBy: Optional[str] = None


@dataclass
class AuditLogConfig:
    """Audit logging configuration"""
    enabled: bool = True
    level: str = "basic"


@dataclass
class ObservabilityConfig:
    """Observability settings"""
    auditLog: AuditLogConfig = field(default_factory=AuditLogConfig)
    logging: Dict[str, Any] = field(default_factory=lambda: {"level": "INFO"})


@dataclass
class AgentSpec:
    """Agent specification from manifest"""
    role: str
    llm: LLMConfig
    tools: List[Dict[str, Any]] = field(default_factory=list)
    compliance: ComplianceConfig = field(default_factory=ComplianceConfig)
    cost: CostConfig = field(default_factory=CostConfig)
    hitl: HITLConfig = field(default_factory=HITLConfig)
    trust: TrustConfig = field(default_factory=TrustConfig)
    observability: ObservabilityConfig = field(default_factory=ObservabilityConfig)


@dataclass
class ManifestMetadata:
    """Manifest metadata"""
    name: str
    version: str = "1.0.0"
    description: str = ""
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class OSSAManifest:
    """Parsed OSSA manifest"""
    apiVersion: str
    kind: str
    metadata: ManifestMetadata
    spec: AgentSpec

    def to_dict(self) -> Dict[str, Any]:
        """Convert manifest to dictionary"""
        return asdict(self)


class ManifestLoader:
    """Load and parse OSSA manifests from YAML files"""

    @staticmethod
    def load_yaml(path: Path) -> Dict[str, Any]:
        """Load YAML file"""
        with open(path, 'r') as f:
            return yaml.safe_load(f) or {}

    @staticmethod
    def parse_manifest(data: Dict[str, Any]) -> OSSAManifest:
        """Parse manifest dictionary into OSSAManifest object"""

        # Parse metadata
        metadata_data = data.get('metadata', {})
        metadata = ManifestMetadata(
            name=metadata_data.get('name', 'unnamed'),
            version=metadata_data.get('version', '1.0.0'),
            description=metadata_data.get('description', ''),
            labels=metadata_data.get('labels', {})
        )

        # Parse spec
        spec_data = data.get('spec', {})

        # LLM config
        llm_data = spec_data.get('llm', {})
        llm = LLMConfig(
            provider=llm_data.get('provider', 'gemini'),
            model=llm_data.get('model', 'gemini-2.5-flash'),
            temperature=float(llm_data.get('temperature', 0.7)),
            maxTokens=int(llm_data.get('maxTokens', 1024))
        )

        # Compliance
        compliance_data = spec_data.get('compliance', {})
        compliance = ComplianceConfig(
            frameworks=compliance_data.get('frameworks', []),
            dataClassification=compliance_data.get('dataClassification', 'public'),
            retentionPolicy=compliance_data.get('retentionPolicy', {})
        )

        # Cost
        cost_data = spec_data.get('cost', {})
        budget_data = cost_data.get('tokenBudget', {})
        cost = CostConfig(
            tokenBudget=CostBudget(
                perExecution=int(budget_data.get('perExecution', 2000)),
                daily=int(budget_data.get('daily', 10000))
            ),
            spendLimits=cost_data.get('spendLimits', {'daily': 1.0})
        )

        # HITL
        hitl_data = spec_data.get('hitl', {})
        hitl_points = []
        for point in hitl_data.get('interventionPoints', []):
            hitl_points.append(InterventionPoint(
                id=point.get('id', 'unknown'),
                trigger=point.get('trigger', {}),
                mode=point.get('mode', 'NEVER'),
                approvers=point.get('approvers', [])
            ))
        hitl = HITLConfig(
            enabled=hitl_data.get('enabled', False),
            interventionPoints=hitl_points
        )

        # Trust
        trust_data = spec_data.get('trust', {})
        trust = TrustConfig(
            tier=trust_data.get('tier', 'unverified'),
            verificationDate=trust_data.get('verificationDate'),
            verifiedBy=trust_data.get('verifiedBy')
        )

        # Observability
        obs_data = spec_data.get('observability', {})
        audit_data = obs_data.get('auditLog', {})
        observability = ObservabilityConfig(
            auditLog=AuditLogConfig(
                enabled=audit_data.get('enabled', True),
                level=audit_data.get('level', 'basic')
            ),
            logging=obs_data.get('logging', {})
        )

        spec = AgentSpec(
            role=spec_data.get('role', 'You are a helpful assistant.'),
            llm=llm,
            tools=spec_data.get('tools', []),
            compliance=compliance,
            cost=cost,
            hitl=hitl,
            trust=trust,
            observability=observability
        )

        return OSSAManifest(
            apiVersion=data.get('apiVersion', 'ossa/v0.4.6'),
            kind=data.get('kind', 'Agent'),
            metadata=metadata,
            spec=spec
        )

    @staticmethod
    def load_manifest(manifest_path: Path) -> OSSAManifest:
        """Load manifest from file"""
        data = ManifestLoader.load_yaml(manifest_path)
        return ManifestLoader.parse_manifest(data)
