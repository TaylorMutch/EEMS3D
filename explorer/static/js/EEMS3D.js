/**
 * Created by taylor on 4/29/2016.
 */
$(document).ready(function() {
    /* global EEMS variables */
    var EEMS_TILE_SIZE = [500,500];
    var THREE_TILE_SIZE = [4000 * EEMS_TILE_SIZE[0]/100, 4000 * EEMS_TILE_SIZE[1]/100];
    var x_tiles, y_tiles, dimensions, fill_value;
    var eems;
    var material;   // GLOBAL material that all tiles will inherit from

    /* global colors */
    var veryLowColorFz = new THREE.Color("rgb(30,89,0)");
    var lowColorFz = new THREE.Color("rgb(64,128,21)");
    var moderateLowColorFz = new THREE.Color("rgb(96,160,45)");
    var moderateHighColorFz = new THREE.Color("rgb(142,194,120)");
    var highColorFz = new THREE.Color("rgb(183,219,164)");
    var veryHighColorFz = new THREE.Color("rgb(255,255,255)");
    var veryLowColor = new THREE.Color("rgb(205,102,102)");
    var lowColor = new THREE.Color("rgb(245,162,122)");
    var moderateLowColor = new THREE.Color("rgb(252,207,81)");
    var moderateHighColor = new THREE.Color("rgb(215,227,125)");
    var highColor = new THREE.Color("rgb(140,183,164)");
    var veryHighColor = new THREE.Color("rgb(40,146,199)");
    var noDataColor = new THREE.Color("rgb(145,145,145)");

    // setup THREEjs scene
    var container = document.getElementById('scene');
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 100000);

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);

    camera.position.set(0,0, 40000);
    camera.up.set(0, 0, 1);
    var initialCameraLookAt = new THREE.Vector3(0,0,0);
    camera.lookAt(initialCameraLookAt);
    var orbit = new THREE.OrbitControls(camera, renderer.domElement);

    // our single render pass
    var Render = function () {
        orbit.update();
        renderer.render(scene, camera);
    };

    // our animation loop
    var Animate = function () {
        requestAnimationFrame(Animate);
        Render();
    };

    Init();

    // utility function for when the browser window is resized
    function onWindowResize() {
        var container = document.getElementById('scene');
        camera.aspect = container.offsetWidth / container.offsetHeight;
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        camera.updateProjectionMatrix();
    }

    /* get the EEMS program and initialize the explorer GUI */
    function Init() {
        $.getJSON('eems-program', function (response) {
            eems = response;
            google.charts.load('current', {packages: ["orgchart"]});
            google.charts.setOnLoadCallback(drawChart);
            function drawChart() {
                var data = new google.visualization.DataTable();
                data.addColumn('string', 'Variable');	// pk
                data.addColumn('string', 'Parent');	// fk to Variable
                data.addColumn('boolean', 'IsFuzzy');	// is_fuzzy

                $.each(eems.nodes, function (key, value) {
                    if (value.children) {
                        for (var i = 0; i < value.children.length; i++) {
                            var childName = value.children[i];
                            if (childName == 'elev') continue;
                            var childNode = eems.nodes[childName];
                            data.addRow([
                                {
                                    v: childName,
                                    f: childName + "<div style='color:blue;'>" + eems.nodes[childName].operation + "</div>"
                                },
                                key,
                                childNode.is_fuzzy
                            ]);
                        }
                    }
                });
                // hack to add the root nodes back in
                var keys = data.getDistinctValues(0);
                var rootNodes = [];
                $.each(eems.nodes, function (key, value) {
                    var notFound = true;
                    if (key != 'elev') {    // ignore keys that read for elevation data, not important in EEMS
                        for (var i = 0; i < keys.length; i++) {
                            if (keys[i] == key) {
                                notFound = false;
                                break;
                            }
                        }
                        if (notFound) { // We found a node without a parent
                            rootNodes.push(key);
                        }
                    }
                });
                for (var i = 0; i < rootNodes.length; i++) {
                    var rootNode = eems.nodes[rootNodes[i]];
                    data.addRow([
                        {
                            v: rootNodes[i],
                            f: rootNodes[i] + "<div style='color: blue;'>" + rootNode.operation + "</div>"
                        },
                        "",
                        rootNode.is_fuzzy
                    ]);
                }

                var chart = new google.visualization.OrgChart(document.getElementById("eems-tree"));
                chart.draw(data, {allowHtml: true, allowCollapse: true, size: 'small'});

                function selectHandler() {
                    var selection = chart.getSelection();
                    if (selection.length > 0) {
                        UpdateVariable(data.getValue(selection[0].row, 0));
                    }
                }

                google.visualization.events.addListener(chart, 'select', selectHandler);
            }
        });

        // get the dimensions of the elevation attribute
        $.getJSON('elev/dimensions', function(response) {
            dimensions = response['elev'];
            x_tiles = Math.ceil(dimensions.x/EEMS_TILE_SIZE[0]);
            y_tiles = Math.ceil(dimensions.y/EEMS_TILE_SIZE[1]);
            fill_value = Number(dimensions.fill_value);
            CreateTiles();
        });
    }


    /* Create the initial tiles in the scene */
    function CreateTiles() {

        material = new THREE.ShaderMaterial({
            uniforms: {
                minimum: {type: "f", value: -1.0},
                maximum: {type: "f", value: 1.0},
                fillValue: {type: "f", value: fill_value},
                is_fuzzy: {type: "i", value: 1},    // THREEjs/webgl apparently doesn't allow boolean types yet
                veryLowColorFz: {type: "c", value: veryLowColorFz},
                lowColorFz: {type: "c", value: lowColorFz},
                moderateLowColorFz: {type: "c", value: moderateLowColorFz},
                moderateHighColorFz: {type: "c", value: moderateHighColorFz},
                highColorFz: {type: "c", value: highColorFz},
                veryHighColorFz: {type: "c", value: veryHighColorFz},
                veryLowColor: {type: "c", value: veryLowColor},
                lowColor: {type: "c", value: lowColor},
                moderateLowColor: {type: "c", value: moderateLowColor},
                moderateHighColor: {type: "c", value: moderateHighColor},
                highColor: {type: "c", value: highColor},
                veryHighColor: {type: "c", value: veryHighColor},
                noDataColor: {type: "c", value: noDataColor}
            },
            vertexShader: [
                "uniform float minimum;",
                "uniform float maximum;",
                "uniform float fillValue;",
                "uniform int is_fuzzy;",
                "",
                "//colors for normal color ramp",
                "uniform vec3 veryLowColor;",
                "uniform vec3 lowColor;",
                "uniform vec3 moderateLowColor;",
                "uniform vec3 moderateHighColor;",
                "uniform vec3 highColor;",
                "uniform vec3 veryHighColor;",
                "",
                "//colors for fuzzy color ramp",
                "uniform vec3 veryLowColorFz;",
                "uniform vec3 lowColorFz;",
                "uniform vec3 moderateLowColorFz;",
                "uniform vec3 moderateHighColorFz;",
                "uniform vec3 highColorFz;",
                "uniform vec3 veryHighColorFz;",
                "",
                "//no data color",
                "uniform vec3 noDataColor;",
                "attribute float variable_data;",
                "varying vec3 active_color;",
                "",
                "varying vec3 vNormal;",
                "varying vec3 vViewPosition;",
                "",
                "void main() {",
                "   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
                "   vNormal = normalize(normalMatrix * normal);",   // hacking a pointlight
                "   vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);",
                "   vViewPosition = -mvPosition.xyz;",
                "",
                "if (is_fuzzy > 0) {   // use fuzzy color ramp",
                "   if (variable_data > 0.75) {",
                "       active_color = veryHighColorFz;",
                "   } else if (variable_data > 0.5) {",
                "       active_color = highColorFz;",
                "   } else if (variable_data > 0.0) {",
                "       active_color = moderateHighColorFz;",
                "   } else if (variable_data > -0.5) {",
                "       active_color = moderateLowColorFz;",
                "   } else if (variable_data > -.75){",
                "       active_color = lowColorFz;",
                "   } else {",
                "       active_color = veryLowColorFz;",
                "   }",
                "   } else {",  // use misc color ramp
                "       float domain = maximum - minimum;",
                "       if (variable_data > (minimum + domain*0.95)) {",
                "           active_color = veryHighColor;",
                "       } else if (variable_data > (minimum + domain*0.66)) {",
                "           active_color = highColor;",
                "       } else if (variable_data > (minimum + domain*0.5)) {",
                "           active_color = moderateHighColor;",
                "       } else if (variable_data > (minimum + domain*0.33)) {",
                "           active_color = moderateLowColor;",
                "       } else if (variable_data > (minimum + domain*0.05)) {",
                "           active_color = lowColor;",
                "       } else {",
                "           active_color = veryLowColor;",
                "       }",
                "   }",
                "   if (variable_data == fillValue) {",
                "       active_color = noDataColor;",
                "   }",
                "}"
            ].join("\n"),
            fragmentShader: [
                "varying vec3 active_color;",
                "",
                "varying vec3 vNormal;",
                "varying vec3 vViewPosition;",
                "",
                "void main() {",
                "   vec3 normal = normalize(vNormal);",    // hacking a pointlight
                "   vec3 lightDir = normalize(vViewPosition);",
                "   float dotProduct = max( dot(normal, lightDir), 0.0);",
                "   gl_FragColor = vec4(active_color, 1) * dotProduct;",
                "}"
            ].join("\n")
        });

        function CreateOneTile(tile_group, x,y,x_offset,y_offset,world_x_offset,world_y_offset) {
            $.getJSON('elev/tiles/' + x * EEMS_TILE_SIZE[0] + '/' + y * EEMS_TILE_SIZE[1], function (response) {
                var elev_data = response['elev'];
                fill_value = Number(response.fill_value);
                var width = response.x;
                var height = response.y;
                var geometry = new THREE.PlaneBufferGeometry(THREE_TILE_SIZE[0], THREE_TILE_SIZE[1],
                    width - 1, height - 1);
                // add initial variable attribute and fill it with dummy data
                var dummyVar = new Float32Array(width * height);
                dummyVar.fill(0);
                var variable_attr = new THREE.BufferAttribute(dummyVar, 1);
                geometry.addAttribute('variable_data', variable_attr);

                // add height values
                var posBuffer = geometry.getAttribute('position').array;

                function correctedValue(i) { // TODO - move this to the django side
                    if (elev_data[i] == fill_value) { // get neighbors and average their values
                        /*
                         __________
                         |NW|_N_|NE|
                         |W_|_i_|_E|
                         |SW|_S_|SE|
                         */
                        var values = [];
                        if (i < elev_data.length - width) {          // we are not on the bottom side;
                            values.push(elev_data[(i + width)]);       // south
                            if (i % width != 0) {                    // we are not on the left side
                                values.push(elev_data[i - 1]);              // west
                                values.push(elev_data[(i + width) - 1]); // southwest
                            }
                            else if (((i + 1) % width) != 0) {       // we are not on the right side
                                values.push(elev_data[i + 1]);              // east
                                values.push(elev_data[(i + width) + 1]); // southeast
                            }
                        }
                        if (i >= width) {                           // we are not on the top side
                            values.push(elev_data[i - width]);         // north
                            if (i % width != 0) {                    // we are not on the left side
                                values.push(elev_data[i - 1]);              // west
                                values.push(elev_data[(i - width) - 1]); // northwest
                            }
                            else if (((i + 1) % width) != 0) {       // we are not on the right side
                                values.push(elev_data[i + 1]);              // east
                                values.push(elev_data[(i - width) + 1]); // northeast
                            }
                        }
                        var average = 0;
                        var numToAverage = 0;
                        for (var j = 0; j < values.length; j++) { // take the average of collected values
                            if (values[j] != fill_value) {
                                average += values[j];
                                numToAverage += 1;
                            }
                        }
                        if (numToAverage != 0) average = average / numToAverage;
                        elev_data[i] = average;
                    }
                    return elev_data[i];
                }

                // account for missing values in the elevation data
                for (var i = 0; i < elev_data.length; i++) {
                    // set the actual z positions
                    posBuffer[i * 3 + 2] = correctedValue(i);
                }
                geometry.computeVertexNormals();
                geometry.translate(world_x_offset, world_y_offset, 0);
                geometry.translate(x_offset, y_offset, 0);
                var tile = new THREE.Mesh(geometry, material);
                tile.userData = {x: x * EEMS_TILE_SIZE[0], y: y * EEMS_TILE_SIZE[1]};
                tile_group.add(tile);
            });
        }

        var world_width = x_tiles * THREE_TILE_SIZE[0];
        var world_height = y_tiles * THREE_TILE_SIZE[1];
        var world_x_offset = -1 * world_width / 2 + THREE_TILE_SIZE[0]/ 2;
        var world_y_offset = world_height / 2 - THREE_TILE_SIZE[1]/2;
        var tile_group = new THREE.Group();


        var local_x_offset = 0;
        var local_y_offset = 0;

        for (var x = 0; x < x_tiles; x++) {
            local_y_offset = 0;
            for (var y = 0; y < y_tiles; y++) {
                CreateOneTile(tile_group, x,y,local_x_offset,local_y_offset,world_x_offset,world_y_offset);
                local_y_offset -= THREE_TILE_SIZE[1];
            }
            local_x_offset += THREE_TILE_SIZE[0];
        }

        scene.add(tile_group);
        Animate();
    }

    /* Update the tiles in the scene */
    function UpdateTiles(variable_name) {

        function UpdateOneTile(tile, variable_name) {
            var x = tile.userData.x;
            var y = tile.userData.y;
            $.getJSON(variable_name + '/tiles/' + x + '/' + y, function (response) {
                var attribute_data = new Float32Array(response[variable_name]);
                var buffer = tile.geometry.getAttribute("variable_data");
                buffer.array = attribute_data;
                buffer.needsUpdate = true;
            })
        }

        var tiles = scene.children[0].children;
        for (var i = 0; i < tiles.length; i++) {
            var tile = tiles[i];
            UpdateOneTile(tile, variable_name);
        }
    }

    /* Update the legend with the new variable name */
    function RedrawLegend(variable_name) {
        var legendContainer = $('#legend');
        var variableNode = eems.nodes[variable_name];

        legendContainer.empty();
        legendContainer.append('<div class="panel-heading">' + variable_name + '</div>');
        legendContainer.append('<div class="panel-body"></div>');
        var colors;
        var colorstrings = ["Very Low", "Low", "Moderate-Low", "Moderate-High", "High", "Very High"];

        if (variableNode.is_fuzzy) {
            // draw fuzzy color
            colors = [veryLowColorFz, lowColorFz, moderateLowColorFz, moderateHighColorFz, highColorFz, veryHighColorFz];
        } else {
            // draw other color legend
            colors = [veryLowColor, lowColor, moderateLowColor, moderateHighColor, highColor, veryHighColor];
        }
        colors.push(noDataColor);
        colorstrings.push("No Data");

        // draw the legend colors
        for (var i = 0; i < colors.length; i++) {
            var legendBody = $('.panel-body:last');
            var color = colors[i];
            legendBody.append('<div class="legend-element"><canvas class="legend-image"></canvas><div class="legend-label"></div></div>');
            var lastLegendImage = $('.legend-image:last')[0];
            var context = lastLegendImage.getContext('2d');
            context.fillStyle = color.getStyle();
            context.fillRect(0, 0, lastLegendImage.width, lastLegendImage.height);
            $('.legend-label:last')[0].innerHTML = colorstrings[i];
        }
    }

    /* Fetch the new variable info, update scene material, and update the tiles. */
    function UpdateVariable(variableName) {
        $.getJSON(variableName + '/dimensions/').done(
            function (response) {
                dimensions = response[variableName];
                var uniforms = material.uniforms;
                uniforms.minimum.value = dimensions.min;
                uniforms.maximum.value = dimensions.max;
                fill_value = Number(dimensions.fill_value);
                uniforms.fillValue.value = fill_value;
                var is_fuzzy = eems.nodes[variableName].is_fuzzy;
                if (is_fuzzy) {
                    uniforms.is_fuzzy.value = 1;
                } else {
                    uniforms.is_fuzzy.value = 0;
                }
                UpdateTiles(variableName);
                RedrawLegend(variableName);
            }
        );
    }
});