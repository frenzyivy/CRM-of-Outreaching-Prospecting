"""
Lead Researcher Skill
Assembles all available context about a lead into a structured brief
that other skills (email_writer, content_writer) can use as input.
"""

from core.supabase_client import get_lead_by_id, get_activities


def get_lead_context(lead_id: str) -> dict:
    """
    Build a comprehensive context dict for a lead.
    Returns all available data the AI agent needs to personalize output.
    """
    lead = get_lead_by_id(lead_id)
    if not lead:
        return {"error": f"Lead {lead_id} not found"}

    # Build name
    name = (
        lead.get("full_name")
        or f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip()
        or lead.get("company_name")
        or "Unknown"
    )

    # Build location
    parts = [lead.get("city", ""), lead.get("state", ""), lead.get("country", "")]
    location = ", ".join(p for p in parts if p)

    # Get recent activities
    activities = lead.get("activities", [])
    email_activities = [a for a in activities if a.get("activity_type") in ("email", "email_open", "email_reply")]

    return {
        "lead_id": lead_id,
        "lead_name": name,
        "first_name": lead.get("first_name", ""),
        "last_name": lead.get("last_name", ""),
        "email": lead.get("email", ""),
        "phone": lead.get("phone", ""),
        "job_title": lead.get("title") or lead.get("job_title", ""),
        "company_name": lead.get("company_name") or lead.get("company", ""),
        "industry": lead.get("industry", ""),
        "location": location,
        "city": lead.get("city", ""),
        "country": lead.get("country", ""),
        "website": lead.get("website") or lead.get("company_website", ""),
        "linkedin": lead.get("linkedin", ""),
        "instagram": lead.get("instagram", ""),
        "facebook": lead.get("facebook", ""),
        "twitter": lead.get("twitter", ""),
        "company_linkedin": lead.get("company_linkedin", ""),
        "company_instagram": lead.get("company_instagram", ""),
        "company_facebook": lead.get("company_facebook", ""),
        "company_twitter": lead.get("company_twitter", ""),
        "stage": lead.get("stage", "new"),
        "stage_label": lead.get("stage_label", "New"),
        "lead_score": lead.get("lead_score", 0),
        "lead_tier": lead.get("lead_tier", "cold"),
        # Email engagement
        "email_opens": lead.get("email_opens", 0),
        "email_replies": lead.get("email_replies", 0),
        "email_clicks": lead.get("email_clicks", 0),
        "email_bounced": lead.get("email_bounced", False),
        # Activity summary
        "total_activities": len(activities),
        "email_activities": len(email_activities),
        "recent_activities": [
            {
                "type": a.get("activity_type", ""),
                "description": a.get("description", ""),
                "date": a.get("created_at", ""),
            }
            for a in activities[:5]
        ],
        # Source
        "source": lead.get("source", ""),
        "notes": lead.get("notes", ""),
    }


def format_lead_brief(context: dict) -> str:
    """
    Format lead context into a human-readable brief for prompt injection.
    """
    if "error" in context:
        return f"Error: {context['error']}"

    lines = [
        f"Name: {context['lead_name']}",
    ]

    if context["job_title"]:
        lines.append(f"Title: {context['job_title']}")
    if context["company_name"]:
        lines.append(f"Company: {context['company_name']}")
    if context["industry"]:
        lines.append(f"Industry: {context['industry']}")
    if context["location"]:
        lines.append(f"Location: {context['location']}")
    if context["email"]:
        lines.append(f"Email: {context['email']}")
    if context["linkedin"]:
        lines.append(f"LinkedIn: {context['linkedin']}")
    if context.get("instagram"):
        lines.append(f"Instagram: {context['instagram']}")
    if context.get("facebook"):
        lines.append(f"Facebook: {context['facebook']}")
    if context.get("twitter"):
        lines.append(f"Twitter/X: {context['twitter']}")
    if context["website"]:
        lines.append(f"Website: {context['website']}")
    if context.get("company_linkedin"):
        lines.append(f"Company LinkedIn: {context['company_linkedin']}")
    if context.get("company_instagram"):
        lines.append(f"Company Instagram: {context['company_instagram']}")
    if context.get("company_facebook"):
        lines.append(f"Company Facebook: {context['company_facebook']}")
    if context.get("company_twitter"):
        lines.append(f"Company Twitter/X: {context['company_twitter']}")

    lines.append(f"Pipeline Stage: {context['stage_label']}")
    lines.append(f"Lead Score: {context['lead_score']}/100 ({context['lead_tier']})")

    if context["email_opens"] or context["email_replies"]:
        lines.append(f"Email Engagement: {context['email_opens']} opens, {context['email_replies']} replies, {context['email_clicks']} clicks")

    if context["recent_activities"]:
        lines.append("\nRecent Activity:")
        for act in context["recent_activities"][:3]:
            lines.append(f"  - [{act['type']}] {act['description'][:80]}")

    if context["notes"]:
        lines.append(f"\nNotes: {context['notes'][:200]}")

    return "\n".join(lines)
