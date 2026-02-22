"""
Notification system – sends SMS (Twilio) and/or email alerts when
reservation slots are found, and confirmations when a booking succeeds.
"""

from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText
from typing import Union

from config import (
    NOTIFY_EMAIL,
    NOTIFY_PHONE,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USER,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER,
)
from resy_client import Slot
from opentable_client import OTSlot

logger = logging.getLogger(__name__)

SlotType = Union[Slot, OTSlot]


class Notifier:
    """Dispatches alerts over SMS and email."""

    def __init__(self) -> None:
        self._twilio_client = None
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            try:
                from twilio.rest import Client as TwilioClient
                self._twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                logger.info("Twilio SMS notifications enabled.")
            except ImportError:
                logger.warning(
                    "twilio package not installed – SMS notifications disabled. "
                    "Install with: pip install twilio"
                )

        self._email_enabled = bool(SMTP_USER and SMTP_PASSWORD and NOTIFY_EMAIL)
        if self._email_enabled:
            logger.info("Email notifications enabled → %s", NOTIFY_EMAIL)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def send_alert(self, slots: list[SlotType]) -> None:
        """Notify about newly discovered available slots."""
        if not slots:
            return
        subject = f"🍽 {len(slots)} reservation slot(s) found!"
        body = self._format_slots(slots)
        self._dispatch(subject, body)

    def send_booking_confirmation(self, slot: SlotType, booking_result: dict) -> None:
        """Notify that a reservation was auto-booked."""
        token = booking_result.get("resy_token", "N/A")
        subject = f"Booked! {getattr(slot, 'venue_name', 'Restaurant')} confirmed"
        body = (
            f"Auto-booked reservation:\n\n"
            f"  {slot}\n\n"
            f"Confirmation token: {token}\n"
            f"Check your Resy app for details."
        )
        self._dispatch(subject, body)

    # ------------------------------------------------------------------
    # Formatting
    # ------------------------------------------------------------------

    @staticmethod
    def _format_slots(slots: list[SlotType]) -> str:
        lines = ["Available reservations found:\n"]
        for s in slots:
            if isinstance(s, Slot):
                link = f"https://resy.com/cities/ny?date={s.date}&seats={s.party_size}"
                lines.append(f"  • {s}")
                lines.append(f"    Book → {link}\n")
            elif isinstance(s, OTSlot):
                lines.append(f"  • {s}")
                lines.append(f"    Book → https://www.opentable.com/r/{s.restaurant_id}\n")
            else:
                lines.append(f"  • {s}\n")

        lines.append(
            "\nSlots go fast — open the link or your Resy app immediately!"
        )
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Dispatch
    # ------------------------------------------------------------------

    def _dispatch(self, subject: str, body: str) -> None:
        logger.info("ALERT: %s", subject)
        self._send_sms(f"{subject}\n\n{body}")
        self._send_email(subject, body)

    def _send_sms(self, body: str) -> None:
        if not self._twilio_client or not NOTIFY_PHONE or not TWILIO_FROM_NUMBER:
            return
        try:
            # Twilio SMS limit is 1600 chars; truncate if needed
            if len(body) > 1500:
                body = body[:1497] + "…"
            msg = self._twilio_client.messages.create(
                body=body,
                from_=TWILIO_FROM_NUMBER,
                to=NOTIFY_PHONE,
            )
            logger.info("SMS sent: %s", msg.sid)
        except Exception:
            logger.exception("Failed to send SMS.")

    def _send_email(self, subject: str, body: str) -> None:
        if not self._email_enabled:
            return
        try:
            msg = MIMEText(body, "plain")
            msg["Subject"] = subject
            msg["From"] = SMTP_USER
            msg["To"] = NOTIFY_EMAIL
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
            logger.info("Email sent to %s", NOTIFY_EMAIL)
        except Exception:
            logger.exception("Failed to send email.")
