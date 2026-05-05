"""OSSA Cost tracking and budget enforcement"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from datetime import datetime


@dataclass
class TokenUsage:
    """Token usage tracking"""
    input_tokens: int = 0
    output_tokens: int = 0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class ProviderPricing:
    """Provider-specific pricing (per 1K tokens)"""
    input_per_1k: float
    output_per_1k: float


class CostTracker:
    """Track and enforce OSSA cost budgets"""

    # Pricing tables per provider
    PRICING = {
        'gemini': ProviderPricing(input_per_1k=0.00015, output_per_1k=0.0006),
        'google': ProviderPricing(input_per_1k=0.00015, output_per_1k=0.0006),
        'anthropic': ProviderPricing(input_per_1k=0.003, output_per_1k=0.015),
        'claude': ProviderPricing(input_per_1k=0.003, output_per_1k=0.015),
    }

    def __init__(self, provider: str = 'gemini'):
        self.provider = provider.lower()
        self.pricing = self.PRICING.get(self.provider, self.PRICING['gemini'])
        self.usage = TokenUsage()
        self.estimated_cost = 0.0
        self.cost_history: list[Dict[str, Any]] = []

    def track_usage(self, input_tokens: int, output_tokens: int) -> float:
        """Track token usage and return estimated cost for this batch"""
        self.usage.input_tokens += input_tokens
        self.usage.output_tokens += output_tokens

        # Calculate cost for this batch
        input_cost = (input_tokens / 1000) * self.pricing.input_per_1k
        output_cost = (output_tokens / 1000) * self.pricing.output_per_1k
        batch_cost = input_cost + output_cost

        # Add to total
        self.estimated_cost += batch_cost

        # Log to history
        self.cost_history.append({
            'timestamp': datetime.now().isoformat(),
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'batch_cost': round(batch_cost, 6),
            'total_cost': round(self.estimated_cost, 6)
        })

        return batch_cost

    def check_budget(self, budget) -> tuple[bool, Optional[str]]:
        """Check if current usage exceeds budget

        Returns:
            (is_within_budget, error_message)
        """
        # Handle both dict and dataclass
        if hasattr(budget, 'perExecution'):
            per_execution = budget.perExecution
        else:
            per_execution = budget.get('perExecution', float('inf'))

        if self.usage.total_tokens > per_execution:
            return False, f"Token budget exceeded: {self.usage.total_tokens} > {per_execution}"

        return True, None

    def check_spend_limit(self, spend_limit: float) -> tuple[bool, Optional[str]]:
        """Check if estimated cost exceeds spend limit

        Returns:
            (is_within_limit, error_message)
        """
        if self.estimated_cost > spend_limit:
            return False, f"Spend limit exceeded: ${self.estimated_cost:.4f} > ${spend_limit:.2f}"

        return True, None

    def get_summary(self) -> Dict[str, Any]:
        """Get usage and cost summary"""
        return {
            'provider': self.provider,
            'tokens': {
                'input': self.usage.input_tokens,
                'output': self.usage.output_tokens,
                'total': self.usage.total_tokens
            },
            'cost': {
                'estimated_usd': round(self.estimated_cost, 6),
                'input_price_per_1k': self.pricing.input_per_1k,
                'output_price_per_1k': self.pricing.output_per_1k
            },
            'history': self.cost_history
        }

    def reset(self):
        """Reset tracker for new execution"""
        self.usage = TokenUsage()
        self.estimated_cost = 0.0
        self.cost_history = []
