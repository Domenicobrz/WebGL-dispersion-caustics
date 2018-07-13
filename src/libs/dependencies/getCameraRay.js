import { mat4, vec4, vec3 } from "./gl-matrix-min";


/** 
 * @param {Number} x  		[0...1] NDC
 * @param {Number} y  		[0...1] NDC - From bottom to top, not the other way around
 * 
 * @returns {Array} direction 		Direction the ray is facing from normalized positions   x, y
 */
function getCameraRay(x, y, perspective, view) {
	var BoundingVertices = [];
	var perspective_inverse = mat4.create();
	var view_inverse 		= mat4.create();

	mat4.invert(perspective_inverse, perspective);
	mat4.invert(view_inverse, view);
	
	var NDCcube = [];

	// NDCcube.push(vec4.fromValues(-1.0, -1.0, -1.0, 1.0));
	// NDCcube.push(vec4.fromValues( 1.0, -1.0, -1.0, 1.0));
	// NDCcube.push(vec4.fromValues(-1.0,  1.0, -1.0, 1.0));
	// NDCcube.push(vec4.fromValues( 1.0,  1.0, -1.0, 1.0));

	// NDCcube.push(vec4.fromValues(-1.0, -1.0,  1.0, 1.0));
	// NDCcube.push(vec4.fromValues(-1.0,  1.0,  1.0, 1.0));
	// NDCcube.push(vec4.fromValues( 1.0,  1.0,  1.0, 1.0));
	// NDCcube.push(vec4.fromValues( 1.0, -1.0,  1.0, 1.0));

	NDCcube.push(vec4.fromValues( x, y, -1.0, 1.0));
	NDCcube.push(vec4.fromValues( x, y, +1.0, 1.0));

	/*
		Returned Values:
		2___________3
		|			|
		|			|
		|			|
		|___________|
		1			4
	*/

	for(var i = 0; i < NDCcube.length; i++) {
		var tempvec = vec4.create();
		tempvec = vec4.transformMat4(tempvec, NDCcube[i], perspective_inverse);
		tempvec[0] /= tempvec[3];
		tempvec[1] /= tempvec[3];
		tempvec[2] /= tempvec[3];
		tempvec[3]  = 1;

		tempvec = vec4.transformMat4(tempvec, tempvec, view_inverse);

		BoundingVertices.push(vec3.fromValues(
			tempvec[0],
			tempvec[1],
			tempvec[2]
			   ));
	}

	var direction = vec3.create();
	vec3.subtract(direction, BoundingVertices[1], BoundingVertices[0]);
	vec3.normalize(direction, direction);

	return direction;
}

export { getCameraRay };