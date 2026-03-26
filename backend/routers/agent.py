"""AI Agent API endpoints — email drafting, content generation, lead research."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.llm import is_configured as llm_configured, get_status as llm_status

router = APIRouter(prefix="/api/agent", tags=["agent"])


# --- Request models ---

class DraftEmailRequest(BaseModel):
    lead_id: str
    custom_instructions: str = ""


class FollowUpRequest(BaseModel):
    lead_id: str
    follow_up_number: int = 1
    previous_emails: str = ""
    custom_instructions: str = ""


class LinkedInPostRequest(BaseModel):
    topic: str
    style: str = "thought leadership"
    custom_instructions: str = ""


class CopywritingRequest(BaseModel):
    content_type: str  # landing_page, ad_copy, case_study, website_section
    topic: str
    audience: str = "healthcare decision-makers"
    custom_instructions: str = ""


class FreeformRequest(BaseModel):
    prompt: str
    lead_id: str | None = None
    system: str = ""


# --- Endpoints ---

@router.get("/status")
def agent_status():
    """Check if the AI agent is configured and ready."""
    return llm_status()


@router.get("/lead/{lead_id}/context")
def get_lead_research(lead_id: str):
    """Get the assembled context brief for a lead (what the AI sees)."""
    from skills.lead_researcher import get_lead_context, format_lead_brief

    context = get_lead_context(lead_id)
    if "error" in context:
        raise HTTPException(status_code=404, detail=context["error"])

    return {
        "context": context,
        "brief": format_lead_brief(context),
    }


@router.post("/draft-email")
def draft_email(body: DraftEmailRequest):
    """Generate a cold outreach email for a lead."""
    if not llm_configured():
        raise HTTPException(status_code=503, detail="LLM not configured. Set API keys in .env")

    from skills.email_writer import draft_cold_email

    result = draft_cold_email(
        lead_id=body.lead_id,
        custom_instructions=body.custom_instructions,
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.post("/draft-follow-up")
def draft_follow_up(body: FollowUpRequest):
    """Generate a follow-up email for a lead."""
    if not llm_configured():
        raise HTTPException(status_code=503, detail="LLM not configured. Set API keys in .env")

    from skills.email_writer import draft_follow_up as write_follow_up

    result = write_follow_up(
        lead_id=body.lead_id,
        follow_up_number=body.follow_up_number,
        previous_emails=body.previous_emails,
        custom_instructions=body.custom_instructions,
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.post("/linkedin-post")
def generate_linkedin_post(body: LinkedInPostRequest):
    """Generate a LinkedIn post."""
    if not llm_configured():
        raise HTTPException(status_code=503, detail="LLM not configured. Set API keys in .env")

    from skills.content_writer import write_linkedin_post

    return write_linkedin_post(
        topic=body.topic,
        style=body.style,
        custom_instructions=body.custom_instructions,
    )


@router.post("/copywriting")
def generate_copy(body: CopywritingRequest):
    """Generate marketing copy (landing page, ad, case study, etc.)."""
    if not llm_configured():
        raise HTTPException(status_code=503, detail="LLM not configured. Set API keys in .env")

    if body.content_type not in ("landing_page", "ad_copy", "case_study", "website_section"):
        raise HTTPException(
            status_code=400,
            detail="content_type must be: landing_page, ad_copy, case_study, or website_section",
        )

    from skills.content_writer import write_copy

    return write_copy(
        content_type=body.content_type,
        topic=body.topic,
        audience=body.audience,
        custom_instructions=body.custom_instructions,
    )


@router.post("/freeform")
def freeform_generate(body: FreeformRequest):
    """Send a freeform prompt to the AI, optionally with lead context."""
    if not llm_configured():
        raise HTTPException(status_code=503, detail="LLM not configured. Set API keys in .env")

    from core.llm import generate

    prompt = body.prompt

    # If a lead_id is provided, prepend lead context
    if body.lead_id:
        from skills.lead_researcher import get_lead_context, format_lead_brief
        context = get_lead_context(body.lead_id)
        if "error" not in context:
            brief = format_lead_brief(context)
            prompt = f"## Lead Context\n{brief}\n\n## Request\n{body.prompt}"

    system = body.system or (
        "You are an AI assistant for a medical/healthcare CRM. "
        "Help the user with their request using the lead context provided."
    )

    result = generate(prompt=prompt, system=system, max_tokens=2048, temperature=0.7)

    return {
        "content": result.strip(),
        "lead_id": body.lead_id,
        "type": "freeform",
    }
