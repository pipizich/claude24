from flask import render_template, request, jsonify, url_for, send_file
import os
import uuid
from db import get_db_connection
from image_utils import allowed_file, optimize_image_with_metadata, create_thumbnail_with_metadata
from config import UPLOAD_FOLDER
from utils import validate_image_file, cleanup_old_files

def register_routes(app):
    @app.route('/')
    def index():
        conn = get_db_connection()
        artworks = conn.execute('SELECT * FROM artworks ORDER BY position DESC').fetchall()
        conn.close()
        
        # Process artworks để thêm thumbnail path
        processed_artworks = []
        for artwork in artworks:
            art_dict = dict(artwork)
            filename = art_dict['image_path'].split('/')[-1]
            art_dict['thumbnail_path'] = f"/thumbnail/{filename}"
            processed_artworks.append(art_dict)
            
        return render_template('index.html', artworks=processed_artworks)

    @app.route('/thumbnail/<path:filename>')
    def serve_thumbnail(filename):
        """Serve thumbnail, create if not exists"""
        thumb_path = f"static/thumbnails/{filename}"
        original_path = f"static/uploads/{filename}"
        
        if not os.path.exists(thumb_path) and os.path.exists(original_path):
            create_thumbnail_with_metadata(original_path)
            
        if os.path.exists(thumb_path):
            return send_file(thumb_path)
        else:
            return send_file(original_path)

    @app.route('/add', methods=['POST'])
    def add_artwork():
        try:
            if 'image' not in request.files:
                return jsonify({'success': False, 'message': 'No image selected'}), 400
                
            file = request.files['image']
            if file.filename == '':
                return jsonify({'success': False, 'message': 'No image selected'}), 400
                
            # Validate file
            validation_result = validate_image_file(file)
            if not validation_result['valid']:
                return jsonify({'success': False, 'message': validation_result['message']}), 400
                
            filename = file.filename
            ext = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4()}.{ext}"
            file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            
            # Process and save file with metadata preservation
            if ext != 'svg':
                optimized = optimize_image_with_metadata(file)
                with open(file_path, 'wb') as f:
                    f.write(optimized.read())
            else:
                file.save(file_path)
            
            # Create thumbnail with metadata
            create_thumbnail_with_metadata(file_path)
            
            title = request.form.get('title', '').strip()
            description = request.form.get('description', '').strip()
            if not description:
                description = "No description provided"
            
            conn = get_db_connection()
            max_pos = conn.execute('SELECT MAX(position) FROM artworks').fetchone()[0] or 0
            new_pos = max_pos + 1
            
            # ✅ FIXED: Get the new artwork ID and return artwork data
            cursor = conn.execute(
                'INSERT INTO artworks (title, description, image_path, position) VALUES (?, ?, ?, ?)',
                (title if title else None, description, f"static/uploads/{unique_filename}", new_pos)
            )
            new_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # ✅ FIXED: Return complete artwork data for frontend animation
            artwork_data = {
                'id': new_id,
                'title': title if title else None,
                'description': description,
                'image_path': f"static/uploads/{unique_filename}",
                'thumbnail_path': f"/thumbnail/{unique_filename}",
                'position': new_pos
            }
            
            print(f"✅ Artwork added with metadata preserved: {unique_filename}")
            
            return jsonify({
                'success': True,
                'message': 'Artwork added successfully!',
                'artwork': artwork_data,  # ✅ NEW: Include artwork data
                'redirect': url_for('index')
            })
            
        except Exception as e:
            print(f"❌ Error adding artwork: {e}")
            if 'file_path' in locals() and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass
            return jsonify({'success': False, 'message': f'Failed to add artwork: {str(e)}'}), 500

    @app.route('/edit/<int:id>', methods=['POST'])
    def edit_artwork(id):
        try:
            title = request.form.get('title', '').strip()
            description = request.form.get('description', '').strip()
            if not description:
                description = "No description provided"
            
            conn = get_db_connection()
            artwork = conn.execute('SELECT * FROM artworks WHERE id = ?', (id,)).fetchone()
            
            if not artwork:
                return jsonify({'success': False, 'message': 'Artwork not found'}), 404
            
            new_image_path = None
            new_unique_filename = None
            
            if 'image' in request.files and request.files['image'].filename != '':
                file = request.files['image']
                
                validation_result = validate_image_file(file)
                if not validation_result['valid']:
                    return jsonify({'success': False, 'message': validation_result['message']}), 400
                
                filename = file.filename
                ext = filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{uuid.uuid4()}.{ext}"
                new_unique_filename = unique_filename
                file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                
                # Process with metadata preservation
                if ext != 'svg':
                    optimized = optimize_image_with_metadata(file)
                    with open(file_path, 'wb') as f:
                        f.write(optimized.read())
                else:
                    file.save(file_path)
                    
                create_thumbnail_with_metadata(file_path)
                new_image_path = f"static/uploads/{unique_filename}"
                
                # Cleanup old files
                old_image = artwork['image_path']
                cleanup_old_files(old_image)
                
                conn.execute(
                    'UPDATE artworks SET title = ?, description = ?, image_path = ? WHERE id = ?',
                    (title if title else None, description, new_image_path, id)
                )
                
                print(f"✅ Artwork updated with metadata preserved: {unique_filename}")
            else:
                conn.execute(
                    'UPDATE artworks SET title = ?, description = ? WHERE id = ?',
                    (title if title else None, description, id)
                )
                print(f"✅ Artwork metadata updated: {id}")
            
            conn.commit()
            conn.close()
            
            # ✅ FIXED: Return updated artwork data
            artwork_data = {
                'id': id,
                'title': title if title else None,
                'description': description,
                'image_path': new_image_path if new_image_path else artwork['image_path'],
                'thumbnail_path': f"/thumbnail/{new_unique_filename}" if new_unique_filename else f"/thumbnail/{artwork['image_path'].split('/')[-1]}",
                'position': artwork['position']
            }
            
            return jsonify({
                'success': True,
                'message': 'Artwork updated successfully!',
                'artwork': artwork_data,  # ✅ NEW: Include updated artwork data
                'redirect': url_for('index')
            })
            
        except Exception as e:
            print(f"❌ Error updating artwork: {e}")
            if 'file_path' in locals() and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass
            return jsonify({'success': False, 'message': f'Failed to update artwork: {str(e)}'}), 500

    @app.route('/delete/<int:id>', methods=['POST'])
    def delete_artwork(id):
        try:
            conn = get_db_connection()
            artwork = conn.execute('SELECT * FROM artworks WHERE id = ?', (id,)).fetchone()
            
            if not artwork:
                return jsonify({'success': False, 'message': 'Artwork not found'}), 404
            
            img_path = artwork['image_path']
            cleanup_old_files(img_path)
            
            conn.execute('DELETE FROM artworks WHERE id = ?', (id,))
            conn.commit()
            conn.close()
            
            print(f"✅ Artwork deleted: {id}")
            
            return jsonify({
                'success': True,
                'message': 'Artwork deleted successfully!'
            })
            
        except Exception as e:
            print(f"❌ Error deleting artwork: {e}")
            return jsonify({'success': False, 'message': f'Failed to delete artwork: {str(e)}'}), 500

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('error.html', 
                             error_code=404, 
                             error_message='Resource not found'), 404

    @app.errorhandler(500)
    def internal_error(error):
        return render_template('error.html', 
                             error_code=500, 
                             error_message='Internal server error occurred'), 500