#!/usr/bin/env python3
"""
Script to generate VAPID keys for push notifications.
Run this script to generate keys and add them to your .env file.
"""

try:
    from pywebpush import webpush
    import base64
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.backends import default_backend
    
    # Generate private key
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    
    # Get public key
    public_key = private_key.public_key()
    
    # Serialize private key
    private_key_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Serialize public key in uncompressed format
    public_key_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    
    # Convert to base64url format (without padding)
    private_key_b64 = base64.urlsafe_b64encode(private_key_bytes).decode('utf-8').rstrip('=')
    public_key_b64 = base64.urlsafe_b64encode(public_key_bytes).decode('utf-8').rstrip('=')
    
    print("VAPID Keys Generated Successfully!")
    print("=" * 50)
    print(f"VAPID_PRIVATE_KEY={private_key_b64}")
    print(f"VAPID_PUBLIC_KEY={public_key_b64}")
    print("=" * 50)
    print("\nAdd these to your .env file:")
    print(f"VAPID_PRIVATE_KEY={private_key_b64}")
    print(f"VAPID_PUBLIC_KEY={public_key_b64}")
    print(f"VAPID_CLAIM_EMAIL=admin@expense-tracker.com")
    
except ImportError as e:
    print(f"Error: Missing required packages. {e}")
    print("Make sure pywebpush and cryptography are installed:")
    print("pip install pywebpush cryptography")
except Exception as e:
    print(f"Error generating VAPID keys: {e}")