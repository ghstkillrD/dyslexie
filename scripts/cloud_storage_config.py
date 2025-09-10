#!/usr/bin/env python
"""
Cloud Storage Configuration for Production Deployment
This file shows how to configure cloud storage for the dyslexie project
"""

# Add this to your backend/settings.py for cloud storage

# At the top of settings.py, add these imports:
import os
from pathlib import Path

# Cloudinary Configuration (recommended for this project)
def configure_cloudinary_storage():
    """
    Configure Cloudinary for image storage
    Sign up at: https://cloudinary.com/
    """
    
    # Add to INSTALLED_APPS
    INSTALLED_APPS_ADDITION = [
        'cloudinary_storage',
        'cloudinary',
    ]
    
    # Cloudinary settings
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME'),
        'API_KEY': os.getenv('CLOUDINARY_API_KEY'),
        'API_SECRET': os.getenv('CLOUDINARY_API_SECRET')
    }
    
    # Use Cloudinary for media files in production
    if not os.getenv('DEBUG', 'False').lower() == 'true':
        DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    
    return {
        'INSTALLED_APPS_ADDITION': INSTALLED_APPS_ADDITION,
        'CLOUDINARY_STORAGE': CLOUDINARY_STORAGE,
        'DEFAULT_FILE_STORAGE': 'cloudinary_storage.storage.MediaCloudinaryStorage' if not DEBUG else None
    }

# AWS S3 Configuration (alternative option)
def configure_aws_s3_storage():
    """
    Configure AWS S3 for image storage
    """
    
    # S3 settings
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', 'dyslexie-handwriting')
    AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = False
    
    # Use S3 for media files in production
    if not os.getenv('DEBUG', 'False').lower() == 'true':
        DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
        MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
    
    return {
        'AWS_ACCESS_KEY_ID': AWS_ACCESS_KEY_ID,
        'AWS_SECRET_ACCESS_KEY': AWS_SECRET_ACCESS_KEY,
        'AWS_STORAGE_BUCKET_NAME': AWS_STORAGE_BUCKET_NAME,
        'AWS_S3_REGION_NAME': AWS_S3_REGION_NAME,
        'AWS_S3_CUSTOM_DOMAIN': AWS_S3_CUSTOM_DOMAIN,
        'AWS_S3_OBJECT_PARAMETERS': AWS_S3_OBJECT_PARAMETERS,
        'AWS_DEFAULT_ACL': AWS_DEFAULT_ACL,
        'AWS_S3_FILE_OVERWRITE': AWS_S3_FILE_OVERWRITE,
        'AWS_QUERYSTRING_AUTH': AWS_QUERYSTRING_AUTH,
        'DEFAULT_FILE_STORAGE': 'storages.backends.s3boto3.S3Boto3Storage' if not DEBUG else None,
        'MEDIA_URL': f'https://{AWS_S3_CUSTOM_DOMAIN}/media/' if not DEBUG else '/media/'
    }

# Environment variables template
ENV_TEMPLATE = """
# For Cloudinary (recommended)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# For AWS S3 (alternative)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=dyslexie-handwriting
AWS_S3_REGION_NAME=us-east-1

# Production settings
DEBUG=False
"""

if __name__ == "__main__":
    print("Cloud Storage Configuration Helper")
    print("=" * 50)
    print("\n1. Choose your cloud storage provider:")
    print("   - Cloudinary (recommended for images)")
    print("   - AWS S3 (more general purpose)")
    print("\n2. Sign up for your chosen service")
    print("3. Get your API credentials")
    print("4. Add credentials to your .env file")
    print("5. Update settings.py with the configuration")
    print("\nSee CLOUD_STORAGE_GUIDE.md for detailed instructions")