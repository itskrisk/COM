#!/usr/bin/env python3
"""
Safaricom Domains Nameserver Automator
Updates nameservers for muncheez.co.ke to Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)

Usage:
    pip install requests
    python scripts/update_safaricom_dns.py [email] [password]
"""

import sys
import re
import requests

EMAIL = sys.argv[1] if len(sys.argv) > 1 else "campuskrisk@gmail.com"
PASSWORD = sys.argv[2] if len(sys.argv) > 2 else "Kenya2026@!"

BASE_URL = "https://domains.safaricom.co.ke"

def update_nameservers():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    })

    print(f"[1/5] Connecting to Safaricom Domains ({BASE_URL})...")
    login_page = session.get(f"{BASE_URL}/clientarea.php")
    
    token_match = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', login_page.text)
    if not token_match:
        print("[-] Could not find CSRF token on Safaricom login page.")
        return

    csrf_token = token_match.group(1)

    print(f"[2/5] Authenticating as {EMAIL}...")
    login_payload = {
        "token": csrf_token,
        "username": EMAIL,
        "password": PASSWORD
    }

    login_res = session.post(
        f"{BASE_URL}/index.php?rp=/login",
        data=login_payload,
        allow_redirects=False,
        headers={"Referer": f"{BASE_URL}/clientarea.php"}
    )

    if login_res.status_code == 302 and "/login" in login_res.headers.get("Location", ""):
        # Failed login redirect
        fail_page = session.get(f"{BASE_URL}{login_res.headers['Location']}")
        alert_match = re.search(r'class=["\'][^"\']*alert[^"\']*["\'][^>]*>([\s\S]*?)</div>', fail_page.text)
        alert_text = re.sub(r'<[^>]+>', '', alert_match.group(1)).strip() if alert_match else "Login Details Incorrect"
        print(f"[-] Authentication failed: \"{alert_text}\"")
        print("[-] Please check your Safaricom portal password.")
        return

    print("[3/5] Authentication successful! Fetching domains list...")
    domains_page = session.get(f"{BASE_URL}/clientarea.php?action=domains")
    
    domain_id_match = (
        re.search(r'id=(\d+)[^"\']*muncheez\.co\.ke', domains_page.text) or
        re.search(r'muncheez\.co\.ke[\s\S]*?id=(\d+)', domains_page.text) or
        re.search(r'domaindetails&(?:amp;)?id=(\d+)', domains_page.text)
    )

    if not domain_id_match:
        print("[-] Could not find domain ID for muncheez.co.ke.")
        return

    domain_id = domain_id_match.group(1)
    print(f"[4/5] Found muncheez.co.ke (Domain ID: {domain_id}). Accessing nameservers...")

    ns_page = session.get(f"{BASE_URL}/clientarea.php?action=domainnameservers&id={domain_id}")
    ns_token_match = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', ns_page.text)
    ns_token = ns_token_match.group(1) if ns_token_match else csrf_token

    print("[5/5] Updating nameservers to Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)...")
    ns_payload = {
        "token": ns_token,
        "sub": "savens",
        "nschoice": "custom",
        "ns1": "ns1.vercel-dns.com",
        "ns2": "ns2.vercel-dns.com",
        "ns3": "",
        "ns4": "",
        "ns5": ""
    }

    update_res = session.post(
        f"{BASE_URL}/clientarea.php?action=domainnameservers&id={domain_id}",
        data=ns_payload,
        headers={"Referer": f"{BASE_URL}/clientarea.php?action=domainnameservers&id={domain_id}"}
    )

    if "success" in update_res.text.lower() or update_res.status_code == 200:
        print("✓ SUCCESS! Nameservers for muncheez.co.ke have been updated to Vercel.")
        print("  Nameserver 1: ns1.vercel-dns.com")
        print("  Nameserver 2: ns2.vercel-dns.com")
        print("Vercel will verify the domain and issue the SSL certificate within 15-30 minutes.")
    else:
        print(f"[-] Response status: {update_res.status_code}")

if __name__ == "__main__":
    update_nameservers()
