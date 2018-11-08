# Quetzal
A small example dashboard for visualizing high-dimensional simulation data
coming from the ICSE at the University of Utah.

# Installing Dependencies

The following dependencies need to be installed before running:

 * Flask

The following optional dependencies are needed to run the `example.py` code:

 * scipy
 * numpy
 * pandas
 * openpyxl
 * xlrd >= 0.9.0
 * dill

These can easily all be installed using ```pip```:

```bash
pip install -r requirements.txt
```

# Running
There are two examples that can be run:

```bash
python example_simple.py
```

```bash
python example.py
```

Then navigate your browser to ```localhost:5000```.

Note, this second example requires additional dependencies which are listed in the Dependencies section above.

# Known Issues

* Explore the use of scatterplot projections and other methods of summarizing the many output dimensions.
* Continue exposing the formatting to the python side.
* Generate more data and validate example with experimental data.

# Acknowledgements

This project utilizes or reproduces code from the following projects:
 * [D3.js](https://d3js.org/)
 * [d3.parcoords.js](http://syntagmatic.github.io/parallel-coordinates/)
 * [Font Awesome](https://fontawesome.com/)
 * [Sortable.js](https://github.com/RubaXa/Sortable)
