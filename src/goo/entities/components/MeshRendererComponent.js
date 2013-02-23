define(['goo/entities/components/Component'],
	/** @lends MeshRendererComponent */
	function (Component) {
	"use strict";

	/**
	 * @class Defines the appearance of a mesh, through materials. Using several materials results in multi-pass rendering.
	 * @property {Material[]} materials Materials to use when rendering
	 * @property {Bounding} worldBound Worldspace bounding considering entity transformations
	 */
	function MeshRendererComponent() {
		this.type = 'MeshRendererComponent';

		this.materials = [];
		this.worldBound = null;

		this.cullMode = 'Dynamic'; //'Dynamic', 'Never'
		
		this.castShadows = false;
		this.receiveShadows = false;
	}

	MeshRendererComponent.prototype = Object.create(Component.prototype);

	/**
	 * Update world bounding
	 *
	 * @param bounding Bounding volumen in local space
	 * @param transform Transform to apply to local bounding -> world bounding
	 */
	MeshRendererComponent.prototype.updateBounds = function (bounding, transform) {
		this.worldBound = bounding.transform(transform, this.worldBound);
	};

	return MeshRendererComponent;
});