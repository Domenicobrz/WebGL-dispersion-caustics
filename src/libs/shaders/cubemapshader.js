const cubemapVertex = `
attribute vec4 aPosition;

uniform mat4 uPerspective;
uniform mat4 uModel;
uniform mat4 uView;

varying vec4 Position;

void main() {
    gl_Position = uPerspective * mat4(mat3(uView)) * uModel * aPosition;

    Position = uModel * aPosition;
}`;

const cubemapFragment = `
precision mediump float;

varying vec4 Position;

uniform samplerCube uTexture;

void main() {
    vec4 col = vec4(textureCube(uTexture, Position.xyz).rgb * 0.55, 1.0);
	gl_FragColor = col;
}`;


export { cubemapVertex, cubemapFragment };