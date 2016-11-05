/**
 * Created by taylo on 10/16/2016.
 */

var res = 400;

var EEMS_TILE_SIZE = [500,500];
var THREE_TILE_SIZE = [res * 100, res * 100];
var x_tiles, y_tiles, dimensions, fill_value;
var material;   // GLOBAL material that all tiles will inherit from
var scene, sites, hiddenSites, renderer, camera, raycaster;
var world_width, world_height, world_x_offset, world_y_offset;
var clearDepth = true;  // determine whether to allow the labels to be hidden
var currentLayerName = 'tmin';
var currentVariableName = "";

var mouse;
var currentSiteSelected;  // = null;

var INTERSECTED = null;
var INTERSECTED_STATIC = null;
var INTERSECTED_HIDDEN = null;

$(document).ready(function() {
    /* global EEMS variables */
    waitingDialog.show('Loading dataset...');

    $('#explorer').hide();

    /* global colors */
    var veryLowColor = new THREE.Color("rgb(205,102,102)");
    var lowColor = new THREE.Color("rgb(245,162,122)");
    var moderateLowColor = new THREE.Color("rgb(252,207,81)");
    var moderateHighColor = new THREE.Color("rgb(215,227,125)");
    var highColor = new THREE.Color("rgb(140,183,164)");
    var veryHighColor = new THREE.Color("rgb(40,146,199)");
    var noDataColor = new THREE.Color("rgb(145,145,145)");

    // setup THREEjs scene
    var container = document.getElementById('scene');
    scene = new THREE.Scene();
    sites = new THREE.Scene();
    hiddenSites = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 100000);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.autoClear = false;                                     // autoClear false, so clear in the render call
    container.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);

    camera.position.set(0,0, 40000);
    camera.up.set(0, 0, 1);
    var initialCameraLookAt = new THREE.Vector3(0,0,0);
    camera.lookAt(initialCameraLookAt);
    var orbit = new THREE.OrbitControls(camera, renderer.domElement);
	orbit.zoomSpeed = 0.5;
	orbit.minDistance = 5000;
    orbit.maxDistance = 80000;

    // our single render pass
    var Render = function () {
        orbit.update();
        renderer.clear();
        renderer.render(scene, camera);
        if (clearDepth) renderer.clearDepth();
        renderer.render(sites, camera);
        if (clearDepth) renderer.clearDepth();
        renderer.render(hiddenSites, camera);
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

    /* Initialize the explorer GUI */
    function Init() {

        google.charts.load('current', {packages: ["orgchart"]});
        google.charts.setOnLoadCallback(drawChart);
        function drawChart() {
            var data = new google.visualization.DataTable();
            data.addColumn('string', 'Variable');	// pk
            data.addColumn('string', 'Parent');	// fk to Variable
            data.addColumn('string', 'layer_name');

            var providers = ['CanESM2', 'CCSM4', 'CNRM-CM5', 'HadGEM2-ES'];

            data.addRow([
                {
                    v: 'ensemble_tmin',
                    f: "Ensemble<div style='color:blue;'>tmin</div>"
                },
                '',
                'tmin'
            ]);

            data.addRow([
                {
                    v: 'ensemble_tmax',
                    f: "Ensemble<div style='color:blue;'>tmax</div>"
                },
                '',
                'tmax'
            ]);

            for (var i = 0; i < providers.length; i++) {
                var name = providers[i];
                data.addRow([
                    {
                        v: name + '_tmin',
                        f: name + "<div style='color:blue;'>tmin</div>"
                    },
                    'ensemble_tmin',
                    'tmin'
                ]);
                data.addRow([
                    {
                        v: name + '_tmax',
                        f: name + "<div style='color:blue;'>tmax</div>"
                    },
                    'ensemble_tmax',
                    'tmax'
                ]);
            }

            var chart = new google.visualization.OrgChart(document.getElementById("providers-tree"));
            chart.draw(data, {allowHtml: true, allowCollapse: true, size: 'small'});

            function selectHandler() {
                var selection = chart.getSelection();
                if (selection.length > 0) {
                    UpdateVariable(data.getValue(selection[0].row, 0), data.getValue(selection[0].row, 2));
                }
            }

            google.visualization.events.addListener(chart, 'select', selectHandler);
        }

        // get the dimensions of the elevation attribute
        $.getJSON('dimensions', function(response) {
            dimensions = response;
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
                is_fuzzy: {type: "i", value: 0},        // THREEjs/webgl apparently doesn't allow boolean types yet
                veryLowColor: {type: "c", value: veryLowColor},
                lowColor: {type: "c", value: lowColor},
                moderateLowColor: {type: "c", value: moderateLowColor},
                moderateHighColor: {type: "c", value: moderateHighColor},
                highColor: {type: "c", value: highColor},
                veryHighColor: {type: "c", value: veryHighColor},
                noDataColor: {type: "c", value: noDataColor},
                verticalScale: {type: "f", value: 1}
            },
            vertexShader: [
                "uniform float minimum;",
                "uniform float maximum;",
                "uniform float fillValue;",
                "uniform float verticalScale;",
                "uniform int is_fuzzy;",
                "uniform int legendOrientation;",
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
                "   gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, position.y, position.z*verticalScale, 1.0);",
                "   vNormal = normalize(normalMatrix * normal);",   // hacking a pointlight
                "   vec4 mvPosition = modelViewMatrix * vec4(position.x, position.y, position.z*verticalScale, 1.0);",
                "   vViewPosition = -mvPosition.xyz;",
                "",
                "if (is_fuzzy > 0) {   // use fuzzy color ramp",

                "   float operating_data = variable_data;",
                "   if (operating_data <= 0.0) {",
                "       active_color = vec3((165.0 + 90.0 * (operating_data + 1.0) * 2.0) / 255.0, operating_data + 1.0, (40.0 + 150.0 * (operating_data +1.0))/255.0);",
                "   }",
                "   else {",
                "       active_color = vec3(1.0 - operating_data * 2.0, (100.0 + 155.0 *(1.0-operating_data)) / 255.0, (40.0 + 150.0 * (1.0-operating_data))/255.0);",
                "   }",
                "} else {",  // use misc color ramp
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

        var numRequestsSent = 0;

        //function CreateOneTile(tile_group, x,y,x_offset,y_offset,world_x_offset,world_y_offset) {
        function CreateOneTile(tile_group, x,y,x_offset,y_offset) {
            numRequestsSent++;
            $.getJSON('tiles/' + x * EEMS_TILE_SIZE[0] + '/' + y * EEMS_TILE_SIZE[1], function (response) {


                var elev_data = response['elev'];
                fill_value = Number(response.fill_value);
                var width = response.x;
                var height = response.y;
                var object_width = Math.floor(THREE_TILE_SIZE[0] * (width / EEMS_TILE_SIZE[0]));
                var object_height = Math.floor(THREE_TILE_SIZE[1] * (height / EEMS_TILE_SIZE[1]));
                var x_object_offset = object_width / 2 - THREE_TILE_SIZE[0]/2;
                var y_object_offset = object_height / 2 - THREE_TILE_SIZE[1]/2;
                var geometry = new THREE.PlaneBufferGeometry(object_width, object_height,
                    width - 1, height - 1);
                // add initial variable attribute and fill it with dummy data
                var dummyVar = new Float32Array(width * height);
                dummyVar.fill(-0.8);
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
                geometry.translate(x_object_offset, -y_object_offset, 0);
                var tile = new THREE.Mesh(geometry, material);
                tile.userData = {x: x * EEMS_TILE_SIZE[0], y: y * EEMS_TILE_SIZE[1]};
                tile_group.add(tile);
                numRequestsSent--;
                if (numRequestsSent == 0) {
                    waitingDialog.hide();
                    CreateFocalPoints();
                }
            });
        }

        world_width = x_tiles * THREE_TILE_SIZE[0];
        world_height = y_tiles * THREE_TILE_SIZE[1];
        world_x_offset = -1 * world_width / 2 + THREE_TILE_SIZE[0]/ 2;
        world_y_offset = world_height / 2 - THREE_TILE_SIZE[1]/2;
        var tile_group = new THREE.Group();

        var local_x_offset = 0;
        var local_y_offset = 0;

        for (var x = 0; x < x_tiles; x++) {
            local_y_offset = 0;
            for (var y = 0; y < y_tiles; y++) {
                CreateOneTile(tile_group, x,y,local_x_offset,local_y_offset);
                local_y_offset -= THREE_TILE_SIZE[1];
            }
            local_x_offset += THREE_TILE_SIZE[0];
        }

        scene.add(tile_group);
        Animate();

        // Add a simple gui for adjusting the vertical height
        var verticalScale = {
            'Vertical Scale':material.uniforms.verticalScale.value,
            'Clear Depth':clearDepth,
            'Min Zoom Distance':orbit.minDistance
        };
        var gui = new dat.GUI({autoPlace: false});
        var terrainControls = gui.addFolder('Terrain Controls', "a");
        terrainControls.add(verticalScale, 'Vertical Scale',0.0, 3.0).onChange( function(){
            material.uniforms.verticalScale.value = verticalScale.verticalScale;

            // update the sprite positions as well

        });
        terrainControls.add(verticalScale, 'Clear Depth', false).onChange( function(value) {
            clearDepth = value;
        });
        terrainControls.add(verticalScale, 'Min Zoom Distance', 1000, 10000).onChange(function(value) {
            orbit.minDistance = value;
        });
        gui.domElement.style.position='absolute';
        gui.domElement.style.bottom = '20px';
        gui.domElement.style.right = '0%';
        gui.domElement.style.textAlign = 'center';
        container.appendChild(gui.domElement);
    }


    /* Create text sprites for each focal point in the scene */
    function CreateFocalPoints() {
        for (var i = 0; i < focal_sites.length; i++) {

            var focal_point = focal_sites[i];
            var lat = focal_point.Lat;
            var lon = focal_point.Lon;

            var x_width = x_tiles * THREE_TILE_SIZE[0];
            var y_width = y_tiles * THREE_TILE_SIZE[1];

            // ratio of position in lat/long space, (0,1)
            var rx = (lon - dimensions.lon_min) / (dimensions.lon_max - dimensions.lon_min);
            var ry = (lat - dimensions.lat_min) / (dimensions.lat_max - dimensions.lat_min);

            // world x,y coords
            var x = rx * x_width - x_width/2;
            var y = ry * y_width - y_width/2;

            var color = {
                r: 0,
                g: 0,
                b: 0,
                a: 1.0
            };

            var confidence = parseInt(Number(focal_point.confidence) / 20 * 255);   // color needs to be an integer

            switch (focal_point.consensus) {
                case 'increase':
                    color.b = confidence;
                    break;
                case 'decrease':
                    color.r = confidence;
                    break;

                case 'unsure':
                    color.r = confidence;
                    color.g = confidence;
                    break;
            }

            var message = 'Site ' + String(focal_point.site);
            var z = focal_point.z;
            var sprite =  makeTextSprite(message, x, y, z,
                { // parameters
                    fontsize: 18,
                    fontface: "Georgia",
                    borderThickness: 4,
                    textColor: {r: 255, g: 255, b: 255, a: 1.0},
                    fillColor: color,
                    radius: 0,
                    vAlign: "bottom",
                    hAlign: "center"
                }
            );

            var hidden_sprite = makeTextSprite(message, x, y, z,
                { // parameters
                    fontsize: 18,
                    fontface: "Georgia",
                    borderColor: {r: 255, g: 255, b: 255, a: 1.0},
                    borderThickness: 4,
                    textColor: {r: 255, g: 255, b: 255, a: 1.0},
                    fillColor: color,
                    radius: 0,
                    vAlign: "bottom",
                    hAlign: "center"
                }
            );

            // link sprite to elevation
            sprite.userData = {
                //sprite_id: i,
                orig_z: z,
                site: focal_point.site,
                tmin: focal_point['tmin'],
                tmax: focal_point['tmax'],
                confidence: focal_point.confidence,
                consensus: focal_point.consensus
            };
            sprite.name = String(focal_point.site);

            hidden_sprite.userData = {
                site: focal_point.site
            };
            hidden_sprite.name = String(focal_point.site);
            hidden_sprite.visible = false;

            sites.add(sprite);
            hiddenSites.add(hidden_sprite);
        }
    }

        /* Update the tiles in the scene */
    function UpdateTiles(variable_name, layer_name) {
        waitingDialog.show('Updating base layer to ' + variable_name + ' - ' + layer_name + '...');
        var numRequestsSent = 0;
        function UpdateOneTile(tile, variable_name) {
            numRequestsSent++;
            var x = tile.userData.x;
            var y = tile.userData.y;
            $.getJSON(variable_name + '/' + layer_name + '/tiles/' + x + '/' + y, function (response) {
                var attribute_data = new Float32Array(response[variable_name]);
                var buffer = tile.geometry.getAttribute("variable_data");
                buffer.array = attribute_data;
                buffer.needsUpdate = true;
                numRequestsSent--;
                if (numRequestsSent == 0) {
                    waitingDialog.hide();
                }
            })
        }

        var tiles = scene.children[0].children;
        for (var i = 0; i < tiles.length; i++) {
            var tile = tiles[i];
            UpdateOneTile(tile, variable_name);
        }
    }

        /* Fetch the new variable info, update scene material, and update the tiles. */
    function UpdateVariable(variableName, layerName) {

        var actualVariableName = variableName.split('_')[0];

        $.getJSON(actualVariableName + '/' + layerName + '/dimensions/').done(
            function (response) {
                dimensions = response;
                var uniforms = material.uniforms;
                uniforms.minimum.value = dimensions.min;
                uniforms.maximum.value = dimensions.max;
                fill_value = Number(dimensions.fill_value);
                uniforms.fillValue.value = fill_value;
                UpdateTiles(actualVariableName, layerName);


                //RedrawLegend(variableName);
                currentVariableName = actualVariableName;
                currentLayerName = layerName;
            }
        );
    }

    var availableLayers = ['tmin', 'tmax'];
    function UpdateResults() {
        var focal_site = sites.getObjectByName(currentSiteSelected);
        var log = $('#results');
        log.empty();
        var data = focal_site.userData;
        log.append('<table>');
        for (var i = 0; i < availableLayers.length; i++) {
            var layer = availableLayers[i];
            var first_attr = true;
            for (var attr in data[layer]) {
                var message = '<tr>' + (first_attr ? '<td>' + layer +' ->  </td>' : '<td></td>') + '<td>' + String(attr) + ': </td><td>' + data[layer][attr] + '</td>';
                log.append(message);
                first_attr = false;
            }
        }

        var textColor;
        switch (data.consensus) {
            case 'increase':
                textColor = 'blue';
                break;
            case 'decrease':
                textColor = 'red';
                break;
            case 'unsure':
                textColor = 'yellow';
                break;
        }

        log.append('</table>');
        log.prepend('<h3 class="confidence" style="text-align:center; color: ' + textColor + '">' +
                    'Confidence = ' + data.confidence + ' Consensus = ' + data.consensus +
                    '</h3>');
        log.prepend('<h3 style="text-align:center;"><a> Site ' + data.site + '</a></h3>');
        log.show();
    }

    function onDocumentMouseDown() {
        raycaster.setFromCamera(mouse, camera);
        //var intersects = raycaster.intersectObjects(sites.children, true);
        var intersects = raycaster.intersectObjects(hiddenSites.children, false);
        if (intersects.length > 0) {
            if (INTERSECTED != intersects[0].object) {
                INTERSECTED = intersects[0].object;
                currentSiteSelected = INTERSECTED.userData.site;
                UpdateResults();
            }
        } else {
            INTERSECTED = null;
        }
    }


    function clear() {

        for (var i = 0; i < hiddenSites.children.length; i++) {
            if (hiddenSites.children[i] != INTERSECTED_HIDDEN) {
                hiddenSites.children[i].visible = false;
            }
        }

        for (var i = 0; i < sites.children.length; i++) {
            if (sites.children[i] != INTERSECTED_STATIC) {
                sites.children[i].visible = true;
            }
        }

    }

    setInterval(clear, 50);

    function onDocumentMouseMove(event) {
        mouse.x = (event.clientX / renderer.domElement.width) * 2 - 1;
        mouse.y = (-(event.clientY - 50) / renderer.domElement.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        var intersects = raycaster.intersectObjects(sites.children, true);
        //var hidden_intersects = raycaster.intersectObjects(hiddenSites.children, false);
        //if (intersects.length > 0 || hidden_intersects > 0) {
        var hidden_intersects = raycaster.intersectObjects(hiddenSites.children, false);
        if (intersects.length > 0) {


            // Pick the closest object
            if (INTERSECTED_STATIC != intersects[0].object) {
                //if (INTERSECTED_STATIC != null) { //If we already have one, reset the previous to its former state
                //    INTERSECTED_STATIC.visible = true;
                //
                //}

                // Get the new object and highlight it
                INTERSECTED_STATIC = intersects[0].object;
                INTERSECTED_STATIC.visible = false;

                INTERSECTED_HIDDEN = hiddenSites.getObjectByName(INTERSECTED_STATIC.name);
                INTERSECTED_HIDDEN.visible = true;

            }
        }
        else if (hidden_intersects.length > 0) {
            // do nothing ?
        }
        else {
            if (INTERSECTED_STATIC) { // If we selected an object, we want to restore its state
                INTERSECTED_STATIC.visible = true;
            }

            if (INTERSECTED_HIDDEN) {
                INTERSECTED_HIDDEN.visible = false;
            }

            /*if (INTERSECTED_HIDDEN) {
                INTERSECTED_HIDDEN.visible = false;
            }*/

            // Clear the saved objects and wait for next object
            INTERSECTED_STATIC = null;
            INTERSECTED_HIDDEN = null;
        }
    }

    document.addEventListener( 'mousedown', onDocumentMouseDown, false);
    document.addEventListener( 'mousemove', onDocumentMouseMove, false);

});