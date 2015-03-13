require([
	'goo/renderer/Camera',
	'goo/entities/components/CSS3DComponent',
	'goo/entities/systems/CSS3DSystem',
	'goo/renderer/Material',
	'goo/renderer/shaders/ShaderLib',
	'goo/shapes/Box',
	'goo/shapes/Quad',
	'goo/math/Vector3',
	'goo/math/Transform',
	'goo/util/gizmopack/GizmoRenderSystem',
	'goo/util/Skybox',
	'lib/V',
	'goo/renderer/Renderer',

	'goo/animationpack/systems/AnimationSystem',
	'goo/fsmpack/statemachine/StateMachineSystem',
	'goo/entities/systems/HtmlSystem',
	'goo/timelinepack/TimelineSystem',
	'goo/loaders/DynamicLoader',

	'goo/animationpack/handlers/AnimationHandlers',

	'goo/fsmpack/StateMachineHandlers',
	'goo/timelinepack/TimelineComponentHandler',
	'goo/passpack/PosteffectsHandler',
	'goo/quadpack/QuadComponentHandler',
	'goo/scriptpack/ScriptHandlers',
	'goo/scriptpack/ScriptRegister',
	'goo/scripts/GooClassRegister'
], function(
	Camera,
	CSS3DComponent,
	CSS3DSystem,
	Material,
	ShaderLib,
	Box,
	Quad,
	Vector3,
	Transform,
	GizmoRenderSystem,
	Skybox,
	V,
	Renderer,
	AnimationSystem,
	StateMachineSystem,
	HtmlSystem,
	TimelineSystem,
	DynamicLoader
) {
	'use strict';

	V.describe('Testing the matching of CSS3D transformed DOM elements to our entities');

	var gizmoRenderSystem;

	function key1() {
		gizmoRenderSystem.setActiveGizmo(0);
	}

	function key2() {
		gizmoRenderSystem.setActiveGizmo(1);
	}

	function key3() {
		gizmoRenderSystem.setActiveGizmo(2);
	}

	function setupKeys() {
		document.body.addEventListener('keypress', function(e) {
			switch (e.which) {
				case 49: // 1
					key1();
					break;
				case 50: // 2
					key2();
					break;
				case 51: // 3
					key3();
					break;
				case 52: // 4
					goo.renderer.domElement.style.pointerEvents = 'none';
					break;
				case 53: // 5
					goo.renderer.domElement.style.pointerEvents = 'inherit';
					break;
				default:
					console.log('1: translate gizmo\n2: rotate gizmo\n3: scale gizmo');
			}
		});
	}

	function setupMouse() {
		function onPick(e) {
			if (e.domEvent.button !== 0) {
				return;
			}
			if (e.domEvent.shiftKey || e.domEvent.altKey) {
				return;
			}

			if (e.id < 16000) {
				if (e.id >= 0) {
					var entitySelected = goo.world.entityManager.getEntityByIndex(e.id);
					gizmoRenderSystem.show(entitySelected);
				} else {
					gizmoRenderSystem.show(); // actually hides
				}
			} else if (e.id < 16100) {
				gizmoRenderSystem.activate(e.id, e.x, e.y);
			}
		}

		goo.addEventListener('mousedown', onPick);
		goo.addEventListener('touchstart', onPick);

		function onUnpick() {
			gizmoRenderSystem.deactivate();
		}

		document.addEventListener('mouseup', onUnpick);
		document.addEventListener('touchend', onUnpick);
	}

	function setupGizmos() {
		gizmoRenderSystem = new GizmoRenderSystem();
		gizmoRenderSystem.setActiveGizmo(0);
		goo.setRenderSystem(gizmoRenderSystem);
	}

	function loadProject(gooRunner) {

		// The loader takes care of loading the data.
		var loader = new DynamicLoader({
			world: gooRunner.world,
			rootPath: 'res'
		});

		return loader.load('root.bundle', {
			preloadBinaries: true,
			//progressCallback: progressCallback
		}).then(function(result) {
			var project = null;

			// Try to get the first project in the bundle.
			for (var key in result) {
				if (/\.project$/.test(key)) {
					project = result[key];
					break;
				}
			}

			if (!project || !project.id) {
				alert('Error: No project in bundle'); // Should never happen.
				return null;
			}

			return loader.load(project.id);
		});
	}

	var goo = V.initGoo({
		alpha: true
	});
	var world = goo.world;
	goo.world.add(new AnimationSystem());
	goo.world.add(new StateMachineSystem(goo));
	goo.world.add(new HtmlSystem(goo.renderer));
	goo.world.add(new TimelineSystem());
	var css3dSystem = new CSS3DSystem(goo.renderer);
	goo.world.setSystem(css3dSystem);

	var transformSystem = world.getSystem('TransformSystem');
	var cameraSystem = world.getSystem('CameraSystem');
	var lightingSystem = world.getSystem('LightingSystem');
	var boundingSystem = world.getSystem('BoundingUpdateSystem');
	var renderSystem = world.getSystem('RenderSystem');
	var renderer = goo.renderer;

	// Load the project
	loadProject(goo).then(function() {
		world.processEntityChanges();
		transformSystem._process();
		lightingSystem._process();
		cameraSystem._process();
		boundingSystem._process();
		if (Renderer.mainCamera) {
			goo.renderer.checkResize(Renderer.mainCamera);
		}
	}).then(function() {
		var goon = world.by.name('goon_mesh').first();
		// goon.meshRendererComponent.isReflectable = true;
		// goon.setTranslation(0, -1000, 3000);
		goon.setScale(20, 20, 20);

		goo.renderSystems[0].composers.length = 0;

		// add the gizmo render system
		setupGizmos();

		// allow using the mouse to select what entity to transform
		setupMouse();

		setupKeys();

		V.addLights();
		var camEntity = V.addOrbitCamera(new Vector3(150, Math.PI / 1.5, Math.PI / 8), new Vector3(), 'Right');
		camEntity.cameraComponent.camera.setFrustumPerspective(null, null, 1, 10000);
		camEntity.setAsMainCamera();

		// console.log(window.WindowHelper);
		// window.WindowHelper.install(css3dSystem.rootDom, goo.renderer.domElement);

		var material = new Material(ShaderLib.uber);
		material.renderQueue = 2;
		material.uniforms.opacity = 0;
		material.uniforms.materialAmbient = [0, 0, 0, 0];
		material.uniforms.materialDiffuse = [0, 0, 0, 0];
		// material.cullState.enabled = false;

		var material3 = new Material(ShaderLib.uber);
		material3.cullState.cullFace = 'Front';

		var material2 = new Material(ShaderLib.uber);
		var box2 = new Box(50, 20, 50);
		var entity = world.createEntity([0, 0, 0], box2, material2).addToWorld();

		var numBoxes = 2;
		var spread = 70.0;
		for (var i = 0; i < numBoxes; i++) {
			for (var j = 0; j < numBoxes; j++) {
				for (var k = 0; k < numBoxes; k++) {
					var domElement;
					var width = (0.5 + V.rng.nextFloat() * 3) * 100;
					var height = (0.5 + V.rng.nextFloat() * 3) * 100;
					var rand = V.rng.nextFloat();
					if (rand > 0.6) {
						domElement = document.createElement('div');
						domElement.style.backgroundImage = 'url(https://dl.dropboxusercontent.com/u/640317/screenshot.jpg)';
					} else if (rand > 0.1) {
						domElement = document.createElement('div');
						domElement.className = 'object';
						domElement.innerText = 'Gooooo';
						domElement.style.border = '1px solid black';
						domElement.style.backgroundColor = 'blue';
						domElement.style.padding = '20px';
					} else {
						width = 768;
						height = 640;
						domElement = document.createElement('iframe');
						// domElement.src = 'https://get.webgl.org/';
						domElement.src = 'https://gootechnologies.com';
						domElement.style.border = 'none';
						domElement.style.width = '100%';
						domElement.style.height = '100%';
					}

					var htmlComponent = new CSS3DComponent({
						domElement: domElement,
						width: width,
						height: height
						// backfaceVisibility: 'visible'
					});

					// Make some elements face the camera
					// htmlComponent.faceCamera = V.rng.nextFloat() > 0.95;

					var position = [
						(i - (numBoxes / 4)) * spread, (j - (numBoxes / 4)) * spread, (k - (numBoxes / 4)) * spread
					];
					var quad = new Quad(width, height);
					var entity = world.createEntity(position, quad, material, htmlComponent);
					entity.setScale(0.1, 0.1, 1);
					entity.addToWorld();

					var entity3 = world.createEntity(quad, material3).addToWorld();
					entity3.meshRendererComponent.isPickable = false;
					entity.attachChild(entity3);

					// if (V.rng.nextFloat() > 0.7) {
					// 	var r1 = V.rng.nextFloat();
					// 	var r2 = V.rng.nextFloat();
					// 	(function(r1, r2) {
					// 		var script = function (entity) {
					// 			entity.setRotation(world.time * r1, world.time * r2, 0);
					// 		};
					// 		entity.set(script);
					// 	})(r1, r2);
					// }
				}
			}
		}

		var environmentPath = '../../../addons/Water/resources/skybox/';
		var images = [
			environmentPath + '1.jpg',
			environmentPath + '3.jpg',
			environmentPath + '6.jpg',
			environmentPath + '5.jpg',
			environmentPath + '4.jpg',
			environmentPath + '2.jpg'
		];
		var skybox = new Skybox(Skybox.BOX, images, null, 0);
		goo.world.createEntity(
			skybox.transform,
			skybox.materials[0],
			skybox.meshData
		).addToWorld();

		return renderer.precompileShaders(renderSystem._activeEntities, renderSystem.lights);
	}).then(function() {
		return renderer.preloadMaterials(renderSystem._activeEntities);
	}).then(function() {
		// Start the rendering loop!
		V.process();
	}).then(null, function(e) {
		// If something goes wrong, 'e' is the error message from the engine.
		alert('Failed to load project: ' + e);
	});

});