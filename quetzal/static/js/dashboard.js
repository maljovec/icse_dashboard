d3.queue()
    .defer(d3.json, "/data")
    .defer(d3.json, "/configuration")
    .await(make_graphs);

var pcps = {};
var series_off = {};
var legend_labels = {};
var legend_glyphs = {};

const intersect = (set1, set2) => [...set1].filter(num => set2.has(num))

// Encapsulated code for dragging an element around on the page
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

// Encapsulated code for highlighting items
function addHighlightSettings(parcoords, container_id, data) {
    var intersectionPoints;
    function highlightLines(mouseCoordinates) {
        var highlightedLines = getLinesForHighlight(mouseCoordinates);
        if (highlightedLines && highlightedLines[0].length) {
            var currentData = highlightedLines[0];
            highlight_selection(currentData);
        }
    }
    function getLinesForHighlight(mouseCoordinates) {
        var rightAxisNumber = getNearAxis(mouseCoordinates);
        if (intersectionPoints.length && rightAxisNumber) {
            var leftAxisNumber = rightAxisNumber - 1;
            var brushedData = parcoords.selected().length ? parcoords.selected() : data;
            var currentData = [];
            var currentIntersectionPoints = [];
            intersectionPoints.forEach(function (d, i) {
                if (isMouseOnLine(d[leftAxisNumber], d[rightAxisNumber], mouseCoordinates)) {
                    currentData.push(brushedData[i]);
                    currentIntersectionPoints.push(intersectionPoints[i]);
                }
            });
            return [currentData, currentIntersectionPoints];
        }
    }
    function isMouseOnLine(startIntersectionPoint, endIntersectionPoint, mouseCoordinates) {
        var accuracy = 1;
        var x0 = mouseCoordinates[0];
        var y0 = mouseCoordinates[1];
        var x1 = startIntersectionPoint[0];
        var y1 = startIntersectionPoint[1];
        var x2 = endIntersectionPoint[0];
        var y2 = endIntersectionPoint[1];
        var dX = x2 - x1;
        var dY = y2 - y1;
        var delta = Math.abs(dY * x0 - dX * y0 - x1 * y2 + x2 * y1) / Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2));
        return delta <= accuracy;
    }
    function getNearAxis(mouseCoordinates) {
        var x = mouseCoordinates[0];
        var intersectionPointsSample = intersectionPoints[0];
        var leftMostXPoint = intersectionPointsSample[0][0];
        var rightMostXPoint = intersectionPointsSample[intersectionPointsSample.length - 1][0];
        if (leftMostXPoint <= x && x <= rightMostXPoint) {
            for (var axisNumber = 0; axisNumber < intersectionPointsSample.length; axisNumber++) {
                if (intersectionPointsSample[axisNumber][0] > x) { return axisNumber; }
            }
        }
    }
    function computeCentroids(data) {
        var margins = parcoords.margin();
        return parcoords.compute_real_centroids(data).map(function (d) { return [d[0] + margins.left, d[1] + margins.top]; });
    }
    function updateIntersectionPoints() {
        var brushedData = parcoords.selected().length ? parcoords.selected() : data;
        intersectionPoints = brushedData.map(function (d) { return computeCentroids(d) });
    }

    parcoords.on('select', function () { updateIntersectionPoints(); });
    updateIntersectionPoints();
    var svg = d3.select('#' + container_id + ' svg');
    var svgElement = svg[0][0];
    svg.on('mousemove', function () {
        highlightLines(d3.mouse(svgElement));
    })
        .on('mouseout', function () {
            parcoords.unhighlight();
        });
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
        for (var pcp of Object.values(pcps)) {
            pcp.canvas.foreground.classList.add('faded');
            pcp.clear("selected");
            pcp.select_data(pcp.data().filter((item, i) => current_selection.has(item.key + '_' + item.series)));

        }
    }
    else {
        for (var pcp of Object.values(pcps)) {
            pcp.canvas.foreground.classList.remove('faded');
            pcp.clear("selected");
            pcp.select_data(pcp.data().filter((item, i) => !series_off[item.series]));
        }
    }
}

function highlight_selection(items) {
    var current_selection = null;
    if (items) {
        items = items.filter(item => item && !series_off[item.series]);
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
        for (var pcp of Object.values(pcps)) {
            pcp.clear("highlight");
            var selectedData = pcp.selected().length ? pcp.selected() : pcp.data();
            var selected = new Set(selectedData.map(function (d) { return d.key + '_' + d.series; }));
            var pcp_highlighted = new Set(intersect(current_selection, selected));
            pcp.highlight(pcp.data().filter((item, i) => pcp_highlighted.has(item.key + '_' + item.series)));
        }
    }
    else {
        for (var pcp of Object.values(pcps)) {
            pcp.unhighlight();
        }
    }
}

function clear_all() {
    for (var pcp of Object.values(pcps)) {
        pcp.brushReset();
    }
}

function align_filter(series) {
    for (var pcp of Object.values(pcps)) {
        pcp.brushReset();

    }
    for (var pcp of Object.values(pcps)) {
        var extents = {};
        pcp.brushReset();
        pcp['brush_select'].property('value', '1D-axes');
        for (var item of Object.values(pcp.data())) {
            if (item['series'] == series) {
                for (var dim of Object.keys(item)) {
                    if (dim == 'series' || dim == 'key') {
                        continue;
                    }
                    extents[dim] = [Math.min(...item[dim]), Math.max(...item[dim])];
                }
            }
        }
        pcp.brushExtents(extents);
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

    //add hover event
    addHighlightSettings(parcoords, container_id, data);

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

    parcoords['brush_select'] = brush_select;

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

function make_buttons(input_data, config) {

    var series_with_bounds = new Set();
    for (var data_object of Object.values(input_data)) {
        for (var series of Object.keys(data_object)) {
            if (series_with_bounds.has(series)) {
                continue;
            }
            for (var params of Object.values(data_object[series])) {
                for (var values of Object.values(params)) {
                    if (Array.isArray(values)) {
                        series_with_bounds.add(series);
                        continue;
                    }
                }
                if (series_with_bounds.has(series)) {
                    continue;
                }
            }
        }
    }

    var colors = 'colors' in config ? config['colors'] : {};
    for (let series of series_with_bounds) {
        var color;
        if (series in colors) {
            color = colors[series];
        }
        else {
            color = colors['default'];
        }
        d3.select('#button_bar').append('button')
            .html('<i class="fas fa-filter icon" style="color: ' + color + ';"></i> Align Filter to ' + series)
            .attr('id', 'button_align')
            .attr('class', 'button')
            .on('click', function () { align_filter(series); });
    }

    d3.select('#button_bar').append('button')
        .html('<i class="fas fa-eraser"></i> Clear All Selections')
        .attr('id', 'button_clear')
        .attr('class', 'button')
        .on('click', clear_all);
}

function make_graphs(error, input_data, config) {
    if (error != null) {
        console.log(error);
        return;
    }

    console.log(config);
    if ('title' in config) {
        console.log(config['title']);
        document.title = config['title'];
    }

    make_buttons(input_data, config);

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