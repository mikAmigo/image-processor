"""
Resy API client – handles auth, venue search, availability checks, and booking.

Resy's public-facing API lives at https://api.resy.com.  An API key is
embedded in their web app; you can grab one from browser dev-tools (look for
the `authorization` header with value `ResyAPI api_key="…"`).

Authentication flow:
  1. POST /3/auth/password  → returns an auth token
  2. All subsequent calls include both the API key and the auth token.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import date, datetime

import requests

logger = logging.getLogger(__name__)

RESY_BASE = "https://api.resy.com"


@dataclass
class Slot:
    """A single available reservation slot."""
    venue_name: str
    venue_id: str
    date: str           # YYYY-MM-DD
    time_start: str     # e.g. "17:30"
    time_end: str
    party_size: int
    slot_type: str      # e.g. "Dining Room", "Bar"
    config_token: str   # needed to book
    payment_method_id: int | None = None

    def __str__(self) -> str:
        return (
            f"{self.venue_name} | {self.date} {self.time_start}-{self.time_end} | "
            f"{self.slot_type} | party {self.party_size}"
        )


class ResyClient:
    """Thin wrapper around the Resy REST API."""

    def __init__(self, api_key: str, email: str = "", password: str = ""):
        self.api_key = api_key
        self.email = email
        self.password = password
        self.auth_token: str | None = None
        self.payment_method_id: int | None = None
        self.session = requests.Session()
        self.session.headers.update({
            "authorization": f'ResyAPI api_key="{self.api_key}"',
            "x-resy-universal-auth": "",
            "accept": "application/json",
            "user-agent": "ResyBot/1.0",
        })

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    def authenticate(self) -> bool:
        """Log in with email/password and store the auth token."""
        if not self.email or not self.password:
            logger.warning("No Resy credentials configured – running in read-only mode.")
            return False

        resp = self.session.post(
            f"{RESY_BASE}/3/auth/password",
            data={"email": self.email, "password": self.password},
        )
        if resp.status_code != 200:
            logger.error("Resy auth failed: %s %s", resp.status_code, resp.text[:300])
            return False

        payload = resp.json()
        self.auth_token = payload.get("token")
        self.payment_method_id = (
            payload.get("payment_method_id")
            or _extract_payment_id(payload)
        )
        self.session.headers["x-resy-universal-auth"] = self.auth_token or ""
        logger.info("Authenticated with Resy as %s", self.email)
        return True

    # ------------------------------------------------------------------
    # Venue search (useful for discovering venue IDs)
    # ------------------------------------------------------------------

    def search_venue(self, query: str, location: str = "new york") -> list[dict]:
        """Search Resy for venues matching *query*."""
        resp = self.session.get(
            f"{RESY_BASE}/3/venuesearch/search",
            params={"query": query, "geo": '{"latitude":40.7128,"longitude":-74.0060}', "per_page": 5},
        )
        if resp.status_code != 200:
            logger.error("Venue search failed: %s", resp.status_code)
            return []
        results = resp.json().get("search", {}).get("hits", [])
        return [
            {
                "name": r.get("name", ""),
                "venue_id": r.get("id", {}).get("resy"),
                "location": r.get("location", {}).get("name", ""),
                "slug": r.get("url_slug", ""),
            }
            for r in results
        ]

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------

    def find_available(
        self,
        venue_id: str,
        party_size: int,
        target_date: date | str,
        venue_name: str = "",
    ) -> list[Slot]:
        """Return available slots for a venue on a given date."""
        if isinstance(target_date, date):
            target_date = target_date.isoformat()

        resp = self.session.get(
            f"{RESY_BASE}/4/find",
            params={
                "lat": 0,
                "long": 0,
                "day": target_date,
                "party_size": party_size,
                "venue_id": venue_id,
            },
        )

        if resp.status_code != 200:
            logger.warning(
                "find_available(%s, %s) → %s", venue_id, target_date, resp.status_code
            )
            return []

        data = resp.json()
        results = data.get("results", {})
        venues = results.get("venues", [])
        slots: list[Slot] = []

        for venue in venues:
            for raw_slot in venue.get("slots", []):
                config = raw_slot.get("config", {})
                dt = raw_slot.get("date", {})
                slots.append(
                    Slot(
                        venue_name=venue_name or str(venue_id),
                        venue_id=str(venue_id),
                        date=target_date,
                        time_start=dt.get("start", ""),
                        time_end=dt.get("end", ""),
                        party_size=party_size,
                        slot_type=config.get("type", ""),
                        config_token=config.get("token", ""),
                    )
                )

        logger.info(
            "Found %d slot(s) for venue %s on %s", len(slots), venue_id, target_date
        )
        return slots

    # ------------------------------------------------------------------
    # Booking
    # ------------------------------------------------------------------

    def get_booking_details(self, config_token: str, party_size: int, target_date: str) -> dict | None:
        """Step 1 of the booking flow – get the booking token."""
        resp = self.session.get(
            f"{RESY_BASE}/3/details",
            params={
                "config_id": config_token,
                "day": target_date,
                "party_size": party_size,
            },
        )
        if resp.status_code != 200:
            logger.error("get_booking_details failed: %s %s", resp.status_code, resp.text[:300])
            return None
        return resp.json()

    def book(self, config_token: str, party_size: int, target_date: str) -> dict | None:
        """
        Full booking flow:
          1. GET /3/details  → obtain book_token
          2. POST /3/book    → confirm the reservation
        """
        if not self.auth_token:
            logger.error("Cannot book without authentication.")
            return None

        details = self.get_booking_details(config_token, party_size, target_date)
        if not details:
            return None

        book_token = (
            details.get("book_token", {}).get("value")
            if isinstance(details.get("book_token"), dict)
            else details.get("book_token")
        )
        if not book_token:
            logger.error("No book_token in details response.")
            return None

        payment_id = self.payment_method_id or 0
        resp = self.session.post(
            f"{RESY_BASE}/3/book",
            data={
                "book_token": book_token,
                "struct_payment_method": f'{{"id":{payment_id}}}',
                "source_id": "resy.com-venue-details",
            },
        )

        if resp.status_code != 200:
            logger.error("Booking failed: %s %s", resp.status_code, resp.text[:300])
            return None

        result = resp.json()
        logger.info("Booked! Confirmation: %s", result.get("resy_token", "unknown"))
        return result


# ------------------------------------------------------------------
# helpers
# ------------------------------------------------------------------

def _extract_payment_id(auth_payload: dict) -> int | None:
    """Try to pull a payment method ID from the auth response."""
    methods = auth_payload.get("payment_methods", [])
    if methods and isinstance(methods, list):
        return methods[0].get("id")
    return None
