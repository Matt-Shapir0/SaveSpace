"""
Aggregation endpoints for Profile and Insights pages.
All queries are scoped to a single user_id.
"""
from fastapi import APIRouter, HTTPException
from app.database import get_supabase
from datetime import datetime, date, timedelta
from collections import defaultdict

router = APIRouter()

THEME_LABELS = {
    "growth": "Growth Mindset",
    "selfcare": "Self-Care",
    "motivation": "Motivation",
    "confidence": "Confidence",
    "mindfulness": "Mindfulness",
    "relationships": "Relationships",
}

THEME_COLORS = {
    "growth": "#e97b4f",
    "selfcare": "#f4a261",
    "motivation": "#e9c46a",
    "confidence": "#a8dadc",
    "mindfulness": "#81b29a",
    "relationships": "#f2cc8f",
}


@router.get("/{user_id}/summary")
def get_profile_summary(user_id: str):
    """
    Returns stats for the Profile page header:
    - total videos saved
    - videos fully processed
    - weeks active
    - top 3 themes
    """
    db = get_supabase()

    # Video counts
    all_videos = (
        db.table("videos")
        .select("id, status, created_at, theme_tags")
        .eq("user_id", user_id)
        .execute()
    )
    videos = all_videos.data or []
    total = len(videos)
    processed = sum(1 for v in videos if v["status"] == "done")

    # Weeks active
    weeks_active = 1
    if videos:
        dates = [
            datetime.fromisoformat(v["created_at"].replace("Z", "+00:00")).date()
            for v in videos
        ]
        first = min(dates)
        weeks_active = max(1, ((date.today() - first).days // 7) + 1)

    # Theme distribution — count across all processed videos
    theme_counts: dict[str, int] = defaultdict(int)
    for v in videos:
        for t in (v.get("theme_tags") or []):
            theme_counts[t] += 1

    total_theme_count = sum(theme_counts.values()) or 1
    theme_distribution = [
        {
            "theme_id": t,
            "label": THEME_LABELS.get(t, t.title()),
            "color": THEME_COLORS.get(t, "#888888"),
            "count": count,
            "percentage": round(count / total_theme_count * 100),
        }
        for t, count in sorted(theme_counts.items(), key=lambda x: -x[1])
    ]

    return {
        "total_videos": total,
        "processed_videos": processed,
        "weeks_active": weeks_active,
        "theme_distribution": theme_distribution,
        "top_theme": theme_distribution[0] if theme_distribution else None,
    }


@router.get("/{user_id}/insights")
def get_insights(user_id: str):
    """
    Returns data for the Insights page:
    - weekly theme evolution (for area chart)
    - theme distribution (for pie chart)
    - key insight messages
    """
    db = get_supabase()

    # Get weekly theme data, last 8 weeks
    eight_weeks_ago = (date.today() - timedelta(weeks=8)).isoformat()
    weekly_result = (
        db.table("themes_weekly")
        .select("week_label, week_start, theme_id, count")
        .eq("user_id", user_id)
        .gte("week_start", eight_weeks_ago)
        .order("week_start")
        .execute()
    )
    weekly_rows = weekly_result.data or []

    # Build chart data — group by week, pivot themes as columns
    weeks_map: dict[str, dict] = {}
    for row in weekly_rows:
        wl = row["week_label"]
        if wl not in weeks_map:
            weeks_map[wl] = {"week": wl, "week_start": row["week_start"]}
        label = THEME_LABELS.get(row["theme_id"], row["theme_id"].title())
        weeks_map[wl][label] = row["count"]

    evolution_data = sorted(weeks_map.values(), key=lambda x: x["week_start"])
    # Remove internal sort key
    for row in evolution_data:
        row.pop("week_start", None)

    # Theme distribution (lifetime)
    all_videos = (
        db.table("videos")
        .select("theme_tags")
        .eq("user_id", user_id)
        .eq("status", "done")
        .execute()
    )
    theme_counts: dict[str, int] = defaultdict(int)
    for v in (all_videos.data or []):
        for t in (v.get("theme_tags") or []):
            theme_counts[t] += 1

    total = sum(theme_counts.values()) or 1
    distribution = [
        {
            "name": THEME_LABELS.get(t, t.title()),
            "value": round(count / total * 100),
            "color": THEME_COLORS.get(t, "#888888"),
            "theme_id": t,
        }
        for t, count in sorted(theme_counts.items(), key=lambda x: -x[1])
    ]

    # Generate insight messages from the data
    insights = _generate_insights(theme_counts, weekly_rows)

    return {
        "evolution_data": evolution_data,
        "distribution": distribution,
        "insights": insights,
        "has_data": len(weekly_rows) > 0,
    }


def _generate_insights(
    theme_counts: dict[str, int],
    weekly_rows: list[dict],
) -> list[dict]:
    """Generate plain-English insight cards from aggregated theme data."""
    insights = []

    if not theme_counts:
        return [{
            "title": "Getting started",
            "description": "Save a few videos to start seeing insights about your mindset themes.",
            "trend": "neutral",
            "change": "New",
        }]

    # Top theme
    top = max(theme_counts, key=theme_counts.get)
    insights.append({
        "title": "Top Focus",
        "description": f"{THEME_LABELS.get(top, top.title())} is your most saved theme with {theme_counts[top]} video{'s' if theme_counts[top] != 1 else ''}.",
        "trend": "up",
        "change": f"{theme_counts[top]} saves",
    })

    # Theme diversity
    n_themes = len(theme_counts)
    if n_themes >= 4:
        insights.append({
            "title": "Well-rounded",
            "description": f"You're exploring {n_themes} different mindset themes — a sign of diverse growth.",
            "trend": "up",
            "change": f"{n_themes} themes",
        })
    elif n_themes == 1:
        only = list(theme_counts.keys())[0]
        insights.append({
            "title": "Focused",
            "description": f"All your saved content is around {THEME_LABELS.get(only, only.title())}. Save more diverse content to broaden your feed.",
            "trend": "neutral",
            "change": "1 theme",
        })

    # Recent trend (last 2 weeks vs previous 2)
    if len(weekly_rows) >= 4:
        recent_weeks = sorted({r["week_start"] for r in weekly_rows})[-2:]
        recent_counts: dict[str, int] = defaultdict(int)
        older_counts: dict[str, int] = defaultdict(int)
        for r in weekly_rows:
            if r["week_start"] in recent_weeks:
                recent_counts[r["theme_id"]] += r["count"]
            else:
                older_counts[r["theme_id"]] += r["count"]

        for t, count in recent_counts.items():
            old = older_counts.get(t, 0)
            if old > 0 and count > old * 1.3:
                pct = round((count - old) / old * 100)
                insights.append({
                    "title": "Rising Theme",
                    "description": f"You've saved {pct}% more {THEME_LABELS.get(t, t)} content recently.",
                    "trend": "up",
                    "change": f"+{pct}%",
                })
                break

    return insights[:3]  # max 3 insight cards
