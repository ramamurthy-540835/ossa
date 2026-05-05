"""Abstract base class for LLM providers"""

from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncGenerator


class LLMProvider(ABC):
    """Abstract LLM provider interface"""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    def get_provider_name(self) -> str:
        """Get provider name"""
        pass

    @abstractmethod
    def call_sync(self, system_prompt: str, user_message: str, temperature: float, max_tokens: int) -> Dict[str, Any]:
        """Synchronous LLM call - returns response with token usage"""
        pass

    @abstractmethod
    async def call_stream(self, system_prompt: str, user_message: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        """Stream LLM response chunks"""
        pass
