from PIL import Image, ExifTags
from PIL.PngImagePlugin import PngInfo
import io
import os
from werkzeug.utils import secure_filename
from config import ALLOWED_EXTENSIONS, MAX_IMAGE_SIZE, IMAGE_QUALITY

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_all_metadata(img):
    """
    Extract both EXIF and PNG metadata from PIL Image object
    Returns: (exif_bytes, pnginfo_object)
    """
    exif_bytes = None
    pnginfo = None
    
    try:
        # Extract EXIF for JPEG
        if hasattr(img, 'getexif'):
            exif_dict = img.getexif()
            if exif_dict:
                exif_bytes = img.info.get('exif')
    except Exception as e:
        print(f"EXIF extraction error: {e}")
    
    try:
        # Extract PNG info
        if img.format == 'PNG' and hasattr(img, 'info') and img.info:
            pnginfo = PngInfo()
            for key, value in img.info.items():
                try:
                    # Convert bytes to string if needed
                    if isinstance(value, bytes):
                        value = value.decode('utf-8', errors='ignore')
                    # Only add text data that PIL can handle
                    if isinstance(value, (str, int, float)):
                        pnginfo.add_text(str(key), str(value))
                except Exception as e:
                    print(f"PNG metadata key {key} skipped: {e}")
    except Exception as e:
        print(f"PNG info extraction error: {e}")
    
    return exif_bytes, pnginfo

def optimize_image_with_metadata(file_stream, max_size=MAX_IMAGE_SIZE, quality=IMAGE_QUALITY):
    """
    Optimized version that properly preserves ALL metadata
    """
    try:
        # Save original position
        original_position = file_stream.tell()
        
        img = Image.open(file_stream)
        original_format = img.format
        
        # Extract ALL metadata BEFORE any modifications
        exif_bytes, pnginfo = extract_all_metadata(img)
        
        # Handle transparency properly
        needs_transparency = img.mode in ('RGBA', 'LA', 'P') and img.format == 'PNG'
        
        if img.mode in ('RGBA', 'LA') and not needs_transparency:
            # Only convert to RGB if not PNG or if user explicitly wants JPEG
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[-1])
            else:  # LA
                background.paste(img)
            img = background
        
        # Resize if too large
        if img.width > max_size[0] or img.height > max_size[1]:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Prepare output
        output = io.BytesIO()
        save_kwargs = {'optimize': True}
        
        # Determine output format and apply metadata
        if needs_transparency or original_format == 'PNG':
            # Keep as PNG to preserve transparency and PNG-specific metadata
            save_kwargs.update({
                'format': 'PNG',
                'compress_level': 6  # Good compression without quality loss
            })
            if pnginfo:
                save_kwargs['pnginfo'] = pnginfo
        else:
            # Save as JPEG with EXIF
            save_kwargs.update({
                'format': 'JPEG',
                'quality': quality
            })
            if exif_bytes:
                save_kwargs['exif'] = exif_bytes
        
        img.save(output, **save_kwargs)
        output.seek(0)
        
        print(f"✅ Image optimized: {original_format} → {save_kwargs['format']}, metadata preserved")
        return output
        
    except Exception as e:
        print(f"❌ Image optimization error: {e}")
        # Reset file stream and return original
        file_stream.seek(original_position)
        return file_stream

def create_thumbnail_with_metadata(original_path, thumb_size=(400, 400)):
    """
    Create thumbnail preserving ALL metadata
    """
    try:
        # Create thumbnail directory
        thumb_dir = original_path.replace('/uploads/', '/thumbnails/')
        os.makedirs(os.path.dirname(thumb_dir), exist_ok=True)
        
        # Skip if thumbnail exists
        if os.path.exists(thumb_dir):
            return thumb_dir
            
        img = Image.open(original_path)
        original_format = img.format
        
        # Extract metadata from original
        exif_bytes, pnginfo = extract_all_metadata(img)
        
        # Handle transparency
        needs_transparency = img.mode in ('RGBA', 'LA', 'P') and original_format == 'PNG'
        
        if img.mode in ('RGBA', 'LA') and not needs_transparency:
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[-1])
            else:
                background.paste(img)
            img = background
            
        # Create thumbnail
        img.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        
        # Save with metadata
        save_kwargs = {'optimize': True}
        
        if needs_transparency or original_format == 'PNG':
            save_kwargs.update({
                'format': 'PNG',
                'compress_level': 6
            })
            if pnginfo:
                save_kwargs['pnginfo'] = pnginfo
        else:
            save_kwargs.update({
                'format': 'JPEG',
                'quality': 85
            })
            if exif_bytes:
                save_kwargs['exif'] = exif_bytes
        
        img.save(thumb_dir, **save_kwargs)
        print(f"✅ Thumbnail created with metadata: {thumb_dir}")
        
        return thumb_dir
        
    except Exception as e:
        print(f"❌ Thumbnail creation error: {e}")
        return None

def ensure_thumbnails_exist():
    """Generate thumbnails for existing images"""
    import glob
    uploads = glob.glob('static/uploads/*')
    
    for upload in uploads:
        if any(upload.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
            create_thumbnail_with_metadata(upload)

# Backward compatibility aliases - to avoid import errors
def optimize_image(file_stream, max_size=MAX_IMAGE_SIZE, quality=IMAGE_QUALITY):
    """Backward compatibility - redirects to optimize_image_with_metadata"""
    return optimize_image_with_metadata(file_stream, max_size, quality)

def create_thumbnail(original_path, thumb_size=(400, 400)):
    """Backward compatibility - redirects to create_thumbnail_with_metadata"""
    return create_thumbnail_with_metadata(original_path, thumb_size)