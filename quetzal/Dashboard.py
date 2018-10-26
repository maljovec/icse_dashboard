import json
from flask import Flask
from flask import render_template
import webbrowser


class Dashboard(object):
    """ A Dashboard class for visualizing multidimensional data using
        parallel coordinates in d3
    """

    def __init__(self, data=None, configuration=None, name=None, **kwargs):
        if data is None:
            data = {}
        if configuration is None:
            configuration = {}
        self.configuration = configuration
        self.data = data
        self.host = kwargs.get("host", "127.0.0.1")
        self.port = kwargs.get("port", 5000)

    def add_axes(self, axes_name, data=None):
        if data is None:
            data = {}
        self.data[axes_name] = data

    def add_series(self, axes_name, series_name, data=None):
        if data is None:
            data = {}
        self.data[axes_name][series_name] = data

    def add_case(self, axes_name, series_name, case_name, data=None):
        if data is None:
            data = {}
        self.data[axes_name][series_name][case_name] = data

    def config(self, key, value):
        self.configuration[key] = value

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

        webbrowser.open("http://" + self.host + ":" + str(self.port))
        app.run(host=self.host, port=self.port, debug=False)
