"""Google Gemini provider — uses google-genai SDK (v1+).
Auth priority:
  1. Vertex AI via ADC (VERTEXAI_PROJECT + VERTEXAI_LOCATION env vars set)  → no API key needed
  2. API key  (GEMINI_API_KEY / GOOGLE_API_KEY env var or passed directly)
"""

import os
import asyncio
from typing import AsyncGenerator, Dict, Any
from .base import LLMProvider


def _make_client(api_key: str):
    """Return a google.genai Client using Vertex AI ADC or API key."""
    from google import genai

    project  = os.getenv("VERTEXAI_PROJECT") or os.getenv("GCP_PROJECT_ID")
    location = os.getenv("VERTEXAI_LOCATION", "us-central1")

    if project:
        return genai.Client(vertexai=True, project=project, location=location)

    key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
    if not key:
        raise ValueError("No Gemini API key and no VERTEXAI_PROJECT configured.")
    return genai.Client(api_key=key)


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider (google-genai SDK)"""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash", thinking_budget: int = -1):
        super().__init__(api_key, model)
        self._client = _make_client(api_key)
        self._thinking_budget = thinking_budget  # -1 = model default; 0 = disabled

    def get_provider_name(self) -> str:
        return "gemini"

    def call_sync(self, system_prompt: str, user_message: str,
                  temperature: float, max_tokens: int) -> Dict[str, Any]:
        from google.genai import types

        try:
            config_kwargs: dict = dict(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            if self._thinking_budget >= 0:
                config_kwargs["thinking_config"] = types.ThinkingConfig(
                    thinking_budget=self._thinking_budget
                )

            response = self._client.models.generate_content(
                model=self.model,
                contents=f"{system_prompt}\n\nUser input:\n{user_message}",
                config=types.GenerateContentConfig(**config_kwargs),
            )

            meta = getattr(response, "usage_metadata", None)
            input_tokens  = getattr(meta, "prompt_token_count",     0) if meta else 0
            output_tokens = getattr(meta, "candidates_token_count", 0) if meta else 0

            return {
                "status": "success",
                "output": response.text,
                "tokens": {"input": input_tokens, "output": output_tokens},
                "model": self.model,
                "provider": self.get_provider_name(),
            }

        except Exception as e:
            return {"status": "error", "error": str(e), "provider": self.get_provider_name()}

    async def call_stream(self, system_prompt: str, user_message: str,
                          temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        """Real token-by-token streaming via Gemini generate_content_stream."""
        from google.genai import types

        config_kwargs: dict = dict(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        if self._thinking_budget >= 0:
            config_kwargs["thinking_config"] = types.ThinkingConfig(
                thinking_budget=self._thinking_budget
            )

        contents = f"{system_prompt}\n\nUser input:\n{user_message}"

        try:
            # Use thread executor so the sync iterator doesn't block the event loop
            loop = asyncio.get_event_loop()
            queue: asyncio.Queue = asyncio.Queue()

            def _stream_in_thread():
                try:
                    for chunk in self._client.models.generate_content_stream(
                        model=self.model,
                        contents=contents,
                        config=types.GenerateContentConfig(**config_kwargs),
                    ):
                        text = getattr(chunk, "text", None)
                        if text:
                            loop.call_soon_threadsafe(queue.put_nowait, text)
                except Exception as exc:
                    loop.call_soon_threadsafe(queue.put_nowait, f"\n\nError: {exc}")
                finally:
                    loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

            loop.run_in_executor(None, _stream_in_thread)

            while True:
                token = await queue.get()
                if token is None:
                    break
                yield token

        except Exception as e:
            yield f"Error: {str(e)}"
