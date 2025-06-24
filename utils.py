import os
from config import ALLOWED_EXTENSIONS, UPLOAD_FOLDER, THUMBNAIL_FOLDER

def validate_image_file(file):
    """Validate uploaded image file"""
    if not file or file.filename == '':
        return {'valid': False, 'message': 'No file selected'}
    
    # Check file extension
    if not ('.' in file.filename and 
            file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS):
        return {'valid': False, 'message': 'Invalid file type. Please select: JPG, PNG, GIF, WebP, SVG'}
    
    # Check file size
    file.seek(0, 2)  # Go to end of file
    file_length = file.tell()
    file.seek(0)  # Reset to beginning
    
    max_size = 15 * 1024 * 1024  # 15MB
    if file_length > max_size:
        return {'valid': False, 'message': f'File too large ({file_length // 1024 // 1024}MB). Max size: 15MB'}
    
    return {'valid': True, 'message': 'File is valid'}

def cleanup_old_files(image_path):
    """Remove old image and its thumbnail"""
    if image_path and image_path.startswith('static/uploads/') and os.path.exists(image_path):
        try:
            # Remove original image
            os.remove(image_path)
            
            # Remove thumbnail
            thumb_path = image_path.replace('/uploads/', '/thumbnails/')
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
        except OSError as e:
            print(f"Error removing files: {e}")

def ensure_directories():
    """Ensure upload and thumbnail directories exist"""
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(THUMBNAIL_FOLDER, exist_ok=True)

def get_file_size_formatted(size_bytes):
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0B"
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.1f}{size_names[i]}"

def cleanup_orphaned_files():
    """Remove files that don't have corresponding database entries"""
    from db import get_db_connection
    import glob
    
    # Get all image paths from database
    conn = get_db_connection()
    db_paths = set()
    artworks = conn.execute('SELECT image_path FROM artworks').fetchall()
    for artwork in artworks:
        db_paths.add(artwork['image_path'])
    conn.close()
    
    # Check files in upload folder
    upload_files = glob.glob(os.path.join(UPLOAD_FOLDER, '*'))
    removed_count = 0
    
    for file_path in upload_files:
        relative_path = file_path.replace('\\', '/')  # Normalize path separators
        if relative_path not in db_paths:
            try:
                os.remove(file_path)
                removed_count += 1
                
                # Also remove corresponding thumbnail
                filename = os.path.basename(file_path)
                thumb_path = os.path.join(THUMBNAIL_FOLDER, filename)
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)
                    
            except OSError as e:
                print(f"Error removing orphaned file {file_path}: {e}")
    
    return removed_count