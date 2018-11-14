from dill import load
from pandas.core.series import Series

from quetzal import Dashboard

# Import data:
with open('BSF_nonlinear.p', 'rb') as input_file:
    data = load(input_file)
expt, dsgn, sim, surr = data['expt'], data['dsgn'], data['sim'], data['surr']
prior_x, prior_y = data['prior_x'], data['prior_y']
post_x, post_y = data['post_x'], data['post_y']

def expt_range(expt, qoi_type):
    experimental_data = {}
    for row in expt.loc[qoi_type].index:
        m = expt.loc[qoi_type].loc[row]["yd_m"]
        s = expt.loc[qoi_type].loc[row]["yd_s"]
        # A hack since it looks like some of the rows come back with
        # multiple values, they happen to be replicates from my spot
        # checking, so taking the first value is fine
        if type(m) == Series:
            m = m.values[0]
        if type(s) == Series:
            s = s.values[0]
        experimental_data[row] = [m - 2*s, m + 2*s]
    return {"Base Case": experimental_data}

dashboard = Dashboard()
dashboard.add_axes('Input parameters')
dashboard.add_series("Input parameters", "simulations", dsgn.to_dict("index"))
dashboard.add_series("Input parameters", "surrogates", dsgn.to_dict("index"))
dashboard.add_series("Input parameters", "prior sample", prior_x.to_dict("index"))
dashboard.add_series("Input parameters", "post. sample", post_x.to_dict("index"))

for qoi_type in sim.index.levels[0]:
    dashboard.add_axes(qoi_type)
    dashboard.add_series(qoi_type, "simulations", sim.loc[qoi_type].to_dict())
    dashboard.add_series(qoi_type, "experiments", expt_range(expt, qoi_type))
    dashboard.add_series(qoi_type, "surrogates", surr.loc[qoi_type].to_dict())
    dashboard.add_series(qoi_type, "prior sample", prior_y.loc[qoi_type].to_dict())
    dashboard.add_series(qoi_type, "post. sample", post_y.loc[qoi_type].to_dict())

colors = {
        "experiments": "#e41a1c",
        "simulations": "#00bfff",
        "surrogates": "#0055ff",
        "prior sample": "#4000ff",
        "post. sample": "#4daf4a",
        "default": "#000000",
}
dashboard.config('colors', colors)

scales = {
    "O2": "shared",
    "HEAT FLUX": "shared",
    "TEMPERATURE": "shared"
}
dashboard.config('scales', scales)

dimension_labels = {
    "O2": "none",
    "HEAT FLUX": "none",
    "TEMPERATURE": "none"
}
dashboard.config('dimension_labels', dimension_labels)

tick_labels = {
    "Input parameters": "visible",
    "O2": "hidden",
    "HEAT FLUX": "hidden",
    "TEMPERATURE": "hidden"
}
dashboard.config('tick_labels', tick_labels)

dashboard.config('title', "nonlinear proof of concept")

dashboard.run()
