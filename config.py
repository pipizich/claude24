import os

SECRET_KEY = 'art_gallery_secret_key'
UPLOAD_FOLDER = 'static/uploads'
THUMBNAIL_FOLDER = 'static/thumbnails'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}
MAX_IMAGE_SIZE = (1920, 1080)
THUMBNAIL_SIZE = (400, 400)
IMAGE_QUALITY = 85

# Ensure upload and thumbnail directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(THUMBNAIL_FOLDER, exist_ok=True)