d3.queue()
    .defer(d3.json, "/data/design")
    .defer(d3.json, "/data/simulation/O2")
    .defer(d3.json, "/data/simulation/TEMPERATURE")
    .defer(d3.json, "/data/simulation/HEAT_FLUX")
    .defer(d3.json, "/data/samples/O2")
    .defer(d3.json, "/data/samples/TEMPERATURE")
    .defer(d3.json, "/data/samples/HEAT_FLUX")
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

var pcp_inputs;
var pcp_O2;
var pcp_temperature;
var pcp_heat_flux;

function format_dimensions(data) {
    min_value = null;
    max_value = null;
    for (var i in data) {
        for (var j in data[i]) {
            if (min_value == null || data[i][j] < min_value) {
                min_value = data[i][j];
            }
            if (max_value == null || data[i][j] > max_value) {
                max_value = data[i][j];
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
            title: "D" + dim_count++,
            // This prevents the axis flipping from working:
            yscale: yScale
        };
    }
    return dimensions;
}

function update_selection() {
    var current_selection = null;
    var pcps = [pcp_inputs, pcp_O2, pcp_temperature, pcp_heat_flux];
    for (var i = 0; i < pcps.length; i++) {
        var items = pcps[i].brushed();
        // if something appears as selected and there is at least one
        // dimension that has been brushed for this PCP, then add its
        // selection to the list of highlighted data.
        if (items && Object.keys(pcps[i].brushExtents()).length) {
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
        for (var i = 0; i < pcps.length; i++) {
            pcps[i].clear("highlight");
            pcps[i].highlight(pcps[i].data().filter((item, i) => current_selection.has(item.key + '_' + item.series)));
        }
    }
    else {
        for (var i = 0; i < pcps.length; i++) {
            pcps[i].clear("highlight");
            pcps[i].canvas.foreground.classList.remove('faded');
        }
    }
}

function preview_selection(label) {
    var current_selection = null;
    var pcps = [pcp_inputs, pcp_O2, pcp_temperature, pcp_heat_flux];
    for (var i = 0; i < pcps.length; i++) {
        var items = pcps[i].brushed();
        // if something appears as selected and there is at least one
        // dimension that has been brushed for this PCP, then add its
        // selection to the list of highlighted data.
        if (items && Object.keys(pcps[i].brushExtents()).length) {
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
        for (var i = 0; i < pcps.length; i++) {
            pcps[i].clear("highlight");
            pcps[i].highlight(pcps[i].data().filter((item, i) => current_selection.has(item.key + '_' + item.series) && item.series == label));
        }
    }
    else {
        for (var i = 0; i < pcps.length; i++) {
            pcps[i].clear("highlight");
            pcps[i].highlight(pcps[i].data().filter((item, i) => item.series == label));
        }
    }
}

function create_parcoord(title, data, dimensions, colormap) {
    d3.select('body').append('h1').html(title);
    d3.select('body').append('div')
        .attr('id', 'pcp_' + title)
        .attr('class', 'parcoords')
        .style("z-index", 1)
        .style("width", "100%")
        .style("height", "150px");
    return d3.parcoords()('#pcp_' + title)
        .data(data)
        .dimensions(dimensions)
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

function make_graphs(error, input_data, simO2, simT, simHF, samplesO2, samplesT, samplesHF, config) {
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
        .attr('id', 'legend')
        .attr('style', 'opacity: 1; background-color: #FFFFFF; width: 200px; position: fixed; border: 1px solid black; top: 20px; right: 30px; margin: 0px; z-index: 2;');

    legend_div.append('h2').html('Legend')
        .attr('style', 'text-align: center; margin: 0px;');

    var graphic = legend_div.append('svg')
        .attr('width', '200px')
        .attr('height', '100px')
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
                .attr("x2", 190)
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

    var data = map_data_for_pcp(input_data, "inference").concat(map_data_for_pcp(input_data, "simulation"));
    var dimensions = format_dimensions(data);
    var title = 'Inputs';
    d3.select('body').append('h1').html(title);
    d3.select('body').append('div')
        .attr('id', 'pcp_' + title)
        .attr('class', 'parcoords')
        .style("width", "100%")
        .style("height", "150px")
        .style("z-index", 1);

    pcp_inputs = d3.parcoords()("#pcp_" + title)
        .data(data)
        .hideAxis(["key", "series"])
        .color(colormap)
        .render()
        .shadows()
        .reorderable()
        // .smoothness(1)
        .axisDots(size = 1)
        // .bundleDimension("ThardB")
        .rotateLabels(true)
        .brushMode("1D-axes")
        .on("brush", update_selection)
        .on("render", update_selection);

    data = map_data_for_pcp(samplesO2, "inference").concat(map_data_for_pcp(simO2, "simulation"));
    dimensions = format_dimensions(data);
    pcp_O2 = create_parcoord('O2', data, dimensions, colormap);

    data = map_data_for_pcp(samplesT, "inference").concat(map_data_for_pcp(simT, "simulation"));
    dimensions = format_dimensions(data);
    pcp_temperature = create_parcoord('Temperature', data, dimensions, colormap);

    data = map_data_for_pcp(samplesHF, "inference").concat(map_data_for_pcp(simHF, "simulation"));
    dimensions = format_dimensions(data);
    pcp_heat_flux = create_parcoord('Heat_Flux', data, dimensions, colormap);

    d3.selectAll(".dimension")
        .selectAll(".tick text")
        .remove();
};