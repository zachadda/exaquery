from os.path import abspath
import os

from werkzeug.middleware.dispatcher import DispatcherMiddleware
from flask import Flask, send_from_directory, send_file

from timeline.timeline_app import app as timeline_app


# set the project root directory as the static folder, you can set others.
html_app = Flask(__name__, static_folder=None)  # , static_url_path="")

defaults = {"path": ""}


@html_app.route("/", defaults=defaults)
@html_app.route("/<path:path>")
def index(path):
    html_dir = os.environ.get("HTML", "../ui/dist")
    if path.startswith("assets") or path == "favicon.ico":
        return send_file(abspath(html_dir + "/" + path))
    return send_from_directory(html_dir, "index.html")


app = Flask("main")
app.wsgi_app = DispatcherMiddleware(html_app, {"/api": timeline_app})
app.config.from_object(os.environ.get("SETTINGS", "settings.devel"))

if app.config["DEBUG"]:
    app.run(host=app.config["HOST"], port=app.config["PORT"], debug=True)
else:
    from gevent.pywsgi import WSGIServer

    http_server = WSGIServer((app.config["HOST"], app.config["PORT"]), app)
    http_server.serve_forever()
