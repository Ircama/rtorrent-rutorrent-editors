# Configuration Editors - Reuse Guide

> **🚀 Live Demo:** Try the editors online at [ircama.github.io/rtorrent-rutorrent-editors](https://ircama.github.io/rtorrent-rutorrent-editors/demo/)
> 
> - [rtorrent Editor Demo](https://ircama.github.io/rtorrent-rutorrent-editors/rtorrent_config_editor.html?demo=1)
> - [ruTorrent Editor Demo](https://ircama.github.io/rtorrent-rutorrent-editors/rutorrent_config_editor.html?demo=1)

This document explains how to reuse `rtorrent_config_editor.html` and `rutorrent_config_editor.html` in other projects.

These editors are highly interactive, feature-rich configuration file editors with:
- **Customized [ACE](https://ace.c9.io/) Editor** for syntax highlighting and code completion
- **Comprehensive tooltips** for all configuration parameters
- **Multi-language support** (English, Italian, German, French, Spanish)
- **Context menus** with snippets and templates
- **Validation** with real-time error detection
- **History management** with restore capability
- **Auto-save** to browser localStorage
- **Keyboard shortcuts** (Ctrl+S, F3, F4, Shift+F3, Enter/ESC in modals)
- **Responsive design** for desktop and mobile devices

---

## Table of Contents

1. [Overview](#overview)
2. [CONFIG Section](#config-section)
3. [AJAX Backend Requirements](#ajax-backend-requirements)
4. [Python Backend Examples](#python-backend-examples)
5. [Utility Functions](#utility-functions)
6. [Customization Guide](#customization-guide)
7. [Integration Checklist](#integration-checklist)
8. [Security Considerations](#security-considerations)

---

## Overview

### rtorrent_config_editor.html

A specialized editor for rtorrent `.rtorrent.rc` configuration files with:
- **Syntax highlighting**
- **650+ rtorrent commands** with autocomplete
- **Context-aware tooltips** explaining each command
- **Validation rules** for rtorrent-specific syntax
- **Template loading** from server
- **Direct file I/O** via AJAX to CGI backend

### rutorrent_config_editor.html

A multi-file editor for ruTorrent configuration with:
- **PHP and INI syntax highlighting** (auto-switched)
- **4 configuration files**: config.php, freetz_config.php, access.ini, plugins.ini
- **180+ ruTorrent parameters** with autocomplete
- **Dynamic file switching** without page reload
- **Context-aware validation** for PHP/INI syntax
- **Template support** for each file type

---

## CONFIG Section

Both editors use a centralized `CONFIG` object for all paths, endpoints, and options.

### rtorrent_config_editor.html CONFIG

```javascript
const CONFIG = {
    // File paths
    paths: {
        templateFile: '/mod/etc/default.rtorrent/rtorrent.rc.template',
        defaultFile: '.rtorrent.rc',
        acceptedExtensions: '.rc,.rtorrent.rc,*'
    },
    
    // AJAX configuration
    ajax: {
        cgiUrl: '/cgi-bin/conf/rtorrent',
        ajaxParam: 'ajax',
        ajaxValue: '1',
        actions: {
            readFile: 'read_file',
            writeFile: 'write_file'
        },
        responseMarker: 'Content-Type: application/json'
    },
    
    // Editor options
    editor: {
        theme: 'ace/theme/monokai',
        mode: 'ace/mode/sh',
        fontSize: '14px',
        tabSize: 4,
        showPrintMargin: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true
    },
    
    // Auto-save configuration
    autoSave: {
        enabled: true,
        intervalMs: 30000,  // 30 seconds
        storageKey: 'rtorrent_config_autosave'
    },
    
    // Validation options
    validation: {
        enabled: true,
        checkOnType: false,
        checkOnSave: false
    }
};
```

### rutorrent_config_editor.html CONFIG

```javascript
const CONFIG = {
    // File paths
    paths: {
        // Base paths for ruTorrent configuration files
        externalBase: '/mod/external/usr/mww/rutorrent/conf',
        standardBase: '/usr/mww/rutorrent/conf',
        
        // File names
        files: {
            config: 'config.php',
            freetzConfig: 'freetz_config.php',
            access: 'access.ini',
            plugins: 'plugins.ini'
        },
        
        // Template suffix
        templateSuffix: '.template',
        
        // Accepted file extensions for upload
        acceptedExtensions: '.php,.ini,*'
    },
    
    // AJAX configuration
    ajax: {
        cgiUrl: '/cgi-bin/conf/rtorrent',
        ajaxParam: 'ajax',
        ajaxValue: '1',
        actions: {
            readFile: 'read_file',
            writeFile: 'write_file'
        },
        responseMarker: 'Content-Type: application/json'
    },
    
    // Editor options
    editor: {
        theme: 'ace/theme/monokai',
        modes: {
            php: 'ace/mode/php',
            ini: 'ace/mode/ini'
        },
        fontSize: '14px',
        tabSize: 4,
        showPrintMargin: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true
    },
    
    // File type to mode mapping
    fileTypes: {
        config: { mode: 'php', extension: '.php' },
        freetz_config: { mode: 'php', extension: '.php' },
        access: { mode: 'ini', extension: '.ini' },
        plugins: { mode: 'ini', extension: '.ini' }
    }
};
```

### Customization

To adapt the editors to your project:

1. **Change paths** in `CONFIG.paths` to match your file locations
2. **Update AJAX endpoint** in `CONFIG.ajax.cgiUrl` to your backend URL
3. **Modify action names** in `CONFIG.ajax.actions` if your backend uses different parameter names
4. **Adjust editor theme/mode** in `CONFIG.editor` to match your file types
5. **Configure auto-save** in `CONFIG.autoSave` (enable/disable, interval, storage key)

---

## AJAX Backend Requirements

The editors expect a specific AJAX response format: **JSON wrapped in HTML**.

### Request Format

**URL Parameters:**
- `ajax=1` - Indicates AJAX mode
- `action=read_file` or `action=write_file` - Operation to perform
- `file=/path/to/file` - File path to read/write
- `content=...` - File content (for write_file only)

**Example Request:**
```
GET /cgi-bin/conf/rtorrent?ajax=1&action=read_file&file=/path/to/.rtorrent.rc
```

### Response Format

**CRITICAL**: The response must be HTML-wrapped JSON with a specific marker.

```html
Content-Type: text/html; charset=UTF-8

<style>
.ajax-json-box { display: none; }
</style>
<div class="ajax-json-box"><div class="ajax-json-content"><pre>Content-Type: application/json

{"success": true, "content": "file content here...", "file": "/path/to/file"}
</pre></div></div>
```

**Why HTML-wrapped?** These editors have been developed for integration with the [freetz-ng](https://github.com/Freetz-NG/freetz-ng) framework. The JavaScript parser:
1. Searches for the marker `Content-Type: application/json`
2. Finds the first `{` after the marker
3. Counts braces to extract complete JSON object
4. Parses the extracted JSON

### Response JSON Schema

**Read File Success:**
```json
{
    "success": true,
    "content": "# rtorrent configuration\n...",
    "file": "/path/to/.rtorrent.rc"
}
```

**Write File Success:**
```json
{
    "success": true,
    "file": "/path/to/.rtorrent.rc",
    "backup": "/path/to/.rtorrent.rc.2026-02-09-14-30-00"
}
```

**Error Response:**
```json
{
    "success": false,
    "error": "File not found: /path/to/.rtorrent.rc"
}
```

OR:

```json
{
    "error": "Access denied: /path/to/sensitive.file"
}
```

---

## Python Backend Examples

### Flask Backend

```python
#!/usr/bin/env python3
from flask import Flask, request, Response
import os
import json
from datetime import datetime
from urllib.parse import unquote

app = Flask(__name__)

# Security: Whitelist of allowed file paths
ALLOWED_PATHS = [
    '/home/user/.rtorrent.rc',
    '/var/media/ftp/rtorrent/.rtorrent.rc',
    '/usr/mww/rutorrent/conf/config.php',
    '/usr/mww/rutorrent/conf/access.ini',
]

ALLOWED_DIRS = [
    '/var/media/ftp/',
    '/home/user/.config/',
]

def is_path_allowed(filepath):
    """Security check: validate file path against whitelist"""
    # Prevent directory traversal
    if '..' in filepath or filepath.startswith('../'):
        return False
    
    # Normalize path
    filepath = os.path.normpath(filepath)
    
    # Check exact matches
    if filepath in ALLOWED_PATHS:
        return True
    
    # Check directory prefixes
    for allowed_dir in ALLOWED_DIRS:
        if filepath.startswith(allowed_dir):
            return True
    
    return False

def wrap_json_response(json_data):
    """Wrap JSON in HTML format expected by editors"""
    json_string = json.dumps(json_data, ensure_ascii=False, indent=2)
    
    html = f"""Content-Type: text/html; charset=UTF-8

<style>
.ajax-json-box {{ display: none; }}
</style>
<div class="ajax-json-box"><div class="ajax-json-content"><pre>Content-Type: application/json

{json_string}
</pre></div></div>"""
    
    return Response(html, mimetype='text/html')

@app.route('/cgi-bin/conf/rtorrent')
def handle_ajax():
    ajax = request.args.get('ajax')
    action = request.args.get('action')
    
    if ajax != '1':
        return "Not an AJAX request", 400
    
    if action == 'read_file':
        return handle_read_file()
    elif action == 'write_file':
        return handle_write_file()
    else:
        return wrap_json_response({
            'error': f'Unknown action: {action}'
        })

def handle_read_file():
    filepath = request.args.get('file')
    
    if not filepath:
        return wrap_json_response({
            'error': 'Missing file parameter'
        })
    
    # Decode URL-encoded path
    filepath = unquote(filepath)
    
    # Security check
    if not is_path_allowed(filepath):
        return wrap_json_response({
            'error': f'Access denied: {filepath}'
        })
    
    # Check file exists
    if not os.path.exists(filepath):
        return wrap_json_response({
            'error': f'File not found: {filepath}'
        })
    
    # Read file
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return wrap_json_response({
            'success': True,
            'content': content,
            'file': filepath
        })
    except Exception as e:
        return wrap_json_response({
            'error': f'Failed to read file: {str(e)}'
        })

def handle_write_file():
    filepath = request.args.get('file')
    content = request.args.get('content', '')
    
    if not filepath:
        return wrap_json_response({
            'error': 'Missing file parameter'
        })
    
    # Decode URL-encoded path and content
    filepath = unquote(filepath)
    content = unquote(content)
    
    # Security check
    if not is_path_allowed(filepath):
        return wrap_json_response({
            'error': f'Access denied: {filepath}'
        })
    
    # Create backup if file exists
    backup_path = None
    if os.path.exists(filepath):
        timestamp = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
        backup_path = f'{filepath}.{timestamp}'
        try:
            import shutil
            shutil.copy2(filepath, backup_path)
        except Exception as e:
            return wrap_json_response({
                'error': f'Failed to create backup: {str(e)}'
            })
    
    # Write file
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        response = {
            'success': True,
            'file': filepath
        }
        
        if backup_path:
            response['backup'] = backup_path
        
        return wrap_json_response(response)
    except Exception as e:
        # Rollback: restore backup if write failed
        if backup_path and os.path.exists(backup_path):
            try:
                import shutil
                shutil.move(backup_path, filepath)
            except:
                pass
        
        return wrap_json_response({
            'error': f'Failed to write file: {str(e)}'
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
```

### CGI Script (Bash)

```bash
#!/bin/sh
# /cgi-bin/conf/rtorrent

# Parse query string
eval $(echo "$QUERY_STRING" | tr '&' '\n' | sed 's/=/="/; s/$/"/;')

# Check AJAX mode
[ "$ajax" != "1" ] && exit 1

# Function to encode JSON string
json_encode() {
    echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/g' | tr -d '\n' | sed 's/\\n$//'
}

# Function to wrap JSON response
wrap_json() {
    cat << EOF
Content-Type: text/html; charset=UTF-8

<style>
.ajax-json-box { display: none; }
</style>
<div class="ajax-json-box"><div class="ajax-json-content"><pre>Content-Type: application/json

$1
</pre></div></div>
EOF
}

# Security: Check file path
is_allowed() {
    case "$1" in
        /var/media/ftp/*/.rtorrent.rc|\
        /home/*/.rtorrent.rc|\
        /usr/mww/rutorrent/conf/*.php|\
        /usr/mww/rutorrent/conf/*.ini|\
        /mod/etc/default.rtorrent/*.template)
            return 0
            ;;
        *../*|*/../*|../*)
            return 1
            ;;
        *)
            return 1
            ;;
    esac
}

# URL decode
urldecode() {
    echo -e "$(echo "$1" | sed 's/+/ /g; s/%\([0-9A-F][0-9A-F]\)/\\x\1/g')"
}

# Decode parameters
FILE=$(urldecode "$file")
CONTENT=$(urldecode "$content")

# Handle actions
case "$action" in
    read_file)
        # Security check
        if ! is_allowed "$FILE"; then
            wrap_json "{\"error\": \"Access denied: $FILE\"}"
            exit 0
        fi
        
        # Check file exists
        if [ ! -f "$FILE" ]; then
            wrap_json "{\"error\": \"File not found: $FILE\"}"
            exit 0
        fi
        
        # Read file and encode JSON
        CONTENT=$(cat "$FILE" | json_encode)
        wrap_json "{\"success\": true, \"content\": \"$CONTENT\", \"file\": \"$FILE\"}"
        ;;
    
    write_file)
        # Security check
        if ! is_allowed "$FILE"; then
            wrap_json "{\"error\": \"Access denied: $FILE\"}"
            exit 0
        fi
        
        # Create backup
        if [ -f "$FILE" ]; then
            TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
            BACKUP="${FILE}.${TIMESTAMP}"
            cp "$FILE" "$BACKUP" 2>/dev/null
        fi
        
        # Write file
        echo "$CONTENT" > "$FILE" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            wrap_json "{\"success\": true, \"file\": \"$FILE\", \"backup\": \"$BACKUP\"}"
        else
            # Rollback on error
            [ -n "$BACKUP" ] && mv "$BACKUP" "$FILE" 2>/dev/null
            wrap_json "{\"error\": \"Failed to write file\"}"
        fi
        ;;
    
    *)
        wrap_json "{\"error\": \"Unknown action: $action\"}"
        ;;
esac

exit 0
```

### FastAPI Backend

```python
#!/usr/bin/env python3
from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from datetime import datetime
from urllib.parse import unquote
from pathlib import Path

app = FastAPI()

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security whitelist
ALLOWED_PATHS = [
    Path('/home/user/.rtorrent.rc'),
    Path('/var/media/ftp/rtorrent/.rtorrent.rc'),
]

ALLOWED_DIRS = [
    Path('/var/media/ftp/'),
    Path('/home/user/.config/'),
]

def is_path_allowed(filepath: str) -> bool:
    """Security check: validate file path"""
    if '..' in filepath:
        return False
    
    path = Path(filepath).resolve()
    
    # Check exact matches
    for allowed in ALLOWED_PATHS:
        if path == allowed:
            return True
    
    # Check directory prefixes
    for allowed_dir in ALLOWED_DIRS:
        try:
            path.relative_to(allowed_dir)
            return True
        except ValueError:
            continue
    
    return False

def wrap_json_response(data: dict) -> Response:
    """Wrap JSON in HTML format"""
    json_string = json.dumps(data, ensure_ascii=False, indent=2)
    
    html = f"""Content-Type: text/html; charset=UTF-8

<style>
.ajax-json-box {{ display: none; }}
</style>
<div class="ajax-json-box"><div class="ajax-json-content"><pre>Content-Type: application/json

{json_string}
</pre></div></div>"""
    
    return Response(content=html, media_type="text/html")

@app.get("/cgi-bin/conf/rtorrent")
async def handle_ajax(
    ajax: str = Query(...),
    action: str = Query(...),
    file: str = Query(None),
    content: str = Query(None)
):
    if ajax != "1":
        return Response("Not AJAX", status_code=400)
    
    if action == "read_file":
        return handle_read_file(file)
    elif action == "write_file":
        return handle_write_file(file, content)
    else:
        return wrap_json_response({"error": f"Unknown action: {action}"})

def handle_read_file(filepath: str):
    if not filepath:
        return wrap_json_response({"error": "Missing file parameter"})
    
    filepath = unquote(filepath)
    
    if not is_path_allowed(filepath):
        return wrap_json_response({"error": f"Access denied: {filepath}"})
    
    if not os.path.exists(filepath):
        return wrap_json_response({"error": f"File not found: {filepath}"})
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            file_content = f.read()
        
        return wrap_json_response({
            "success": True,
            "content": file_content,
            "file": filepath
        })
    except Exception as e:
        return wrap_json_response({"error": f"Read failed: {str(e)}"})

def handle_write_file(filepath: str, content: str):
    if not filepath:
        return wrap_json_response({"error": "Missing file parameter"})
    
    filepath = unquote(filepath)
    content = unquote(content) if content else ""
    
    if not is_path_allowed(filepath):
        return wrap_json_response({"error": f"Access denied: {filepath}"})
    
    backup_path = None
    if os.path.exists(filepath):
        timestamp = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
        backup_path = f'{filepath}.{timestamp}'
        try:
            import shutil
            shutil.copy2(filepath, backup_path)
        except Exception as e:
            return wrap_json_response({"error": f"Backup failed: {str(e)}"})
    
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        result = {"success": True, "file": filepath}
        if backup_path:
            result["backup"] = backup_path
        
        return wrap_json_response(result)
    except Exception as e:
        if backup_path and os.path.exists(backup_path):
            import shutil
            shutil.move(backup_path, filepath)
        
        return wrap_json_response({"error": f"Write failed: {str(e)}"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

---

## Utility Functions

Both editors include these utility functions for AJAX communication:

### parseAjaxResponse(text)

Extracts JSON from HTML-wrapped response.

```javascript
function parseAjaxResponse(text) {
    const marker = CONFIG.ajax.responseMarker; // 'Content-Type: application/json'
    const markerPos = text.indexOf(marker);
    
    if (markerPos === -1) {
        throw new Error(`Marker "${marker}" not found in response`);
    }
    
    const searchStart = markerPos + marker.length;
    const firstBrace = text.indexOf('{', searchStart);
    
    if (firstBrace === -1) {
        throw new Error('No JSON object found after marker');
    }
    
    // Count braces to find complete JSON object
    let braceCount = 0;
    let jsonEnd = -1;
    
    for (let i = firstBrace; i < text.length; i++) {
        if (text[i] === '{') braceCount++;
        else if (text[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                jsonEnd = i + 1;
                break;
            }
        }
    }
    
    if (jsonEnd === -1) {
        throw new Error('Incomplete JSON in response');
    }
    
    const jsonText = text.substring(firstBrace, jsonEnd);
    return JSON.parse(jsonText);
}
```

**Usage:**
```javascript
const response = await fetch('/cgi-bin/conf/rtorrent?ajax=1&action=read_file&file=/path/to/file');
const text = await response.text();
const data = parseAjaxResponse(text);

if (data.success) {
    console.log('File content:', data.content);
} else {
    console.error('Error:', data.error);
}
```

### ajaxRequest(action, params)

Generic AJAX request wrapper using CONFIG.

```javascript
async function ajaxRequest(action, params = {}) {
    const url = CONFIG.ajax.cgiUrl;
    const urlParams = new URLSearchParams({
        [CONFIG.ajax.ajaxParam]: CONFIG.ajax.ajaxValue,
        action: action,
        ...params
    });
    
    const response = await fetch(`${url}?${urlParams.toString()}`);
    const text = await response.text();
    
    return parseAjaxResponse(text);
}
```

**Usage:**
```javascript
// Read file
const data = await ajaxRequest('read_file', { file: '/path/to/.rtorrent.rc' });

// Write file
const result = await ajaxRequest('write_file', {
    file: '/path/to/.rtorrent.rc',
    content: 'new content here'
});
```

### readFileFromServer(filePath)

Convenience function for reading files.

```javascript
async function readFileFromServer(filePath) {
    return await ajaxRequest(CONFIG.ajax.actions.readFile, { file: filePath });
}
```

**Usage:**
```javascript
try {
    const data = await readFileFromServer('/path/to/.rtorrent.rc');
    if (data.success) {
        editor.setValue(data.content);
    } else {
        console.error(data.error);
    }
} catch (err) {
    console.error('Failed to read file:', err);
}
```

### writeFileToServer(filePath, content)

Convenience function for writing files.

```javascript
async function writeFileToServer(filePath, content) {
    return await ajaxRequest(CONFIG.ajax.actions.writeFile, {
        file: filePath,
        content: content
    });
}
```

**Usage:**
```javascript
try {
    const content = editor.getValue();
    const result = await writeFileToServer('/path/to/.rtorrent.rc', content);
    if (result.success) {
        console.log('File saved:', result.file);
        if (result.backup) {
            console.log('Backup created:', result.backup);
        }
    } else {
        console.error(result.error);
    }
} catch (err) {
    console.error('Failed to save file:', err);
}
```

---

## Customization Guide

### 1. Change Backend URL

```javascript
// In CONFIG section
ajax: {
    cgiUrl: '/api/config',  // Change this
    // ... rest unchanged
}
```

### 2. Change Action Names

If your backend uses different parameter names:

```javascript
ajax: {
    cgiUrl: '/api/files',
    ajaxParam: 'mode',      // Instead of 'ajax'
    ajaxValue: 'json',      // Instead of '1'
    actions: {
        readFile: 'load',   // Instead of 'read_file'
        writeFile: 'save'   // Instead of 'write_file'
    },
    responseMarker: 'Content-Type: application/json'
}
```

### 3. Use Plain JSON (No HTML Wrapper)

If you want to use plain JSON responses instead of HTML-wrapped:

**Replace `parseAjaxResponse()` function:**

```javascript
function parseAjaxResponse(text) {
    // Simple JSON parsing
    return JSON.parse(text);
}
```

**Update backend to return:**

```python
@app.route('/api/files')
def handle_request():
    # ... your logic ...
    return jsonify({
        'success': True,
        'content': file_content,
        'file': filepath
    })
```

### 4. Add More File Types (rutorrent_config_editor.html)

```javascript
paths: {
    // Add your files
    files: {
        config: 'config.php',
        myCustom: 'custom.conf',    // Add this
        // ...
    }
},

fileTypes: {
    config: { mode: 'php', extension: '.php' },
    myCustom: { mode: 'ini', extension: '.conf' },  // Add this
    // ...
}
```

**Update HTML select:**

```html
<select id="fileType" onchange="switchFile(this.value)">
    <option value="config">config.php</option>
    <option value="myCustom">custom.conf</option>
</select>
```

### 5. Customize Editor Theme/Mode

```javascript
editor: {
    theme: 'ace/theme/twilight',        // Dark theme
    mode: 'ace/mode/javascript',        // JS syntax
    fontSize: '16px',                   // Larger font
    tabSize: 2,                         // 2-space tabs
    showPrintMargin: true,              // Show margin at 80 chars
    // ...
}
```

**Available themes:**
- `ace/theme/monokai` (dark)
- `ace/theme/twilight` (dark)
- `ace/theme/github` (light)
- `ace/theme/solarized_dark`
- `ace/theme/solarized_light`

**Available modes:**
- `ace/mode/sh` (shell/bash)
- `ace/mode/php`
- `ace/mode/ini`
- `ace/mode/javascript`
- `ace/mode/python`
- `ace/mode/yaml`
- `ace/mode/json`

### 6. Disable Auto-Save

```javascript
autoSave: {
    enabled: false,  // Disable auto-save
    // ...
}
```

### 7. Change Translation

All UI text is in the `translations` object:

```javascript
const translations = {
    en: {
        toolbarTitle: "My Custom Editor",
        btnSave: "Save Configuration",
        // ... customize all strings
    },
    // Add more languages
    pt: {
        toolbarTitle: "Meu Editor Personalizado",
        btnSave: "Salvar Configuração",
    }
};
```

---

## Integration Checklist

### For rtorrent_config_editor.html

- [ ] **Deploy editor HTML** to your web server
- [ ] **Configure CONFIG.paths** with your file locations
- [ ] **Set CONFIG.ajax.cgiUrl** to your backend endpoint
- [ ] **Implement backend** with read_file/write_file actions
- [ ] **Test read operation** - load file in editor
- [ ] **Test write operation** - save changes via editor
- [ ] **Verify backup creation** - check `.YYYY-MM-DD-HH-MM-SS` files
- [ ] **Test template loading** (if used)
- [ ] **Verify security whitelist** in backend
- [ ] **Test keyboard shortcuts** (Ctrl+S, F3, F4, ESC, Enter)
- [ ] **Check mobile responsiveness**
- [ ] **Test all languages** (if multi-lingual)

### For rutorrent_config_editor.html

- [ ] **Deploy editor HTML** to your web server
- [ ] **Configure CONFIG.paths** with base paths and file names
- [ ] **Set CONFIG.ajax.cgiUrl** to your backend endpoint
- [ ] **Implement backend** with file I/O for all 4 file types
- [ ] **Test file switching** - switch between config/access/plugins
- [ ] **Test syntax highlighting** - verify PHP/INI modes switch correctly
- [ ] **Verify templates** for each file type
- [ ] **Test auto-detection** of external vs standard paths
- [ ] **Check validation** for PHP and INI syntax
- [ ] **Test tooltips** for ruTorrent parameters
- [ ] **Verify security** for all file paths

---

## Security Considerations

### 1. Path Traversal Prevention

**Always validate file paths** to prevent `../../../etc/passwd` attacks:

```python
def is_path_allowed(filepath):
    # Reject paths with '..'
    if '..' in filepath or filepath.startswith('../'):
        return False
    
    # Normalize and check
    filepath = os.path.normpath(filepath)
    
    # Whitelist approach
    allowed_dirs = ['/var/media/ftp/', '/home/user/.config/']
    return any(filepath.startswith(d) for d in allowed_dirs)
```

### 2. File Type Validation

**Restrict file extensions:**

```python
ALLOWED_EXTENSIONS = ['.rc', '.php', '.ini', '.conf']

def is_extension_allowed(filepath):
    ext = os.path.splitext(filepath)[1]
    return ext in ALLOWED_EXTENSIONS
```

### 3. Content Sanitization

**For PHP/INI files, consider validating syntax:**

```python
import configparser

def validate_ini(content):
    try:
        config = configparser.ConfigParser()
        config.read_string(content)
        return True
    except:
        return False
```

### 4. Authentication

**Add authentication to your backend:**

```python
from functools import wraps
from flask import request, abort

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_credentials(auth.username, auth.password):
            abort(401)
        return f(*args, **kwargs)
    return decorated

@app.route('/cgi-bin/conf/rtorrent')
@require_auth
def handle_ajax():
    # ... your handler
```

### 5. File Size Limits

**Prevent huge file uploads:**

```python
MAX_FILE_SIZE = 1024 * 1024  # 1 MB

def handle_write_file(filepath, content):
    if len(content.encode('utf-8')) > MAX_FILE_SIZE:
        return wrap_json_response({
            'error': 'File too large (max 1 MB)'
        })
    # ... rest of handler
```

### 6. Rate Limiting

**Prevent abuse with rate limiting:**

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

@app.route('/cgi-bin/conf/rtorrent')
@limiter.limit("10 per minute")
def handle_ajax():
    # ... your handler
```

### 7. HTTPS Only

**Always use HTTPS in production:**

```python
@app.before_request
def require_https():
    if not request.is_secure and app.env != 'development':
        return redirect(request.url.replace('http://', 'https://'))
```

---

## Advanced Features

### Auto-Save to Browser localStorage

The editors automatically save to browser storage every 30 seconds:

```javascript
// Auto-save configuration
autoSave: {
    enabled: true,
    intervalMs: 30000,
    storageKey: 'rtorrent_config_autosave'
}

// Restore from auto-save
function restoreAutoSave() {
    const saved = localStorage.getItem(CONFIG.autoSave.storageKey);
    if (saved) {
        editor.setValue(saved, -1);
    }
}
```

### Context Menu with Snippets

Right-click in editor for context menu with:
- Copy/Cut/Paste
- Insert watch directory
- Insert schedule
- Configure logging
- SCGI/XMLRPC setup
- And more...

### Validation with Error Markers

The editors validate configuration syntax and show error markers:

```javascript
// Example: Validate rtorrent.rc
function validateConfig() {
    const content = editor.getValue();
    const lines = content.split('\n');
    const errors = [];
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (trimmed.startsWith('#') || trimmed === '') return;
        
        // Check for '=' operator
        if (!trimmed.includes('=')) {
            errors.push({
                row: index,
                column: 0,
                text: "Command is missing the '=' operator",
                type: "error"
            });
        }
    });
    
    // Add error markers to editor
    editor.session.setAnnotations(errors);
}
```

### Keyboard Shortcuts

- **Ctrl+S** (Cmd+S on Mac): Save file
- **F4**: Open find dialog
- **F3**: Find next
- **Shift+F3**: Find previous
- **Enter** in modal: Confirm action
- **ESC** in modal: Cancel action
- **ESC** in editor: Close context menu

---

## Troubleshooting

### Issue: AJAX 404 Error

**Problem:** `GET /cgi-bin/conf/rtorrent 404 (Not Found)`

**Solution:**
1. Check `CONFIG.ajax.cgiUrl` matches your backend URL
2. Verify backend is running
3. Check web server routing configuration

### Issue: JSON Parse Error

**Problem:** `SyntaxError: Unexpected token < in JSON`

**Solution:**
1. Verify backend returns HTML-wrapped JSON with correct marker
2. Check `parseAjaxResponse()` function is unchanged
3. Inspect actual response in browser DevTools Network tab

### Issue: Empty Editor on Load

**Problem:** Editor shows blank when loading file

**Solution:**
1. Check browser console for errors
2. Verify file path in `CONFIG.paths.defaultFile`
3. Check backend returns `{success: true, content: "..."}`
4. Test backend directly with curl/wget

### Issue: Save Doesn't Work

**Problem:** Clicking Save button does nothing

**Solution:**
1. Check browser console for JavaScript errors
2. Verify `CONFIG.ajax.actions.writeFile` action name
3. Check backend implements write handler
4. Verify file permissions on server

### Issue: Tooltips Don't Show

**Problem:** Hovering over parameters shows no tooltip

**Solution:**
1. Check `configDocs` object contains parameter definitions
2. Verify tooltip CSS is not hidden
3. Try different browser (some block position:fixed)

---

## Examples

### Minimal HTML File

Simplest possible integration:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Config Editor</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.23.4/ace.js"></script>
</head>
<body>
    <div id="editor" style="height: 600px;"></div>
    <button onclick="save()">Save</button>
    
    <script>
        // CONFIG
        const CONFIG = {
            paths: { defaultFile: '/path/to/config' },
            ajax: {
                cgiUrl: '/api/files',
                ajaxParam: 'ajax',
                ajaxValue: '1',
                actions: { readFile: 'read_file', writeFile: 'write_file' },
                responseMarker: 'Content-Type: application/json'
            }
        };
        
        // Initialize editor
        const editor = ace.edit("editor");
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode("ace/mode/sh");
        
        // Utility functions
        function parseAjaxResponse(text) {
            const marker = CONFIG.ajax.responseMarker;
            const markerPos = text.indexOf(marker);
            if (markerPos === -1) throw new Error('Marker not found');
            const firstBrace = text.indexOf('{', markerPos + marker.length);
            let braceCount = 0, jsonEnd = -1;
            for (let i = firstBrace; i < text.length; i++) {
                if (text[i] === '{') braceCount++;
                else if (text[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) { jsonEnd = i + 1; break; }
                }
            }
            return JSON.parse(text.substring(firstBrace, jsonEnd));
        }
        
        async function ajaxRequest(action, params) {
            const url = CONFIG.ajax.cgiUrl;
            const urlParams = new URLSearchParams({
                [CONFIG.ajax.ajaxParam]: CONFIG.ajax.ajaxValue,
                action, ...params
            });
            const response = await fetch(`${url}?${urlParams}`);
            return parseAjaxResponse(await response.text());
        }
        
        // Load file
        async function load() {
            const data = await ajaxRequest('read_file', {
                file: CONFIG.paths.defaultFile
            });
            if (data.success) editor.setValue(data.content);
        }
        
        // Save file
        async function save() {
            const data = await ajaxRequest('write_file', {
                file: CONFIG.paths.defaultFile,
                content: editor.getValue()
            });
            if (data.success) alert('Saved!');
        }
        
        // Auto-load on page load
        load();
    </script>
</body>
</html>
```

### Usage with Static Files

If backend serves static configuration files:

```javascript
// Simple fetch for read
async function loadFileFromServer() {
    const response = await fetch('/static/configs/rtorrent.rc');
    const content = await response.text();
    editor.setValue(content);
}

// Use download for "save" (download to user's computer)
function saveFileToServer() {
    const content = editor.getValue();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rtorrent.rc';
    a.click();
    URL.revokeObjectURL(url);
}
```

---

## License

This project is licensed under the **European Union Public License 1.2 (EUPL-1.2)**.

See the [LICENSE](LICENSE) file for full license text.

---

## Credits

- **ACE Editor**: Ajax.org Cloud9 Editor (https://ace.c9.io/)
