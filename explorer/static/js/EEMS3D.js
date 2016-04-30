/**
 * Created by taylor on 4/29/2016.
 */
$(document).ready(function() {

    var variables_list;
    var geometry, material;
    var dataset_struct;
    /* global colors */
    // fuzzy colors
    var veryLowColorFz = new THREE.Color("rgb(30,89,0)");
    var lowColorFz = new THREE.Color("rgb(64,128,21)");
    var moderateColorFz = new THREE.Color("rgb(122,184,92)");
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
    var camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 100000);

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);

    camera.position.set(0, -1500, 80);
    camera.up.set(0, 0, 1);
    var orbit = new THREE.OrbitControls(camera, renderer.domElement);

    // our single render pass
    var render = function () {
        orbit.update();
        renderer.render(scene, camera);
    };

    // our animation loop
    var animate = function () {
        requestAnimationFrame(animate);
        render();
    };

    init();

    // utility function for when the browser window is resized
    function onWindowResize() {
        var container = document.getElementById('scene');
        camera.aspect = container.offsetWidth / container.offsetHeight;
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        camera.updateProjectionMatrix();
    }

    function init() {
        //var location = window.location.pathname.toString();
//var datasetID = location.split('/')[location.split('/').length-1];

//console.log(datasetID);

// TODO - Implement dataset picker
// if id is null, then we ask user to specify what dataset they want to view


/*
    TODO - Implement a grid of THREE.BufferPlaneGeometry objects as TILES

    Each tile will correspond to an ID assigned by:
        Getting the max size of the variable data (max_x, max_y)
        Starting at (0,0) and going by 100 increments, we send requests to \tiles\layer\x\y
        and load the buffer z values (i+2), then prepare the data buffer for each plane.

        Variables can be found at... TODO - Implement variable list retrieval in Django side

        We then get the first variable in the EEMS variable list and load the data buffer for each plane
        in the same way that we do for the elevation data.

 */


/*
    TODO - Reimplement the legend

    TODO - Implement classify and legend methods in Django to serve the values that we need

 */

    }
});