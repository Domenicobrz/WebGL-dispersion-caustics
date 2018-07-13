const planeVertex = `
attribute vec4 aPosition;
attribute vec4 aColor;

uniform mat4 uPerspective;
uniform mat4 uModel;
uniform mat4 uView;

varying vec4 Color;
varying vec2 UVPlanePos;

void main() {
    gl_Position  = uPerspective * uView * uModel * vec4(aPosition.xyz, 1.0); 

    Color = vec4(aColor);

    UVPlanePos = (aPosition.xz / 3.0) * 0.5 + 0.5;
}`;

const planeFragment = `
precision mediump float;

uniform int       uUseTexture;
uniform sampler2D uTexture;

uniform float uRayCount;
uniform float uResolution;

varying vec4 Color;
varying vec2 UVPlanePos;


vec4 filterTexture() {
    float fract_x = fract(UVPlanePos.x * uResolution) - 0.5;
    float fract_y = fract(UVPlanePos.y * uResolution) - 0.5;

    float offset = 1.0 / uResolution;
    vec4 center  = texture2D(uTexture, UVPlanePos + vec2(0.0, 0.0));

    vec4 top     = texture2D(uTexture, UVPlanePos + vec2(0.0, +offset));
    vec4 bottom  = texture2D(uTexture, UVPlanePos + vec2(0.0, -offset));
    vec4 left    = texture2D(uTexture, UVPlanePos + vec2(-offset, 0.0));
    vec4 right   = texture2D(uTexture, UVPlanePos + vec2(+offset, 0.0));

    vec4 col = vec4(center);

    // if (fract_x < 0.0) col = col * (1.0 + fract_x) + left * (-fract_x);  
    // if (fract_x > 0.0) col = col * (1.0 - fract_x) + right * (fract_x);  
    // if (fract_y < 0.0) col = col * (1.0 + fract_y) + bottom * (-fract_y);  
    // if (fract_y > 0.0) col = col * (1.0 - fract_y) + top * (fract_y);  

    return col;
}


void main() {
    gl_FragColor = Color; 

    if (uUseTexture > 0) {
        vec4 col = filterTexture() / uRayCount;
        col.xyz *= 25000.0;
        col.xyz += vec3(0.04);
        col.a = 1.0;
        
        gl_FragColor = col;
    } 
}`;


export { planeVertex, planeFragment };