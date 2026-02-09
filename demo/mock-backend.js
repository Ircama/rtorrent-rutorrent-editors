/**
 * Mock Backend for rtorrent/ruTorrent Config Editors Demo
 * 
 * This simulates the AJAX backend without requiring a real server.
 * Intercepts fetch() calls and returns mock data in the expected format.
 */

// Sample configuration files from freetz-ng templates (placeholders replaced with demo values)
const SAMPLE_CONFIGS = {
    '.rtorrent.rc': `#############################################################################
# A minimal rTorrent configuration that provides the basic features
# you want to have in addition to the built-in defaults.
#
# See https://github.com/rakshasa/rtorrent/wiki/CONFIG-Template
# for an up-to-date version.
#############################################################################

# Networking
network.port_range.set = 51413-51413
network.port_random.set = no
network.bind_address.set = 0.0.0.0

## Daemon mode - COMMENTED OUT because rc.rtorrent init script uses
## start-stop-daemon with -b (background) flag, making this redundant.
## Enabling both can cause issues with PID file management.
# system.daemon.set = true

method.insert = cfg.basedir,  private|const|string, (cat,"/var/media/ftp/MediaServer/rtorrent/")
method.insert = cfg.download, private|const|string, (cat,(cfg.basedir),"downloads/")
method.insert = cfg.logs,     private|const|string, (cat,(cfg.basedir),"log/")
method.insert = cfg.logfile,  private|const|string, (cat,(cfg.logs),"rtorrent-",(system.time),".log")
method.insert = cfg.session,  private|const|string, (cat,(cfg.basedir),"session/")
method.insert = cfg.watch,    private|const|string, (cat,(cfg.basedir),"watch/")

## Create instance directories
execute.throw = sh, -c, (cat,\\
    "mkdir -p \\"",(cfg.download),"\\" ",\\
    "\\"",(cfg.logs),"\\" ",\\
    "\\"",(cfg.session),"\\" ",\\
    "\\"",(cfg.watch),"/load\\" ",\\
    "\\"",(cfg.watch),"/start\\" ")

## Tracker-less torrent
dht.mode.set = auto

# Adding public DHT servers for easy bootstrapping
#####schedule2 = dht_node_1, 5, 0, "dht.add_node=router.utorrent.com:6881"
#####schedule2 = dht_node_2, 5, 0, "dht.add_node=dht.transmissionbt.com:6881"
#####schedule2 = dht_node_3, 5, 0, "dht.add_node=router.bitcomet.com:6881"
#####schedule2 = dht_node_4, 5, 0, "dht.add_node=dht.aelitis.com:6881"

# Enable/disable peer exchange for torrents that aren't marked private. Disabled by default. (peer_exchange)
protocol.pex.set = 1

# Set whether the client should try to connect to UDP trackers (It can cause various problems if it's enabled, if you experience any with this option enabled then disable it.)
trackers.use_udp.set = 1

## Peer settings
throttle.max_uploads.set = 30
throttle.max_uploads.global.set = 30
throttle.min_peers.normal.set = 20
throttle.max_peers.normal.set = 40
throttle.min_peers.seed.set = 30
throttle.max_peers.seed.set = 50
trackers.numwant.set = 80
protocol.encryption.set = allow_incoming,try_outgoing,enable_retry

## Limits for file handle resources, this is optimized for
## an 'ulimit' of 1024 (a common default). You MUST leave
## a ceiling of handles reserved for rTorrent's internal needs!
## NOTE: Values reduced for embedded FritzBox devices to prevent
## "Poll::process() event_error" issues with too many open sockets
network.http.max_open.set = 50
network.max_open_files.set = 400
network.max_open_sockets.set = 200

## Memory resource usage
## pieces.memory.max: RAM used for buffering torrent pieces (critical on low-RAM devices)
##   - FritzBox with 64MB RAM: 32M
##   - FritzBox with 128-256MB RAM: 64M (default)
##   - FritzBox with 512MB+ RAM: 128M or higher
##   Too high = OOM crashes, too low = slower performance
pieces.memory.max.set = 64M

## XMLRPC message size limit - only relevant when using ruTorrent or XMLRPC proxy
## Limits response size for operations like d.multicall2 (listing many torrents)
## Can be increased if you manage 1000+ torrents via ruTorrent
## Commented out by default (4M is reasonable for most use cases)
# network.xmlrpc.size_limit.set = 4M

## Basic operational settings (no need to change these)
session.path.set = (cat, (cfg.session))
directory.default.set = (cat, (cfg.download))
log.execute = (cat, (cfg.logs), "execute.log")
#log.xmlrpc = (cat, (cfg.logs), "xmlrpc.log")
execute.nothrow = sh, -c, (cat, "echo >",\\
    (session.path), "rtorrent.pid", " ",(system.pid))

## Other operational settings (check & adapt)
encoding.add = UTF-8
system.umask.set = 0027
system.cwd.set = (directory.default)
network.http.dns_cache_timeout.set = 25
schedule2 = monitor_diskspace, 15, 60, ((close_low_diskspace, 100M))
#pieces.hash.on_completion.set = no
#view.sort_current = seeding, greater=d.ratio=
#keys.layout.set = qwerty

# CURL options to add CA path and to skip TLS verification (for nonofficial SSL trackers)
network.http.capath.set = "/etc/ssl/certs"
#network.http.ssl_verify_host.set = 0
#network.http.ssl_verify_peer.set = 0

## Some additional values and commands
method.insert = system.startup_time, value|const, (system.time)
method.insert = d.data_path, simple,\\
    "if=(d.is_multi_file),\\
        (cat, (d.directory), /),\\
        (cat, (d.directory), /, (d.name))"
method.insert = d.session_file, simple, "cat=(session.path), (d.hash), .torrent"

## Watch directories (add more as you like, but use unique schedule names)
## Add torrent
schedule2 = watch_load, 11, 10, ((load.verbose, (cat, (cfg.watch), "load/*.torrent")))
## Add & download straight away
schedule2 = watch_start, 10, 10, ((load.start_verbose, (cat, (cfg.watch), "start/*.torrent")))

## SCGI for ruTorrent - TCP socket (FritzBox configuration)
## Port 16891 is a high port unlikely to conflict with other services
## Traditional ports are 5000 or 5555, but 16891 avoids conflicts with Flask, Docker, UPnP, etc.
network.scgi.open_port = 127.0.0.1:16891
network.send_buffer.size.set = 16M
network.receive_buffer.size.set = 4M

## Logging:
##   Levels = critical error warn notice info debug
##   Groups = connection_* dht_* peer_* rpc_* storage_* thread_* tracker_* torrent_*
print = (cat, "Logging to ", (cfg.logfile))
log.open_file = "log", (cfg.logfile)

log.add_output = "debug", "log"
#####log.add_output = "storage_debug", "log"
#####log.add_output = "system", "log"
#####log.add_output = "thread_debug", "log"
#####log.add_output = "protocol_storage_errors", "log"
log.add_output = "tracker_dump", "log"
log.add_output = "tracker_events", "log"
log.add_output = "tracker_requests", "log"

# Do not preallocate files on storage (avoiding filling preallocated data with NULL bytes):
#system.file.allocate=0
#system.file.allocate.set = 0

# Download (KB/s)
throttle.global_down.max_rate.set_kb = 870
# Upload (KB/s)
throttle.global_up.max_rate.set_kb   = 100

method.insert=d.down.sequential,value|const,0
method.insert=d.down.sequential.set,value|const,0

### END of rtorrent.rc ###
`,
    
    'config.php': `<?php
	// configuration parameters

	// for snoopy client
	$httpUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
	$httpTimeOut = 30;			// in seconds
	$httpUseGzip = true;
	$httpIP = null;				// IP string. Or null for any.
	$httpProxy = array
	(
		'use'	=> false,
		'proto'	=> 'http',		// 'http' or 'https'
		'host'	=> 'PROXY_HOST_HERE',
		'port'	=> 3128
	);

	// for xmlrpc actions
	$rpcTimeOut = 5;			// in seconds
	$rpcLogCalls = false;
	$rpcLogFaults = true;

	// for php
	$phpUseGzip = false;
	$phpGzipLevel = 2;

	$schedule_rand = 10;			// rand for schedulers start, +0..X seconds

	$do_diagnostic = true;			// Diagnose ruTorrent. Recommended to keep enabled, unless otherwise required.
	$al_diagnostic = true;			// Diagnose auto-loader. Set to "false" to make composer plugins work.

	$log_file = $_ENV['RU_LOG_FILE'] ?? '/tmp/errors.log'; // path to log file (comment or leave blank to disable logging)

	$saveUploadedTorrents = true;		// Save uploaded torrents to profile/torrents directory or not
	$overwriteUploadedTorrents = false;	// Overwrite existing uploaded torrents in profile/torrents directory or make unique name

	$topDirectory = $_ENV['RU_TOP_DIR'] ?? '/';			// Upper available directory. Absolute path with trail slash.
	$forbidUserSettings = false;

	$scgi_port = $_ENV['RU_SCGI_PORT'] ?? 16891;
	$scgi_host = $_ENV['RU_SCGI_HOST'] ?? "127.0.0.1";

	// For web->rtorrent link through unix domain socket
	// (scgi_local in rtorrent conf file), change variables
	// above to something like this:
	//
	// $scgi_port = 0;
	// $scgi_host = "unix:///tmp/rpc.socket";

	$XMLRPCMountPoint = "/RPC2";		// DO NOT DELETE THIS LINE!!! DO NOT COMMENT THIS LINE!!!

	$throttleMaxSpeed = 327625*1024;	// DO NOT EDIT THIS LINE!!! DO NOT COMMENT THIS LINE!!!
	// Can't be greater then 327625*1024 due to limitation in libtorrent ResourceManager::set_max_upload_unchoked function.

	$pathToExternals = array(
		"php"	=> '',			// Something like /usr/bin/php. If empty, will be found in PATH.
		"curl"	=> '',			// Something like /usr/bin/curl. If empty, will be found in PATH.
		"gzip"	=> '',			// Something like /usr/bin/gzip. If empty, will be found in PATH.
		"id"	=> '',			// Something like /usr/bin/id. If empty, will be found in PATH.
		"stat"	=> '',			// Something like /usr/bin/stat. If empty, will be found in PATH.
	);

	$localHostedMode = false;		// Set to true if rTorrent is hosted on the SAME machine as ruTorrent
	
	$cachedPluginLoading = false;		// Set to true to enable rapid cached loading of ruTorrent plugins
										// Required to clear web browser cache when upgrading versions	

	$pluginMinification = true; 	// Stable change to reduce loading times by minimizing JavaScript networked
									// Only recommended to disable when required for debuging purposes

	$localhosts = array(			// list of local interfaces
		"::1",
		"127.0.0.1",
		"localhost",
	);

    getenv("RU_LOCALHOSTS") && $localhosts[] = $_ENV['RU_LOCALHOSTS'];

	$profilePath = $_ENV['RU_PROFILE_PATH'] ?? '../../share';		// Path to user profiles
	$profileMask = $_ENV['RU_PROFILE_MASK'] ?? 0777;			// Mask for files and directory creation in user profiles.
						// Both Webserver and rtorrent users must have read-write access to it.
						// For example, if Webserver and rtorrent users are in the same group then the value may be 0770.

	$tempDirectory = $_ENV['RU_TEMP_DIRECTORY'] ?? null; // Temp directory. Absolute path. If null, then autodetect will be used.

	$canUseXSendFile = false;		// If true then use X-Sendfile feature if it exist

	$locale = "UTF8";

	$enableCSRFCheck = false;		// If true then Origin and Referer will be checked
	$enabledOrigins = array();		// List of enabled domains for CSRF check (only hostnames, without protocols, port etc.).
						// If empty, then will retrieve domain from HTTP_HOST / HTTP_X_FORWARDED_HOST
`,
    
    'freetz_config.php': `<?php
// ruTorrent dynamic configuration for Freetz-NG
// This file is auto-loaded by ruTorrent to configure SCGI connection

// Auto-detect first available USB storage
function autodetect_storage() {
	// Load Freetz config
	$mod_cfg = '/mod/etc/conf/mod.cfg';
	$stor_prefix = 'uStor';
	if (file_exists($mod_cfg)) {
		$lines = file($mod_cfg, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
		foreach ($lines as $line) {
			if (preg_match("/^export MOD_STOR_PREFIX='([^']+)'/", $line, $matches)) {
				$stor_prefix = $matches[1];
				break;
			}
		}
	}
	
	// Try \${stor_prefix}01 first
	$default_path = "/var/media/ftp/{$stor_prefix}01/rtorrent";
	if (is_dir("/var/media/ftp/{$stor_prefix}01")) {
		return $default_path;
	}
	
	// Try to find any mounted USB storage
	$usb_dirs = glob('/var/media/ftp/*', GLOB_ONLYDIR);
	if (!empty($usb_dirs)) {
		return $usb_dirs[0] . '/rtorrent';
	}
	
	// Fallback to tmpfs
	return '/var/tmp/rtorrent';
}

// Read SCGI socket path from rtorrent's active .rtorrent.rc file
$scgi_socket = '/tmp/rpc.socket';  // Default fallback

// Find BASEDIR - try /mod/etc/conf first (user config), then /etc/default (default)
$basedir = '';
$use_home = false;
$config_files = ['/mod/etc/conf/rtorrent.cfg', '/etc/default.rtorrent/rtorrent.cfg'];
foreach ($config_files as $freetz_cfg) {
	if (file_exists($freetz_cfg)) {
		$lines = file($freetz_cfg, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
		foreach ($lines as $line) {
			if (preg_match("/^(export )?RTORRENT_BASEDIR=['\\"]?([^'\\"\\s]+)['\\"]?/", $line, $matches)) {
				$basedir = $matches[2];
			}
			if (preg_match("/^(export )?RUTORRENT_USES_HOME=['\\"]?([^'\\"\\s]+)['\\"]?/", $line, $matches)) {
				if (strtolower($matches[2]) === 'yes') {
					$use_home = true;
				}
			}
		}
		if (!empty($basedir)) {
			break; // Exit loop if BASEDIR found in this config file
		}
	}
}

// If BASEDIR not set or empty, try to auto-detect
if (empty($basedir)) {
	$basedir = autodetect_storage();
}

// Try to read SCGI configuration from .rtorrent.rc in BASEDIR
$rtorrent_rc = $basedir . '/.rtorrent.rc';
$download_dir = $basedir . '/downloads/';  // Default assumption

// Ensure SCGI defaults are always defined (avoid PHP notices that can break JSON output)
$scgi_host = 'unix://' . $scgi_socket;
$scgi_port = 0;

if (file_exists($rtorrent_rc)) {
	$lines = file($rtorrent_rc, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
	foreach ($lines as $line) {
		// Match: network.scgi.open_port = 127.0.0.1:5000 (TCP mode)
		if (preg_match('/^\\s*network\\.scgi\\.open_port\\s*=\\s*(.+)/', $line, $matches)) {
			$tcp_config = trim($matches[1]);
			// Parse host:port
			if (preg_match('/^([^:]+):(\\d+)$/', $tcp_config, $parts)) {
				$scgi_host = $parts[1];
				$scgi_port = (int)$parts[2];
				break;
			}
		}
		// Match: network.scgi.open_local = /path/to/socket (UNIX socket mode)
		if (preg_match('/^\\s*network\\.scgi\\.open_local\\s*=\\s*(.+)/', $line, $matches)) {
			$socket_path = trim($matches[1]);
			// Handle relative paths - if not starting with /, assume /tmp/
			if ($socket_path[0] !== '/') {
				$socket_path = '/tmp/' . $socket_path;
			}
			$scgi_host = 'unix://' . $socket_path;
			$scgi_port = 0;
			break;
		}
		// Match: method.insert = cfg.download, ... (to find download directory)
		if (preg_match('/^\\s*method\\.insert\\s*=\\s*cfg\\.download,\\s*private\\|const\\|string,\\s*\\(cat,\\(cfg\\.basedir\\),"([^"]+)"\\)/', $line, $matches)) {
			$download_subdir = $matches[1];
			$download_dir = $basedir . '/' . ltrim($download_subdir, '/');
		}
	}
}

// Export values for ruTorrent's conf/config.php which reads from $_ENV.
// This avoids relying on the webserver/FastCGI environment propagation.
if (!isset($_ENV['RU_SCGI_HOST']) || $_ENV['RU_SCGI_HOST'] === '') {
	$_ENV['RU_SCGI_HOST'] = $scgi_host;
}
if (!isset($_ENV['RU_SCGI_PORT']) || $_ENV['RU_SCGI_PORT'] === '') {
	$_ENV['RU_SCGI_PORT'] = $scgi_port;
}
if (!isset($_ENV['RU_TOP_DIR']) || $_ENV['RU_TOP_DIR'] === '') {
	if ($use_home) {
		$top_dir = rtrim($basedir, '/') . '/';
	} else {
		$top_dir = rtrim($download_dir, '/') . '/';
	}
	if ($top_dir === '/' || empty($basedir)) {
		$top_dir = '/tmp/';  // Fallback safe directory
	}
	$_ENV['RU_TOP_DIR'] = $top_dir;
}

// Note: $scgi_host and $scgi_port are now set from .rtorrent.rc
// They can be used directly by ruTorrent's config.php
$al_diagnostic = false;

`,
    
    'access.ini': `;; 1
;; ruTorrent permissions.
;; All flags are assumed to be yes by default.

[settings]
showDownloadsPage = yes
showConnectionPage = yes
showBittorentPage = yes
showAdvancedPage = yes

[tabs]
showPluginsTab = yes

[statusbar]
canChangeULRate = yes
canChangeDLRate = yes

[dialogs]
canChangeTorrentProperties = yes
canAddTorrentsWithoutPath = yes
canAddTorrentsWithoutStarting = yes
canAddTorrentsWithResume = yes
canAddTorrentsWithRandomizeHash = yes`,
    
    'plugins.ini': `;; Plugins' permissions.
;; If flag is not found in plugin section, corresponding flag from "default" section is used.
;; If flag is not found in "default" section, it is assumed to be "yes".
;;
;; For setting individual plugin permissions you must write something like that:
;;
;; [ratio]
;; enabled = yes			;; also may be "user-defined", in this case user can control plugin's state from UI
;; canChangeToolbar = yes
;; canChangeMenu = yes
;; canChangeOptions = no
;; canChangeTabs = yes
;; canChangeColumns = yes
;; canChangeStatusBar = yes
;; canChangeCategory = yes
;; canBeShutdowned = yes

[default]
enabled = user-defined
canChangeToolbar = yes
canChangeMenu = yes
canChangeOptions = yes
canChangeTabs = yes
canChangeColumns = yes
canChangeStatusBar = yes
canChangeCategory = yes
canBeShutdowned = yes`
};

// Wrap response in HTML format expected by editors
function wrapJsonResponse(data) {
    const jsonString = JSON.stringify(data, null, 2);
    
    return `Content-Type: text/html; charset=UTF-8

<style>
.ajax-json-box { display: none; }
</style>
<div class="ajax-json-box"><div class="ajax-json-content"><pre>Content-Type: application/json

${jsonString}
</pre></div></div>`;
}

// Get file content from samples
function getFileContent(filePath) {
    // Map file paths to sample configs
    if (filePath === '.rtorrent.rc' || filePath.endsWith('.rtorrent.rc')) {
        return SAMPLE_CONFIGS['.rtorrent.rc'];
    } else if (filePath.includes('config.php')) {
        return SAMPLE_CONFIGS['config.php'];
    } else if (filePath.includes('freetz_config.php')) {
        return SAMPLE_CONFIGS['freetz_config.php'];
    } else if (filePath.includes('access.ini')) {
        return SAMPLE_CONFIGS['access.ini'];
    } else if (filePath.includes('plugins.ini')) {
        return SAMPLE_CONFIGS['plugins.ini'];
    } else if (filePath.includes('.template')) {
        // Return template content (same as regular files in demo)
        if (filePath.includes('rtorrent.rc.template')) {
            return SAMPLE_CONFIGS['.rtorrent.rc'];
        } else if (filePath.includes('config.php.template')) {
            return SAMPLE_CONFIGS['config.php'];
        } else if (filePath.includes('freetz_config.php.template')) {
            return SAMPLE_CONFIGS['freetz_config.php'];
        } else if (filePath.includes('access.ini.template')) {
            return SAMPLE_CONFIGS['access.ini'];
        } else if (filePath.includes('plugins.ini.template')) {
            return SAMPLE_CONFIGS['plugins.ini'];
        }
    }
    
    return null;
}

// Mock localStorage for file persistence in demo
const mockStorage = {};

// Intercept fetch calls
const originalFetch = window.fetch;
window.fetch = async function(url, options) {
    // Check if it's an AJAX call to our mock backend
    if (url.includes('ajax=1')) {
        console.log('Mock Backend: Intercepted AJAX call:', url);
        
        // Parse URL parameters
        const urlObj = new URL(url, window.location.origin);
        const params = new URLSearchParams(urlObj.search);
        
        const action = params.get('action');
        const file = params.get('file');
        const content = params.get('content');
        
        let responseData;
        
        if (action === 'read_file') {
            console.log('Mock Backend: Reading file:', file);
            
            // Get file content from mock storage or samples
            const storedContent = mockStorage[file];
            const sampleContent = getFileContent(file);
            
            if (storedContent !== undefined) {
                responseData = {
                    success: true,
                    content: storedContent,
                    file: file
                };
            } else if (sampleContent !== null) {
                responseData = {
                    success: true,
                    content: sampleContent,
                    file: file
                };
            } else {
                responseData = {
                    success: false,
                    error: 'File not found',
                    file: file
                };
            }
        } else if (action === 'write_file') {
            console.log('Mock Backend: Writing file:', file);
            
            // Store in mock storage
            mockStorage[file] = content;
            
            responseData = {
                success: true,
                file: file
            };
        } else {
            responseData = {
                success: false,
                error: 'Unknown action'
            };
        }
        
        // Wrap response in expected HTML format
        const wrappedResponse = wrapJsonResponse(responseData);
        
        return new Response(wrappedResponse, {
            status: 200,
            statusText: 'OK',
            headers: {
                'Content-Type': 'text/html; charset=UTF-8'
            }
        });
    }
    
    // Not an AJAX call, use original fetch
    return originalFetch.apply(this, arguments);
};

// Demo mode active - banner removed to avoid blocking status bar
// Changes are automatically saved in browser memory (mockStorage)

console.log('Mock Backend loaded! Demo mode active.');

// Trigger load event for editors to auto-load sample files
window.dispatchEvent(new CustomEvent('mockBackendReady'));
