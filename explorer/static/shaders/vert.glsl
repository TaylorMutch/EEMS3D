uniform float minimum;
uniform float maximum;
uniform float fillValue;
uniform int is_fuzzy;
uniform int legendOrientation;

//colors for normal color ramp
uniform vec3 veryLowColor;
uniform vec3 lowColor;
uniform vec3 moderateLowColor;
uniform vec3 moderateHighColor;
uniform vec3 highColor;
uniform vec3 veryHighColor;

//colors for fuzzy color ramp
/*
uniform vec3 veryLowColorFz;
uniform vec3 lowColorFz;
uniform vec3 moderateLowColorFz;
uniform vec3 moderateHighColorFz;
uniform vec3 highColorFz;
uniform vec3 veryHighColorFz;
*/

//no data color
uniform vec3 noDataColor;
attribute float variable_data;
varying vec3 active_color;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);   // hacking a pointlight
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;

    if (is_fuzzy > 0) {   // use fuzzy color ramp
        /*
        if (variable_data > 0.75) {
            active_color = veryHighColorFz;
        } else if (variable_data > 0.5) {
            active_color = highColorFz;
        } else if (variable_data > 0.0) {
            active_color = moderateHighColorFz;
        } else if (variable_data > -0.5) {
            active_color = moderateLowColorFz;
        } else if (variable_data > -.75){
            active_color = lowColorFz;
        } else {
            active_color = veryLowColorFz;
        }*/

        // value that fuzzy logic is decided on. Flippable with legend orientation
        float operating_data = variable_data;

        if (legendOrientation == 1) {
            operating_data = operating_data * -1.0;
        }

        if (operating_data <= 0.0) {
            active_color = vec3((165.0 + 90.0 * (operating_data + 1.0) * 2.0) / 255.0, operating_data + 1.0, (40.0 + 150.0 * (operating_data +1.0))/255.0);
        }
        else {
            active_color = vec3(1.0 - operating_data * 2.0, (100.0 + 155.0 *(1.0-operating_data)) / 255.0, (40.0 + 150.0 * (1.0-operating_data))/255.0);
        }
    } else {  // use misc color ramp
        float domain = maximum - minimum;
        if (variable_data > (minimum + domain*0.95)) {
            active_color = veryHighColor;
        } else if (variable_data > (minimum + domain*0.66)) {
            active_color = highColor;
        } else if (variable_data > (minimum + domain*0.5)) {
            active_color = moderateHighColor;
        } else if (variable_data > (minimum + domain*0.33)) {
            active_color = moderateLowColor;
        } else if (variable_data > (minimum + domain*0.05)) {
            active_color = lowColor;
        } else {
            active_color = veryLowColor;
        }
    }
    if (variable_data == fillValue) {
        active_color = noDataColor;
    }
}