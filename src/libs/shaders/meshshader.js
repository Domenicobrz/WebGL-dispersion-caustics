const meshVertex = `
attribute vec4 aPosition;
attribute vec4 aNormal;

uniform mat4 uPerspective;
uniform mat4 uModel;
uniform mat4 uView;

varying vec4 Normal;
varying vec4 Position;
varying vec2 UVPlanePos;

void main() {
    gl_Position  = uPerspective * uView * uModel * vec4(aPosition.xyz, 1.0); 

    Normal = mat4(mat3(uModel)) * aNormal;
    Position = uModel * vec4(aPosition.xyz, 1.0); 

    UVPlanePos = (aPosition.xz / 3.0) * 0.5 + 0.5;
}`;

const meshFragment = `
precision mediump float;

uniform int       uUseTexture;
uniform sampler2D uTexture;
uniform samplerCube uCubeTexture;

uniform vec3 uEyePosition;
uniform vec3 uLightPosition;
uniform vec3 uLightDirection;
uniform float uLightSize;
uniform vec3 uLightPlaneU;
uniform vec3 uLightPlaneV;

uniform float uRayCount;
uniform float uUseSkybox;
uniform float uIOR;
uniform float uDispersion;
uniform float uRefractiveLightReflection;

varying vec4 Normal;
varying vec4 Position;
varying vec2 UVPlanePos;

void main() {
    vec3 normal = normalize(Normal.xyz);
    vec3 lightDir = normalize(uLightPosition - Position.xyz);
    vec3 viewDir  = normalize(uEyePosition - vec3(Position));

    float fresnel = pow((1.0 - dot(normal, viewDir)),   1.6) * 1.0 + 0.65;  
    // float fresnel = 1.0;

    vec3 h = normalize(viewDir + lightDir);
    float specular = pow(   max(dot(h, normal), 0.0),    24.0);


    // compute intersection along LIGHT plane to calculate specular reflections
    {
        vec3 reflectedDir = reflect(-viewDir, normal);
        vec3 planeHitPoint = vec3(999.0);

        vec3 rayDirection = reflectedDir;
        vec3 rayOrigin    = Position.xyz;
        vec3 planeNormal  = uLightDirection;

        float denominator = dot(planeNormal, rayDirection);
        float t = -1.0;
        if (abs(denominator) > 0.0001) {
            vec3 difference = uLightPosition - rayOrigin;
            t = dot(difference, planeNormal) / denominator;

            if (t > 0.0001) {
                planeHitPoint = rayOrigin + rayDirection * t;

                vec3 hitVec = planeHitPoint - uLightPosition;
                float a = abs(dot( hitVec, uLightPlaneU));
                float b = abs(dot( hitVec, uLightPlaneV));
                if( 0.0 <= a && a <= uLightSize && 0.0 <= b && b <= uLightSize) {
                    specular = 1.2;
                }
            }
        }
    }
    // compute intersection along LIGHT plane to calculate specular reflections - END






    

    // compute intersection along plane
    vec3 refractedDir = refract(-viewDir, normal, 1.0 / uIOR);
    vec3 planeHitPoint = vec3(999.0);

    vec3 rayDirection = refractedDir;
    vec3 rayOrigin    = Position.xyz;
    vec3 planeNormal  = vec3(0.0, 1.0, 0.0);

    float denominator = dot(planeNormal, rayDirection);
    float t = -1.0;
    if (abs(denominator) > 0.0001) {
        vec3 difference = vec3(0.0) - rayOrigin;
        t = dot(difference, planeNormal) / denominator;

        if (t > 0.0001) {
            planeHitPoint = rayOrigin + rayDirection * t;
            planeHitPoint.y = 0.0;
        }
    }
    // compute intersection along plane - END


    vec3 refractColor = vec3(0.0);
    vec2 planeUV = (planeHitPoint.xz / 3.0) * 0.5 + 0.5; 
    if (planeUV.x < 1.0 && planeUV.x > 0.0 && planeUV.y < 1.0 && planeUV.y > 0.0) {
        refractColor = texture2D(uTexture, planeUV).rgb / uRayCount;
        refractColor *= 25000.0;
    }

    // use environment map if we miss the surface
    if (t < 0.0 && uUseSkybox > 0.0) {
        refractColor = vec3(
                         textureCube(uCubeTexture, rayDirection).r,
                         textureCube(uCubeTexture, rayDirection + vec3(uDispersion)).g,
                         textureCube(uCubeTexture, rayDirection + vec3(uDispersion * 2.0)).b
                       ) * 0.7;
    }














    // compute intersection along LIGHT plane to calculate reflections from refraction
    if (uRefractiveLightReflection > 0.0)
    {
        vec3 reflectedDir = refract(-viewDir, normal, 1.0 / uIOR);
        vec3 planeHitPoint = vec3(999.0);

        vec3 rayDirection = reflectedDir;
        vec3 rayOrigin    = Position.xyz;
        vec3 planeNormal  = uLightDirection;

        float denominator = dot(planeNormal, rayDirection);
        float tt = -1.0;
        if (abs(denominator) > 0.0001) {
            vec3 difference = uLightPosition - rayOrigin;
            tt = dot(difference, planeNormal) / denominator;

            if (tt > 0.0001 && t <= 0.0) {
                planeHitPoint = rayOrigin + rayDirection * tt;

                vec3 hitVec = planeHitPoint - uLightPosition;
                float a = abs(dot( hitVec, uLightPlaneU));
                float b = abs(dot( hitVec, uLightPlaneV));
                if( 0.0 <= a && a <= uLightSize && 0.0 <= b && b <= uLightSize) {
                    specular = 1.2;
                }
            }
        }
    }
    // compute intersection along LIGHT plane to calculate reflections from refraction - END












    gl_FragColor = vec4(vec3(refractColor * fresnel + specular * fresnel - vec3(0.05)), 1.0); 
}`;


export { meshVertex, meshFragment };