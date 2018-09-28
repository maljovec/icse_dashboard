d3.queue()
    .defer(d3.json, "/data")
    .defer(d3.json, "/configuration")
    .await(make_graphs);

const intersect = (set1, set2) => [...set1].filter(num => set2.has(num))

function map_data_for_pcp(in_data, series_name) {
    var out_data = d3.entries(in_data).map(function (d) {
        var val = d.value;
        val.key = d.key;
        val.series = series_name;

        return val;
    });
    return out_data;
}

var pcps = {};

function format_dimensions(data) {
    min_value = null;
    max_value = null;

    for (var i in data) {
        for (const [key, value] of Object.entries(data[i])) {
            if (key == 'series' || key == 'key') {
                continue;
            }

            if (min_value == null || value < min_value) {
                min_value = value;
            }
            if (max_value == null || value > max_value) {
                max_value = value;
            }
        }
    }
    // Somehow, I need this information before the thing is created, for
    // now I will assume the user is not modifying this information, but
    // this is a brittle solution
    // var dummy = d3.parcoords();
    // var range = dummy.height() - dummy.margin().top - dummy.margin().bottom;
    // console.log(range);

    var dimensions = {};
    var dim_count = 0;
    for (var j in data[0]) {
        var yScale = d3.scale.linear()
            .domain([min_value, max_value]).range([115, 1]);
        dimensions[j] = {
            // ticks: 3,
            tickValues: [min_value, (min_value + max_value) / 2., max_value],
            title: "\u21f3",//"\u2195",
            // This prevents the axis flipping from working:
            yscale: yScale
        };
    }
    return dimensions;
}

function update_selection() {
    var current_selection = null;
    for (const [title, pcp] of Object.entries(pcps)) {
        var items = pcp.brushed();
        // if something appears as selected and there is at least one
        // dimension that has been brushed for this PCP, then add its
        // selection to the list of highlighted data.
        if (items && Object.keys(pcp.brushExtents()).length) {
            var selected = new Set(items.map(function (d) { return d.key + '_' + d.series; }));
            if (current_selection != null) {
                current_selection = new Set(intersect(current_selection, selected));
            }
            else {
                current_selection = selected;
            }
        }
    }
    if (current_selection != null && current_selection.size) {
        for (const [title, pcp] of Object.entries(pcps)) {
            pcp.clear("highlight");
            pcp.highlight(pcp.data().filter((item, i) => current_selection.has(item.key + '_' + item.series)));
        }
    }
    else {
        for (const [title, pcp] of Object.entries(pcps)) {
            pcp.clear("highlight");
            pcp.canvas.foreground.classList.remove('faded');
        }
    }
}

function preview_selection(label) {
    var current_selection = null;
    for (const [title, pcp] of Object.entries(pcps)) {
        var items = pcp.brushed();
        // if something appears as selected and there is at least one
        // dimension that has been brushed for this PCP, then add its
        // selection to the list of highlighted data.
        if (items && Object.keys(pcp.brushExtents()).length) {
            var selected = new Set(items.map(function (d) { return d.key + '_' + d.series; }));
            if (current_selection != null) {
                current_selection = new Set(intersect(current_selection, selected));
            }
            else {
                current_selection = selected;
            }
        }
    }
    if (current_selection != null && current_selection.size) {
        for (const [title, pcp] of Object.entries(pcps)) {
            pcp.clear("highlight");
            pcp.highlight(pcp.data().filter((item, i) => current_selection.has(item.key + '_' + item.series) && item.series == label));
        }
    }
    else {
        for (const [title, pcp] of Object.entries(pcps)) {
            pcp.clear("highlight");
            pcp.highlight(pcp.data().filter((item, i) => item.series == label));
        }
    }
}

function create_parcoord(box, title, data, dimensions, colormap) {
    box.append('h2').html(title);
    box.append("label")
        .text('Selection Mode:')
        .style("width", "100px")
        .style("display", "inline-block");
    var brush_select = box.append('select');
    box.append('div')
        .attr('id', 'pcp_' + title)
        .attr('class', 'parcoords')
        .style("z-index", 1)
        .style("width", "100%")
        .style("height", "150px");

    var parcoords;

    if (dimensions != null) {
        parcoords = d3.parcoords()('#pcp_' + title)
            .data(data)
            .dimensions(dimensions)
            .color(colormap)
            .hideAxis(["key", "series"])
            .render()
            .shadows()
            .reorderable()
            .brushMode("1D-axes")
            .rotateLabels(false)
            .on("brush", update_selection)
            .on("render", update_selection);
    }
    else {
        parcoords = d3.parcoords()('#pcp_' + title)
            .data(data)
            .color(colormap)
            .hideAxis(["key", "series"])
            .render()
            .shadows()
            .reorderable()
            .brushMode("1D-axes")
            .rotateLabels(true)
            .on("brush", update_selection)
            .on("render", update_selection);
    }

    brush_select.selectAll('option')
        .data(parcoords.brushModes())
        .enter()
        .append('option')
        .text(function (d) { return d; });

    brush_select.on('change', function () {
        parcoords.brushMode(this.value);
        switch (this.value) {
            case 'None':
                d3.select("#pStrums").style("visibility", "hidden");
                d3.select("#lblPredicate").style("visibility", "hidden");
                d3.select("#sltPredicate").style("visibility", "hidden");
                d3.select("#btnReset").style("visibility", "hidden");
                break;
            case '2D-strums':
                d3.select("#pStrums").style("visibility", "visible");
                break;
            default:
                d3.select("#pStrums").style("visibility", "hidden");
                d3.select("#lblPredicate").style("visibility", "visible");
                d3.select("#sltPredicate").style("visibility", "visible");
                d3.select("#btnReset").style("visibility", "visible");
                break;
        }
    });

    brush_select.property('value', '1D-axes');

    return parcoords;
}

function make_graphs(error, input_data, config) {
    if (error != null) {
        console.log(error);
        return;
    }

    var colors = config['colors'];
    function colormap(d) {
        if (d.series in colors) {
            return colors[d.series];
        }
        else {
            return colors['default'];
        }
    }
    line_height = 25;
    var legend_height = line_height * Object.keys(colors).length;

    // Generate the legend
    var legend_div = d3.select('body').append('div')
        .attr('id', 'legend');

    legend_div.append('h2').html('Legend')
        .attr('style', 'text-align: center; margin: 0px;');

    var graphic = legend_div.append('svg')
        .attr('width', '200px')
        .attr('height', '80px')
        .append('g');
    // graphic.append("rect")
    //     .attr("x", 0)
    //     .attr("y", 0)
    //     .attr("width", 200)
    //     .attr("height", legend_height)
    //     .attr("fill", "#FFFFFF")
    //     .attr("stroke", "#000000")
    //     .attr("stroke-width", 1);

    var y_pos = line_height;
    for (const [key, value] of Object.entries(colors)) {
        if (key != 'default') {
            graphic.append("text")
                .attr("x", 5)
                .attr("y", y_pos)
                .text(key)
                .on("mouseover", function () {
                    preview_selection(key);
                })
                .on("mouseout", update_selection);
            graphic.append("line")
                .attr("x1", 100)
                .attr("y1", y_pos - (line_height) / 4.)
                .attr("x2", 180)
                .attr("y2", y_pos - (line_height) / 4.)
                .attr("stroke-width", 2)
                .attr("stroke", value)
                .on("mouseover", function () {
                    preview_selection(key);
                })
                .on("mouseout", update_selection);
            y_pos += line_height;
        }
    }
    d3.select('body').append('div')
        .attr('class', 'spacer')
        .attr('style', 'height: 100px;');

    for (const [title, data_object] of Object.entries(input_data)) {
        var dimensions;
        var data = [];
        for (const [series, values] of Object.entries(data_object)) {
            data = data.concat(map_data_for_pcp(values, series));
        }

        if (title in config['scales'] && config['scales'][title] == 'shared') {
            dimensions = format_dimensions(data);
        }
        else {
            dimensions = null;
        }
        var box = d3.select('body').append('div').attr('class', 'box');
        console.log(title, data);
        pcps[title] = create_parcoord(box, title, data, dimensions, colormap);
    }

    d3.selectAll(".dimension")
        .selectAll(".tick text")
        .remove();
};