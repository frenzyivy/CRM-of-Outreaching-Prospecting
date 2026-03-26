"""
Email Writer Skill
Generates personalized cold outreach and follow-up emails using lead context + LLM.
"""

import os
import logging

from core.llm import generate
from skills.lead_researcher import get_lead_context, format_lead_brief

logger = logging.getLogger("email_writer")

PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agents", "prompts")


def _load_prompt(template_name: str) -> str:
    """Load a prompt template from agents/prompts/."""
    path = os.path.join(PROMPTS_DIR, f"{template_name}.md")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _fill_template(template: str, variables: dict) -> str:
    """Replace {{variable}} placeholders in a template."""
    for key, value in variables.items():
        template = template.replace(f"{{{{{key}}}}}", str(value))
    return template


def draft_cold_email(
    lead_id: str,
    custom_instructions: str = "",
    model: str | None = None,
) -> dict:
    """
    Generate a cold outreach email for a lead.

    Args:
        lead_id: The Supabase lead ID
        custom_instructions: Optional additional instructions for the AI

    Returns:
        dict with "email_body", "lead_context", and metadata
    """
    # Get lead context
    context = get_lead_context(lead_id)
    if "error" in context:
        return {"error": context["error"]}

    # Load and fill the prompt template
    template = _load_prompt("email_cold_outreach")
    prompt = _fill_template(template, {
        "lead_name": context["lead_name"],
        "job_title": context["job_title"] or "Professional",
        "company_name": context["company_name"] or "their company",
        "industry": context["industry"] or "Healthcare",
        "location": context["location"] or "N/A",
        "linkedin": context["linkedin"] or "N/A",
        "website": context["website"] or "N/A",
        "custom_instructions": custom_instructions or "None",
    })

    # Generate the email
    system = (
        "You are an expert B2B email copywriter specializing in medical and healthcare outreach. "
        "Write concise, personalized emails that feel human — not templated."
    )

    email_body = generate(
        prompt=prompt,
        system=system,
        max_tokens=512,
        temperature=0.7,
        model=model,
    )

    return {
        "email_body": email_body.strip(),
        "lead_id": lead_id,
        "lead_name": context["lead_name"],
        "email_to": context["email"],
        "type": "cold_outreach",
        "lead_brief": format_lead_brief(context),
    }


def draft_follow_up(
    lead_id: str,
    follow_up_number: int = 1,
    previous_emails: str = "",
    custom_instructions: str = "",
    model: str | None = None,
) -> dict:
    """
    Generate a follow-up email for a lead.

    Args:
        lead_id: The Supabase lead ID
        follow_up_number: Which follow-up this is (1 or 2)
        previous_emails: Summary of previous email(s) sent
        custom_instructions: Optional additional instructions

    Returns:
        dict with "email_body", "lead_context", and metadata
    """
    context = get_lead_context(lead_id)
    if "error" in context:
        return {"error": context["error"]}

    # Build email history from activities if not provided
    if not previous_emails:
        email_acts = [
            a for a in context.get("recent_activities", [])
            if a.get("type") in ("email", "email_sent")
        ]
        if email_acts:
            previous_emails = "\n".join(
                f"- {a['date'][:10]}: {a['description'][:100]}"
                for a in email_acts
            )
        else:
            previous_emails = "No previous email history available."

    template = _load_prompt("email_follow_up")
    prompt = _fill_template(template, {
        "lead_name": context["lead_name"],
        "job_title": context["job_title"] or "Professional",
        "company_name": context["company_name"] or "their company",
        "industry": context["industry"] or "Healthcare",
        "location": context["location"] or "N/A",
        "email_history": previous_emails,
        "follow_up_number": str(follow_up_number),
        "custom_instructions": custom_instructions or "None",
    })

    system = (
        "You are an expert B2B email copywriter. Write a concise follow-up that adds value "
        "and doesn't feel like a generic 'just checking in' email."
    )

    email_body = generate(
        prompt=prompt,
        system=system,
        max_tokens=384,
        temperature=0.7,
        model=model,
    )

    return {
        "email_body": email_body.strip(),
        "lead_id": lead_id,
        "lead_name": context["lead_name"],
        "email_to": context["email"],
        "type": "follow_up",
        "follow_up_number": follow_up_number,
        "lead_brief": format_lead_brief(context),
    }
