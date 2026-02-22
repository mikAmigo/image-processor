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
import random
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
        self._consecutive_500s: int = 0
        self._rate_limited_until: float = 0
        self.session = requests.Session()
        self.session.headers.update({
            "authorization": f'ResyAPI api_key="{self.api_key}"',
            "x-resy-universal-auth": "",
            "accept": "application/json",
            "origin": "https://resy.com",
            "referer": "https://resy.com/",
            "user-agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        })

    # ------------------------------------------------------------------
    # Rate-limited requests
    # ------------------------------------------------------------------

    def _request(self, method: str, url: str, retries: int = 2, **kwargs) -> requests.Response:
        """Make an API request with rate limiting and retry on 500 (CDN block).

        Resy uses Imperva CDN which returns empty 500s when rate-limited.
        We use exponential backoff with jitter and a circuit breaker that
        pauses all requests when we detect sustained rate limiting.
        """
        if self._rate_limited_until and time.time() < self._rate_limited_until:
            wait = self._rate_limited_until - time.time()
            logger.info("Circuit breaker active, waiting %.0fs…", wait)
            time.sleep(wait)
            self._rate_limited_until = 0

        for attempt in range(retries):
            # Base delay between requests: ~1-2s
            delay = 1.0 + random.uniform(0, 1.0)
            if attempt > 0:
                delay = (2 ** (attempt + 1)) + random.uniform(0, 2.0)
            time.sleep(delay)

            resp = self.session.request(method, url, **kwargs)
            if resp.status_code == 500 and not resp.text.strip():
                # Empty 500 = Imperva CDN rate limit
                logger.debug("Rate limited (attempt %d/%d), backing off…", attempt + 1, retries)
                self._consecutive_500s += 1
                if self._consecutive_500s >= 5:
                    # Trip circuit breaker: pause for 5 minutes
                    self._rate_limited_until = time.time() + 300
                    logger.warning(
                        "Rate limit circuit breaker tripped after %d consecutive 500s. "
                        "Pausing requests for 5 minutes.",
                        self._consecutive_500s,
                    )
                    self._consecutive_500s = 0
                    return resp
                continue
            self._consecutive_500s = 0
            return resp
        return resp  # return last response even if still 500

    @property
    def is_rate_limited(self) -> bool:
        """True if the circuit breaker is currently active."""
        return bool(self._rate_limited_until and time.time() < self._rate_limited_until)

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    def authenticate(self) -> bool:
        """Log in with email/password and store the auth token."""
        if not self.email or not self.password:
            logger.warning("No Resy credentials configured – running in read-only mode.")
            return False

        resp = self._request(
            "POST", f"{RESY_BASE}/3/auth/password",
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
        resp = self._request(
            "POST", f"{RESY_BASE}/3/venuesearch/search",
            json={
                "query": query,
                "geo": {"latitude": 40.7128, "longitude": -74.0060},
                "per_page": 5,
                "types": ["venue"],
            },
        )
        if resp.status_code != 200:
            logger.error("Venue search failed: %s", resp.status_code)
            return []
        results = resp.json().get("search", {}).get("hits", [])
        return [
            {
                "name": r.get("name", ""),
                "venue_id": r.get("id", {}).get("resy") if isinstance(r.get("id"), dict) else r.get("id"),
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

        resp = self._request(
            "GET", f"{RESY_BASE}/4/find",
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
                # API returns full datetime strings like "2026-03-07 17:45:00"
                # Extract just the time portion (HH:MM) for filtering
                start_raw = dt.get("start", "")
                end_raw = dt.get("end", "")
                time_start = _extract_time(start_raw)
                time_end = _extract_time(end_raw)
                slots.append(
                    Slot(
                        venue_name=venue_name or str(venue_id),
                        venue_id=str(venue_id),
                        date=target_date,
                        time_start=time_start,
                        time_end=time_end,
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
        resp = self._request(
            "GET", f"{RESY_BASE}/3/details",
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
        resp = self._request(
            "POST", f"{RESY_BASE}/3/book",
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

def _extract_time(raw: str) -> str:
    """Extract HH:MM from a datetime string like '2026-03-07 17:45:00' or '17:45'."""
    if not raw:
        return ""
    # If it contains a space, it's a full datetime string
    if " " in raw:
        time_part = raw.split(" ")[-1]  # "17:45:00"
        return ":".join(time_part.split(":")[:2])  # "17:45"
    # Already in HH:MM or HH:MM:SS format
    return ":".join(raw.split(":")[:2])


def _extract_payment_id(auth_payload: dict) -> int | None:
    """Try to pull a payment method ID from the auth response."""
    methods = auth_payload.get("payment_methods", [])
    if methods and isinstance(methods, list):
        return methods[0].get("id")
    return None
