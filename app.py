# app.py - Updated to include lightbox API routes

from flask import Flask, request, jsonify
from config import SECRET_KEY
from db import init_db, get_db_connection
from routes import register_routes
from api import register_api_routes
from utils import ensure_directories

# Create lightbox API routes inline since we're adding to existing file
def register_lightbox_api_routes(app):
    """
    Register API routes specifically for lightbox inline editing
    Separate from modal editing to avoid conflicts
    """
    
    @app.route('/api/artwork/<int:artwork_id>/update-text', methods=['PATCH'])
    def update_artwork_text(artwork_id):
        """
        Update only title and/or description of an artwork (no image changes)
        Used by lightbox inline editing to avoid conflicts with modal editing
        """
        try:
            # Get JSON data from request
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False, 
                    'message': 'No data provided'
                }), 400
            
            # Validate that we only accept title and description
            allowed_fields = {'title', 'description'}
            provided_fields = set(data.keys())
            
            if not provided_fields.issubset(allowed_fields):
                invalid_fields = provided_fields - allowed_fields
                return jsonify({
                    'success': False,
                    'message': f'Invalid fields: {", ".join(invalid_fields)}. Only title and description are allowed.'
                }), 400
            
            if not provided_fields:
                return jsonify({
                    'success': False,
                    'message': 'No valid fields provided'
                }), 400
            
            # Connect to database
            conn = get_db_connection()
            
            # Check if artwork exists
            artwork = conn.execute(
                'SELECT id, title, description FROM artworks WHERE id = ?', 
                (artwork_id,)
            ).fetchone()
            
            if not artwork:
                conn.close()
                return jsonify({
                    'success': False,
                    'message': 'Artwork not found'
                }), 404
            
            # Prepare update data
            update_fields = []
            update_values = []
            
            if 'title' in data:
                title = data['title'].strip() if data['title'] else None
                # Convert empty strings to None for database
                if title == '':
                    title = None
                update_fields.append('title = ?')
                update_values.append(title)
            
            if 'description' in data:
                description = data['description'].strip() if data['description'] else None
                # Convert empty strings to None for database  
                if description == '':
                    description = None
                update_fields.append('description = ?')
                update_values.append(description)
            
            # Add artwork_id for WHERE clause
            update_values.append(artwork_id)
            
            # Build and execute update query
            update_query = f"UPDATE artworks SET {', '.join(update_fields)} WHERE id = ?"
            
            cursor = conn.execute(update_query, update_values)
            conn.commit()
            
            # Get updated artwork data
            updated_artwork = conn.execute(
                'SELECT id, title, description, image_path FROM artworks WHERE id = ?',
                (artwork_id,)
            ).fetchone()
            
            conn.close()
            
            # Log the update
            updated_fields = list(data.keys())
            print(f"✅ Artwork {artwork_id} text updated via lightbox: {', '.join(updated_fields)}")
            
            # Return success response with updated data
            return jsonify({
                'success': True,
                'message': f'Successfully updated {", ".join(updated_fields)}',
                'artwork': {
                    'id': updated_artwork['id'],
                    'title': updated_artwork['title'],
                    'description': updated_artwork['description'],
                    'image_path': updated_artwork['image_path']
                },
                'updated_fields': updated_fields
            })
            
        except Exception as e:
            print(f"❌ Error updating artwork text via lightbox: {e}")
            return jsonify({
                'success': False,
                'message': f'Failed to update artwork: {str(e)}'
            }), 500
    
    @app.route('/api/artwork/<int:artwork_id>/info', methods=['GET'])  
    def get_artwork_info(artwork_id):
        """
        Get basic artwork information (title, description)
        Used for refreshing lightbox data after updates
        """
        try:
            conn = get_db_connection()
            artwork = conn.execute(
                'SELECT id, title, description, image_path FROM artworks WHERE id = ?',
                (artwork_id,)
            ).fetchone()
            conn.close()
            
            if not artwork:
                return jsonify({
                    'success': False,
                    'message': 'Artwork not found'
                }), 404
            
            return jsonify({
                'success': True,
                'artwork': {
                    'id': artwork['id'],
                    'title': artwork['title'],
                    'description': artwork['description'],
                    'image_path': artwork['image_path']
                }
            })
            
        except Exception as e:
            print(f"❌ Error fetching artwork info: {e}")
            return jsonify({
                'success': False,
                'message': f'Failed to fetch artwork: {str(e)}'
            }), 500

def register_patch_middleware(app):
    """
    Add middleware to handle PATCH request errors gracefully
    """
    
    @app.errorhandler(400)
    def bad_request(error):
        if request.method == 'PATCH':
            return jsonify({
                'success': False,
                'message': 'Bad request: Invalid data format'
            }), 400
        # Return original error for non-PATCH requests
        return error
    
    @app.errorhandler(404) 
    def not_found(error):
        if request.method == 'PATCH':
            return jsonify({
                'success': False,
                'message': 'Resource not found'
            }), 404
        # Return original error for non-PATCH requests  
        return error
    
    @app.errorhandler(500)
    def internal_error(error):
        if request.method == 'PATCH':
            return jsonify({
                'success': False,
                'message': 'Internal server error'
            }), 500
        # Return original error for non-PATCH requests
        return error

app = Flask(__name__)
app.secret_key = SECRET_KEY

# Ensure directories exist
ensure_directories()

# Register all routes
register_routes(app)
register_api_routes(app)
register_lightbox_api_routes(app)  # ✅ NEW: Lightbox-specific API routes
register_patch_middleware(app)     # ✅ NEW: Enhanced error handling for PATCH

# Security headers
@app.after_request
def after_request(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    
    # ✅ NEW: Add CORS headers for PATCH requests
    if request.method == 'PATCH':
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    
    return response

# ✅ NEW: Add OPTIONS handler for PATCH preflight requests
@app.route('/api/artwork/<int:artwork_id>/update-text', methods=['OPTIONS'])
def artwork_update_text_preflight(artwork_id):
    """Handle preflight requests for PATCH"""
    response = jsonify({'status': 'ok'})
    response.headers['Access-Control-Allow-Methods'] = 'PATCH'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

if __name__ == '__main__':
    init_db()
    
    # Generate thumbnails for existing images
    from image_utils import ensure_thumbnails_exist
    ensure_thumbnails_exist()
    
    print("🎨 Art Gallery starting...")
    print("✅ Standard routes registered")
    print("✅ API routes registered") 
    print("✅ Lightbox API routes registered")
    print("✅ Enhanced error handling enabled")
    print("🚀 Ready for inline editing in lightbox!")
    
    app.run(debug=True)