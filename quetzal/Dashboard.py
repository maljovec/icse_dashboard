import json
from flask import Flask
from flask import render_template
import webbrowser

class Dashboard(object):
    """ A Dashboard class for visualizing multidimensional data using
        parallel coordinates in d3
    """

    def __init__(self, data, configuration=None, name=None, **kwargs):
        if configuration is None:
            configuration = {}

        self.configuration = configuration
        self.data = data
        self.host = kwargs.get("host", "127.0.0.1")
        self.port = kwargs.get("port", "5000")

    def run(self):
        app = Flask(__name__)

        @app.route("/")
        def index():
            return render_template("index.html")

        @app.route("/configuration")
        def get_configuration():
            return json.dumps(self.configuration)

        @app.route("/data")
        def get_data():
            return json.dumps(self.data)

        webbrowser.open('http://' + self.host + ':' + self.port)
        app.run(host=self.host, port=self.port, debug=False)