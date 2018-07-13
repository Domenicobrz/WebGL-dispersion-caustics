import { cubemapVertex, cubemapFragment } from "./shaders/cubemapshader";
import { getShader } from "./dependencies/shader";
import { gl, perspective, model, view } from "./index";

var CubemapProgram;

function initCubemapProgram() {

    CubemapProgram = getShader(gl, cubemapVertex, cubemapFragment);

    CubemapProgram.aPosition = gl.getAttribLocation(CubemapProgram, "aPosition");

    CubemapProgram.uPerspective = gl.getUniformLocation(CubemapProgram, "uPerspective");
    CubemapProgram.uModel = gl.getUniformLocation(CubemapProgram, "uModel");
    CubemapProgram.uView = gl.getUniformLocation(CubemapProgram, "uView");
    
    CubemapProgram.uTexture = gl.getUniformLocation(CubemapProgram, "uTexture");
    CubemapProgram.texture = cubeMapTexture();

    var cubevertices = [
        -1.0,  1.0, -1.0, 1,
        -1.0, -1.0, -1.0, 1,
         1.0, -1.0, -1.0, 1,
         1.0, -1.0, -1.0, 1,
         1.0,  1.0, -1.0, 1,
        -1.0,  1.0, -1.0, 1,

        -1.0, -1.0,  1.0, 1,
        -1.0, -1.0, -1.0, 1,
        -1.0,  1.0, -1.0, 1,
        -1.0,  1.0, -1.0, 1,
        -1.0,  1.0,  1.0, 1,
        -1.0, -1.0,  1.0, 1,

         1.0, -1.0, -1.0, 1,
         1.0, -1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0,  1.0, -1.0, 1,
         1.0, -1.0, -1.0, 1,

        -1.0, -1.0,  1.0, 1,
        -1.0,  1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0, -1.0,  1.0, 1,
        -1.0, -1.0,  1.0, 1,

        -1.0,  1.0, -1.0, 1,
         1.0,  1.0, -1.0, 1,
         1.0,  1.0,  1.0, 1,
         1.0,  1.0,  1.0, 1,
        -1.0,  1.0,  1.0, 1,
        -1.0,  1.0, -1.0, 1,

        -1.0, -1.0, -1.0, 1,
        -1.0, -1.0,  1.0, 1,
         1.0, -1.0, -1.0, 1,
         1.0, -1.0, -1.0, 1,
        -1.0, -1.0,  1.0, 1,
         1.0, -1.0,  1.0, 1
    ];

    CubemapProgram.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, CubemapProgram.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubevertices), gl.STATIC_DRAW);
}



function drawCubemap(now, deltatime) {
    
    gl.disable(gl.DEPTH_TEST);

    gl.useProgram(CubemapProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, CubemapProgram.vertexBuffer);

    gl.enableVertexAttribArray(CubemapProgram.aPosition);
    gl.enableVertexAttribArray(CubemapProgram.aColor);

    gl.vertexAttribPointer(CubemapProgram.aPosition, 4, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(CubemapProgram.uPerspective, false, perspective);
    gl.uniformMatrix4fv(CubemapProgram.uModel, false,       model);
    gl.uniformMatrix4fv(CubemapProgram.uView, false,        view);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, CubemapProgram.texture);
    gl.uniform1i(CubemapProgram.uTexture, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 36);

    gl.enable(gl.DEPTH_TEST);    
}



function cubeMapTexture()
{
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var faces = [["./assets/images/skybox/posx.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
                 ["./assets/images/skybox/negx.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
                 ["./assets/images/skybox/posy.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
                 ["./assets/images/skybox/negy.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
                 ["./assets/images/skybox/posz.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
                 ["./assets/images/skybox/negz.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]];

    for (var i = 0; i < faces.length; i++) {
        var face = faces[i][1];
        var image = new Image();
        image.onload = function(texture, face, image) {
            return function() {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            }
        } (texture, face, image);
        image.src = faces[i][0];
    }
    return texture;
}




export { drawCubemap, initCubemapProgram, CubemapProgram };