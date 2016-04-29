$(document).ready(function(){
    var myurl = 'rest/datasets/1/'; // NOTE**:temporary for prototype
    var variables_list;
    var geometry, material;
    var dataset_struct;
    /* global colors */
    // fuzzy colors
    var veryLowColorFz =  new THREE.Color("rgb(30,89,0)");
    var lowColorFz = new THREE.Color("rgb(64,128,21)");
    var moderateColorFz =  new THREE.Color("rgb(122,184,92)");
    var highColorFz = new THREE.Color("rgb(183,219,164)");
    var veryHighColorFz = new THREE.Color("rgb(255,255,255)");
    // other color mapping
    var veryLowColor = new THREE.Color("rgb(205,102,102)");
    var lowColor = new THREE.Color("rgb(245,162,122)");
    var moderateLowColor = new THREE.Color("rgb(252,207,81)");
    var moderateHighColor = new THREE.Color("rgb(215,227,125)");
    var highColor = new THREE.Color("rgb(140,183,164)");
    var veryHighColor = new THREE.Color("rgb(40,146,199)");
    // nodata color mapping
    var noDataColor = new THREE.Color("rgb(145,145,145)");

    // setup THREEjs scene
    var container = document.getElementById('scene');
    //NOTE** global - make private when we are done
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera( 75, container.offsetWidth/container.offsetHeight, 0.1, 100000 );

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize( container.offsetWidth, container.offsetHeight );
    container.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);

    camera.position.set(0,-1500,80);
    camera.up.set(0,0,1);
    var orbit = new THREE.OrbitControls(camera, renderer.domElement);

    // our single render pass
    var render = function () {
        orbit.update();
        renderer.render(scene, camera);
    };

    // our animation loop
    var animate = function() {
        requestAnimationFrame( animate );
        render();
    };

    init();

    // utility function for when the browser window is resized
    function onWindowResize() {
        var container = document.getElementById('scene');
        camera.aspect = container.offsetWidth/container.offsetHeight;
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        camera.updateProjectionMatrix();
    }

    // recursive function to find a parameter of the eems tree by raw_name
    function findParamByName(variable_name, param, currentNode) {
        if (variable_name == currentNode.attribute.raw_name) {
            return currentNode.attribute[param];
        } else {
            for (var i = 0; i < currentNode.attribute.children.length; i++) {
                currentChild = currentNode.attribute.children[i];
                result = findParamByName(variable_name, param, currentChild);

                if (result !== "") {
                    return result;
                }
            }
        }
        // param not found
        return "";
    }

    function init() {

      // get the initial variable_list
    $.getJSON(myurl + 'variable_list', function(response) {
        variables_list = response['variables'];
        for (var i = 0; i < variables_list.length; i++) {
            $('#variables').append('<li><a href="#" class="variable">' + variables_list[i] + '</a></li>');
        }
    });

    // get the initial eems data structure
    $.getJSON(myurl + 'dataset_struct', function(response) {
        dataset_struct = response;
        // here we build our Google OrgChart
        google.charts.load('current', {packages:["orgchart"]});
        google.charts.setOnLoadCallback(drawChart);

        function drawChart() {
          var data = new google.visualization.DataTable();
          data.addColumn('string', 'Variable');	// pk
          data.addColumn('string', 'DependentVariable');	// fk to Variable
          data.addColumn('boolean', 'IsFuzzy');	// is_fuzzy
          var addRecursiveData = function(currentNode, parentNode) {
            data.addRow([
              {v:currentNode.attribute.raw_name, f:currentNode.attribute.name + "<div style='color:blue;'>" + currentNode.attribute.operation + "</div>"},
              (parentNode ? parentNode.attribute.raw_name : ""),
              currentNode.attribute.is_fuzzy
            ]);
            for (var i = 0; i < currentNode.attribute.children.length; i++) {
              var childNode = currentNode.attribute.children[i];
              addRecursiveData(childNode, currentNode);
            }
            return false;
          }
          addRecursiveData(dataset_struct.nodes);
          var chart = new google.visualization.OrgChart(document.getElementById("eems-tree"));
          chart.draw(data, {allowHtml: true, allowCollapse: true, size: 'small'});

          function selectHandler() {
            var selection = chart.getSelection();
            if (selection.length > 0) {
              updateVariable(data.getValue(selection[0].row, 0));
            }
          }
          google.visualization.events.addListener(chart, 'select', selectHandler);
        }
    });

    // get our initial terrain mesh and set it up in three
    $.getJSON(myurl + 'variable_data', {'name':'elev'}).done(function(data){
        var dimensions = data.dimensions;
        var geometry = new THREE.PlaneBufferGeometry(2000, 2000, dimensions-1, dimensions-1);
        var posBuffer = geometry.getAttribute('position').array;
        var fill_value = Number(data.fill_value);
        for (var i = 0; i < data.elev.length; i++) {
            if (data.elev[i] == fill_value) { // get neighbors and average their values
                /*
                    __________
                    |NW|_N_|NE|
                    |W_|_i_|_E|
                    |SW|_S_|SE|
                */
                var values = [];
                if (i < data.elev.length - dimensions) {          // we are not on the bottom side;
                    values.push(data.elev[(i+dimensions)]);       // south
                    if (i % dimensions != 0) {                    // we are not on the left side
                        values.push(data.elev[i-1]);              // west
                        values.push(data.elev[(i+dimensions)-1]); // southwest
                    }
                    else if (((i + 1) % dimensions) != 0) {       // we are not on the right side
                        values.push(data.elev[i+1]);              // east
                        values.push(data.elev[(i+dimensions)+1]); // southeast
                    }
                }
                if (i >= dimensions ) {                           // we are not on the top side
                    values.push(data.elev[i-dimensions]);         // north
                    if (i % dimensions != 0) {                    // we are not on the left side
                        values.push(data.elev[i-1]);              // west
                        values.push(data.elev[(i-dimensions)-1]); // northwest
                    }
                    else if (((i + 1) % dimensions) != 0) {       // we are not on the right side
                        values.push(data.elev[i+1]);              // east
                        values.push(data.elev[(i-dimensions)+1]); // northeast
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
                if (numToAverage != 0) average = average/numToAverage;
                data.elev[i] = average;
            }
            posBuffer[i*3 + 2] = data.elev[i];
        }

        // add initial variable attribute and fill it with dummy data
        var dummyVar = new Float32Array(dimensions * dimensions);
        dummyVar.fill(0);
        var variable_attr = new THREE.BufferAttribute(dummyVar, 1);
        geometry.addAttribute('variable_data', variable_attr);
        var material = new THREE.ShaderMaterial(
            {
                uniforms : {    // NOTE**these can be changed and will be to update the necessary components with new data
                    minimum: { type: "f", value: -1.0},
                    maximum: { type: "f", value: 1.0},
                    fillValue: {type: "f", value: data.fill_value},
                    is_fuzzy: { type: "i", value: 1},    // THREEjs/webgl apparently doesn't allow boolean types yet
                    veryLowColorFz: { type: "c", value: veryLowColorFz},
                    lowColorFz: { type: "c", value: lowColorFz},
                    moderateColorFz: { type: "c", value: moderateColorFz},
                    highColorFz: { type: "c", value: highColorFz},
                    veryHighColorFz: { type: "c", value: veryHighColorFz},
                    veryLowColor: { type: "c", value: veryLowColor},
                    lowColor: { type: "c", value: lowColor},
                    moderateLowColor: { type: "c", value: moderateLowColor},
                    moderateHighColor: { type: "c", value: moderateHighColor},
                    highColor: { type: "c", value: highColor},
                    veryHighColor: { type: "c", value: veryHighColor},
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
                    "uniform vec3 moderateColorFz;",
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
                    "   if (is_fuzzy > 0) {",   // use fuzzy color ramp
                    "       if (variable_data > 0.6) {",
                    "           active_color = veryHighColorFz;",
                    "       } else if (variable_data > 0.2) {",
                    "           active_color = highColorFz;",
                    "       } else if (variable_data > -0.2) {",
                    "           active_color = moderateColorFz;",
                    "       } else if (variable_data > -0.6) {",
                    "           active_color = lowColorFz;",
                    "       } else {",
                    "           active_color = veryLowColorFz;",
                    "       }",
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
            }
        );
        geometry.computeVertexNormals();    // THREE computes the vertex normals for us
        var mesh = new THREE.Mesh(geometry, material);
        mesh.name = "terrain";
        scene.add( mesh );
        animate();
    });
  }

    function redrawLegend(is_fuzzy, variable_name) {
        var legendContainer = $('#legend');
        legendContainer.empty();
        legendContainer.append('<div class="panel-heading">' + variable_name + '</div>');
        legendContainer.append('<div class="panel-body"></div>');
        var colors;
        var colorstrings;
        if (is_fuzzy) {
            // draw fuzzy color
            colors = [veryLowColorFz, lowColorFz, moderateColorFz, highColorFz, veryHighColorFz];
            colorstrings = ["Very Low", "Low", "Moderate", "High", "Very High"];
        } else {
            // draw other color legend
            colors = [veryLowColor, lowColor, moderateLowColor, moderateHighColor, highColor, veryHighColor];
            colorstrings = ["Very Low", "Low", "Moderate-Low", "Moderate-High", "High", "Very High"];
        }
        colors.push(noDataColor);
        colorstrings.push("No Data");

        // draw the legend colors
        for (var i = 0; i < colors.length; i++) {
            var legendBody = $('.panel-body:last');
            var color = colors[i];
            legendBody.append('<div class="legend-element"><canvas class="legend-image"></canvas><div class="legend-label"></div></div>');
            var context = $('.legend-image:last')[0].getContext('2d');
            context.fillStyle = color.getStyle();
            context.fillRect(0,0,$('.legend-image:last')[0].width,$('.legend-image:last')[0].height);
            $('.legend-label:last')[0].innerHTML = colorstrings[i];
        }
    }

    // go get the variable data and attach it to the scene.
    function updateVariable(variableName) {
      $.getJSON(myurl + 'variable_data', {'name':variableName}).done(
          function(data) {
              var values = new Float32Array(data[variableName]);
              var terrain = scene.getObjectByName("terrain");
              var uniforms = terrain.material.uniforms;
              uniforms.minimum.value = data.min;
              uniforms.maximum.value = data.max;
              uniforms.fillValue.value = data.fill_value;
              var is_fuzzyBool = findParamByName(variableName, "is_fuzzy", dataset_struct.nodes);
              if (is_fuzzyBool) {
                  uniforms.is_fuzzy.value = 1;
              } else {
                  uniforms.is_fuzzy.value = 0;
              }
              // update per vertex attribute
              var buffer = terrain.geometry.getAttribute("variable_data");
              buffer.array = values;
              buffer.needsUpdate = true;
              var formattedVariableName = findParamByName(variableName, 'name', dataset_struct.nodes);
              // update the legend
              redrawLegend(is_fuzzyBool, formattedVariableName);
          }
      );
    }
});
