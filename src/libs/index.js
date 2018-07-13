import { getjson } from "./dependencies/getjson";
import { createCamera } from "./dependencies/camera_v1.05";
import { mat4, vec3 } from "./dependencies/gl-matrix-min";
import { getShader } from "./dependencies/shader";
import { planeVertex, planeFragment } from "./shaders/planeshader";
import { meshVertex, meshFragment } from "./shaders/meshshader";
import { drawCubemap, initCubemapProgram, CubemapProgram } from "./cubemap";
import { getCameraRay } from "./dependencies/getCameraRay";
import { lightPlaneVertex, lightPlaneFragment } from "./shaders/lightplaneshader";
import { rayCount, RESOLUTION, LIGHT_POS, LIGHT_DIR, LIGHT_SIZE, lightPlaneU, lightPlaneV } from "./computeCaustics";
import { lightPlaneVertices, initCausticsComputer, computeCaustics, ETA } from "./computeCaustics";
import { initGUI } from "./controller";
import { controllerParams } from "./controller";

// TODO: compute caustics uses an hardcoded plane size inside the shootRay routine, set to 3


var gl;
var canvas;
var camera;
var PlaneProgram;
var MeshProgram;
var step = Float32Array.BYTES_PER_ELEMENT;

var raycastData = [];
var normalsData = [];

var jsonModelData;

var perspective;
var model;
var view;


var MAX_TRIANGLES_PER_NODE = 7; 




(function start() {
    initCanvas();
    initCamera();
    initModel();    // will call other functions on load complete
    initControls();
}());


function initCanvas() {
    canvas = document.getElementById("canvas");
	canvas.width  = innerWidth;
	canvas.height = innerHeight;

	var names = ["webgl", "experimental-webgl"];

	for(var i in names)
    {
        try 
        {
            gl = canvas.getContext(names[i], { });

            if (gl && typeof gl.getParameter == "function") 
            {
                // WebGL is enabled 
                break;
            }
        } catch(e) { }
    }

    if(gl === null)
        alert("could not initialize WebGL");

    gl.getExtension('OES_texture_float');
    gl.getExtension('OES_texture_float_linear');
}

function initCamera() {
    camera = new createCamera();
    camera.pos = [0, 3, 10];
    camera.look = [0, 0.1, 0];
    camera.autoCentered = true;
    camera.radius = 6.0;
    camera.yaw = 0.9;	//-90 e sai perchè
	camera.pitch = 0.5;


    perspective = mat4.create(); 
    model       = mat4.create(); 
    view        = mat4.create(); 
    mat4.perspective(perspective, 45 * Math.PI / 180, innerWidth / innerHeight, 0.1, 1000);
}

function initModel() {
    getjson("./assets/models/dragon3k.json", function(jsonData) {
        jsonModelData = jsonData;
        initCubemapProgram();
        initPlaneProgram();
        initMeshProgram();
        initLightPlaneProgram();
        initGUI();
        initCausticsComputer(raycastData, normalsData);
        
        requestAnimationFrame(draw);    
    });
}

function initControls() {
    window.addEventListener("wheel", function(e) {
        if(e.deltaY < 0) {
            camera.radius *= 0.95;
        } else {
            camera.radius += 0.2;            
        }
    });
}

function initMeshProgram() {
    MeshProgram = getShader(gl, meshVertex, meshFragment);

    MeshProgram.aPosition = gl.getAttribLocation(MeshProgram, "aPosition");
    MeshProgram.aNormal = gl.getAttribLocation(MeshProgram, "aNormal");

    MeshProgram.uPerspective = gl.getUniformLocation(MeshProgram, "uPerspective");
    MeshProgram.uModel = gl.getUniformLocation(MeshProgram, "uModel");
    MeshProgram.uView = gl.getUniformLocation(MeshProgram, "uView");
    
    MeshProgram.uTexture = gl.getUniformLocation(MeshProgram, "uTexture");
    MeshProgram.uCubeTexture = gl.getUniformLocation(MeshProgram, "uCubeTexture");
    MeshProgram.uUseTexture = gl.getUniformLocation(MeshProgram, "uUseTexture");
    MeshProgram.uEyePosition = gl.getUniformLocation(MeshProgram, "uEyePosition");
    MeshProgram.uRayCount = gl.getUniformLocation(MeshProgram, "uRayCount");
    MeshProgram.uLightPosition = gl.getUniformLocation(MeshProgram, "uLightPosition");
    MeshProgram.uLightDirection = gl.getUniformLocation(MeshProgram, "uLightDirection");
    MeshProgram.uLightSize = gl.getUniformLocation(MeshProgram, "uLightSize");
    MeshProgram.uLightPlaneU = gl.getUniformLocation(MeshProgram, "uLightPlaneU");
    MeshProgram.uLightPlaneV = gl.getUniformLocation(MeshProgram, "uLightPlaneV");
    MeshProgram.uUseSkybox = gl.getUniformLocation(MeshProgram, "uUseSkybox");
    MeshProgram.uIOR = gl.getUniformLocation(MeshProgram, "uIOR");
    MeshProgram.uDispersion = gl.getUniformLocation(MeshProgram, "uDispersion");
    MeshProgram.uRefractiveLightReflection = gl.getUniformLocation(MeshProgram, "uRefractiveLightReflection");
    

    MeshProgram.vertexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, MeshProgram.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(getModelVertices()), gl.STATIC_DRAW); 
}

function initPlaneProgram() {
    PlaneProgram = getShader(gl, planeVertex, planeFragment);

    PlaneProgram.aPosition = gl.getAttribLocation(PlaneProgram, "aPosition");
    PlaneProgram.aColor = gl.getAttribLocation(PlaneProgram, "aColor");

    PlaneProgram.uPerspective = gl.getUniformLocation(PlaneProgram, "uPerspective");
    PlaneProgram.uModel = gl.getUniformLocation(PlaneProgram, "uModel");
    PlaneProgram.uView = gl.getUniformLocation(PlaneProgram, "uView");
    
    PlaneProgram.uTexture = gl.getUniformLocation(PlaneProgram, "uTexture");
    PlaneProgram.uUseTexture = gl.getUniformLocation(PlaneProgram, "uUseTexture");
    PlaneProgram.uRayCount = gl.getUniformLocation(PlaneProgram, "uRayCount");
    PlaneProgram.uResolution = gl.getUniformLocation(PlaneProgram, "uResolution");


    PlaneProgram.vertexBuffer = gl.createBuffer();

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 500, 500, 0, gl.RGBA, gl.FLOAT, null);

    PlaneProgram.texture = texture;

    gl.bindBuffer(gl.ARRAY_BUFFER, PlaneProgram.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(getPlaneVertices()), gl.STATIC_DRAW); 
}


function getModelVertices() {
    var model = jsonModelData;
    var vertices = model.meshes[0].vertices; 
    var normals = model.meshes[0].normals;
    var faces = model.meshes[0].faces;

    var vertexBufferData = [];

    var SCALE = 1.2;

    for (var i = 0; i < faces.length; i++) {
        var triangle = [];
        var normal = [];

        for(var r = 0; r < 3; r++) {    // every face has 3 vertex
            var vertexIndex = faces[i][r];  

            triangle.push({ x: vertices[vertexIndex * 3 + 0] * SCALE,  
                            y: vertices[vertexIndex * 3 + 1] * SCALE, 
                            z: vertices[vertexIndex * 3 + 2] * SCALE});
        }

        var V = vec3.fromValues(triangle[1].x - triangle[0].x,
                                triangle[1].y - triangle[0].y,
                                triangle[1].z - triangle[0].z);

        var W = vec3.fromValues(triangle[2].x - triangle[0].x,
                                triangle[2].y - triangle[0].y,
                                triangle[2].z - triangle[0].z);

        var N = vec3.fromValues(
            V[1]*W[2] - V[2]*W[1],
            V[2]*W[0] - V[0]*W[2],
            V[0]*W[1] - V[1]*W[0]
        );

        vec3.normalize(N, N);


        for(var r = 0; r < 3; r++) {    // every face has 3 vertex
            var vertexIndex = faces[i][r];  
           
            // every vertex has 3 components
            vertexBufferData.push(vertices[vertexIndex * 3 + 0] * SCALE);
            vertexBufferData.push(vertices[vertexIndex * 3 + 1] * SCALE);
            vertexBufferData.push(vertices[vertexIndex * 3 + 2] * SCALE);

            // push fourth position attribute and white colors
            vertexBufferData.push(1.0);     

            vertexBufferData.push(N[0]);     
            vertexBufferData.push(N[1]);     
            vertexBufferData.push(N[2]);     
            vertexBufferData.push(1.0);     
        }

        raycastData.push(triangle);
        normalsData.push(N);
    }




    MeshProgram.vertexCount = vertexBufferData.length / 8;   
    MeshProgram.raycastData = raycastData; 

    return vertexBufferData;
}

function getPlaneVertices() {
    var vertexBufferData = [];
    vertexBufferData.push(-3, 0, -3,      1,1,0,0,1);
    vertexBufferData.push(-3, 0, +3,      1,1,0,0,1);
    vertexBufferData.push(+3, 0, -3,      1,1,0,0,1);

    vertexBufferData.push(-3, 0, +3,      1,1,0,0,1);
    vertexBufferData.push(+3, 0, +3,      1,1,0,0,1);
    vertexBufferData.push(+3, 0, -3,      1,1,0,0,1);

    raycastData.push([{x: -3, y: 0, z: -3}, {x: -3, y: 0, z: +3}, {x: +3, y: 0, z: -3}], 
                     [{x: -3, y: 0, z: +3}, {x: +3, y: 0, z: +3}, {x: +3, y: 0, z: -3}]);

    normalsData.push(vec3.fromValues(0,1,0), vec3.fromValues(0,1,0));
                     

    PlaneProgram.vertexCount = vertexBufferData.length / 8;   

    return vertexBufferData;    
}



var then = 0;
var count = 0;
function draw(now) {
    requestAnimationFrame(draw);
    
    now *= 0.001;
    var deltatime = now - then;
    then = now;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    view = camera.getViewMatrix(deltatime, 0.5);

    computeCaustics();

    if (controllerParams.skybox) 
        drawCubemap(now, deltatime);
    
    drawPlane(now, deltatime);
    drawLightPlane(now, deltatime);
    drawWolf(now, deltatime);
}


function drawWolf(now, deltatime) {
    gl.useProgram(MeshProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, MeshProgram.vertexBuffer);

    gl.enableVertexAttribArray(MeshProgram.aPosition);
    gl.enableVertexAttribArray(MeshProgram.aNormal);

    gl.vertexAttribPointer(MeshProgram.aPosition, 4, gl.FLOAT, false, step * 8, 0);
    gl.vertexAttribPointer(MeshProgram.aNormal,   4, gl.FLOAT, false, step * 8, step * 4);


    view = camera.getViewMatrix(deltatime, 0.5);
    gl.uniformMatrix4fv(MeshProgram.uPerspective, false, perspective);
    gl.uniformMatrix4fv(MeshProgram.uModel, false,       model);
    gl.uniformMatrix4fv(MeshProgram.uView, false,        view);

    gl.uniform1i(MeshProgram.uUseTexture, 0);
    gl.uniform1f(MeshProgram.uRefractiveLightReflection, controllerParams.refractiveLightReflection ? 1 : 0);
    gl.uniform1f(MeshProgram.uIOR, ETA);
    gl.uniform1f(MeshProgram.uDispersion, controllerParams.dispersion * 0.025);
    gl.uniform1f(MeshProgram.uRayCount, rayCount);
    gl.uniform1f(MeshProgram.uUseSkybox, controllerParams.skybox ? 1 : 0);
    gl.uniform3f(MeshProgram.uEyePosition, camera.pos[0], camera.pos[1], camera.pos[2]);
    gl.uniform3f(MeshProgram.uLightPosition, LIGHT_POS.x, LIGHT_POS.y, LIGHT_POS.z);
    gl.uniform3f(MeshProgram.uLightDirection, LIGHT_DIR.x, LIGHT_DIR.y, LIGHT_DIR.z);
    gl.uniform1f(MeshProgram.uLightSize, LIGHT_SIZE);
    gl.uniform3f(MeshProgram.uLightPlaneU, lightPlaneU[0], lightPlaneU[1], lightPlaneU[2]);
    gl.uniform3f(MeshProgram.uLightPlaneV, lightPlaneV[0], lightPlaneV[1], lightPlaneV[2]);


    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, PlaneProgram.texture);
    gl.uniform1i(MeshProgram.uTexture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, CubemapProgram.texture);
    gl.uniform1i(MeshProgram.uCubeTexture, 1);


    gl.drawArrays(gl.TRIANGLES, 0, MeshProgram.vertexCount);
}


function drawPlane(now, deltatime) {

    gl.useProgram(PlaneProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, PlaneProgram.vertexBuffer);

    gl.enableVertexAttribArray(PlaneProgram.aPosition);
    gl.enableVertexAttribArray(PlaneProgram.aColor);

    gl.vertexAttribPointer(PlaneProgram.aPosition, 4, gl.FLOAT, false, step * 8, 0);
    gl.vertexAttribPointer(PlaneProgram.aColor,    4, gl.FLOAT, false, step * 8, step * 4);

    gl.uniformMatrix4fv(PlaneProgram.uPerspective, false, perspective);
    gl.uniformMatrix4fv(PlaneProgram.uModel, false,       model);
    gl.uniformMatrix4fv(PlaneProgram.uView, false,        view);

    gl.uniform1i(PlaneProgram.uUseTexture, 1);
    gl.uniform1f(PlaneProgram.uRayCount, rayCount);
    gl.uniform1f(PlaneProgram.uResolution, RESOLUTION);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, PlaneProgram.texture);
    gl.uniform1i(PlaneProgram.uTexture, 0);


    gl.drawArrays(gl.TRIANGLES, 0, PlaneProgram.vertexCount);
}

// Light render program
var LightPlaneProgram;
function initLightPlaneProgram() {
    LightPlaneProgram = getShader(gl, lightPlaneVertex, lightPlaneFragment);

    LightPlaneProgram.aPosition = gl.getAttribLocation(LightPlaneProgram, "aPosition");

    LightPlaneProgram.uPerspective = gl.getUniformLocation(LightPlaneProgram, "uPerspective");
    LightPlaneProgram.uModel = gl.getUniformLocation(LightPlaneProgram, "uModel");
    LightPlaneProgram.uView = gl.getUniformLocation(LightPlaneProgram, "uView");

    LightPlaneProgram.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, LightPlaneProgram.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lightPlaneVertices()), gl.STATIC_DRAW);
}

function drawLightPlane(now, deltatime) {
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.useProgram(LightPlaneProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, LightPlaneProgram.vertexBuffer);

    gl.enableVertexAttribArray(LightPlaneProgram.aPosition);
    gl.vertexAttribPointer(LightPlaneProgram.aPosition, 4, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(LightPlaneProgram.uPerspective, false, perspective);
    gl.uniformMatrix4fv(LightPlaneProgram.uModel, false,       model);
    gl.uniformMatrix4fv(LightPlaneProgram.uView, false,        view);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.CULL_FACE);    
}

export { gl, perspective, model, view, PlaneProgram, LightPlaneProgram };