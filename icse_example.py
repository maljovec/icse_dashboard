########################################################################
# Imports
import plotly
import plotly.graph_objs as go

import dash
from dash.dependencies import Input, Output, State
import dash_core_components as dcc
import dash_html_components as html
import dash_table_experiments as dt

from dill import load
import pandas as pd
import numpy as np

import pdir

from parse_input import *

########################################################################
# Constants
PORT_NUMBER = 9999

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
# Setup UI components

# Data Table
data_table = dt.DataTable(rows=dsgn.to_dict('records'), row_selectable=True,
                          filterable=True, sortable=True, selected_row_indices=[],
                          id='datatable')

# PCP
line = dict(color=list(range(len(dsgn))), colorscale='Reds',
            showscale=True, cmin=0, cmax=len(dsgn))
dimensions = []
for col in dsgn.columns:
    dimensions.append(dict(values=dsgn[col], label=col))
par_coords = go.Parcoords(line=line, dimensions=dimensions)
input_space = dcc.Graph(id='inputs', figure={'data': [par_coords]})
par_coords.on_selection(lambda x: print('Selection'))
par_coords.on_click(lambda x: print('Click'))
# par_coords.on_change(lambda x: print('Change'))
par_coords.on_hover(lambda x: print('Hover'))
par_coords.on_unhover(lambda x: print('Unhover'))
print(pdir(input_space))

dimensions2 = {'O2': [], 'TEMPERATURE': [], 'HEAT FLUX': []}
for i, tup in enumerate(sims.index.values):
    dimensions2[tup[0]].append(dict(values=y_samples[:, i], label=tup[1]))
output_spaces = {}
for key in dimensions2:
    par_coords2 = go.Parcoords(line=line, dimensions=dimensions2[key])
    output_spaces[key] = dcc.Graph(id=key, figure={'data': [par_coords2]})

# output_spaces = {}
# Error Bar Plots
# scatters = []
# for var in ['O2', 'TEMPERATURE', 'HEAT FLUX']:
#     scatter_expt_1 = go.Scatter(name='Experimental', x=expt['m'][var].index,
#                                 y=expt['m'][var].values,
#                                 error_y=dict(type='data',
#                                              array=expt['s'][var].values,
#                                              visible=True),
#                                 mode='markers')
#     scatter_sims_1 = go.Scatter(name='Simulation', x=sims.T[var].mean().index,
#                                 y=sims.T[var].mean(),
#                                 error_y=dict(type='data',
#                                              array=sims.T[var].std(),
#                                              visible=True),
#                                 mode='markers')
#     scatter_plots = [scatter_expt_1, scatter_sims_1]
#     output_spaces[var] = dcc.Graph(
#         id='{}_outputs'.format(var), figure={'data': scatter_plots})

########################################################################
# Dash Specific Code
app = dash.Dash()

app.layout = html.Div([
    html.Div(id='selected-indexes'),
    html.H4('Inputs'),
    input_space,
    html.H4('O2'),
    output_spaces['O2'],
    html.H4('Heat Flux'),
    output_spaces['HEAT FLUX'],
    html.H4('Temperature'),
    output_spaces['TEMPERATURE'],
    # html.H4('DataTable'),
    # data_table,
], className="container")


def update_input(indices):
    dimensions = []
    for col in dsgn.columns:
        dimensions.append(dict(values=dsgn[col], label=col))
    par_coords = go.Parcoords(line=line, dimensions=dimensions)
    return par_coords

def update_output(key, indices):
    print('~'*80)
    print(indices)
    selected = dsgn.index
    for selection in indices:
        if selection is not None:
            selected = np.intersect1d(selected, selection)
    print(selected)
    print('~'*80)
    dimensions = []
    for i, tup in enumerate(sims.index.values):
        if tup[0] == key:
            dimensions.append(dict(values=y_samples[:, i], label=tup[1]))
    par_coords = go.Parcoords(line=line, dimensions=dimensions, selectedpoints=selected)
    return par_coords


@app.callback(
    Output(component_id='O2', component_property='figure'),
    [Input(component_id='inputs', component_property='clickData'),
     Input(component_id='HEAT FLUX', component_property='clickData'),
     Input(component_id='TEMPERATURE', component_property='clickData')
     ])
def update_O2(*indices):
    return update_output('O2', indices)


@app.callback(
    Output(component_id='HEAT FLUX', component_property='figure'),
    [Input(component_id='inputs', component_property='clickData'),
     Input(component_id='O2', component_property='clickData'),
     Input(component_id='TEMPERATURE', component_property='clickData')
     ])
def update_HEAT_FLUX(*indices):
    return update_output('HEAT FLUX', indices)


@app.callback(
    Output(component_id='TEMPERATURE', component_property='figure'),
    [Input(component_id='inputs', component_property='clickData'),
     Input(component_id='O2', component_property='clickData'),
     Input(component_id='HEAT FLUX', component_property='clickData')
     ])
def update_TEMPERATURE(*indices):
    return update_output('TEMPERATURE', indices)


app.run_server(debug=True, host='0.0.0.0', port=PORT_NUMBER)
