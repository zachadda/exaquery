import os
import re
import time
from flask import Flask, jsonify, request, abort
from flask_cors import CORS
from flask_caching import Cache
import pyexasol
from timeline.config import load_config, get_logger
from timeline.query_generator import gen_export, process_resultset, get_jinja_environment


DEFAULT_TIME = 3600
DEFAULT_GRANULARITY = 150
DEFAULT_THRESHOLD = 10
CONFIG_PATH = "config/"

MAX_SEARCH_LEN = 200
BOX_ID_PATTERN = re.compile(r"^[A-Z_]+_[0-9]+_[0-9]+$")
SQL_META_CHARS = re.compile(r"['\";]|--|/\*")


def sanitize_search(q: str) -> str:
    """Strip SQL meta-characters and enforce max length."""
    q = SQL_META_CHARS.sub("", q)
    return q[:MAX_SEARCH_LEN]


def validate_box_id(box_id: str) -> str:
    """Validate box_id matches expected format or abort 400."""
    if not box_id or not BOX_ID_PATTERN.match(box_id):
        abort(400, description="Invalid box_id format")
    return box_id

app = Flask(__name__)
CORS(app)
cache = Cache(app, config={"CACHE_TYPE": "simple"})


log = get_logger()

_db_connection = None


def _connect():
    """Create a new Exasol connection."""
    dsn = os.environ.get("HOST", "127.0.0.1:8888")
    user = os.environ.get("USER", "sys")
    log.info("Connecting to Exasol at %s", dsn)
    conn = pyexasol.connect(
        dsn=dsn,
        user=user,
        password=os.environ.get("PASSWORD", "exasol"),
        debug=False,
        fetch_dict=True,
        socket_timeout=30,
        compression=True,
    )
    log.info("Connected successfully to %s, user %s", dsn, user)
    return conn


def get_db():
    """Return the persistent connection, reconnecting if needed."""
    global _db_connection
    if _db_connection is not None:
        try:
            _db_connection.execute("SELECT 1")
            return _db_connection
        except Exception:
            log.warning("Stale connection detected, reconnecting")
            try:
                _db_connection.close()
            except Exception:
                pass
            _db_connection = None
    _db_connection = _connect()
    return _db_connection


def execute(q):
    try:
        connection = get_db()
        stm = connection.execute(q)
        return stm.fetchall() if stm.rowcount() > 0 else []
    except Exception:
        # Retry once with a fresh connection on failure
        global _db_connection
        log.warning("Query failed, retrying with fresh connection")
        try:
            _db_connection.close()
        except Exception:
            pass
        _db_connection = None
        connection = get_db()
        stm = connection.execute(q)
        return stm.fetchall() if stm.rowcount() > 0 else []


def get_config() -> pyexasol.ExaConnection:
    log.info("Querying for config")
    config_path = os.environ.get("CONFIG_PATH", CONFIG_PATH)
    log.info("Loading config from %s", config_path)
    conf = dict(load_config(config_path))
    log.info("Loaded %d configs: %s", len(conf), ", ".join(conf.keys()))
    return conf


config = get_config()


@app.route("/<config_name>/")
@cache.cached(timeout=600, query_string=True)
def get(config_name):
    log.info("Getting data for config %s", config_name)
    start_time = float(request.args.get("from", time.time() - DEFAULT_TIME))
    stop_time = float(request.args.get("to", time.time()))
    q = sanitize_search((request.args.get("q", "") or "").lower())
    if "." in config_name:
        abort(404)
    params = config.get(config_name)
    if not params:
        log.warning("Could not find config %s", config_name)
        abort(404)
    params["start_time"] = start_time
    params["stop_time"] = stop_time
    params["q"] = q
    q = gen_export(
        params.get("base"),
        start_time,
        stop_time,
        params.get("granularity", DEFAULT_GRANULARITY),
        params.get("threshold", DEFAULT_THRESHOLD),
        params,
    )
    log.info(q)
    t0 = time.time()
    # execute("FLUSH STATISTICS") # this is slow
    result = execute(q)
    t1 = time.time()
    log.info("Retrieved %d results in %.03f sec", len(result), (t1 - t0))
    return jsonify(sql=q, result=list(process_resultset(result, start_time, stop_time)))


@app.route("/<config_name>/info")
@cache.cached(timeout=600, query_string=True)
def get_info(config_name):
    box_id = validate_box_id(request.args.get("id"))
    log.info("Getting data for config %s, id %s", config_name, box_id)
    if "." in config_name:
        abort(404)
    params = config.get(config_name)
    if not params:
        log.warning("Could not find config %s", config_name)
        abort(404)
    params["box_id"] = box_id
    out = {}
    jinja_environment = get_jinja_environment()
    t0 = time.time()
    for k, v in params["info"].items():
        log.info("Querying %s", k)
        sql = jinja_environment.from_string(v).render(params)
        log.info(sql)
        out[k] = execute(sql)
    t1 = time.time()
    log.info("Retrieved info in %.03f sec", (t1 - t0))
    return jsonify(result=out)


@app.route("/<config_name>/flush", methods=["POST"])
def flush_statistics(config_name):
    params = config.get(config_name)
    if "flush" in params:
        t0 = time.time()
        out = execute(params["flush"])
        t1 = time.time()
        log.info("Flushed stats in %.03f sec", (t1 - t0))
        return jsonify(result=out)
    abort(501)
