# Scripts Directory

This directory contains utility scripts for development, testing, and deployment.

## Files:

### `cloud_storage_config.py`
- **Purpose**: Configuration documentation for setting up cloud storage (Cloudinary)
- **Usage**: Reference file for production deployment
- **When to use**: When configuring cloud storage for production

### `create_sample_data.py`
- **Purpose**: Creates sample test data for development and testing
- **Usage**: `python scripts/create_sample_data.py`
- **When to use**: When you need test data for development or demo purposes

### `debug_student.py`
- **Purpose**: Debug script to examine student model structure
- **Usage**: `python scripts/debug_student.py`
- **When to use**: For debugging database model issues

### `migrate_to_cloudinary.py`
- **Purpose**: Migrates existing local images to Cloudinary cloud storage
- **Usage**: `python scripts/migrate_to_cloudinary.py`
- **When to use**: When moving from local file storage to cloud storage

### `test_cloudinary.py`
- **Purpose**: Tests Cloudinary integration and upload functionality
- **Usage**: `python scripts/test_cloudinary.py`
- **When to use**: To verify Cloudinary configuration is working

## Notes:
- All scripts are set up to work with Django and require the project environment
- Make sure you're in the project root directory when running these scripts
- Some scripts may require additional environment variables or configuration
