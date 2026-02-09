#!/usr/bin/env python3
"""
FastAPI Backend Example for rtorrent/ruTorrent Config Editors

This example demonstrates a modern FastAPI backend with async support,
automatic API documentation, and robust error handling.

Installation:
    pip install fastapi uvicorn python-multipart

Usage:
    uvicorn fastapi-backend:app --reload --host 0.0.0.0 --port 8000

Or run directly:
    python fastapi-backend.py

API Documentation will be available at:
    http://localhost:8000/docs
"""

from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
import json
from datetime import datetime
from typing import Optional
from pathlib import Path

app = FastAPI(
    title="rtorrent/ruTorrent Config Editors API",
    description="Backend API for configuration editors",
    version="1.0.0"
)

# Configuration
CONFIG = {
    'BASE_DIR': Path.home() / 'rtorrent',
    'ALLOWED_PATHS': [
        Path('/var/media/ftp'),
        Path.home() / 'rtorrent',
        Path('/tmp')
    ],
    'ALLOWED_EXTENSIONS': {'.rc', '.php', '.ini', '.conf', '.template'},
    'MAX_FILE_SIZE': 1024 * 1024,  # 1MB
    'CREATE_BACKUPS': True
}


def wrap_json_response(data: dict) -> str:
    """Wrap JSON in HTML format expected by editors"""
    json_str = json.dumps(data, indent=2)
    
    return f"""Content-Type: text/html; charset=UTF-8

<style>
.ajax-json-box {{ display: none; }}
</style>
<div class="ajax-json-box"><div class="ajax-json-content"><pre>Content-Type: application/json

{json_str}
</pre></div></div>"""


def is_path_allowed(file_path: Path) -> bool:
    """Check if file path is in allowed directories"""
    abs_path = file_path.resolve()
    
    for allowed in CONFIG['ALLOWED_PATHS']:
        try:
            abs_path.relative_to(allowed.resolve())
            return True
        except ValueError:
            continue
    
    return False


def has_valid_extension(file_path: Path) -> bool:
    """Check if file has allowed extension"""
    return (
        file_path.suffix in CONFIG['ALLOWED_EXTENSIONS'] or
        file_path.name.endswith('.rtorrent.rc')
    )


async def create_backup(file_path: Path) -> Optional[str]:
    """Create timestamped backup of existing file"""
    if not CONFIG['CREATE_BACKUPS'] or not file_path.exists():
        return None
    
    timestamp = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
    backup_path = Path(f"{file_path}.{timestamp}")
    
    try:
        backup_path.write_text(file_path.read_text(encoding='utf-8'))
        return str(backup_path)
    except Exception as e:
        print(f"Backup failed: {e}")
        return None


@app.get("/", response_class=HTMLResponse)
async def index():
    """Serve landing page"""
    return """
    <html>
    <head><title>rtorrent/ruTorrent Config Editors</title></head>
    <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto;">
        <h1>🔧 rtorrent/ruTorrent Config Editors</h1>
        <p>FastAPI backend with automatic API documentation</p>
        <ul>
            <li><a href="/rtorrent_config_editor.html">rtorrent Editor</a></li>
            <li><a href="/rutorrent_config_editor.html">ruTorrent Editor</a></li>
            <li><a href="/docs">API Documentation</a></li>
        </ul>
    </body>
    </html>
    """


@app.get("/{filename}")
async def serve_static(filename: str):
    """Serve HTML editor files"""
    file_path = Path(filename)
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")


@app.get("/cgi-bin/conf/{editor}", response_class=HTMLResponse)
async def ajax_handler(
    editor: str,
    ajax: str = Query(None),
    action: str = Query(None),
    file: str = Query(None),
    content: Optional[str] = Query(None)
):
    """
    Handle AJAX requests from editors
    
    - **editor**: rtorrent or rutorrent
    - **ajax**: Must be '1' for AJAX mode
    - **action**: read_file or write_file
    - **file**: Path to configuration file
    - **content**: File content (for write_file action)
    """
    
    # Check AJAX mode
    if ajax != '1':
        raise HTTPException(status_code=400, detail="Not AJAX request")
    
    if not action:
        return wrap_json_response({'error': 'Missing action parameter'})
    
    if action == 'read_file':
        if not file:
            return wrap_json_response({'error': 'Missing file parameter'})
        
        file_path = Path(file)
        
        # Security checks
        if '..' in file:
            return wrap_json_response({'error': 'Directory traversal not allowed'})
        
        if not is_path_allowed(file_path):
            return wrap_json_response({'error': f'Access denied: {file}'})
        
        if not has_valid_extension(file_path):
            return wrap_json_response({'error': f'Invalid file type: {file}'})
        
        # Read file
        if not file_path.exists():
            return wrap_json_response({'error': f'File not found: {file}'})
        
        if file_path.stat().st_size > CONFIG['MAX_FILE_SIZE']:
            return wrap_json_response({'error': 'File too large'})
        
        try:
            content = file_path.read_text(encoding='utf-8')
            return wrap_json_response({
                'success': True,
                'content': content,
                'file': file
            })
        except Exception as e:
            return wrap_json_response({'error': f'Failed to read file: {str(e)}'})
    
    elif action == 'write_file':
        if not file:
            return wrap_json_response({'error': 'Missing file parameter'})
        
        if content is None:
            content = ''
        
        file_path = Path(file)
        
        # Security checks
        if '..' in file:
            return wrap_json_response({'error': 'Directory traversal not allowed'})
        
        if not is_path_allowed(file_path):
            return wrap_json_response({'error': f'Access denied: {file}'})
        
        if not has_valid_extension(file_path):
            return wrap_json_response({'error': f'Invalid file type: {file}'})
        
        # Size check
        if len(content) > CONFIG['MAX_FILE_SIZE']:
            return wrap_json_response({'error': 'Content too large'})
        
        # Create backup
        backup_path = await create_backup(file_path)
        
        # Ensure directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        try:
            file_path.write_text(content, encoding='utf-8')
            
            response = {
                'success': True,
                'file': file
            }
            
            if backup_path:
                response['backup'] = Path(backup_path).name
            
            return wrap_json_response(response)
        except Exception as e:
            # Rollback on failure
            if backup_path:
                try:
                    file_path.write_text(
                        Path(backup_path).read_text(encoding='utf-8')
                    )
                except:
                    pass
            
            return wrap_json_response({'error': f'Failed to write file: {str(e)}'})
    
    else:
        return wrap_json_response({'error': f'Unknown action: {action}'})


if __name__ == '__main__':
    import uvicorn
    
    # Ensure base directory exists
    CONFIG['BASE_DIR'].mkdir(parents=True, exist_ok=True)
    
    print(f"""
    FastAPI Backend for rtorrent/ruTorrent Config Editors
    
    Server starting...
    Base directory: {CONFIG['BASE_DIR']}
    
    Access editors at:
    - http://localhost:8000/rtorrent_config_editor.html
    - http://localhost:8000/rutorrent_config_editor.html
    - http://localhost:8000/docs (API Documentation)
    
    Press Ctrl+C to stop
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
