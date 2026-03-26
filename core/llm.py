"""
Unified LLM Client — supports Anthropic Claude and OpenAI with a provider toggle.

Configuration via .env:
  LLM_PROVIDER=anthropic   (or "openai")
  ANTHROPIC_API_KEY=...
  OPENAI_API_KEY=...
  LLM_MODEL=claude-sonnet-4-20250514   (or "gpt-4o", etc.)
"""

import os
import logging

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("llm")

# Defaults per provider
DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
}


def _get_provider() -> str:
    return os.getenv("LLM_PROVIDER", "anthropic").lower().strip()


def _get_model() -> str:
    provider = _get_provider()
    return os.getenv("LLM_MODEL", DEFAULT_MODELS.get(provider, "claude-sonnet-4-20250514"))


# Available models per provider
AVAILABLE_MODELS = {
    "anthropic": [
        {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4"},
        {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5"},
        {"id": "claude-opus-4-20250514", "name": "Claude Opus 4"},
    ],
    "openai": [
        {"id": "gpt-4o", "name": "GPT-4o"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini"},
        {"id": "gpt-4.1", "name": "GPT-4.1"},
        {"id": "gpt-4.1-mini", "name": "GPT-4.1 Mini"},
    ],
}


def generate(
    prompt: str,
    system: str = "",
    max_tokens: int = 2048,
    temperature: float = 0.7,
    model: str | None = None,
) -> str:
    """
    Generate text from the configured LLM provider.

    Args:
        prompt: The user message / main prompt
        system: System instructions
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature (0.0 = deterministic, 1.0 = creative)
        model: Optional model override (e.g. "claude-haiku-4-5-20251001", "gpt-4o-mini")

    Returns:
        Generated text string

    Raises:
        RuntimeError: If the API key is missing or the provider is unsupported
    """
    provider = _get_provider()

    if provider == "anthropic":
        return _generate_anthropic(prompt, system, max_tokens, temperature, model)
    elif provider == "openai":
        return _generate_openai(prompt, system, max_tokens, temperature, model)
    else:
        raise RuntimeError(f"Unsupported LLM_PROVIDER: {provider}. Use 'anthropic' or 'openai'.")


def _generate_anthropic(prompt: str, system: str, max_tokens: int, temperature: float, model: str | None = None) -> str:
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set in .env")

    client = anthropic.Anthropic(api_key=api_key)
    use_model = model or _get_model()

    kwargs = {
        "model": use_model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        kwargs["system"] = system

    response = client.messages.create(**kwargs)
    return response.content[0].text


def _generate_openai(prompt: str, system: str, max_tokens: int, temperature: float, model: str | None = None) -> str:
    from openai import OpenAI

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set in .env")

    client = OpenAI(api_key=api_key)
    use_model = model or _get_model()

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model=use_model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content


def is_configured() -> bool:
    """Check if at least one LLM provider has an API key set."""
    provider = _get_provider()
    if provider == "anthropic":
        return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())
    elif provider == "openai":
        return bool(os.getenv("OPENAI_API_KEY", "").strip())
    return False


def get_status() -> dict:
    """Return the current LLM configuration status with available models."""
    provider = _get_provider()
    return {
        "provider": provider,
        "model": _get_model(),
        "configured": is_configured(),
        "available_models": AVAILABLE_MODELS.get(provider, []),
    }
