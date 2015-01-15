define([],
/** @lends */
function () {
	'use strict';

	/**
	 * @class
	 * @param {object} [settings]
	 * @param {Entity} [settings.connectedEntity]
	 * @param {boolean} [settings.collideConnected=false]
	 */
	function PhysicsJoint(settings) {
		settings = settings || {};

		/**
		 * The entity connected
		 * @type {Entity}
		 */
		this.connectedEntity = settings.connectedEntity || null;

		/**
		 * Indicates if the connected entities should collide.
		 * @type {boolean}
		 */
		this.collideConnected = typeof(settings.collideConnected) ? settings.collideConnected : false;

		/**
		 * @private
		 * @type {Boolean}
		 */
		this._dirty = true;
	}
	PhysicsJoint.constructor = PhysicsJoint;

	return PhysicsJoint;
});