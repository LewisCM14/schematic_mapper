import logging

import pytest


def test_api_logger_is_configured_at_debug() -> None:
    """The 'api' logger must be enabled at DEBUG level."""
    logger = logging.getLogger("api")
    assert logger.isEnabledFor(logging.DEBUG)


def test_api_log_record_captured_at_debug(caplog: pytest.LogCaptureFixture) -> None:
    """A DEBUG record emitted from the 'api' namespace must be captured."""
    with caplog.at_level(logging.DEBUG, logger="api"):
        logging.getLogger("api").debug("schematic-mapper test log entry")

    messages = [r.message for r in caplog.records]
    assert any("schematic-mapper test log entry" in m for m in messages)
