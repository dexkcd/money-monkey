#!/usr/bin/env python3
"""
Generate VAPID keys for push notifications.
This script generates proper VAPID keys that work with both pywebpush and browser APIs.
"""

import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend

def generate_vapid_keys():
    """Generate VAPID key pair."""
    # Generate private key
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    
    # Get public key
    public_key = private_key.public_key()
    
    # Serialize private key to PEM format
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Serialize public key to uncompressed point format (65 bytes)
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    
    # Base64url encode the public key for frontend use
    public_key_b64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')
    
    # Base64 encode the private key for storage
    private_key_b64 = base64.b64encode(private_pem).decode('utf-8')
    
    return {
        'public_key': public_key_b64,
        'private_key': private_key_b64,
        'private_key_pem': private_pem.decode('utf-8')
    }

if __name__ == '__main__':
    keys = generate_vapid_keys()
    
    print("Generated VAPID Keys:")
    print("=" * 50)
    print(f"Public Key (for .env): {keys['public_key']}")
    print(f"Private Key (for .env): {keys['private_key']}")
    print()
    print("Private Key PEM format:")
    print(keys['private_key_pem'])
    print()
    print("Add these to your .env file:")
    print(f"VAPID_PUBLIC_KEY={keys['public_key']}")
    print(f"VAPID_PRIVATE_KEY={keys['private_key']}")