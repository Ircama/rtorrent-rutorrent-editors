#!/bin/bash
#
# CGI Bash Backend Example for rtorrent/ruTorrent Config Editors
#
# This example demonstrates a simple CGI script implementation in bash.
# Suitable for lightweight deployments with Apache/Lighttpd.
#
# Installation (Apache):
#   1. Copy to /usr/lib/cgi-bin/config-editor.cgi
#   2. chmod +x /usr/lib/cgi-bin/config-editor.cgi
#   3. Ensure Apache has CGI enabled (a2enmod cgi)
#
# Installation (Lighttpd):
#   1. Copy to /usr/lib/cgi-bin/config-editor.cgi
#   2. chmod +x /usr/lib/cgi-bin/config-editor.cgi
#   3. Ensure lighttpd.conf has:
#      server.modules += ( "mod_cgi" )
#      cgi.assign = ( ".cgi" => "" )

# Configuration
BASE_DIR="/var/media/ftp/rtorrent"
MAX_FILE_SIZE=1048576  # 1MB in bytes
CREATE_BACKUPS=1

# Helper function: Wrap JSON in HTML format
wrap_json_response() {
    local json="$1"
    
    cat << EOF
Content-Type: text/html; charset=UTF-8

<style>
.ajax-json-box { display: none; }
</style>
<div class="ajax-json-box"><div class="ajax-json-content"><pre>Content-Type: application/json

$json
</pre></div></div>
EOF
}

# Helper function: Check if path is allowed
is_path_allowed() {
    local file_path="$1"
    
    # Prevent directory traversal
    case "$file_path" in
        *../*|*/../*|../*)
            return 1
            ;;
    esac
    
    # Whitelist allowed paths
    case "$file_path" in
        /var/media/ftp/*|\
        /tmp/*|\
        /mod/etc/default.*/*|\
        /usr/mww/*/conf/*)
            return 0
            ;;
    esac
    
    # Check if under BASE_DIR
    if [[ "$file_path" == "$BASE_DIR"* ]]; then
        return 0
    fi
    
    return 1
}

# Helper function: Check if extension is allowed
has_valid_extension() {
    local file_path="$1"
    
    case "$file_path" in
        *.rc|*.php|*.ini|*.conf|*.template|*/.rtorrent.rc)
            return 0
            ;;
    esac
    
    return 1
}

# Helper function: Create timestamped backup
create_backup() {
    local file_path="$1"
    
    if [ "$CREATE_BACKUPS" != "1" ] || [ ! -f "$file_path" ]; then
        return 0
    fi
    
    local timestamp=$(date +%Y-%m-%d-%H-%M-%S)
    local backup_path="${file_path}.${timestamp}"
    
    if cp "$file_path" "$backup_path" 2>/dev/null; then
        echo "$backup_path"
        return 0
    fi
    
    return 1
}

# Parse CGI parameters
parse_cgi_params() {
    # Read QUERY_STRING or POST data
    if [ "$REQUEST_METHOD" = "POST" ]; then
        read -t 30 QUERY_STRING
    fi
    
    # Parse parameters
    local IFS='&'
    for param_pair in $QUERY_STRING; do
        local key="${param_pair%%=*}"
        local value="${param_pair#*=}"
        
        # URL decode
        value=$(echo "$value" | sed 's/+/ /g' | sed 's/%\([0-9A-F][0-9A-F]\)/\\x\1/g')
        value=$(echo -e "$value")
        
        # Export as variables
        case "$key" in
            ajax)      AJAX="$value" ;;
            action)    ACTION="$value" ;;
            file)      FILE="$value" ;;
            content)   CONTENT="$value" ;;
        esac
    done
}

# Main handler
main() {
    # Parse parameters
    parse_cgi_params
    
    # Check AJAX mode
    if [ "$AJAX" != "1" ]; then
        echo "Content-Type: text/plain"
        echo ""
        echo "Not AJAX request"
        exit 1
    fi
    
    # Handle actions
    case "$ACTION" in
        read_file)
            # Validate file parameter
            if [ -z "$FILE" ]; then
                wrap_json_response '{"error": "Missing file parameter"}'
                exit 0
            fi
            
            # Security checks
            if ! is_path_allowed "$FILE"; then
                wrap_json_response "{\"error\": \"Access denied: $FILE\"}"
                exit 0
            fi
            
            if ! has_valid_extension "$FILE"; then
                wrap_json_response "{\"error\": \"Invalid file type: $FILE\"}"
                exit 0
            fi
            
            # Check file exists
            if [ ! -f "$FILE" ]; then
                wrap_json_response "{\"error\": \"File not found: $FILE\"}"
                exit 0
            fi
            
            # Check file size
            local file_size=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)
            if [ "$file_size" -gt "$MAX_FILE_SIZE" ]; then
                wrap_json_response '{"error": "File too large"}'
                exit 0
            fi
            
            # Read file (escape special characters for JSON)
            local content=$(cat "$FILE" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/\t/\\t/g')
            
            wrap_json_response "{\"success\": true, \"content\": \"$content\", \"file\": \"$FILE\"}"
            ;;
        
        write_file)
            # Validate file parameter
            if [ -z "$FILE" ]; then
                wrap_json_response '{"error": "Missing file parameter"}'
                exit 0
            fi
            
            # Security checks
            if ! is_path_allowed "$FILE"; then
                wrap_json_response "{\"error\": \"Access denied: $FILE\"}"
                exit 0
            fi
            
            if ! has_valid_extension "$FILE"; then
                wrap_json_response "{\"error\": \"Invalid file type: $FILE\"}"
                exit 0
            fi
            
            # Size check
            local content_size=${#CONTENT}
            if [ "$content_size" -gt "$MAX_FILE_SIZE" ]; then
                wrap_json_response '{"error": "Content too large"}'
                exit 0
            fi
            
            # Create backup
            local backup_path=$(create_backup "$FILE")
            local backup_name=""
            if [ -n "$backup_path" ]; then
                backup_name=$(basename "$backup_path")
            fi
            
            # Ensure directory exists
            mkdir -p "$(dirname "$FILE")" 2>/dev/null
            
            # Write file
            if echo "$CONTENT" > "$FILE" 2>/dev/null; then
                if [ -n "$backup_name" ]; then
                    wrap_json_response "{\"success\": true, \"file\": \"$FILE\", \"backup\": \"$backup_name\"}"
                else
                    wrap_json_response "{\"success\": true, \"file\": \"$FILE\"}"
                fi
            else
                # Rollback on failure
                if [ -n "$backup_path" ] && [ -f "$backup_path" ]; then
                    mv "$backup_path" "$FILE" 2>/dev/null
                fi
                
                wrap_json_response '{"error": "Failed to write file"}'
            fi
            ;;
        
        *)
            wrap_json_response "{\"error\": \"Unknown action: $ACTION\"}"
            ;;
    esac
}

# Run main handler
main
