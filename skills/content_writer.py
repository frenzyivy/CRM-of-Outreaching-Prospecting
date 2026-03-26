"""
Content Writer Skill
Generates LinkedIn posts, ad copy, and other marketing content using LLM.
"""

import os
import logging

from core.llm import generate

logger = logging.getLogger("content_writer")

PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "agents", "prompts")


def _load_prompt(template_name: str) -> str:
    path = os.path.join(PROMPTS_DIR, f"{template_name}.md")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _fill_template(template: str, variables: dict) -> str:
    for key, value in variables.items():
        template = template.replace(f"{{{{{key}}}}}", str(value))
    return template


def write_linkedin_post(
    topic: str,
    style: str = "thought leadership",
    custom_instructions: str = "",
) -> dict:
    """
    Generate a LinkedIn post.

    Args:
        topic: What the post should be about
        style: Post style — "thought leadership", "case study", "hot take", "how-to", "personal story"
        custom_instructions: Optional additional instructions

    Returns:
        dict with "content" and metadata
    """
    template = _load_prompt("linkedin_post")
    prompt = _fill_template(template, {
        "topic": topic,
        "style": style,
        "custom_instructions": custom_instructions or "None",
    })

    system = (
        "You are a LinkedIn content strategist in the medical/healthcare space. "
        "Write posts that are authentic, insightful, and drive engagement."
    )

    content = generate(
        prompt=prompt,
        system=system,
        max_tokens=1024,
        temperature=0.8,
    )

    return {
        "content": content.strip(),
        "type": "linkedin_post",
        "topic": topic,
        "style": style,
    }


def write_copy(
    content_type: str,
    topic: str,
    audience: str = "healthcare decision-makers",
    custom_instructions: str = "",
) -> dict:
    """
    Generate marketing copy.

    Args:
        content_type: "landing_page", "ad_copy", "case_study", "website_section"
        topic: Product, service, or subject
        audience: Target audience description
        custom_instructions: Optional additional instructions

    Returns:
        dict with "content" and metadata
    """
    template = _load_prompt("copywriting")
    prompt = _fill_template(template, {
        "content_type": content_type,
        "topic": topic,
        "audience": audience,
        "custom_instructions": custom_instructions or "None",
    })

    system = (
        "You are a conversion-focused B2B copywriter specializing in healthcare and medical technology. "
        "Write clear, benefit-driven copy that converts."
    )

    content = generate(
        prompt=prompt,
        system=system,
        max_tokens=1536,
        temperature=0.7,
    )

    return {
        "content": content.strip(),
        "type": content_type,
        "topic": topic,
        "audience": audience,
    }
