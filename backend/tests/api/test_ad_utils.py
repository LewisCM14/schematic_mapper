"""
test_ad_utils.py

Unit tests for api.ad_utils.get_user_groups to increase coverage.
Covers:
- User found with groups
- User not found
- User found with no groups
- LDAP connection/search error
"""

import pytest
from unittest.mock import patch, MagicMock
from api.ad_utils import get_user_groups


class TestGetUserGroups:
    """
    Tests for get_user_groups in api.ad_utils, covering all AD/LDAP scenarios.
    """

    @patch("api.ad_utils.Connection")
    @patch("api.ad_utils.Server")
    def test_user_found_with_groups(
        self, MockServer: MagicMock, MockConnection: MagicMock
    ) -> None:
        """User is found and is a member of multiple groups (admin, viewer)."""
        mock_conn = MagicMock()
        mock_entry = MagicMock()
        mock_entry.memberOf.values = [
            "CN=app_admin,OU=Groups,DC=example,DC=com",
            "CN=app_viewer,OU=Groups,DC=example,DC=com",
        ]
        mock_conn.entries = [mock_entry]
        MockConnection.return_value = mock_conn
        MockServer.return_value = MagicMock()
        groups = get_user_groups("testuser")
        assert groups == ["app_admin", "app_viewer"]

    @patch("api.ad_utils.Connection")
    @patch("api.ad_utils.Server")
    def test_user_not_found(
        self, MockServer: MagicMock, MockConnection: MagicMock
    ) -> None:
        """User is not found in AD (empty entries)."""
        mock_conn = MagicMock()
        mock_conn.entries = []
        MockConnection.return_value = mock_conn
        MockServer.return_value = MagicMock()
        groups = get_user_groups("nouser")
        assert groups == []

    @patch("api.ad_utils.Connection")
    @patch("api.ad_utils.Server")
    def test_user_found_no_groups(
        self, MockServer: MagicMock, MockConnection: MagicMock
    ) -> None:
        """User is found but has no memberOf attribute (no groups)."""
        mock_conn = MagicMock()
        mock_entry = MagicMock()
        del mock_entry.memberOf  # Simulate no memberOf attribute
        mock_conn.entries = [mock_entry]
        MockConnection.return_value = mock_conn
        MockServer.return_value = MagicMock()
        groups = get_user_groups("nogroups")
        assert groups == []

    @patch("api.ad_utils.Connection", side_effect=Exception("LDAP error"))
    @patch("api.ad_utils.Server")
    def test_ldap_connection_error(
        self, MockServer: MagicMock, MockConnection: MagicMock
    ) -> None:
        """LDAP connection or search error raises exception."""
        MockServer.return_value = MagicMock()
        with pytest.raises(Exception, match="LDAP error"):
            get_user_groups("failuser")
