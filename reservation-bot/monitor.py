"""
Availability monitor – the core scheduling loop.

Periodically checks each enabled restaurant for open slots that match
our criteria (weekend, 5-8 PM, ≥36 h notice) and dispatches notifications
or auto-books when a match is found.

Rate-limit strategy:
  - Each scan cycle checks a limited batch of (venue, date) pairs
  - Pairs rotate across cycles so everything is covered over time
  - If a rate-limit 500 is detected mid-scan, the cycle stops early
  - The next cycle picks up where we left off
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

# Maximum (venue, date) API calls per scan cycle.  With a 1-2s delay per
# request inside ResyClient._request this keeps each cycle under ~30s of
# API traffic, well below Imperva's threshold.
MAX_CHECKS_PER_CYCLE = int(__import__("os").getenv("MAX_CHECKS_PER_CYCLE", "12"))


def _dates_to_check() -> list[date]:
    """
    Return the upcoming Fri/Sat/Sun dates that are at least MIN_NOTICE_HOURS
    away.  We look ahead up to 30 days.  Sorted nearest-first so the most
    actionable dates are always checked first.
    """
    now = datetime.now()
    cutoff = now + timedelta(hours=MIN_NOTICE_HOURS)
    dates: list[date] = []

    for delta in range(0, 31):
        d = (now + timedelta(days=delta)).date()
        if d.weekday() in ALLOWED_WEEKDAYS:
            earliest_slot_dt = datetime.combine(d, datetime.min.time().replace(hour=EARLIEST_HOUR))
            if earliest_slot_dt >= cutoff:
                dates.append(d)

    return dates  # already in chronological order


def _slot_in_window(time_str: str) -> bool:
    """Return True if a time string like '17:30' falls in the 5-8 PM window.

    Accepts both 'HH:MM' and full datetime 'YYYY-MM-DD HH:MM:SS' formats.
    """
    if not time_str:
        return False
    try:
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
        # Rotating offset – we advance through the full (venue, date) matrix
        # across cycles so we don't always check the same subset.
        self._offset: int = 0

    def _slot_key(self, venue: str, dt: str, time_str: str) -> str:
        return f"{venue}|{dt}|{time_str}"

    # ------------------------------------------------------------------
    # Build the work queue
    # ------------------------------------------------------------------

    @staticmethod
    def _build_pairs() -> list[tuple]:
        """Return all enabled (restaurant, date) pairs to check.

        Ordered so that the soonest dates come first (most likely to
        have fresh cancellation drops), interleaved across venues so a
        single cycle touches multiple restaurants rather than exhausting
        all dates for one venue before moving to the next.
        """
        enabled = [r for r in RESTAURANTS if r.enabled and r.venue_id]
        dates = _dates_to_check()
        if not enabled or not dates:
            return []

        # Interleave: for each date, iterate all venues → gives breadth-first coverage
        pairs: list[tuple] = []
        for d in dates:
            for r in enabled:
                pairs.append((r, d))
        return pairs

    # ------------------------------------------------------------------
    # Single scan (batched)
    # ------------------------------------------------------------------

    def scan_once(self) -> list[Slot | OTSlot]:
        """Run one batched scan.  Checks up to MAX_CHECKS_PER_CYCLE
        (venue, date) pairs, rotating through the full list across cycles.
        Stops early if a rate-limit is detected.
        """
        all_pairs = self._build_pairs()
        if not all_pairs:
            logger.info("No eligible (venue, date) pairs to check.")
            return []

        total = len(all_pairs)
        # Wrap offset if the list shrank (e.g. a date passed)
        if self._offset >= total:
            self._offset = 0

        # Select this cycle's batch
        batch_size = min(MAX_CHECKS_PER_CYCLE, total)
        batch: list[tuple] = []
        idx = self._offset
        for _ in range(batch_size):
            batch.append(all_pairs[idx % total])
            idx += 1
        # Advance offset for next cycle
        self._offset = idx % total

        venues_in_batch = {r.name for r, _ in batch}
        dates_in_batch = sorted({d for _, d in batch})
        logger.info(
            "Scanning batch: %d check(s) across %d venue(s), dates %s–%s  "
            "[offset %d/%d]",
            len(batch),
            len(venues_in_batch),
            dates_in_batch[0],
            dates_in_batch[-1],
            self._offset,
            total,
        )

        hits: list[Slot | OTSlot] = []
        rate_limited = False

        for rest, d in batch:
            if rate_limited:
                break

            try:
                if rest.platform == Platform.RESY:
                    slots = self.resy.find_available(
                        venue_id=rest.venue_id,
                        party_size=PARTY_SIZE,
                        target_date=d,
                        venue_name=rest.name,
                    )
                    # Detect rate-limit: find_available returns [] on 500,
                    # check the client's circuit breaker state
                    if self.resy.is_rate_limited:
                        logger.warning(
                            "Rate limit detected – stopping scan early. "
                            "Will resume from offset %d next cycle.",
                            self._offset,
                        )
                        rate_limited = True
                        break

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

        self.notifier.send_alert(hits)

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
        all_pairs = self._build_pairs()
        total = len(all_pairs)
        cycles_for_full = (total + MAX_CHECKS_PER_CYCLE - 1) // MAX_CHECKS_PER_CYCLE if total else 0

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
        logger.info(
            "Total (venue, date) pairs: %d | Max per cycle: %d | "
            "Full rotation every ~%d cycles (%d min)",
            total,
            MAX_CHECKS_PER_CYCLE,
            cycles_for_full,
            cycles_for_full * POLL_INTERVAL_SECONDS // 60,
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
