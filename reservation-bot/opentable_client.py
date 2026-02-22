"""
OpenTable availability client.

OpenTable doesn't offer a documented public API, but their web app makes
requests to an internal GraphQL/REST layer.  This client hits the public
availability endpoint that their widget uses.  It's less reliable than Resy's
API and may require periodic updates if OpenTable changes their endpoints.

For now this provides read-only availability checks.  Booking through
OpenTable programmatically is significantly harder (CSRF tokens, captchas)
and is left as a notify-only flow.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date

import requests

logger = logging.getLogger(__name__)

OT_BASE = "https://www.opentable.com"
OT_API = "https://mobile.opentable.com/api"


@dataclass
class OTSlot:
    """An available slot on OpenTable."""
    venue_name: str
    restaurant_id: str
    date: str
    time: str
    party_size: int
    slot_type: str = ""

    def __str__(self) -> str:
        return f"{self.venue_name} | {self.date} {self.time} | party {self.party_size}"


class OpenTableClient:
    """Read-only OpenTable availability checker."""

    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "accept": "application/json",
            "user-agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        })

    def find_available(
        self,
        restaurant_id: str,
        party_size: int,
        target_date: date | str,
        venue_name: str = "",
    ) -> list[OTSlot]:
        """Check availability for a restaurant on a given date."""
        if isinstance(target_date, date):
            date_str = target_date.isoformat()
        else:
            date_str = target_date

        # OpenTable's public availability endpoint used by their widget
        resp = self.session.get(
            f"{OT_API}/v2/restaurant/{restaurant_id}/availability",
            params={
                "dateTime": f"{date_str}T19:00",
                "partySize": party_size,
                "includeNextAvailable": "true",
            },
        )

        if resp.status_code != 200:
            logger.warning(
                "OpenTable availability check failed for %s: %s",
                restaurant_id,
                resp.status_code,
            )
            return []

        data = resp.json()
        slots: list[OTSlot] = []

        for table in data.get("availability", {}).get("times", []):
            slots.append(
                OTSlot(
                    venue_name=venue_name or restaurant_id,
                    restaurant_id=restaurant_id,
                    date=date_str,
                    time=table.get("time", ""),
                    party_size=party_size,
                    slot_type=table.get("type", ""),
                )
            )

        logger.info(
            "OpenTable: %d slot(s) for %s on %s", len(slots), restaurant_id, date_str
        )
        return slots
