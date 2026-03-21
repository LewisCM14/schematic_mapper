"""
ad_utils.py

This module provides helper functions for working with Active Directory (AD) using LDAP.
It is used to find out which groups a user belongs to, which is important for permissions and access control.

Dependencies:
    - ldap3: A library for talking to LDAP/Active Directory servers.
    - Django settings: Stores configuration like LDAP server address and credentials.
"""

from ldap3 import Server, Connection, ALL, NTLM
from django.conf import settings


def get_user_groups(username: str) -> list[str]:
    """
    Look up all Active Directory groups for a given username.

    Args:
        username (str): The user's login name (sAMAccountName in AD).

    Returns:
        list[str]: A list of group names (CNs) the user is a member of. Returns an empty list if the user is not found or has no groups.

    How it works:
        1. Connects to the LDAP server using credentials from Django settings.
        2. Searches for the user by sAMAccountName (their login name).
        3. If found, retrieves the 'memberOf' attribute, which lists all groups the user belongs to.
        4. Extracts just the group name (CN) from each full group DN.
    """
    # Connect to the LDAP/Active Directory server
    server = Server(settings.LDAP_SERVER_URI, get_info=ALL)
    conn = Connection(
        server,
        user=settings.LDAP_BIND_DN,  # Service account username
        password=settings.LDAP_BIND_PASSWORD,  # Service account password
        authentication=NTLM,  # Use NTLM authentication (common for AD)
        auto_bind=True,  # Automatically connect
    )
    # Search for the user by their login name
    search_filter = f"(&(objectClass=user)(sAMAccountName={username}))"
    conn.search(settings.LDAP_BASE_DN, search_filter, attributes=["memberOf"])
    if not conn.entries:
        # User not found
        return []
    entry = conn.entries[0]
    # Get the list of groups (as full DNs) from the 'memberOf' attribute
    groups = entry.memberOf.values if hasattr(entry, "memberOf") else []
    # Extract just the group name (CN) from each full DN string
    # Example DN: 'CN=GroupName,OU=SomeUnit,DC=example,DC=com' -> 'GroupName'
    return [g.split(",")[0][3:] for g in groups]
