#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

import os
import sys


def main() -> None:
    """
    Entry point for Django's command-line utility.
    Sets up the environment and delegates to Django's management command system.
    """
    # Set the default settings module for the 'django' program
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        # Import Django's command-line execution utility
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        # Provide a helpful error if Django isn't installed or the venv isn't activated
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    # Run the command-line utility with the provided arguments
    execute_from_command_line(sys.argv)


# Standard Python entry point: run main() if executed as a script
if __name__ == "__main__":
    main()
