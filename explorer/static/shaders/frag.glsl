varying vec3 active_color;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
   vec3 normal = normalize(vNormal);    // hacking a pointlight
   vec3 lightDir = normalize(vViewPosition);
   float dotProduct = max( dot(normal, lightDir), 0.0);
   gl_FragColor = vec4(active_color, 1) * dotProduct;
}