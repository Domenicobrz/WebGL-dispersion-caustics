import * as dat from 'dat.gui';
import { controllerFunctions } from "./computeCaustics";

const gui = new dat.GUI();


var controllerParams = {
    raysPerCycle: 1000,
    lightSize: 0.4,
    lightStrenght: 5,
    lightYaw: 2.1,
    lightPitch: 0.61,
    lightDistance: 3,

    IOR: 1.5,

    dispersion: 0.03,
    resolution: 550,

    skybox: true,
    refractiveLightReflection: true,

    reset: function() {
        controllerParams.raysPerCycle = 1000;
        controllerParams.lightSize = 0.4;
        controllerParams.lightStrenght = 5;
        controllerParams.lightYaw = 2.1;
        controllerParams.lightPitch = 0.61;
        controllerParams.lightDistance = 3;

        controllerParams.IOR = 1.5;

        controllerParams.dispersion = 0.03;
        controllerParams.resolution = 550;

        controllerFunctions.updateParams(controllerParams);
    },
};


function initGUI() {
    var f1 = gui.addFolder('Performance');
    var f2 = gui.addFolder('Light params');
    var f3 = gui.addFolder('Light position');

    f1.add(controllerParams, 'raysPerCycle').onFinishChange(() => controllerFunctions.updateRaycount(controllerParams));
    f1.add(controllerParams, 'resolution', 10, 1000).onChange(() => controllerFunctions.updateResolution(controllerParams));
    f1.add(controllerParams, 'skybox');

    f2.add(controllerParams, 'dispersion', 0, 0.1).onChange(() => controllerFunctions.updateParams(controllerParams));
    f2.add(controllerParams, 'IOR', 1, 1.95).onChange(() => controllerFunctions.updateParams(controllerParams));
    f2.add(controllerParams, 'lightStrenght', 0, 15).onChange(() => controllerFunctions.updateParams(controllerParams));
    f2.add(controllerParams, 'lightSize', 0, 5).onChange(() => controllerFunctions.updateParams(controllerParams));
    f2.add(controllerParams, 'refractiveLightReflection');
    
    f3.add(controllerParams, 'lightYaw',  0, 6.28).onChange(() => controllerFunctions.updateParams(controllerParams));
    f3.add(controllerParams, 'lightPitch',  0, 3.14 / 2).onChange(() => controllerFunctions.updateParams(controllerParams));
    f3.add(controllerParams, 'lightDistance',  0.5, 8).onChange(() => controllerFunctions.updateParams(controllerParams));

    f1.open();
    f2.open();
    f3.open();

    gui.add(controllerParams, 'reset');    
}


export { initGUI, controllerParams };