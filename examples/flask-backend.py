#!/usr/bin/env python3
"""
Flask Backend Example for rtorrent/ruTorrent Config Editors

This example demonstrates a complete Flask backend implementation
with proper security, file validation, and backup functionality.

Installation:
    pip install flask

Usage:
    python flask-backend.py

Then access editors at:
    http://localhost:5000/rtorrent_config_editor.html
    http://localhost:5000/rutorrent_config_editor.html
"""

from flask import Flask, request, send_from_directory, jsonify
import os
import json
from datetime import datetime
from typing import Optional, Dict, Any

app = Flask(__name__)

# Configuration
CONFIG = {
    'BASE_DIR': os.path.join(os.path.expanduser('~'), 'rtorrent'),
    'ALLOWED_PATHS': [
        '/var/media/ftp',
        os.path.join(os.path.expanduser('~'), 'rtorrent'),
        '/tmp'
    ],
    'ALLOWED_EXTENSIONS': ['.rc', '.php', '.ini', '.conf', '.template'],
    'MAX_FILE_SIZE': 1024 * 1024,  # 1MB
    'CREATE_BACKUPS': True
}


def wrap_json_response(data: Dict[str, Any]) -> str:
    """Wrap JSON in HTML format expected by editors"""
    json_str = json.dumps(data, indent=2)
    
    return f"""Content-Type: text/html; charset=UTF-8

<style>
.ajax-json-box {{ display: none; }}
</style>
<div class="ajax-json-box"><div class="ajax-json-content"><pre>Content-Type: application/json

{json_str}
</pre></div></div>"""


def is_path_allowed(file_path: str) -> bool:
    """Check if file path is in allowed directories"""
    # Resolve to absolute path
    abs_path = os.path.abspath(file_path)
    
    # Check against allowed paths
    for allowed in CONFIG['ALLOWED_PATHS']:
        if abs_path.startswith(os.path.abspath(allowed)):
            return True
    
    return False


def has_valid_extension(file_path: str) -> bool:
    """Check if file has allowed extension"""
    _, ext = os.path.splitext(file_path)
    return ext in CONFIG['ALLOWED_EXTENSIONS'] or file_path.endswith('.rtorrent.rc')


def create_backup(file_path: str) -> Optional[str]:
    """Create timestamped backup of existing file"""
    if not CONFIG['CREATE_BACKUPS'] or not os.path.exists(file_path):
        return None
    
    timestamp = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
    backup_path = f"{file_path}.{timestamp}"
    
    try:
        with open(file_path, 'r') as src:
            with open(backup_path, 'w') as dst:
                dst.write(src.read())
        return backup_path
    except Exception as e:
        print(f"Backup failed: {e}")
        return None


@app.route('/')
def index():
    """Serve landing page"""
    return """
    <html>
    <head><title>rtorrent/ruTorrent Config Editors</title></head>
    <body>
        <h1>rtorrent/ruTorrent Config Editors</h1>
        <ul>
            <li><a href="/rtorrent_config_editor.html">rtorrent Editor</a></li>
            <li><a href="/rutorrent_config_editor.html">ruTorrent Editor</a></li>
        </ul>
    </body>
    </html>
    """


@app.route('/<path:filename>')
def serve_static(filename):
    """Serve HTML editor files"""
    return send_from_directory('.', filename)


@app.route('/cgi-bin/conf/rtorrent', methods=['GET', 'POST'])
@app.route('/cgi-bin/conf/rutorrent', methods=['GET', 'POST'])
def ajax_handler():
    """Handle AJAX requests from editors"""
    
    # Check if AJAX mode
    if request.args.get('ajax') != '1':
        return 'Not AJAX request', 400
    
    action = request.args.get('action')
    file_path = request.args.get('file')
    
    # Validate action
    if not action:
        return wrap_json_response({'error': 'Missing action parameter'})
    
    if action == 'read_file':
        # Validate file path
        if not file_path:
            return wrap_json_response({'error': 'Missing file parameter'})
        
        # Security checks
        if '..' in file_path:
            return wrap_json_response({'error': 'Directory traversal not allowed'})
        
        if not is_path_allowed(file_path):
            return wrap_json_response({'error': f'Access denied: {file_path}'})
        
        if not has_valid_extension(file_path):
            return wrap_json_response({'error': f'Invalid file type: {file_path}'})
        
        # Read file
        if not os.path.exists(file_path):
            return wrap_json_response({'error': f'File not found: {file_path}'})
        
        if os.path.getsize(file_path) > CONFIG['MAX_FILE_SIZE']:
            return wrap_json_response({'error': 'File too large'})
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return wrap_json_response({
                'success': True,
                'content': content,
                'file': file_path
            })
        except Exception as e:
            return wrap_json_response({'error': f'Failed to read file: {str(e)}'})
    
    elif action == 'write_file':
        content = request.args.get('content', '')
        
        # Validate file path
        if not file_path:
            return wrap_json_response({'error': 'Missing file parameter'})
        
        # Security checks
        if '..' in file_path:
            return wrap_json_response({'error': 'Directory traversal not allowed'})
        
        if not is_path_allowed(file_path):
            return wrap_json_response({'error': f'Access denied: {file_path}'})
        
        if not has_valid_extension(file_path):
            return wrap_json_response({'error': f'Invalid file type: {file_path}'})
        
        # Size check
        if len(content) > CONFIG['MAX_FILE_SIZE']:
            return wrap_json_response({'error': 'Content too large'})
        
        # Create backup if file exists
        backup_path = create_backup(file_path)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Write file
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            response = {
                'success': True,
                'file': file_path
            }
            
            if backup_path:
                response['backup'] = os.path.basename(backup_path)
            
            return wrap_json_response(response)
        except Exception as e:
            # Rollback on failure
            if backup_path and os.path.exists(backup_path):
                try:
                    with open(backup_path, 'r') as src:
                        with open(file_path, 'w') as dst:
                            dst.write(src.read())
                except:
                    pass
            
            return wrap_json_response({'error': f'Failed to write file: {str(e)}'})
    
    else:
        return wrap_json_response({'error': f'Unknown action: {action}'})


if __name__ == '__main__':
    # Ensure base directory exists
    os.makedirs(CONFIG['BASE_DIR'], exist_ok=True)
    
    print(f"""
    Flask Backend for rtorrent/ruTorrent Config Editors
    
    Server starting...
    Base directory: {CONFIG['BASE_DIR']}
    
    Access editors at:
    - http://localhost:5000/rtorrent_config_editor.html
    - http://localhost:5000/rutorrent_config_editor.html
    
    Press Ctrl+C to stop
    """)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
