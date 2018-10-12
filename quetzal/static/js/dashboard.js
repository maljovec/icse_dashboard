d3.queue()
    .defer(d3.json, "/data")
    .defer(d3.json, "/configuration")
    .await(make_graphs);

var pcps = {};
var series_off = {};
var legend_labels = {};
var legend_glyphs = {};

const intersect = (set1, set2) => [...set1].filter(num => set2.has(num))

// For being able to drag an element around on the page
function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "_header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(elmnt.id + "_header").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function map_data_for_pcp(in_data, series_name) {
    var out_data = d3.entries(in_data).map(function (d) {
        var val = d.value;
        val.key = d.key;
        val.series = series_name;

        return val;
    });
    return out_data;
}

function format_dimensions(data, fixed_scale = true, use_names = false) {
    min_value = null;
    max_value = null;

    if (fixed_scale) {
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
    }
    var dimensions = {};
    var dim_count = 0;
    for (var j in data[0]) {
        dimensions[j] = {};
        if (fixed_scale) {
            // TODO: hard-coded scale here:
            var yScale = d3.scale.linear()
                .domain([min_value, max_value]).range([115, 1]);
            dimensions[j].tickValues = [min_value, (min_value + max_value) / 2., max_value];
            // This prevents the axis flipping from working:
            dimensions[j].yscale = yScale;
        }
        if (use_names) {
            dimensions[j].title = j;
        }
        else {
            dimensions[j].title = "\u21f3";
        }
    }
    return dimensions;
}

function update_selection() {
    var current_selection = null;
    var all_data = null;
    var brushed_count = 0;
    for (const [title, pcp] of Object.entries(pcps)) {
        var items = pcp.brushed();
        brushed_count += pcp.is_brushed();

        if (items) {
            items = items.filter(item => !series_off[item.series]);
            if (items) {
                var selected = new Set(items.map(function (d) { return d.key + '_' + d.series; }));
                if (current_selection != null) {
                    current_selection = new Set(intersect(current_selection, selected));
                }
                else {
                    current_selection = selected;
                }
            }
        }
    }

    if (brushed_count > 0) {
        for (const [title, pcp] of Object.entries(pcps)) {
            pcp.canvas.foreground.classList.add('faded');
            pcp.clear("selected");
            pcp.select_data(pcp.data().filter((item, i) => current_selection.has(item.key + '_' + item.series)));

        }
    }
    else {
        for (const [title, pcp] of Object.entries(pcps)) {
            pcp.canvas.foreground.classList.remove('faded');
            pcp.clear("selected");
            pcp.select_data(pcp.data().filter((item, i) => !series_off[item.series]));
        }
    }
}

function preview_selection(label) {
    var current_selection = null;
    for (const [title, pcp] of Object.entries(pcps)) {
        var items = pcp.brushed();
        if (items) {
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

function toggle_series(key) {
    if (key in series_off) {
        series_off[key] = !series_off[key];
    }
    else {
        series_off[key] = false;
    }

    if (series_off[key]) {
        legend_labels[key].style("opacity", 0.5);
        legend_glyphs[key].style("opacity", 0.5);
    }
    else {
        legend_labels[key].style("opacity", 1.0);
        legend_glyphs[key].style("opacity", 1.0);
    }

    update_selection();
}

function create_parcoord(box, title, data, config) {
    var dimensions;
    var scales = 'scales' in config ? scales = config['scales'] : {};
    var dimension_labels = 'dimension_labels' in config ? config['dimension_labels'] : {};
    var tick_labels = 'tick_labels' in config ? config['tick_labels'] : {};

    var fixed_scales = title in scales && scales[title] == 'shared';
    use_names = !(title in dimension_labels && dimension_labels[title] == 'none');
    dimensions = format_dimensions(data, fixed_scales, use_names);

    var colors = 'colors' in config ? config['colors'] : {};
    function colormap(d) {
        if (d.series in colors) {
            return colors[d.series];
        }
        else {
            return colors['default'];
        }
    }

    var container_id = 'pcp_' + title.replace(/ /g, '_');
    box.append('h2').html(title);
    // box.append('button').html(title)
    //     .attr('class', 'collapsible');
    // var content = box.append('div').attr('class', 'content');

    // var coll = document.getElementsByClassName("collapsible");
    // var i;

    // for (i = 0; i < coll.length; i++) {
    //     coll[i].addEventListener("click", function () {
    //         this.classList.toggle("active");
    //         var content = this.nextElementSibling;
    //         if (content.style.display === "block") {
    //             content.style.display = "none";
    //         } else {
    //             content.style.display = "block";
    //         }
    //     });
    // }

    box.append("label")
        .text('Selection Mode:')
        .style("width", "100px")
        .style("display", "inline-block");
    var brush_select = box.append('select');
    var container = box.append('div')
        .attr('id', container_id)
        .attr('class', 'parcoords')
        .style("z-index", 1)
        .style("width", "100%")
        .style("height", "150px");

    var parcoords = d3.parcoords()('#' + container_id)
        .data(data)
        .dimensions(dimensions)
        .color(colormap)
        .hideAxis(["key", "series"])
        .render()
        .shadows()
        .reorderable()
        .brushMode("1D-axes")
        .rotateLabels(use_names)
        .on("brush", update_selection)
        .on("render", update_selection);

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

    if (!(title in tick_labels) || tick_labels[title] != 'visible') {
        container.selectAll(".dimension")
            .selectAll(".tick text")
            .remove();
    }

    return parcoords;
}

function make_legend(input_data, config) {

    series_set = new Set();
    for (const [title, data_object] of Object.entries(input_data)) {
        for (const [series, values] of Object.entries(data_object)) {
            series_set.add(series);
        }
    }

    var colors = 'colors' in config ? config['colors'] : {};
    line_height = 25;
    var legend_height = line_height * series_set.size;

    // Generate the legend
    var legend_div = d3.select('body').append('div')
        .attr('id', 'legend');

    legend_div.append('h2').html('Legend')
        .style('text-align', 'center')
        .style('margin', '0px')
        .style('cursor', 'move')
        .attr('id', 'legend_header');

    var graphic = legend_div.append('svg')
        .attr('width', '200px')
        .attr('height', String(legend_height) + 'px')
        .append('g');

    var y_pos = line_height;

    for (let key of series_set) {
        var color;
        if (key in colors) {
            color = colors[key];
        }
        else {
            color = colors['default'];
        }
        legend_labels[key] = graphic.append("text")
            .attr("x", 5)
            .attr("y", y_pos)
            .text(key)
            .on("click", function () {
                toggle_series(key);
            });
        legend_glyphs[key] = graphic.append("line")
            .attr("x1", 100)
            .attr("y1", y_pos - (line_height) / 4.)
            .attr("x2", 180)
            .attr("y2", y_pos - (line_height) / 4.)
            .attr("stroke-width", 2)
            .attr("stroke", color)
            .on("click", function () {
                toggle_series(key);
            });
        y_pos += line_height;
    }

    dragElement(document.getElementById("legend"));
}

function make_graphs(error, input_data, config) {
    if (error != null) {
        console.log(error);
        return;
    }

    for (var data_object of Object.values(input_data)) {
        for (var series of Object.keys(data_object)) {
            series_off[series] = false;
        }
    }

    // The legend should be based on the actual data series' not the
    // configuration alone
    make_legend(input_data, config);

    d3.select('body').append('div')
        .attr('class', 'spacer')
        .attr('style', 'height: 100px;');

    for (const [title, data_object] of Object.entries(input_data)) {
        var data = [];
        for (const [series, values] of Object.entries(data_object)) {
            data = data.concat(map_data_for_pcp(values, series));
        }

        var box = d3.select('body').append('div').attr('class', 'box');
        pcps[title] = create_parcoord(box, title, data, config);
    }
};