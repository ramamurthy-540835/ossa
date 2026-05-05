"""
OSSA LangChain Orchestrator
============================
Provides LangChain-based execution with:
  - Automatic chunking via RecursiveCharacterTextSplitter
  - Map-reduce for large documents
  - LCEL pipeline: prompt → model → output parser
  - Multi-provider routing (Gemini, Claude, OpenAI)
  - Seamless fallback to Gemini Flash when keys absent

Pipeline modes:
  direct   — single LLM call (short inputs ≤ 3000 chars)
  map      — chunk → summarise each chunk → combine (long inputs)
  refine   — iterative refinement across chunks (highest quality)
"""

import os
from typing import Any, Iterator, List, Optional

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration


# ── Custom Gemini wrapper using google-genai SDK (avoids the old SDK key issues) ──

class _GenAIChatModel(BaseChatModel):
    """Thin LangChain BaseChatModel wrapping google-genai (new SDK)."""
    model_id: str
    temperature: float = 0.2

    class Config:
        arbitrary_types_allowed = True

    @property
    def _llm_type(self) -> str:
        return "google-genai"

    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None,
                  **kwargs) -> ChatResult:
        from google import genai
        from google.genai import types

        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        project = os.getenv("VERTEXAI_PROJECT") or os.getenv("GCP_PROJECT_ID")
        location = os.getenv("VERTEXAI_LOCATION", "us-central1")

        if project:
            client = genai.Client(vertexai=True, project=project, location=location)
        else:
            client = genai.Client(api_key=api_key)

        # Reconstruct system prompt + user prompt from LangChain messages
        system_parts: list[str] = []
        user_parts: list[str] = []
        for m in messages:
            if isinstance(m, SystemMessage):
                system_parts.append(m.content)
            elif isinstance(m, HumanMessage):
                user_parts.append(m.content)
            elif isinstance(m, AIMessage):
                user_parts.append(f"Assistant: {m.content}")
            else:
                user_parts.append(str(m.content))

        full_prompt = ""
        if system_parts:
            full_prompt += "\n\n".join(system_parts) + "\n\n"
        full_prompt += "\n\n".join(user_parts)

        response = client.models.generate_content(
            model=self.model_id,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                temperature=self.temperature,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        text = response.text or ""
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])


# ── Model factory ─────────────────────────────────────────────────────────────

def _get_lc_model(model_id: str, temperature: float = 0.2):
    """Return the appropriate LangChain chat model for a model ID."""
    provider_map = {
        "gemini": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash",
                   "gemini-2.0-flash-lite", "gemini-3-pro-preview", "gemini-3-flash-preview"],
        "anthropic": ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-7"],
        "openai": ["gpt-4o-mini", "gpt-4o", "o3-mini", "o1"],
    }
    provider = next((p for p, ids in provider_map.items() if model_id in ids), "gemini")

    if provider == "gemini":
        return _GenAIChatModel(model_id=model_id, temperature=temperature)

    if provider == "anthropic":
        try:
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(
                model=model_id,
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
                temperature=temperature,
            )
        except Exception:
            pass  # fall through to Gemini fallback

    if provider == "openai":
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model_id,
                openai_api_key=os.getenv("OPENAI_API_KEY", ""),
                temperature=temperature,
            )
        except Exception:
            pass

    # Fallback — always available
    return _GenAIChatModel(model_id="gemini-2.5-flash", temperature=temperature)


# ── Text splitter ─────────────────────────────────────────────────────────────

def _splitter(chunk_size: int = 2000, chunk_overlap: int = 200):
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )


# ── Orchestration modes ────────────────────────────────────────────────────────

def _direct(llm, system_role: str, user_input: str) -> dict:
    """Single-call LCEL chain — best for short inputs."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_role),
        ("human",  "{input}"),
    ])
    chain = prompt | llm | StrOutputParser()
    output = chain.invoke({"input": user_input})
    return {
        "mode": "direct",
        "chunks": 1,
        "chunk_outputs": [],
        "output": output,
    }


def _map_reduce(llm, fast_llm, system_role: str, user_input: str,
                chunks: list[str]) -> dict:
    """
    Map: summarise each chunk with fast_llm.
    Reduce: combine summaries + answer final question with main llm.
    """
    map_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant. Extract the key information from this text segment."),
        ("human",  "Segment:\n{chunk}\n\nTask context: {task}"),
    ])
    map_chain = map_prompt | fast_llm | StrOutputParser()

    chunk_outputs = []
    for i, chunk in enumerate(chunks):
        out = map_chain.invoke({"chunk": chunk, "task": user_input[:500]})
        chunk_outputs.append({"chunk_index": i + 1, "total_chunks": len(chunks),
                               "chars": len(chunk), "summary": out})

    combined = "\n\n---\n\n".join(
        f"[Segment {c['chunk_index']}/{c['total_chunks']}]\n{c['summary']}"
        for c in chunk_outputs
    )

    reduce_prompt = ChatPromptTemplate.from_messages([
        ("system", system_role),
        ("human",  "Using the following summaries of document segments, answer the original request.\n\n"
                   "Summaries:\n{combined}\n\nOriginal request: {request}"),
    ])
    reduce_chain = reduce_prompt | llm | StrOutputParser()
    final = reduce_chain.invoke({"combined": combined, "request": user_input})

    return {
        "mode": "map_reduce",
        "chunks": len(chunks),
        "chunk_outputs": chunk_outputs,
        "output": final,
    }


def _refine(llm, system_role: str, user_input: str, chunks: list[str]) -> dict:
    """
    Iterative refinement: start with first chunk, refine answer with each subsequent chunk.
    Highest quality for long documents.
    """
    init_prompt = ChatPromptTemplate.from_messages([
        ("system", system_role),
        ("human",  "Using the following text, begin answering: {request}\n\nText:\n{chunk}"),
    ])
    refine_prompt = ChatPromptTemplate.from_messages([
        ("system", system_role),
        ("human",  "Existing answer so far:\n{existing}\n\n"
                   "New information from next segment:\n{chunk}\n\n"
                   "Refine the answer incorporating the new information. "
                   "Keep the full context and improve completeness. "
                   "Original request: {request}"),
    ])

    init_chain   = init_prompt   | llm | StrOutputParser()
    refine_chain = refine_prompt | llm | StrOutputParser()

    chunk_outputs = []
    current = init_chain.invoke({"request": user_input, "chunk": chunks[0]})
    chunk_outputs.append({"chunk_index": 1, "total_chunks": len(chunks),
                           "chars": len(chunks[0]), "summary": current[:300]})

    for i, chunk in enumerate(chunks[1:], start=2):
        current = refine_chain.invoke(
            {"existing": current, "chunk": chunk, "request": user_input}
        )
        chunk_outputs.append({"chunk_index": i, "total_chunks": len(chunks),
                               "chars": len(chunk), "summary": current[:300]})

    return {
        "mode": "refine",
        "chunks": len(chunks),
        "chunk_outputs": chunk_outputs,
        "output": current,
    }


# ── Public entry point ─────────────────────────────────────────────────────────

def run_langchain(
    user_input: str,
    system_role: str,
    model_id: str = "gemini-2.5-flash",
    temperature: float = 0.2,
    mode: str = "auto",           # auto | direct | map_reduce | refine
    chunk_size: int = 2000,
    chunk_overlap: int = 200,
) -> dict:
    """
    Main LangChain execution entry point.

    Returns dict with keys:
      mode, chunks, chunk_outputs, output, model_used, provider
    """
    llm      = _get_lc_model(model_id, temperature)
    fast_llm = _get_lc_model("gemini-2.5-flash", 0.1)  # cheap model for map stage

    splitter = _splitter(chunk_size, chunk_overlap)
    chunks   = splitter.split_text(user_input)

    # Auto-select mode based on input size
    if mode == "auto":
        if len(chunks) <= 1:
            mode = "direct"
        elif len(chunks) <= 6:
            mode = "map_reduce"
        else:
            mode = "refine"

    if mode == "direct" or len(chunks) == 1:
        result = _direct(llm, system_role, user_input)
    elif mode == "refine":
        result = _refine(llm, system_role, user_input, chunks)
    else:
        result = _map_reduce(llm, fast_llm, system_role, user_input, chunks)

    from ossa.multi_model_graph import MODEL_REGISTRY
    meta = MODEL_REGISTRY.get(model_id, {})
    result["model_used"]  = model_id
    result["model_label"] = meta.get("label", model_id)
    result["provider"]    = meta.get("provider", "gemini")
    result["input_chars"] = len(user_input)
    result["all_chunks"]  = [
        {"index": i + 1, "chars": len(c), "preview": c[:120]}
        for i, c in enumerate(chunks)
    ]
    return result
