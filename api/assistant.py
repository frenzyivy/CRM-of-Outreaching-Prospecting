"""
AI Personal Assistant Agent
Endpoint: POST /api/assistant/chat
Uses Claude tool calling to answer questions about real CRM data from Supabase.
"""

import json
import os
import uuid
from datetime import datetime
from typing import Any

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.supabase_client import get_client

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


# ---------------------------------------------------------------------------
# Tool implementations — real Supabase queries
# ---------------------------------------------------------------------------

def _tool_get_lead_stats(country: str = "", specialty: str = "", stage: str = "") -> dict:
    db = get_client()

    # Build base query with stage join
    query = db.table("leads").select(
        "id, country, specialty, lead_stages(stage)"
    )
    if country:
        query = query.ilike("country", f"%{country}%")
    if specialty:
        query = query.ilike("specialty", f"%{specialty}%")

    # Paginate to get all rows
    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0
    while True:
        result = query.range(offset, offset + PAGE_SIZE - 1).execute()
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    # Extract stage from join
    def _get_stage(row: dict) -> str:
        sd = row.get("lead_stages")
        if isinstance(sd, list) and sd:
            return sd[0].get("stage", "new")
        if isinstance(sd, dict):
            return sd.get("stage", "new")
        return "new"

    if stage:
        rows = [r for r in rows if _get_stage(r).lower() == stage.lower()]

    stage_counts: dict[str, int] = {}
    country_counts: dict[str, int] = {}
    specialty_counts: dict[str, int] = {}
    for r in rows:
        s = _get_stage(r)
        stage_counts[s] = stage_counts.get(s, 0) + 1
        c = (r.get("country") or "").strip() or "Unknown"
        country_counts[c] = country_counts.get(c, 0) + 1
        sp = (r.get("specialty") or "").strip() or "Unknown"
        specialty_counts[sp] = specialty_counts.get(sp, 0) + 1

    return {
        "total": len(rows),
        "by_stage": stage_counts,
        "by_country": country_counts,
        "by_specialty": specialty_counts,
    }


def _tool_search_leads(
    country: str = "",
    specialty: str = "",
    name: str = "",
    company: str = "",
    stage: str = "",
    limit: int = 50,
) -> list[dict]:
    db = get_client()
    query = db.table("leads").select(
        "id, first_name, last_name, full_name, email, company_name, country, specialty, lead_stages(stage)"
    )
    if country:
        query = query.ilike("country", f"%{country}%")
    if specialty:
        query = query.ilike("specialty", f"%{specialty}%")
    if name:
        query = query.or_(
            f"first_name.ilike.%{name}%,last_name.ilike.%{name}%,full_name.ilike.%{name}%"
        )
    if company:
        query = query.ilike("company_name", f"%{company}%")

    result = query.limit(min(limit, 200)).execute()
    rows = result.data or []

    def _get_stage(row: dict) -> str:
        sd = row.get("lead_stages")
        if isinstance(sd, list) and sd:
            return sd[0].get("stage", "new")
        if isinstance(sd, dict):
            return sd.get("stage", "new")
        return "new"

    if stage:
        rows = [r for r in rows if _get_stage(r).lower() == stage.lower()]

    return [
        {
            "id": r["id"],
            "name": (r.get("full_name") or " ".join(filter(None, [r.get("first_name"), r.get("last_name")]))) or r.get("email", ""),
            "email": r.get("email", ""),
            "company": r.get("company_name", ""),
            "country": r.get("country", ""),
            "specialty": r.get("specialty", ""),
            "stage": _get_stage(r),
        }
        for r in rows[:limit]
    ]


def _tool_get_company_stats(country: str = "", industry: str = "") -> dict:
    db = get_client()
    query = db.table("leads").select("company_name, country, industry").neq("company_name", "").not_.is_("company_name", "null")
    if country:
        query = query.ilike("country", f"%{country}%")
    if industry:
        query = query.ilike("industry", f"%{industry}%")

    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0
    while True:
        result = query.range(offset, offset + PAGE_SIZE - 1).execute()
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    companies: dict[str, str] = {r["company_name"]: (r.get("country") or "Unknown") for r in rows}
    country_counts: dict[str, int] = {}
    for c in companies.values():
        country_counts[c] = country_counts.get(c, 0) + 1

    return {
        "total_companies": len(companies),
        "company_names": list(companies.keys())[:50],  # cap to 50 for readability
        "by_country": country_counts,
    }


def _tool_get_pipeline_stats() -> dict:
    db = get_client()
    PAGE_SIZE = 1000
    rows: list[dict] = []
    offset = 0
    while True:
        result = db.table("lead_stages").select("stage").range(offset, offset + PAGE_SIZE - 1).execute()
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    stage_counts: dict[str, int] = {}
    for r in rows:
        s = r.get("stage", "new")
        stage_counts[s] = stage_counts.get(s, 0) + 1

    return {"by_stage": stage_counts, "total": len(rows)}


def _tool_create_group(name: str, description: str = "") -> dict:
    db = get_client()
    # Check uniqueness
    existing = db.table("lead_groups").select("id, name").ilike("name", name).execute()
    for g in (existing.data or []):
        if g["name"].lower() == name.lower():
            return {"error": f"A group named '{name}' already exists (id: {g['id']})."}

    result = db.table("lead_groups").insert({
        "name": name,
        "description": description,
    }).execute()

    if not result.data:
        return {"error": "Failed to create group in database"}

    group = result.data[0]
    return {"success": True, "id": group["id"], "name": group["name"]}


def _tool_add_leads_to_group(
    group_id: str = "",
    group_name: str = "",
    emails: list[str] | None = None,
    country: str = "",
    specialty: str = "",
    stage: str = "",
) -> dict:
    db = get_client()

    # Resolve group
    if group_id:
        g_result = db.table("lead_groups").select("id, name").eq("id", group_id).single().execute()
    elif group_name:
        g_result = db.table("lead_groups").select("id, name").ilike("name", group_name).limit(1).execute()
        if g_result.data:
            g_result.data = g_result.data[0]  # type: ignore[assignment]
        else:
            return {"error": "Group not found. Create it first with create_group."}
    else:
        return {"error": "Provide group_id or group_name."}

    group_data = g_result.data
    if not group_data:
        return {"error": "Group not found. Create it first with create_group."}

    # Handle list vs single result
    if isinstance(group_data, list):
        if not group_data:
            return {"error": "Group not found. Create it first with create_group."}
        group_data = group_data[0]

    resolved_group_id: str = group_data["id"]
    resolved_group_name: str = group_data["name"]

    # Resolve leads
    if emails:
        leads_result = db.table("leads").select("id, email").in_("email", emails).execute()
    else:
        query = db.table("leads").select("id, email, country, specialty, lead_stages(stage)")
        if country:
            query = query.ilike("country", f"%{country}%")
        if specialty:
            query = query.ilike("specialty", f"%{specialty}%")
        leads_result = query.execute()

    leads = leads_result.data or []

    if stage:
        def _get_stage(row: dict) -> str:
            sd = row.get("lead_stages")
            if isinstance(sd, list) and sd:
                return sd[0].get("stage", "new")
            if isinstance(sd, dict):
                return sd.get("stage", "new")
            return "new"
        leads = [l for l in leads if _get_stage(l).lower() == stage.lower()]

    if not leads:
        return {"success": True, "added": 0, "total_in_group": 0, "group_name": resolved_group_name, "note": "No matching leads found"}

    # Get existing members to avoid duplicates
    existing_members = db.table("lead_group_members").select("lead_id").eq("group_id", resolved_group_id).execute()
    existing_lead_ids: set[str] = {m["lead_id"] for m in (existing_members.data or [])}

    rows_to_insert = [
        {"group_id": resolved_group_id, "lead_id": l["id"]}
        for l in leads
        if l["id"] not in existing_lead_ids
    ]

    if rows_to_insert:
        # Insert in batches of 500
        for i in range(0, len(rows_to_insert), 500):
            db.table("lead_group_members").insert(rows_to_insert[i:i+500]).execute()

    total_result = db.table("lead_group_members").select("id", count="exact").eq("group_id", resolved_group_id).execute()
    total = total_result.count or 0

    return {
        "success": True,
        "added": len(rows_to_insert),
        "total_in_group": total,
        "group_name": resolved_group_name,
    }


def _tool_list_groups() -> list[dict]:
    db = get_client()
    result = db.table("lead_groups").select("id, name, description, created_at").order("created_at", desc=True).execute()
    groups = result.data or []

    output = []
    for g in groups:
        count_result = db.table("lead_group_members").select("id", count="exact").eq("group_id", g["id"]).execute()
        output.append({
            "id": g["id"],
            "name": g["name"],
            "description": g.get("description", ""),
            "member_count": count_result.count or 0,
            "created_at": g.get("created_at", ""),
        })
    return output


# ---------------------------------------------------------------------------
# Tool dispatch
# ---------------------------------------------------------------------------

TOOL_DISPATCH: dict[str, Any] = {
    "get_lead_stats":      _tool_get_lead_stats,
    "search_leads":        _tool_search_leads,
    "get_company_stats":   _tool_get_company_stats,
    "get_pipeline_stats":  _tool_get_pipeline_stats,
    "create_group":        _tool_create_group,
    "add_leads_to_group":  _tool_add_leads_to_group,
    "list_groups":         _tool_list_groups,
}


def _execute_tool(name: str, inputs: dict) -> str:
    fn = TOOL_DISPATCH.get(name)
    if not fn:
        return json.dumps({"error": f"Unknown tool: {name}"})
    try:
        result = fn(**inputs)
        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


# ---------------------------------------------------------------------------
# Claude tool schemas
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "get_lead_stats",
        "description": "Get lead statistics: total count and breakdowns by country, specialty, and pipeline stage. Optionally filter by country, specialty, or stage.",
        "input_schema": {
            "type": "object",
            "properties": {
                "country":   {"type": "string", "description": "Filter by country (partial match)"},
                "specialty": {"type": "string", "description": "Filter by medical specialty"},
                "stage":     {"type": "string", "description": "Filter by pipeline stage"},
            },
        },
    },
    {
        "name": "search_leads",
        "description": "Search and list individual leads. Returns name, email, company, country, specialty, and stage for each match.",
        "input_schema": {
            "type": "object",
            "properties": {
                "country":   {"type": "string"},
                "specialty": {"type": "string"},
                "name":      {"type": "string", "description": "Partial name match"},
                "company":   {"type": "string", "description": "Partial company name match"},
                "stage":     {"type": "string"},
                "limit":     {"type": "integer", "description": "Max results to return (default 50)"},
            },
        },
    },
    {
        "name": "get_company_stats",
        "description": "Get company statistics: total unique companies, breakdown by country.",
        "input_schema": {
            "type": "object",
            "properties": {
                "country":  {"type": "string"},
                "industry": {"type": "string"},
            },
        },
    },
    {
        "name": "get_pipeline_stats",
        "description": "Get pipeline stage breakdown: how many leads are in each stage.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "create_group",
        "description": (
            "Create a new named lead group. Returns the new group id. Group names must be unique. "
            "If the user did not specify a name, auto-generate one: call list_groups first to see "
            "how many groups exist, then name it 'Group N' where N = (count + 1)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name":        {"type": "string", "description": "Unique group name (auto-generate 'Group N' if user did not specify one)"},
                "description": {"type": "string", "description": "Optional description"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "add_leads_to_group",
        "description": "Add leads to an existing group by filter (country, specialty, stage) or by explicit email list.",
        "input_schema": {
            "type": "object",
            "properties": {
                "group_id":   {"type": "string", "description": "UUID of the target group"},
                "group_name": {"type": "string", "description": "Group name (alternative to group_id)"},
                "emails":     {"type": "array", "items": {"type": "string"}, "description": "Explicit list of lead emails to add"},
                "country":    {"type": "string"},
                "specialty":  {"type": "string"},
                "stage":      {"type": "string"},
            },
        },
    },
    {
        "name": "list_groups",
        "description": "List all existing lead groups with their names and member counts.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
]

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str        # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    tool_calls_made: list[str] = []


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a helpful AI assistant for a medical CRM system. "
    "You have access to tools to query leads, companies, and pipeline data, "
    "and to create and manage lead groups. "
    "Always use tools to get accurate data — never estimate or guess numbers. "
    "Be concise and precise. When creating a group or adding leads, clearly "
    "confirm what was done (group name, number of leads added).\n\n"
    "IMPORTANT — Group creation rules:\n"
    "- If the user specifies a group name, use that exact name.\n"
    "- If the user does NOT specify a name, automatically generate one using the pattern "
    "'Group 1', 'Group 2', etc. (increment based on how many groups exist). "
    "NEVER ask the user for a name — just create the group immediately with an auto-generated name.\n"
    "- After creating a group, always add the requested leads to it in the same response without asking.\n"
    "- Users can rename groups later in the UI."
)

# ---------------------------------------------------------------------------
# Chat endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
def assistant_chat(body: ChatRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    model = os.getenv("ASSISTANT_MODEL", "claude-sonnet-4-20250514")
    client = anthropic.Anthropic(api_key=api_key)

    # Build message history
    messages: list[dict] = [{"role": m.role, "content": m.content} for m in body.history]
    messages.append({"role": "user", "content": body.message})

    tools_used: list[str] = []
    MAX_ITERATIONS = 10

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,  # type: ignore[arg-type]
            messages=messages,  # type: ignore[arg-type]
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            text = next(
                (block.text for block in response.content if hasattr(block, "text")),
                "",
            )
            return ChatResponse(reply=text, tool_calls_made=tools_used)

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    tools_used.append(block.name)
                    result_str = _execute_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_str,
                    })
            messages.append({"role": "user", "content": tool_results})
        else:
            break

    raise HTTPException(status_code=500, detail="Agent loop did not converge")


# ---------------------------------------------------------------------------
# Groups REST endpoints
# ---------------------------------------------------------------------------

class GroupResponse(BaseModel):
    id: str
    name: str
    description: str
    member_count: int
    created_at: str


@router.get("/groups", response_model=list[GroupResponse])
def list_groups_endpoint():
    db = get_client()
    result = db.table("lead_groups").select("id, name, description, created_at").order("created_at", desc=True).execute()
    groups = result.data or []

    output = []
    for g in groups:
        count_result = db.table("lead_group_members").select("id", count="exact").eq("group_id", g["id"]).execute()
        output.append(GroupResponse(
            id=g["id"],
            name=g["name"],
            description=g.get("description") or "",
            member_count=count_result.count or 0,
            created_at=g.get("created_at") or "",
        ))
    return output


class GroupMemberResponse(BaseModel):
    email: str
    name: str
    company: str
    country: str
    specialty: str
    stage: str


@router.get("/groups/{group_id}/members", response_model=list[GroupMemberResponse])
def list_group_members(group_id: str):
    db = get_client()

    # Verify group exists
    g_result = db.table("lead_groups").select("id").eq("id", group_id).single().execute()
    if not g_result.data:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get member lead_ids
    members_result = db.table("lead_group_members").select("lead_id").eq("group_id", group_id).execute()
    lead_ids = [m["lead_id"] for m in (members_result.data or [])]
    if not lead_ids:
        return []

    # Fetch lead details in batches if needed
    all_leads: list[dict] = []
    BATCH = 200
    for i in range(0, len(lead_ids), BATCH):
        batch_ids = lead_ids[i:i+BATCH]
        r = db.table("leads").select(
            "id, first_name, last_name, full_name, email, company_name, country, specialty, lead_stages(stage)"
        ).in_("id", batch_ids).execute()
        all_leads.extend(r.data or [])

    def _get_stage(row: dict) -> str:
        sd = row.get("lead_stages")
        if isinstance(sd, list) and sd:
            return sd[0].get("stage", "new")
        if isinstance(sd, dict):
            return sd.get("stage", "new")
        return "new"

    return [
        GroupMemberResponse(
            email=l.get("email") or "",
            name=(l.get("full_name") or " ".join(filter(None, [l.get("first_name"), l.get("last_name")]))) or l.get("email", ""),
            company=l.get("company_name") or "",
            country=l.get("country") or "",
            specialty=l.get("specialty") or "",
            stage=_get_stage(l),
        )
        for l in all_leads
    ]


class RenameGroupRequest(BaseModel):
    name: str


@router.patch("/groups/{group_id}", response_model=GroupResponse)
def rename_group_endpoint(group_id: str, body: RenameGroupRequest):
    db = get_client()

    g_result = db.table("lead_groups").select("id, name, description, created_at").eq("id", group_id).single().execute()
    if not g_result.data:
        raise HTTPException(status_code=404, detail="Group not found")

    new_name = body.name.strip()

    # Check uniqueness (exclude current group)
    dup = db.table("lead_groups").select("id").ilike("name", new_name).neq("id", group_id).execute()
    if dup.data:
        raise HTTPException(status_code=409, detail=f"A group named '{new_name}' already exists")

    db.table("lead_groups").update({"name": new_name, "updated_at": datetime.utcnow().isoformat()}).eq("id", group_id).execute()

    count_result = db.table("lead_group_members").select("id", count="exact").eq("group_id", group_id).execute()
    g = g_result.data
    return GroupResponse(
        id=g["id"],
        name=new_name,
        description=g.get("description") or "",
        member_count=count_result.count or 0,
        created_at=g.get("created_at") or "",
    )
