uniform float minimum;
uniform float maximum;
uniform float fillValue;
uniform int is_fuzzy;

//colors for normal color ramp
uniform vec3 veryLowColor;
uniform vec3 lowColor;
uniform vec3 moderateLowColor;
uniform vec3 moderateHighColor;
uniform vec3 highColor;
uniform vec3 veryHighColor;

//colors for fuzzy color ramp
uniform vec3 veryLowColorFz;
uniform vec3 lowColorFz;
uniform vec3 moderateColorFz;
uniform vec3 highColorFz;
uniform vec3 veryHighColorFz;

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
        if (variable_data > 0.6) {
            active_color = veryHighColorFz;
        } else if (variable_data > 0.2) {
            active_color = highColorFz;
        } else if (variable_data > -0.2) {
            active_color = moderateColorFz;
        } else if (variable_data > -0.6) {
            active_color = lowColorFz;
        } else {
            active_color = veryLowColorFz;
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