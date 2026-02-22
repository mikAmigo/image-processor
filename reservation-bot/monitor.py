"""
Availability monitor – the core scheduling loop.

Periodically checks each enabled restaurant for open slots that match
our criteria (weekend, 5-8 PM, ≥36 h notice) and dispatches notifications
or auto-books when a match is found.
"""

from __future__ import annotations

import logging
import time
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING

from config import (
    ALLOWED_WEEKDAYS,
    AUTO_BOOK,
    EARLIEST_HOUR,
    LATEST_HOUR,
    MIN_NOTICE_HOURS,
    PARTY_SIZE,
    POLL_INTERVAL_SECONDS,
    RESTAURANTS,
    Platform,
)
from resy_client import ResyClient, Slot
from opentable_client import OpenTableClient, OTSlot

if TYPE_CHECKING:
    from notifier import Notifier

logger = logging.getLogger(__name__)


def _dates_to_check() -> list[date]:
    """
    Return the upcoming Fri/Sat/Sun dates that are at least MIN_NOTICE_HOURS
    away.  We look ahead up to 30 days.
    """
    now = datetime.now()
    cutoff = now + timedelta(hours=MIN_NOTICE_HOURS)
    dates: list[date] = []

    for delta in range(0, 31):
        d = (now + timedelta(days=delta)).date()
        if d.weekday() in ALLOWED_WEEKDAYS:
            # The slot must start at EARLIEST_HOUR on this date and still
            # be ≥ MIN_NOTICE_HOURS from now.
            earliest_slot_dt = datetime.combine(d, datetime.min.time().replace(hour=EARLIEST_HOUR))
            if earliest_slot_dt >= cutoff:
                dates.append(d)

    return dates


def _slot_in_window(time_str: str) -> bool:
    """Return True if a time string like '17:30' falls in the 5-8 PM window.

    Accepts both 'HH:MM' and full datetime 'YYYY-MM-DD HH:MM:SS' formats.
    """
    if not time_str:
        return False
    try:
        # Handle full datetime strings (e.g. "2026-03-07 17:45:00")
        if " " in time_str:
            time_str = time_str.split(" ")[-1]
        hour = int(time_str.split(":")[0])
        return EARLIEST_HOUR <= hour < LATEST_HOUR
    except (ValueError, IndexError):
        return False


class Monitor:
    """Runs the polling loop across all configured restaurants."""

    def __init__(
        self,
        resy: ResyClient,
        opentable: OpenTableClient,
        notifier: "Notifier",
    ):
        self.resy = resy
        self.opentable = opentable
        self.notifier = notifier
        # Track what we already notified about to avoid spam
        self._seen: set[str] = set()

    def _slot_key(self, venue: str, dt: str, time: str) -> str:
        return f"{venue}|{dt}|{time}"

    # ------------------------------------------------------------------
    # Single scan
    # ------------------------------------------------------------------

    def scan_once(self) -> list[Slot | OTSlot]:
        """Run one full scan across all restaurants and dates. Return new hits."""
        dates = _dates_to_check()
        if not dates:
            logger.info("No eligible dates found (all within 36 h window).")
            return []

        logger.info(
            "Scanning %d restaurant(s) across %d date(s)…",
            sum(1 for r in RESTAURANTS if r.enabled),
            len(dates),
        )

        hits: list[Slot | OTSlot] = []

        for rest in RESTAURANTS:
            if not rest.enabled:
                continue
            if not rest.venue_id:
                logger.debug("Skipping %s – no venue_id configured.", rest.name)
                continue

            for d in dates:
                try:
                    if rest.platform == Platform.RESY:
                        slots = self.resy.find_available(
                            venue_id=rest.venue_id,
                            party_size=PARTY_SIZE,
                            target_date=d,
                            venue_name=rest.name,
                        )
                        for s in slots:
                            if not _slot_in_window(s.time_start):
                                continue
                            key = self._slot_key(rest.name, s.date, s.time_start)
                            if key in self._seen:
                                continue
                            self._seen.add(key)
                            hits.append(s)

                    elif rest.platform == Platform.OPENTABLE:
                        ot_slots = self.opentable.find_available(
                            restaurant_id=rest.venue_id,
                            party_size=PARTY_SIZE,
                            target_date=d,
                            venue_name=rest.name,
                        )
                        for s in ot_slots:
                            if not _slot_in_window(s.time):
                                continue
                            key = self._slot_key(rest.name, s.date, s.time)
                            if key in self._seen:
                                continue
                            self._seen.add(key)
                            hits.append(s)

                except Exception:
                    logger.exception("Error checking %s on %s", rest.name, d)

        return hits

    # ------------------------------------------------------------------
    # Act on hits
    # ------------------------------------------------------------------

    def _handle_hits(self, hits: list[Slot | OTSlot]) -> None:
        if not hits:
            return

        # Notify for everything
        self.notifier.send_alert(hits)

        # Auto-book Resy slots if enabled
        if AUTO_BOOK:
            for slot in hits:
                if isinstance(slot, Slot) and slot.config_token:
                    logger.info("Auto-booking: %s", slot)
                    result = self.resy.book(
                        config_token=slot.config_token,
                        party_size=slot.party_size,
                        target_date=slot.date,
                    )
                    if result:
                        self.notifier.send_booking_confirmation(slot, result)
                    else:
                        logger.warning("Auto-book failed for %s", slot)
                    # Only book the first available hit to avoid overbooking
                    break

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def run(self) -> None:
        """Run the monitor in an infinite polling loop."""
        logger.info(
            "Monitor started. Polling every %ds. Auto-book=%s. Party size=%d.",
            POLL_INTERVAL_SECONDS,
            AUTO_BOOK,
            PARTY_SIZE,
        )
        logger.info(
            "Watching: %s",
            ", ".join(r.name for r in RESTAURANTS if r.enabled and r.venue_id),
        )
        logger.info(
            "Days: Fri/Sat/Sun | Window: %d:00–%d:00 | Min notice: %dh",
            EARLIEST_HOUR,
            LATEST_HOUR,
            MIN_NOTICE_HOURS,
        )

        while True:
            try:
                hits = self.scan_once()
                if hits:
                    logger.info("🎯 %d new slot(s) found!", len(hits))
                    for h in hits:
                        logger.info("  → %s", h)
                    self._handle_hits(hits)
                else:
                    logger.debug("No new availability.")
            except KeyboardInterrupt:
                logger.info("Shutting down monitor.")
                break
            except Exception:
                logger.exception("Unhandled error in scan loop.")

            time.sleep(POLL_INTERVAL_SECONDS)
