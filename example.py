########################################################################
# Some import statements

from quetzal import Dashboard

from dill import load
import pandas as pd

from parse_input import *

########################################################################
# Helper methods for extracting information from pandas.DataFrames into
# hierarchical dictionaries that can be passed off to javascript


def get_simulation_data(sims, output_type):
    return sims.loc[output_type].to_dict()


def get_inference_data(sims, y_samples, output_type):
    sample_data = {}
    for i, case in enumerate(sims.columns):
        sample_data[case] = {}
        for j, idx in enumerate(sims.index):
            var = idx[0]
            if var == output_type:
                loc = idx[1]
                sample_data[case][loc] = y_samples[i, j]
    return sample_data


def get_experimental_data(expt, output_type):
    experimental_data = {}
    for row in expt.loc[output_type].index:
        m = expt.loc[output_type].loc[row]["m"]
        s = expt.loc[output_type].loc[row]["s"]
        # A hack since it looks like some of the rows come back with
        # multiple values, they happen to be replicates from my spot
        # checking, so taking the first value is fine
        if type(m) == pd.core.series.Series:
            m = m.values[0]
        if type(s) == pd.core.series.Series:
            s = s.values[0]
        min_value = m - s
        max_value = m + s
        experimental_data[row] = [min_value, max_value]
    return {"Base Case": experimental_data}


########################################################################
# Loading and generating data
file = "BSF_year4_v2.xlsx"
my_parser = InputParser(file)

expt, Nqoi = my_parser.parse_expt()
dsgn, Nmp, param_priors = my_parser.parse_dsgn()
sims = my_parser.parse_sim()

input_dict = load(open("linear_surrogate.p", "rb"))
locals().update(input_dict)
y_samples = y_surrogate(dsgn.values, Θ)

########################################################################
# Make the data and configuration available for dashboard consumption

configuration = {
    "colors": {
        "experiment": "#e41a1c",
        "simulation": "#377eb8",
        "inference": "#4daf4a",
        "default": "#000000",
    },
    "scales": {"O2": "shared", "HEAT FLUX": "shared", "TEMPERATURE": "shared"},
    "labels": {"O2": "none", "HEAT FLUX": "none", "TEMPERATURE": "none"},
}

data = {}
data["Inputs"] = {}
data["Inputs"]["simulation"] = dsgn.to_dict("index")
data["Inputs"]["inference"] = dsgn.to_dict("index")
for output_type in sims.index.levels[0]:
    data[output_type] = {}
    data[output_type]["simulation"] = get_simulation_data(sims, output_type)
    data[output_type]["inference"] = get_inference_data(
        sims, y_samples, output_type
    )
    data[output_type]["experiment"] = get_experimental_data(expt, output_type)

dashboard = Dashboard(data, configuration)
dashboard.run()