import os
import ssl
import yaml
import pyexasol
from timeline.config import get_logger

log = get_logger()

CONNECTIONS_FILE = os.path.join(os.path.dirname(__file__), "..", "connections.yaml")

_active_index = None

DEFAULT_PORT = 8563


def _ensure_file():
    """Create connections.yaml with empty list if it doesn't exist."""
    if not os.path.exists(CONNECTIONS_FILE):
        save_connections([])


def load_connections():
    """Read connections from YAML file, return list of dicts."""
    _ensure_file()
    with open(CONNECTIONS_FILE, "r") as f:
        data = yaml.safe_load(f) or {}
    return data.get("connections", [])


def save_connections(conns):
    """Write connections list to YAML file."""
    with open(CONNECTIONS_FILE, "w") as f:
        yaml.dump({"connections": conns}, f, default_flow_style=False)


def get_active():
    """Return (index, connection_dict) of the active connection, or (None, None)."""
    global _active_index
    conns = load_connections()
    if _active_index is not None and _active_index < len(conns):
        return _active_index, conns[_active_index]
    return None, None


def set_active(index):
    """Set the active connection index. Returns the connection dict."""
    global _active_index
    conns = load_connections()
    if index < 0 or index >= len(conns):
        raise IndexError(f"Connection index {index} out of range")
    _active_index = index
    log.info("Switched active connection to [%d] %s", index, conns[index].get("name", "unnamed"))
    return conns[index]


def _is_nocertcheck(fp):
    return (fp or "").strip().lower() == "nocertcheck"


def build_dsn(conn):
    """Build a pyexasol DSN string from a connection dict.

    Fingerprint hashes are embedded in the DSN: host/FINGERPRINT:port
    nocertcheck is NOT embedded (unsupported in pyexasol <1.1) — handled via ssl opt.
    """
    host = conn["host"]
    port = conn.get("port", DEFAULT_PORT)
    fp = (conn.get("fingerprint") or "").strip()

    if fp and not _is_nocertcheck(fp):
        return f"{host}/{fp}:{port}"
    return f"{host}:{port}"


def _connect_kwargs(conn):
    """Return (dsn, extra_kwargs) for pyexasol.connect()."""
    dsn = build_dsn(conn)
    extra = {}
    if _is_nocertcheck(conn.get("fingerprint", "")):
        extra["websocket_sslopt"] = {"cert_reqs": ssl.CERT_NONE}
    return dsn, extra


def get_connection_params():
    """Return (dsn, user, password, extra_kwargs) from active connection or env vars."""
    _, conn = get_active()
    if conn:
        dsn, extra = _connect_kwargs(conn)
        return dsn, conn["user"], conn["password"], extra
    # Fallback to environment variables
    return (
        os.environ.get("HOST", "127.0.0.1:8888"),
        os.environ.get("USER", "sys"),
        os.environ.get("PASSWORD", "exasol"),
        {},
    )


def test_connection(conn):
    """Try connecting with the given params. Returns (success, message)."""
    try:
        dsn, extra = _connect_kwargs(conn)
        log.info("Testing connection to %s", dsn)
        c = pyexasol.connect(
            dsn=dsn,
            user=conn["user"],
            password=conn["password"],
            debug=False,
            socket_timeout=10,
            **extra,
        )
        c.execute("SELECT 1")
        c.close()
        return True, "Connection successful"
    except Exception as e:
        return False, str(e)
