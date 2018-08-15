# icse_dashboard
A small example dashboard for visualizing high-dimensional simulation data
coming from the ICSE at the University of Utah.

# Installing Dependencies

The following dependencies need to be installed before running:

 * scipy
 * numpy
 * pandas
 * dill
 * Flask
 * openpyxl
 * xlrd >= 0.9.0

These can easily all be installed using ```pip```:

```bash
pip install -r requirements.txt
```

# Running
Simply start the Flask server using the command below:

```bash
python server.py
```

Then navigate your browser to ```localhost:5001```.

# Known Issues

* The code still needs to be reorganized to accommodate more generic data.
* Addition of a legend.
* Explore the use of scatterplot projections and other methods of summarizing
the many output dimensions.
* Expose the formatting to the python side.
* Package up to allow user to call it from their code.
* Generate more data and find example of experimental data.