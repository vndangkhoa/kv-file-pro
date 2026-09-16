#!/usr/bin/env python3
"""
KV File PRO — Master Licensing & Key Management CLI
Generates cryptographically signed Ed25519 licenses for KV File PRO customers.
"""

import argparse
import base64
import json
import os
import sys
import time
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

# Default Master Keys for KV File PRO
DEFAULT_PRIVATE_KEY_HEX = os.environ.get(
    "KV_MASTER_SIGNING_KEY",
    "328cbd52260e870a3bce416049f8e97a55567a2c1e48db56f1f41aa6b12ee469"
)
DEFAULT_PUBLIC_KEY_HEX = "f9b0e2b590ebee9310bd5496ed61595eb8f93468c62807876a1ca43f90c76a4e"

def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def b64url_decode(data: str) -> bytes:
    padding = '=' * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def cmd_generate_keys():
    priv = ed25519.Ed25519PrivateKey.generate()
    pub = priv.public_key()
    priv_bytes = priv.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption()
    )
    pub_bytes = pub.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    print("=================================================================")
    print("  KV File PRO — Generated New Ed25519 Master Keypair")
    print("=================================================================")
    print(f"Master Private Signing Key (KEEP SECRET!):\n  {priv_bytes.hex()}\n")
    print(f"Master Public Verifying Key (Embed in Binary):\n  {pub_bytes.hex()}")
    print("=================================================================")

def cmd_issue(args):
    priv_hex = args.key or DEFAULT_PRIVATE_KEY_HEX
    if not priv_hex:
        print("Error: No private signing key provided. Use --key or KV_MASTER_SIGNING_KEY env.", file=sys.stderr)
        sys.exit(1)
    
    priv_bytes = bytes.fromhex(priv_hex.strip())
    signing_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)

    now = int(time.time())
    expires_at = None
    if not args.lifetime:
        days = args.days if args.days else 365
        expires_at = now + (days * 86400)

    order_or_id = args.id or f"LIC-{int(time.time())}"
    tier = args.tier or "kv-files-pro-all"

    payload = {
        "id": order_or_id,
        "user": args.user,
        "tier": tier,
        "issued_at": now,
        "expires_at": expires_at,
        "features": ["all"]
    }
    if args.email:
        payload["customer_email"] = args.email

    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    signature = signing_key.sign(payload_json)

    token = f"KVPRO-{b64url_encode(payload_json)}.{b64url_encode(signature)}"

    if args.json:
        print(json.dumps({
            "license_key": token,
            "payload": payload,
            "tier": tier,
            "user": args.user,
            "expires_at": expires_at,
            "is_lifetime": expires_at is None
        }, indent=2))
    else:
        print("=================================================================")
        print(f"  KV File PRO — Generated License for: {args.user}")
        print("=================================================================")
        print(f"Tier:          {tier}")
        print(f"License ID:    {order_or_id}")
        print(f"Issued At:     {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(now))}")
        print(f"Expiration:    {'Lifetime / Perpetual' if expires_at is None else time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(expires_at))}")
        print("-----------------------------------------------------------------")
        print(f"LICENSE KEY:\n{token}")
        print("=================================================================")

def cmd_verify(args):
    token = args.token.strip()
    if token.startswith("KVPRO-"):
        token = token[len("KVPRO-"):]
    
    parts = token.split('.')
    if len(parts) != 2:
        print("Error: Invalid token format. Expected KVPRO-<payload>.<sig>", file=sys.stderr)
        sys.exit(1)

    payload_bytes = b64url_decode(parts[0])
    sig_bytes = b64url_decode(parts[1])

    pub_hex = args.pubkey or DEFAULT_PUBLIC_KEY_HEX
    pub_bytes = bytes.fromhex(pub_hex.strip())
    verifying_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)

    try:
        verifying_key.verify(sig_bytes, payload_bytes)
    except Exception as e:
        print(f"INVALID: Signature verification failed! ({e})", file=sys.stderr)
        sys.exit(1)

    payload = json.loads(payload_bytes.decode('utf-8'))
    now = int(time.time())
    is_expired = payload.get("expires_at") is not None and now > payload["expires_at"]

    print("=================================================================")
    print("  KV File PRO — License Verification: VALID (Ed25519)")
    print("=================================================================")
    print(json.dumps(payload, indent=2))
    if is_expired:
        print("\nWARNING: This license has EXPIRED!")
    else:
        print("\nStatus: ACTIVE & VALID")
    print("=================================================================")

def main():
    parser = argparse.ArgumentParser(description="KV File PRO License Key Generator")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # generate-keys
    subparsers.add_parser("generate-keys", help="Generate a new Ed25519 master keypair")

    # issue
    p_issue = subparsers.add_parser("issue", help="Issue a signed KVPRO license key")
    p_issue.add_argument("--user", required=True, help="Username or Organization name")
    p_issue.add_argument("--email", help="Customer email address")
    p_issue.add_argument("--tier", default="kv-files-pro-all", help="License tier (default: kv-files-pro-all)")
    p_issue.add_argument("--id", help="Optional order or license ID")
    p_issue.add_argument("--lifetime", action="store_true", default=True, help="Issue lifetime perpetual license (default)")
    p_issue.add_argument("--days", type=int, help="Issue time-limited license for N days")
    p_issue.add_argument("--key", help="Master private key hex (overrides default)")
    p_issue.add_argument("--json", action="store_true", help="Output JSON format")

    # verify
    p_verify = subparsers.add_parser("verify", help="Verify a KVPRO license key")
    p_verify.add_argument("token", help="The KVPRO-... license key to verify")
    p_verify.add_argument("--pubkey", help="Master public key hex (overrides default)")

    args = parser.parse_args()
    if args.command == "generate-keys":
        cmd_generate_keys()
    elif args.command == "issue":
        if args.days is not None:
            args.lifetime = False
        cmd_issue(args)
    elif args.command == "verify":
        cmd_verify(args)

if __name__ == "__main__":
    main()
