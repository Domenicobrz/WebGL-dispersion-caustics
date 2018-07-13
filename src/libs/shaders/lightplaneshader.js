const lightPlaneVertex = `
attribute vec4 aPosition;

uniform mat4 uPerspective;
uniform mat4 uModel;
uniform mat4 uView;

void main() {
    gl_Position = uPerspective * uView * uModel * aPosition;
}`;

const lightPlaneFragment = `
precision mediump float;

void main() {
	gl_FragColor = vec4(1.0);
}`;


export { lightPlaneVertex, lightPlaneFragment };