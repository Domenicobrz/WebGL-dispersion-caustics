import { gl } from "./index";
import { PlaneProgram, LightPlaneProgram } from "./index";
import { vec3 } from "./dependencies/gl-matrix-min";
import { bvhtree } from "./dependencies/bvhtree_modified";
import { controllerParams } from "./controller";


var LIGHT_POS = { x: -0, y: 1, z: 3 };
var LIGHT_DIR = { x: -0 - LIGHT_POS.x, y: 0 - LIGHT_POS.y, z: -LIGHT_POS.z };
var RAYS_PER_CYCLE = 1000;
var RESOLUTION = 550;

var ETA = 1.5;
var ETA_VARIATION = 0.033;
var LIGHT_SIZE = 1;
var CAUSTICS_STRENGHT = 1.0;
var LIGHT_STRENGHT = 1.5;
var SPECTRAL = true;

var rayCount = 0;

var normals;
var raycastData;
var causticsTextureBuffer;

var lightPlaneU   = vec3.fromValues(0, 0, 0);
var lightPlaneV   = vec3.fromValues(0, 0, 0);
var lightPlaneDir = vec3.fromValues(0, 0, 0);

var MAX_TRIANGLES_PER_NODE = 7; 

var bvh;

// Ray origin reusable buffer
var rayDirectionRB; //= { x: 0, y: 0, z: 0 };
var rayOriginRB; // = { x: LIGHT_POS.x, y: LIGHT_POS.y, z: LIGHT_POS.z };

function initCausticsComputer(_raycastData, _normals) {

    updateParams(controllerParams);

    raycastData = _raycastData;
    normals = _normals;

    rayDirectionRB = { x: 0, y: 0, z: 0 };
    rayOriginRB    = { x: 0, y: 0, z: 0 };


    causticsTextureBuffer = new Float32Array(RESOLUTION * RESOLUTION * 4);
    bvh = new bvhtree.BVH(raycastData, MAX_TRIANGLES_PER_NODE);
    

    for( var i = 0; i < causticsTextureBuffer.length; i++) 
        causticsTextureBuffer[i] = 0;
}

function computeCaustics() {
    for (var i = 0; i < RAYS_PER_CYCLE; i++) 
        shootRay();
    
    rayCount += RAYS_PER_CYCLE;
        
    gl.bindTexture(gl.TEXTURE_2D, PlaneProgram.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, RESOLUTION, RESOLUTION, 0, gl.RGBA, gl.FLOAT, causticsTextureBuffer);
}

function shootRay() {
    var rgb = Math.floor(Math.random() * 3);

    var RANDOM_NUMBER_1 = Math.random(); 
    var RANDOM_NUMBER_2 = Math.random(); 
    
    var PHI = 2 * Math.PI * RANDOM_NUMBER_1;
    var THETA = Math.acos( Math.sqrt( RANDOM_NUMBER_2 ) );    // è zero quando punta verso +y

    var Ucomp = [
        lightPlaneU[0] * Math.cos(PHI) * Math.sin(THETA),
        lightPlaneU[1] * Math.cos(PHI) * Math.sin(THETA),
        lightPlaneU[2] * Math.cos(PHI) * Math.sin(THETA)
    ];

    var Vcomp = [
        lightPlaneV[0] * Math.sin(PHI) * Math.sin(THETA),
        lightPlaneV[1] * Math.sin(PHI) * Math.sin(THETA),
        lightPlaneV[2] * Math.sin(PHI) * Math.sin(THETA)
    ];

    var Dcomp = [
        lightPlaneDir[0] * Math.cos(THETA),
        lightPlaneDir[1] * Math.cos(THETA),
        lightPlaneDir[2] * Math.cos(THETA)
    ];


    var direction = vec3.fromValues(Ucomp[0] + Vcomp[0] + Dcomp[0], 
                                    Ucomp[1] + Vcomp[1] + Dcomp[1],
                                    Ucomp[2] + Vcomp[2] + Dcomp[2]);
    

    if (vec3.dot(lightPlaneDir, direction) < 0) return;
    
    vec3.normalize(direction, direction);

    rayDirectionRB.x = direction[0];
    rayDirectionRB.y = direction[1];
    rayDirectionRB.z = direction[2];

  
    var Urnd = (Math.random() * 2 - 1) * LIGHT_SIZE;
    var Uvariation = vec3.fromValues(lightPlaneU[0], lightPlaneU[1], lightPlaneU[2]);
    Uvariation[0] *= Urnd;
    Uvariation[1] *= Urnd;
    Uvariation[2] *= Urnd;

    var Vrnd = (Math.random() * 2 - 1) * LIGHT_SIZE;
    var Vvariation = vec3.fromValues(lightPlaneV[0], lightPlaneV[1], lightPlaneV[2]);
    Vvariation[0] *= Vrnd;
    Vvariation[1] *= Vrnd;
    Vvariation[2] *= Vrnd;

    rayOriginRB.x = LIGHT_POS.x + Vvariation[0] + Uvariation[0];
    rayOriginRB.y = LIGHT_POS.y + Vvariation[1] + Uvariation[1];
    rayOriginRB.z = LIGHT_POS.z + Vvariation[2] + Uvariation[2];


    for(var ttt = 0; ttt < 10; ttt++) {
        var intersectionResults = bvh.intersectRay(rayOriginRB, rayDirectionRB, false);
        if (intersectionResults.length === 0) return;

        var closest = closestIntersection(intersectionResults);

        if (closest.triangleIndex === 0 || closest.triangleIndex === 1) {
            var _spectral = SPECTRAL;
            if (ttt === 0) _spectral = false;   // on direct plane hits, we're not valuating spectral rays

            var intersectionPoint = closest.intersectionPoint;

            var u = (intersectionPoint.x + 3) / 6;
            var v = (intersectionPoint.z + 3) / 6;

            var uindex = Math.floor(u * RESOLUTION);
            var vindex = Math.floor(v * RESOLUTION);

            var caustStrenght = 3 * CAUSTICS_STRENGHT * LIGHT_STRENGHT;

            if (_spectral) {
                switch(rgb) {
                    // We need to add 3 instead of 1 since every ray has only one of the 3 components in it
                    case 0:    
                        causticsTextureBuffer[(vindex * RESOLUTION + uindex) * 4 + 0] += caustStrenght;
                        break;
                    case 1: 
                        causticsTextureBuffer[(vindex * RESOLUTION + uindex) * 4 + 1] += caustStrenght;
                        break;
                    case 2:
                        causticsTextureBuffer[(vindex * RESOLUTION + uindex) * 4 + 2] += caustStrenght;
                        break;
                }
            } else {
                causticsTextureBuffer[(vindex * RESOLUTION + uindex) * 4 + 0] += 1 * LIGHT_STRENGHT;
                causticsTextureBuffer[(vindex * RESOLUTION + uindex) * 4 + 1] += 1 * LIGHT_STRENGHT;
                causticsTextureBuffer[(vindex * RESOLUTION + uindex) * 4 + 2] += 1 * LIGHT_STRENGHT;
            }

            
            if (ttt === 0) _spectral = SPECTRAL;   // on direct plane hits, we're not valuating spectral rays
            rayCount++;
            return;
        }

        rayOriginRB.x = closest.intersectionPoint.x + rayDirectionRB.x * 0.01;
        rayOriginRB.y = closest.intersectionPoint.y + rayDirectionRB.y * 0.01;
        rayOriginRB.z = closest.intersectionPoint.z + rayDirectionRB.z * 0.01;

        // at this point, we intersected a triangle that's not on the plane, and we need to refract the direction
        var N = vec3.fromValues(normals[closest.triangleIndex][0], 
                                normals[closest.triangleIndex][1], 
                                normals[closest.triangleIndex][2]);

        if (closest.backface) {
            N[0] = -N[0];
            N[1] = -N[1];
            N[2] = -N[2];
        }

        var eta = 1 / ETA;
        switch(rgb) {
            case 1: 
                eta = 1 / (ETA + ETA_VARIATION);
                break;
            case 2:
                eta = 1 / (ETA + ETA_VARIATION * 2);
                break;
        }

        if (!SPECTRAL) eta = 1 / ETA;
        
        refract(direction, direction, N, eta);

        rayDirectionRB.x = direction[0];
        rayDirectionRB.y = direction[1];
        rayDirectionRB.z = direction[2];
    }
}

function closestIntersection(intersectionResult) {

    var intersectionIndex = -1;
    var minSquaredDistance = 999;
    
    for (var i = 0; i < intersectionResult.length; i++) {
        var intersectionPoint = intersectionResult[i].intersectionPoint;

        var x = intersectionPoint.x - rayOriginRB.x;
        var y = intersectionPoint.y - rayOriginRB.y;
        var z = intersectionPoint.z - rayOriginRB.z;

        var sqrdDistance = x*x + y*y + z*z;

        if (sqrdDistance < minSquaredDistance) {
            minSquaredDistance = sqrdDistance;
            intersectionIndex = i;
        }
    }

    return intersectionResult[intersectionIndex];
}

function refract(vec1, I, N, eta) {
    var dotNI = vec3.dot(N, I);

    var k = 1.0 - eta * eta * (1.0 - dotNI * dotNI);
    var sqrtK = Math.sqrt(k);

    if (k < 0.0) {
        vec1[0] = 0;
        vec1[1] = 0;
        vec1[2] = 0;
    }
    else {
        // R    = eta * I    - (eta * vec3.dot(N, I) + Math.sqrt(k)) * N;
        vec1[0] = eta * I[0] - (eta * dotNI + sqrtK) * N[0];
        vec1[1] = eta * I[1] - (eta * dotNI + sqrtK) * N[1];
        vec1[2] = eta * I[2] - (eta * dotNI + sqrtK) * N[2];
    }

}


function lightPlaneVertices() {
    var bl = {
        x: LIGHT_POS.x - lightPlaneU[0] * LIGHT_SIZE - lightPlaneV[0] * LIGHT_SIZE,
        y: LIGHT_POS.y - lightPlaneU[1] * LIGHT_SIZE - lightPlaneV[1] * LIGHT_SIZE,
        z: LIGHT_POS.z - lightPlaneU[2] * LIGHT_SIZE - lightPlaneV[2] * LIGHT_SIZE
    };
    var br = {
        x: LIGHT_POS.x + lightPlaneU[0] * LIGHT_SIZE - lightPlaneV[0] * LIGHT_SIZE,
        y: LIGHT_POS.y + lightPlaneU[1] * LIGHT_SIZE - lightPlaneV[1] * LIGHT_SIZE,
        z: LIGHT_POS.z + lightPlaneU[2] * LIGHT_SIZE - lightPlaneV[2] * LIGHT_SIZE
    };
    var tl = {
        x: LIGHT_POS.x - lightPlaneU[0] * LIGHT_SIZE + lightPlaneV[0] * LIGHT_SIZE,
        y: LIGHT_POS.y - lightPlaneU[1] * LIGHT_SIZE + lightPlaneV[1] * LIGHT_SIZE,
        z: LIGHT_POS.z - lightPlaneU[2] * LIGHT_SIZE + lightPlaneV[2] * LIGHT_SIZE
    };
    var tr = {
        x: LIGHT_POS.x + lightPlaneU[0] * LIGHT_SIZE + lightPlaneV[0] * LIGHT_SIZE,
        y: LIGHT_POS.y + lightPlaneU[1] * LIGHT_SIZE + lightPlaneV[1] * LIGHT_SIZE,
        z: LIGHT_POS.z + lightPlaneU[2] * LIGHT_SIZE + lightPlaneV[2] * LIGHT_SIZE
    };


    var vertices = [ 
        bl.x, bl.y, bl.z, 1,
        br.x, br.y, br.z, 1,
        tl.x, tl.y, tl.z, 1,
    
        tl.x, tl.y, tl.z, 1,
        br.x, br.y, br.z, 1,
        tr.x, tr.y, tr.z, 1,
    ];

    return vertices;
}


function updateVariablesFromParams(controllerParams) {
    LIGHT_SIZE = controllerParams.lightSize;

    var yaw = controllerParams.lightYaw;
    var pitch = controllerParams.lightPitch;
    var r = controllerParams.lightDistance;

    var x = Math.cos(yaw) * Math.cos(pitch) * r;
    var y = Math.sin(pitch) * r;
    var z = Math.sin(yaw) * Math.cos(pitch) * r;

    LIGHT_POS = { x: x, y: y, z: z };
    LIGHT_DIR = { x: -0 - LIGHT_POS.x, y: 0 - LIGHT_POS.y, z: -LIGHT_POS.z };

    lightPlaneDir = vec3.fromValues(LIGHT_DIR.x, LIGHT_DIR.y, LIGHT_DIR.z);
    vec3.normalize(lightPlaneDir, lightPlaneDir);
    // it's required to duplicate this code since lightPlaneVertices() relies on 
    // updated values for lightPlaneU & lightPlaneV
    vec3.cross(lightPlaneU, lightPlaneDir, vec3.fromValues(0, 1, 0));
    vec3.normalize(lightPlaneU, lightPlaneU);  

    vec3.cross(lightPlaneV, lightPlaneDir, lightPlaneU);
    vec3.normalize(lightPlaneV, lightPlaneV); 

    LIGHT_STRENGHT = controllerParams.lightStrenght;
    ETA_VARIATION = controllerParams.dispersion;
    ETA = controllerParams.IOR;

    if (ETA_VARIATION === 0) SPECTRAL = false;
    else                     SPECTRAL = true;
}

function updateParams(controllerParams) {
    updateVariablesFromParams(controllerParams);

    rayCount = 0;
    causticsTextureBuffer = new Float32Array(RESOLUTION * RESOLUTION * 4);

    LightPlaneProgram.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, LightPlaneProgram.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lightPlaneVertices()), gl.STATIC_DRAW);
}

function updateRaycount() {
    RAYS_PER_CYCLE = controllerParams.raysPerCycle;
}

function updateResolution() {
    RESOLUTION = Math.floor(controllerParams.resolution);
    causticsTextureBuffer = new Float32Array(RESOLUTION * RESOLUTION * 4);
    rayCount = 0;    
}


var controllerFunctions = {
    updateParams: updateParams,
    updateRaycount: updateRaycount,
    updateResolution: updateResolution
};


export { rayCount, RESOLUTION, LIGHT_POS, LIGHT_DIR, LIGHT_SIZE, lightPlaneVertices, controllerFunctions,
         lightPlaneU, lightPlaneV, computeCaustics, initCausticsComputer, ETA };