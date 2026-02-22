"""
Configuration for the restaurant reservation bot.
"""

import os
from dataclasses import dataclass, field
from enum import Enum

# ---------------------------------------------------------------------------
# Resy / OpenTable credentials – sourced from environment
# ---------------------------------------------------------------------------
RESY_API_KEY = os.getenv("RESY_API_KEY", "")
RESY_EMAIL = os.getenv("RESY_EMAIL", "")
RESY_PASSWORD = os.getenv("RESY_PASSWORD", "")

OPENTABLE_API_KEY = os.getenv("OPENTABLE_API_KEY", "")

# Notification settings
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
NOTIFY_PHONE = os.getenv("NOTIFY_PHONE", "")
NOTIFY_EMAIL = os.getenv("NOTIFY_EMAIL", "")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# ---------------------------------------------------------------------------
# Bot behaviour
# ---------------------------------------------------------------------------
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))
MIN_NOTICE_HOURS = 36  # must be at least 36 h from now
PARTY_SIZE = int(os.getenv("PARTY_SIZE", "2"))
AUTO_BOOK = os.getenv("AUTO_BOOK", "false").lower() == "true"

# ---------------------------------------------------------------------------
# Time window
# ---------------------------------------------------------------------------
# 0=Mon … 6=Sun.  Friday=4, Saturday=5, Sunday=6
ALLOWED_WEEKDAYS = {4, 5, 6}  # Fri, Sat, Sun
EARLIEST_HOUR = 17  # 5 PM
LATEST_HOUR = 20    # 8 PM (slots starting up to 20:00)


class Platform(Enum):
    RESY = "resy"
    OPENTABLE = "opentable"


@dataclass
class Restaurant:
    name: str
    platform: Platform
    venue_id: str = ""          # Resy venue ID or OpenTable restaurant ID
    slug: str = ""              # URL slug used for lookups
    city: str = "new-york"
    notes: str = ""
    enabled: bool = True


# ---------------------------------------------------------------------------
# Restaurant list
#
# venue_id values need to be filled in once you look them up on each platform.
# You can find Resy venue IDs by inspecting network traffic on resy.com or
# by using the search endpoint.  Slugs are the URL path component, e.g.
# resy.com/cities/ny/4-charles-prime-rib → slug = "4-charles-prime-rib"
# ---------------------------------------------------------------------------
RESTAURANTS: list[Restaurant] = [
    Restaurant(
        name="4 Charles Prime Rib",
        platform=Platform.RESY,
        slug="4-charles-prime-rib",
        venue_id="834",
        notes="West Village classic. Hard to get.",
    ),
    Restaurant(
        name="The Corner Store",
        platform=Platform.RESY,
        slug="the-corner-store",
        venue_id="72309",
        notes="Brooklyn brunch/dinner spot.",
    ),
    Restaurant(
        name="bōm",
        platform=Platform.RESY,
        slug="bom",
        venue_id="58988",
        notes="Korean fine dining.",
    ),
    Restaurant(
        name="The Box",
        platform=Platform.RESY,
        slug="the-box-nyc",
        venue_id="",
        enabled=False,
        notes="Nightlife venue – may not use standard reservations. Disabled by default.",
    ),
    Restaurant(
        name="Clemente Bar",
        platform=Platform.RESY,
        slug="clemente-bar",
        venue_id="",
        notes="Need to look up venue ID.",
    ),
    Restaurant(
        name="Bemelmans Bar",
        platform=Platform.RESY,
        slug="bemelmans-bar",
        venue_id="",
        notes="The Carlyle hotel. May use hotel booking system.",
    ),
    Restaurant(
        name="Monkey Bar",
        platform=Platform.RESY,
        slug="monkey-bar",
        venue_id="",
        notes="Midtown classic.",
    ),
    Restaurant(
        name="Tatiana",
        platform=Platform.RESY,
        slug="tatiana",
        venue_id="62754",
        notes="Lincoln Center. Very competitive.",
    ),
    Restaurant(
        name="Theodora",
        platform=Platform.RESY,
        slug="theodora",
        venue_id="",
        notes="Greek restaurant.",
    ),
    Restaurant(
        name="Semma",
        platform=Platform.RESY,
        slug="semma",
        venue_id="57632",
        notes="South Indian. Michelin star.",
    ),
    Restaurant(
        name="Adda",
        platform=Platform.RESY,
        slug="adda-indian-canteen",
        venue_id="1505",
        notes="Indian canteen in LIC.",
    ),
]
