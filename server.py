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
# Setup Flask routes
app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

# @app.route("/selection", methods=['POST'])
# def update_selection():
#     text = request.form['text']
#     return names(filename)

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT_NUMBER, debug=True)