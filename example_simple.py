from quetzal import Dashboard

configuration = {
    "colors": {
                "Series 1": "#e41a1c",
                "Series 2": "#377eb8",
                "Series 3": "#4daf4a",
                "default": "#000000",
            },
    "scales":  {"Dimension Set 2": "shared"},
    "labels": {"Dimension Set 1": "none"},
}

data = {
    "Dimension Set 1": {
        "Series 1": {
            "Case 0": {"A": 0.25, "B": 0.25, "C": 0.25, "D": 0.25},
            "Case 1": {"A": 0.0, "B": 0.1, "C": 0.0, "D": 0.1},
        },
        "Series 2": {
            "Case 0": {"A": 0.0, "B": 0.0, "C": 0.0, "D": 0.0},
            "Case 1": {"A": 1.0, "B": 1.0, "C": 1.0, "D": 1.0},
            "Case 2": {"A": 0.5, "B": 0.0, "C": 0.5, "D": 0.0},
        },
        "Series 3": {
            "Case 0": {
                "A": [0.5, 1.5],
                "B": [0, 0.5],
                "C": [0, 0.5],
                "D": [0.1, 0.3],
            }
        },
        "Series 4": {
            "Case 0": {"A": 0.25, "B": 0.75, "C": 0.25, "D": 0.75},
        },
    },
    "Dimension Set 2": {
        "Series 1": {
            "Case 0": {"x0": 0.0, "x1": 0.0, "x2": 0.0, "x3": 0.0},
            "Case 1": {"x0": 0.5, "x1": 0.5, "x2": 0.5, "x3": 0.5},
        },
        "Series 2": {
            "Case 0": {"x0": 1.0, "x1": 1.0, "x2": 1.0, "x3": 1.0},
            "Case 1": {"x0": 10.0, "x1": 0.0, "x2": 10.0, "x3": 0.0},
            "Case 2": {"x0": 0.0, "x1": 5.0, "x2": 0.0, "x3": 5.0},
        },
        "Series 3": {
            "Case 0": {
                "x0": [5.0, 7.5],
                "x1": [2.5, 5.0],
                "x2": [4.5, 5.5],
                "x3": [0.0, 2.0],
            }
        },
    },
}

dashboard = Dashboard(data, configuration)
dashboard.run()
