import json
from flask import Flask
from flask import render_template


class Dashboard(object):
    """ A Dashboard class for visualizing multidimensional data using
        parallel coordinates in d3
    """

    def __init__(self, data, configuration=None, name=None, **kwargs):
        if configuration is None:
            configuration = {}

        self.configuration = configuration
        self.data = data
        self.host = kwargs.get("host", "0.0.0.0")
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

        app.run(host=self.host, port=self.port, debug=False)
