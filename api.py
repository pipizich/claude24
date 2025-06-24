import os
import json
from PIL import Image, ExifTags
from PIL.PngImagePlugin import PngInfo
from flask import request, jsonify
from db import get_db_connection
from image_utils import optimize_image_with_metadata, create_thumbnail_with_metadata

# Remove duplicate functions - use ones from image_utils instead
# preserve_metadata_resize, create_thumbnail_with_metadata - moved to image_utils


def process_uploaded_image(uploaded_file_path, save_path, thumbnail_path=None):
    """
    FIXED: Full upload processing pipeline that properly preserves metadata
    """
    try:
        # If paths are the same, optimize in place
        if uploaded_file_path == save_path:
            # Read original file
            with open(uploaded_file_path, 'rb') as f:
                optimized_stream = optimize_image_with_metadata(f)
                
            # Write back optimized version
            with open(save_path, 'wb') as out_f:
                out_f.write(optimized_stream.read())
        else:
            # Different paths - copy with optimization
            with open(uploaded_file_path, 'rb') as f:
                optimized_stream = optimize_image_with_metadata(f)
                with open(save_path, 'wb') as out_f:
                    out_f.write(optimized_stream.read())

        # Extract metadata AFTER optimization (from the final saved file)
        original_metadata = extract_and_store_metadata_separately(save_path)

        # Create thumbnail using the optimized image
        if thumbnail_path:
            create_thumbnail_with_metadata(save_path)

        print(f"✅ Image processed successfully: {save_path}")
        print(f"📊 Metadata keys preserved: {list(original_metadata.keys())}")
        
        return original_metadata
        
    except Exception as e:
        print(f"❌ Upload processing failed: {e}")
        return {}

def extract_and_store_metadata_separately(image_path):
    """
    IMPROVED: Extract all PNG and EXIF metadata into a flat dict
    """
    try:
        img = Image.open(image_path)
        metadata = {}

        # PNG info - improved handling
        if hasattr(img, 'info') and img.info:
            for key, value in img.info.items():
                try:
                    # Better handling of different value types
                    if isinstance(value, bytes):
                        try:
                            decoded_value = value.decode('utf-8', errors='ignore')
                            metadata[f'png_{key}'] = decoded_value
                        except:
                            metadata[f'png_{key}'] = str(value)
                    elif isinstance(value, (str, int, float)):
                        metadata[f'png_{key}'] = value
                    else:
                        metadata[f'png_{key}'] = str(value)
                except Exception as e:
                    print(f"PNG metadata key {key} error: {e}")

        # EXIF - improved handling
        try:
            exif_obj = img.getexif()
            if exif_obj:
                for tag_id, val in exif_obj.items():
                    tag = ExifTags.TAGS.get(tag_id, f'tag_{tag_id}')
                    try:
                        if isinstance(val, bytes):
                            try:
                                metadata[f'exif_{tag}'] = val.decode('utf-8', errors='ignore')
                            except:
                                metadata[f'exif_{tag}'] = str(val)
                        elif isinstance(val, (str, int, float)):
                            metadata[f'exif_{tag}'] = val
                        else:
                            metadata[f'exif_{tag}'] = str(val)
                    except Exception as e:
                        print(f"EXIF tag {tag} error: {e}")
        except Exception as e:
            print(f"EXIF extraction error: {e}")

        print(f"📊 Extracted {len(metadata)} metadata fields from {image_path}")
        return metadata
        
    except Exception as e:
        print(f"❌ Error extracting metadata from {image_path}: {e}")
        return {}

def extract_ai_metadata(image_path):
    """
    Extract AI-generation-specific metadata from PNG/EXIF.
    """
    print(f"🔍 Extracting metadata from: {image_path}")
    metadata = {}
    try:
        img = Image.open(image_path)
        print(f"📷 Opened: {img.format} {img.width}x{img.height}")

        # PNG parameters
        if img.format == 'PNG' and img.info:
            params = None
            if 'parameters' in img.info:
                params = img.info['parameters']
            for key in ['prompt', 'Prompt', 'Description', 'Comment']:
                if key in img.info:
                    metadata['prompt'] = img.info[key]
            # Try JSON parse first
            if params:
                try:
                    data = json.loads(params)
                    sui = data.get('sui_image_params')
                    if sui:
                        metadata.update({
                            'prompt': sui.get('prompt',''),
                            'negative_prompt': sui.get('negativeprompt',''),
                            'model': sui.get('model',''),
                            'seed': str(sui.get('seed','')),
                            'steps': str(sui.get('steps','')),
                            'cfg_scale': str(sui.get('cfgscale','')),
                            'sampler': sui.get('sampler','')
                        })
                        if 'width' in sui and 'height' in sui:
                            metadata['generation_size'] = f"{sui['width']}x{sui['height']}"
                except json.JSONDecodeError:
                    metadata.update(parse_sd_parameters(params))

        # EXIF tags
        try:
            exif_obj = img.getexif()
            for tid, val in exif_obj.items():
                tag = ExifTags.TAGS.get(tid, tid)
                if tag in ('ImageDescription','UserComment'):
                    text = val.decode('utf-8',errors='ignore') if isinstance(val, bytes) else str(val)
                    metadata.update(parse_sd_parameters(text))
        except:
            pass

        # Always include format/size
        metadata['format'] = img.format
        metadata['size'] = f"{img.width}x{img.height}"

        print(f"✅ Final metadata keys: {list(metadata.keys())}")
        return metadata
    except Exception as e:
        print(f"❌ Error extracting AI metadata: {e}")
        return {}

def parse_sd_parameters(params_text):
    """
    Parse SD WebUI parameter strings into a dict of keys.
    """
    metadata = {}
    if not params_text or not isinstance(params_text, str):
        return metadata

    lines = params_text.strip().split('\n')
    # Prompt before 'Negative prompt:'
    neg = params_text.find('Negative prompt:')
    if neg > 0:
        metadata['prompt'] = params_text[:neg].strip()
    elif lines:
        metadata['prompt'] = lines[0].strip()

    # Negative prompt
    if 'Negative prompt:' in params_text:
        neg_start = neg + len('Negative prompt:')
        neg_end = params_text.find('\n', neg_start) or len(params_text)
        metadata['negative_prompt'] = params_text[neg_start:neg_end].strip()

    # Parameter regex
    import re
    patterns = [
        (r'Steps:\s*(\d+)', 'steps'),
        (r'Sampler:\s*([^,\n]+)', 'sampler'),
        (r'CFG [Ss]cale:\s*([\d.]+)', 'cfg_scale'),
        (r'Seed:\s*(\d+)', 'seed'),
        (r'Model:\s*([^,\n]+)', 'model'),
        (r'Size:\s*(\d+x\d+)', 'generation_size'),
    ]
    for pat, key in patterns:
        m = re.search(pat, params_text)
        if m:
            metadata[key] = m.group(1).strip()
    return metadata

def register_api_routes(app):
    @app.route('/get_description/<int:id>')
    def get_description(id):
        try:
            conn = get_db_connection()
            row = conn.execute('SELECT title, description FROM artworks WHERE id=?',(id,)).fetchone()
            conn.close()
            if row:
                return jsonify({
                    'success':True,
                    'title': row['title'] or 'Untitled',
                    'description': row['description'] or 'No description.'
                })
            return jsonify({'success':False,'message':'Not found'}),404
        except Exception as e:
            return jsonify({'success':False,'message':str(e)}),500

    @app.route('/update-order', methods=['POST'])
    def update_order():
        try:
            data = request.get_json()
            order = data.get('order', [])
            conn = get_db_connection()
            for itm in order:
                conn.execute('UPDATE artworks SET position=? WHERE id=?',
                             (itm['position'], itm['id']))
            conn.commit()
            conn.close()
            return jsonify({'success':True,'message':'Order updated'})
        except Exception as e:
            return jsonify({'success':False,'message':str(e)}),500

    @app.route('/api/search')
    def search_artworks():
        q = request.args.get('q','').strip()
        if not q:
            return jsonify({'success':False,'message':'Query required'}),400
        conn = get_db_connection()
        rows = conn.execute(
            """
            SELECT * FROM artworks
            WHERE title LIKE ? OR description LIKE ?
            ORDER BY position DESC
            """, (f'%{q}%',f'%{q}%')
        ).fetchall()
        conn.close()
        arts=[]
        for r in rows:
            d=dict(r)
            fn=os.path.basename(d['image_path'])
            d['thumbnail_path'] = f"/thumbnail/{fn}"
            arts.append(d)
        return jsonify({'success':True,'count':len(arts),'artworks':arts,'query':q})

    @app.route('/api/health')
    def health_check():
        return jsonify({'status':'healthy','service':'art-gallery'})

    @app.route('/api/artworks')
    def get_filtered_artworks():
        q=request.args.get('q','').lower().strip()
        sort=request.args.get('sort','newest')
        sql='SELECT * FROM artworks WHERE 1=1'
        params=[]
        if q:
            sql+=" AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)"
            params.extend([f'%{q}%',f'%{q}%'])
        if sort=='newest': sql+=' ORDER BY created_at DESC, id DESC'
        elif sort=='oldest': sql+=' ORDER BY created_at ASC, id ASC'
        elif sort=='a-z': sql+=' ORDER BY CASE WHEN title IS NULL OR title="" THEN 1 ELSE 0 END, LOWER(title)'
        elif sort=='z-a': sql+=' ORDER BY CASE WHEN title IS NULL OR title="" THEN 1 ELSE 0 END, LOWER(title) DESC'
        conn=get_db_connection()
        rows=conn.execute(sql,params).fetchall()
        conn.close()
        arts=[]
        for r in rows:
            d=dict(r)
            fn=os.path.basename(d['image_path'])
            d['thumbnail_path']=f"/thumbnail/{fn}"
            arts.append(d)
        return jsonify({'success':True,'count':len(arts),'query':q,'sort':sort,'artworks':arts})

    @app.route('/api/metadata/<int:id>')
    def get_image_metadata(id):
        try:
            conn=get_db_connection()
            row=conn.execute('SELECT image_path FROM artworks WHERE id=?',(id,)).fetchone()
            conn.close()
            if not row:
                return jsonify({'success':False,'message':'Not found'}),404
            path=row['image_path']
            if not os.path.exists(path):
                return jsonify({'success':False,'message':'File missing'}),404
            meta=extract_ai_metadata(path)
            return jsonify({'success':True,'metadata':meta})
        except Exception as e:
            return jsonify({'success':False,'message':str(e)}),500