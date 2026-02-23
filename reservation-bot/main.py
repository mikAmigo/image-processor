#!/usr/bin/env python3
"""
NYC Restaurant Reservation Sniper

Usage:
    python main.py                 # run the monitor loop
    python main.py --scan-once     # single scan, print results, exit
    python main.py --search "Tatiana"  # look up a venue ID on Resy
    python main.py --list          # show configured restaurants
    python main.py --dry-run       # scan once, show what *would* be notified

Environment variables are read from a .env file if python-dotenv is installed,
otherwise set them in your shell.  See .env.example for the full list.
"""

from __future__ import annotations

import argparse
import logging
import sys

# Try to load .env automatically
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from config import (
    PARTY_SIZE,
    RESY_API_KEY,
    RESY_AUTH_TOKEN,
    RESY_EMAIL,
    RESY_PASSWORD,
    OPENTABLE_API_KEY,
    RESTAURANTS,
)
from resy_client import ResyClient
from opentable_client import OpenTableClient
from notifier import Notifier
from monitor import Monitor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("reservation-bot")


def build_clients() -> tuple[ResyClient, OpenTableClient]:
    resy = ResyClient(
        api_key=RESY_API_KEY,
        email=RESY_EMAIL,
        password=RESY_PASSWORD,
        auth_token=RESY_AUTH_TOKEN,
    )
    if not RESY_AUTH_TOKEN and RESY_EMAIL and RESY_PASSWORD:
        resy.authenticate()

    ot = OpenTableClient(api_key=OPENTABLE_API_KEY)
    return resy, ot


def cmd_list() -> None:
    """Print the configured restaurant list."""
    print(f"\n{'Name':<30} {'Platform':<12} {'Venue ID':<10} {'Enabled'}")
    print("-" * 70)
    for r in RESTAURANTS:
        status = "yes" if r.enabled else "NO"
        vid = r.venue_id or "(missing)"
        print(f"{r.name:<30} {r.platform.value:<12} {vid:<10} {status}")
        if r.notes:
            print(f"  └─ {r.notes}")
    print()


def cmd_search(query: str) -> None:
    """Search Resy for a venue by name."""
    resy = ResyClient(api_key=RESY_API_KEY)
    results = resy.search_venue(query)
    if not results:
        print(f"No results for '{query}'.")
        return
    print(f"\nResy results for '{query}':")
    for r in results:
        print(f"  {r['name']} | venue_id={r['venue_id']} | slug={r['slug']} | {r['location']}")
    print()


def cmd_scan_once(dry_run: bool = False) -> None:
    """Run a single availability scan."""
    resy, ot = build_clients()
    notifier = Notifier()
    mon = Monitor(resy, ot, notifier)
    hits = mon.scan_once()

    if not hits:
        print("\nNo available slots matching your criteria right now.")
        return

    print(f"\n{'='*60}")
    print(f" {len(hits)} slot(s) found!")
    print(f"{'='*60}")
    for h in hits:
        print(f"  → {h}")
    print()

    if not dry_run:
        mon._handle_hits(hits)
    else:
        print("(dry run — no notifications sent, no bookings made)")


def cmd_run() -> None:
    """Start the continuous monitoring loop."""
    if not RESY_API_KEY:
        logger.error(
            "RESY_API_KEY is required. Get it from browser dev-tools on resy.com "
            "(look for the 'authorization' header). Set it in .env or your environment."
        )
        sys.exit(1)

    resy, ot = build_clients()
    notifier = Notifier()
    mon = Monitor(resy, ot, notifier)
    mon.run()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="NYC Restaurant Reservation Sniper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--list", action="store_true", help="List configured restaurants")
    parser.add_argument("--search", type=str, metavar="QUERY", help="Search Resy for a venue")
    parser.add_argument("--scan-once", action="store_true", help="Single scan then exit")
    parser.add_argument("--dry-run", action="store_true", help="Scan once, no notifications")
    parser.add_argument("--party-size", type=int, default=None, help="Override party size")

    args = parser.parse_args()

    if args.party_size:
        import config
        config.PARTY_SIZE = args.party_size

    if args.list:
        cmd_list()
    elif args.search:
        cmd_search(args.search)
    elif args.scan_once or args.dry_run:
        cmd_scan_once(dry_run=args.dry_run)
    else:
        cmd_run()


if __name__ == "__main__":
    main()
