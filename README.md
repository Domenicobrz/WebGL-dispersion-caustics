WebGL dispersion caustics
======
<p align="center">
	<img src="/screenshots/1.png" style="max-width:100%;" width="1000"/><br><img src="/screenshots/2.png" style="max-width:100%;" width="1000"/>
</p>

<br>

This project fakes dispersion caustics by accumulating photons in a texture (calculated by the CPU) which is also directly sampled 
with ray-plane intersections inside the mesh fragment shader


### See it in action

either download the repo and open the `index.html` inside the `dist` folder or <br>
[see it in action from my website](https://domenicobrz.github.io/webgl/projects/dispersion-caustics/)