"""OSSA Agent Executor - Main orchestration engine"""

import uuid
from typing import Dict, Any, Optional, AsyncGenerator
from pathlib import Path
import asyncio

from ossa.manifest import OSSAManifest, ManifestLoader
from ossa.cost_tracker import CostTracker
from providers.gemini import GeminiProvider
from config import settings, check_api_keys


class ExecutionContext:
    """Context for a single agent execution"""

    def __init__(self, execution_id: str, manifest: OSSAManifest, input_data: str):
        self.execution_id = execution_id
        self.manifest = manifest
        self.input_data = input_data
        self.status = "initializing"
        self.cost_tracker = CostTracker(provider=manifest.spec.llm.provider)
        self.hitl_required = False
        self.hitl_approved = False
        self.response_text = ""
        self.error_message: Optional[str] = None
        self.events: list[Dict[str, Any]] = []

    def log_event(self, event_type: str, data: Dict[str, Any]):
        """Log an execution event"""
        self.events.append({
            "type": event_type,
            "data": data
        })

    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary"""
        return {
            "execution_id": self.execution_id,
            "manifest_name": self.manifest.metadata.name,
            "status": self.status,
            "hitl_required": self.hitl_required,
            "hitl_approved": self.hitl_approved,
            "cost_summary": self.cost_tracker.get_summary(),
            "response_text": self.response_text,
            "error": self.error_message,
            "events": self.events
        }


class OSSAAgentExecutor:
    """OSSA Agent Executor - coordinates manifest execution"""

    def __init__(self):
        self.executions: Dict[str, ExecutionContext] = {}
        self.manifest_loader = ManifestLoader()

        # Verify API keys on startup
        check_api_keys()

    def list_manifests(self) -> list[Dict[str, Any]]:
        """List all available manifests"""
        manifests_dir = settings.manifests_dir
        if not manifests_dir.exists():
            return []

        manifests = []
        for manifest_file in manifests_dir.glob("*.ossa.yaml"):
            try:
                manifest = self.manifest_loader.load_manifest(manifest_file)
                manifests.append({
                    "name": manifest.metadata.name,
                    "version": manifest.metadata.version,
                    "description": manifest.metadata.description,
                    "provider": manifest.spec.llm.provider,
                    "model": manifest.spec.llm.model,
                    "compliance": {
                        "frameworks": manifest.spec.compliance.frameworks,
                        "classification": manifest.spec.compliance.dataClassification
                    },
                    "cost": manifest.spec.cost.spendLimits,
                    "hitl_enabled": manifest.spec.hitl.enabled,
                    "trust_tier": manifest.spec.trust.tier
                })
            except Exception as e:
                print(f"Error loading manifest {manifest_file}: {e}")

        return manifests

    def get_manifest(self, name: str) -> Optional[OSSAManifest]:
        """Load a specific manifest by name"""
        manifests_dir = settings.manifests_dir
        manifest_file = manifests_dir / f"{name}.ossa.yaml"

        if not manifest_file.exists():
            return None

        try:
            return self.manifest_loader.load_manifest(manifest_file)
        except Exception as e:
            print(f"Error loading manifest {name}: {e}")
            return None

    def start_execution(self, manifest_name: str, input_data: str) -> str:
        """Start a new agent execution

        Returns: execution_id
        """
        manifest = self.get_manifest(manifest_name)
        if not manifest:
            raise ValueError(f"Manifest not found: {manifest_name}")

        execution_id = str(uuid.uuid4())
        context = ExecutionContext(execution_id, manifest, input_data)

        # Check HITL requirements
        context.hitl_required = self._check_hitl(context)

        self.executions[execution_id] = context
        context.log_event("execution_started", {
            "manifest_name": manifest_name,
            "hitl_required": context.hitl_required
        })

        return execution_id

    def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get status of an execution"""
        context = self.executions.get(execution_id)
        if not context:
            return None

        return context.to_dict()

    def approve_execution(self, execution_id: str) -> bool:
        """Approve HITL for an execution"""
        context = self.executions.get(execution_id)
        if not context:
            return False

        context.hitl_approved = True
        context.log_event("hitl_approved", {})

        return True

    def _check_hitl(self, context: ExecutionContext) -> bool:
        """Check if HITL is required based on manifest configuration"""
        manifest = context.manifest

        if not manifest.spec.hitl.enabled:
            return False

        for point in manifest.spec.hitl.interventionPoints:
            if point.mode == "NEVER":
                continue

            trigger = point.trigger
            if trigger.get("type") == "on_condition":
                condition = trigger.get("condition", "")
                if "input_size" in condition:
                    threshold = int(condition.split(">")[1].strip())
                    if len(context.input_data) > threshold:
                        if point.mode == "ALWAYS":
                            return True

        return False

    async def execute_agent_stream(self, execution_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute agent with streaming response

        Yields SSE-formatted event dictionaries
        """
        context = self.executions.get(execution_id)
        if not context:
            yield {"type": "error", "data": {"error": "Execution not found"}}
            return

        manifest = context.manifest

        # Check if HITL is required and not yet approved
        if context.hitl_required and not context.hitl_approved:
            yield {
                "type": "hitl_required",
                "data": {
                    "execution_id": execution_id,
                    "reason": "Large input requires approval",
                    "timeout": 300
                }
            }

            # Wait for approval (in production, this would timeout after 5 min)
            context.status = "waiting_for_approval"
            max_wait = 300  # 5 minutes
            waited = 0

            while not context.hitl_approved and waited < max_wait:
                await asyncio.sleep(1)
                waited += 1

            if not context.hitl_approved:
                context.status = "rejected"
                context.error_message = "HITL approval timeout"
                yield {
                    "type": "execution_complete",
                    "data": {
                        "status": "rejected",
                        "reason": "HITL approval timeout"
                    }
                }
                return

            yield {"type": "hitl_approved", "data": {}}

        # Check cost budget before execution
        within_budget, error_msg = context.cost_tracker.check_budget(manifest.spec.cost.tokenBudget)
        if not within_budget:
            context.status = "rejected"
            context.error_message = error_msg
            yield {
                "type": "execution_complete",
                "data": {
                    "status": "rejected",
                    "reason": error_msg
                }
            }
            return

        # Initialize LLM provider
        context.status = "running"
        yield {"type": "execution_status", "data": {"status": "running"}}

        provider = self._get_provider(manifest.spec.llm)
        if not provider:
            context.status = "error"
            context.error_message = "Provider not available"
            yield {
                "type": "execution_complete",
                "data": {
                    "status": "error",
                    "reason": "Provider not available"
                }
            }
            return

        # Execute LLM call with streaming
        try:
            response_text = ""

            async for chunk in provider.call_stream(
                system_prompt=manifest.spec.role,
                user_message=context.input_data,
                temperature=manifest.spec.llm.temperature,
                max_tokens=manifest.spec.llm.maxTokens
            ):
                response_text += chunk
                context.response_text = response_text

                yield {
                    "type": "response_chunk",
                    "data": {
                        "chunk": chunk,
                        "full_response": response_text
                    }
                }

                await asyncio.sleep(0.01)  # Simulate streaming delay

            # Get final token usage (simulated for now)
            # In production, we'd get this from the API response
            estimated_tokens = len(response_text) // 4  # Rough estimate
            context.cost_tracker.track_usage(
                input_tokens=len(context.input_data) // 4,
                output_tokens=estimated_tokens
            )

            yield {
                "type": "cost_update",
                "data": context.cost_tracker.get_summary()
            }

            context.status = "completed"
            context.log_event("execution_completed", {
                "response_length": len(response_text),
                "tokens_used": context.cost_tracker.usage.total_tokens,
                "cost": context.cost_tracker.estimated_cost
            })

            yield {
                "type": "execution_complete",
                "data": {
                    "status": "completed",
                    "response": response_text,
                    "cost_summary": context.cost_tracker.get_summary()
                }
            }

        except Exception as e:
            context.status = "error"
            context.error_message = str(e)
            context.log_event("execution_error", {"error": str(e)})

            yield {
                "type": "execution_complete",
                "data": {
                    "status": "error",
                    "reason": str(e)
                }
            }

    def _get_provider(self, llm_config):
        """Get LLM provider instance based on config"""
        provider_name = llm_config.provider.lower()

        if provider_name in ["gemini", "google"]:
            api_key = settings.gemini_api_key or settings.google_api_key
            if not api_key:
                print("Warning: GEMINI_API_KEY not set")
                return None
            # thinking_budget=0 disables extended thinking — cuts latency from 30s → 3-8s
            return GeminiProvider(api_key, llm_config.model, thinking_budget=0)

        # More providers can be added here
        print(f"Warning: Unknown provider: {provider_name}")
        return None


# Global executor instance
executor = OSSAAgentExecutor()
