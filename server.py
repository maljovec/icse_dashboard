########################################################################
# Imports

import json

from flask import Flask
from flask import render_template

from dill import load
import pandas as pd
import numpy as np

from parse_input import *

########################################################################
# Constants
PORT_NUMBER = 5001

########################################################################
# Loading and massaging data
file = 'BSF_year4_v2.xlsx'
my_parser = InputParser(file)

expt, Nqoi = my_parser.parse_expt()
dsgn, Nmp, param_priors = my_parser.parse_dsgn()
sims = my_parser.parse_sim()

input_dict = load(open('linear_surrogate.p', 'rb'))
locals().update(input_dict)
# print(y_surrogate)
# Evaluate the linear surrogate
# y_surrogate = lambda x, Θ: Θ[:, 0] +  x @ Θ[:, 1:].T
y_samples = y_surrogate(dsgn.values, Θ)

########################################################################
# Exposing configuration of UI to the python side
configuration = {}
configuration['colors'] = {
    'experiment': "#e41a1c",
    'simulation': "#377eb8",
    'inference': "#4daf4a",
    'default': "#4daf4a"}

configuration['scales'] = {
    'Example2': 'shared',
}

########################################################################
# Setup Flask routes
app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')

# @app.route("/selection", methods=['POST'])
# def update_selection():
#     text = request.form['text']
#     return names(filename)


@app.route("/configuration")
def get_configuration():
    return json.dumps(configuration)


@app.route("/data/design")
def get_design_points():
    return dsgn.T.to_json()


@app.route("/data/simulation/<output_type>")
def get_simulation_points(output_type):
    output_type = output_type.replace('_', ' ')
    if output_type == 'TEMPERATURE':
        return json.dumps({})
    return sims.loc[output_type].to_json()


@app.route("/data/samples/<output_type>")
def get_sample_points(output_type):
    output_type = output_type.replace('_', ' ')
    sample_data = {}

    var_types = set()
    for idx in sims.index:
        var_types.add(idx[0])

    for i, case in enumerate(sims.columns):
        sample_data[case] = {}
        for j, idx in enumerate(sims.index):
            var = idx[0]
            if var == output_type:
                loc = idx[1]
                sample_data[case][loc] = y_samples[i, j]

    return json.dumps(sample_data)

@app.route("/data")
def get_test_data():
    test_data = {"Example": {
            "simulation": {
                "0": {
                    "A": 0.25,
                    "B": 0.25,
                    "C": 0.25,
                    "D": 0.25,
                },
                "1": {
                    "A": 0.0,
                    "B": 0.1,
                    "C": 0.0,
                    "D": 0.1,
                },
            },
            "inference": {
                "0": {
                    "A": 0.0,
                    "B": 0.0,
                    "C": 0.0,
                    "D": 0.0,
                },
                "1": {
                    "A": 1.0,
                    "B": 1.0,
                    "C": 1.0,
                    "D": 1.0,
                },
                "2": {
                    "A": 0.5,
                    "B": 0.0,
                    "C": 0.5,
                    "D": 0.0,
                },
            },
            "experiment": {
                "0": {
                    "A": [0.5, 1.5],
                    "B": [0, 0.5],
                    "C": [0, 0.5],
                    "D": [0.1, 0.3],
                }
            }
        },
        "Example2": {
            "simulation": {
                "0": {
                    "x0": 0.0,
                    "x1": 0.0,
                    "x2": 0.0,
                    "x3": 0.0,
                },
                "1": {
                    "x0": 0.5,
                    "x1": 0.5,
                    "x2": 0.5,
                    "x3": 0.5,
                },
            },
            "inference": {
                "0": {
                    "x0": 1.0,
                    "x1": 1.0,
                    "x2": 1.0,
                    "x3": 1.0,
                },
                "1": {
                    "x0": 10.0,
                    "x1": 0.0,
                    "x2": 10.0,
                    "x3": 0.0,
                },
                "2": {
                    "x0": 0.0,
                    "x1": 5.0,
                    "x2": 0.0,
                    "x3": 5.0,
                },
            },
            "experiment": {
                "0": {
                    "x0": [5.0, 7.5],
                    "x1": [2.5, 5.0],
                    "x2": [4.5, 5.5],
                    "x3": [0.0, 2.0],
                }
            }
        },
    }
    return json.dumps(test_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT_NUMBER, debug=True)
