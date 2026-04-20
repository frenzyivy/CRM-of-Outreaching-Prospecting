"""
Shared constants used across the CRM and AI agent subsystems.
"""

EMAIL_PLATFORMS = {
    "instantly": "Instantly.ai",
    "convertkit": "ConvertKit",
    "lemlist": "Lemlist",
    "smartlead": "Smartlead",
}

PIPELINE_STAGES = [
    "new",
    "researched",
    "email_sent",
    "follow_up_1",
    "follow_up_2",
    "responded",
    "meeting",
    "proposal",
    "free_trial",
    "closed_won",
    "closed_lost",
]

STAGE_LABELS = {
    "new": "New",
    "researched": "Researched",
    "email_sent": "Email Sent",
    "follow_up_1": "Follow-up 1",
    "follow_up_2": "Follow-up 2",
    "responded": "Responded",
    "meeting": "Meeting",
    "proposal": "Proposal",
    "free_trial": "Free Trial",
    "closed_won": "Closed (Won)",
    "closed_lost": "Closed (Lost)",
}
