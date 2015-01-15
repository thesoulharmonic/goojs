define([
	'goo/physicspack/AbstractPhysicsSystem',
	'goo/math/Quaternion'
],
/** @lends */
function (
	AbstractPhysicsSystem,
	Quaternion
) {
	'use strict';

	/* global Ammo */

	var tmpVec1;
	var tmpVec2;
	var tmpQuat = new Quaternion();

	/**
	 * @class
	 * @extends AbstractPhysicsSystem
	 */
	function AmmoSystem() {
		var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
		var overlappingPairCache = new Ammo.btDbvtBroadphase();
		var solver = new Ammo.btSequentialImpulseConstraintSolver();

		/**
		 * @type {Ammo.btDiscreteDynamicsWorld}
		 */
		this.world = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);

		/**
		 * Maps Ammo pointers to entities
		 * @private
		 * @type {Object}
		 */
		this._entities = {};

		if (!tmpVec1) {
			tmpVec1 = new Ammo.btVector3();
			tmpVec2 = new Ammo.btVector3();
		}

		this._inContactCurrentStepA = [];
		this._inContactCurrentStepB = [];
		this._inContactLastStepA = [];
		this._inContactLastStepB = [];

		AbstractPhysicsSystem.call(this, 'AmmoSystem', ['AmmoComponent']);
	}
	AmmoSystem.prototype = Object.create(AbstractPhysicsSystem.prototype);

	AmmoSystem.prototype._swapContactLists = function () {
		var tmp = this._inContactCurrentStepA;
		this._inContactCurrentStepA = this._inContactLastStepA;
		this._inContactLastStepA = tmp;
		this._inContactCurrentStepA.length = 0;

		tmp = this._inContactCurrentStepB;
		this._inContactCurrentStepB = this._inContactLastStepB;
		this._inContactLastStepB = tmp;
		this._inContactCurrentStepB.length = 0;
	};

	AmmoSystem.prototype.raycastClosest = function (start, end, result) {

		var ammoStart = tmpVec1;
		var ammoEnd = tmpVec2;
		ammoStart.setValue(start.x, start.y, start.z);
		ammoEnd.setValue(end.x, end.y, end.z);
		var rayCallback = new Ammo.ClosestRayResultCallback(ammoStart, ammoEnd);

		// if (typeof(mask) !== 'number') {
		// 	result = mask;
		// 	mask = null;
		// } else {
		// 	rayCallback.set_m_collisionFilterGroup(-1);
		// 	rayCallback.set_m_collisionFilterMask(mask);
		// }

		this.world.rayTest(ammoStart, ammoEnd, rayCallback);

		var hit = false;
		result.entity = null;
		if (rayCallback.hasHit()) {
			var collisionObj = rayCallback.get_m_collisionObject();
			var body = Ammo.castObject(collisionObj, Ammo.btRigidBody);
			var point = rayCallback.get_m_hitPointWorld();
			var normal = rayCallback.get_m_hitNormalWorld();

			if (body) {
				result.entity = this._entities[body.a || body.ptr];
				result.point.setDirect(point.x(), point.y(), point.z());
				result.normal.setDirect(normal.x(), normal.y(), normal.z());
				hit = true;
			}
		}

		Ammo.destroy(rayCallback);

		return hit;
	};

	AmmoSystem.prototype.setGravity = function (gravityVector) {
		var g = new Ammo.btVector3(gravityVector.x, gravityVector.y, gravityVector.z);
		this.world.setGravity(g);
		Ammo.destroy(g);
	};

	AmmoSystem.prototype.step = function (tpf) {
		var world = this.world;

		// Step the world forward in time
		var fixedTimeStep = 1 / this.stepFrequency;
		var maxSubSteps = this.maxSubSteps;
		world.stepSimulation(tpf, maxSubSteps, fixedTimeStep);

		// TODO: Update kinematic bodies etc

		this.emitContactEvents();
	};

	AmmoSystem.prototype.emitContactEvents = function () {
		// Get overlapping entities
		var dp = this.world.getDispatcher(),
			num = dp.getNumManifolds(),
			entities = this._entities;

		this._swapContactLists();
		for (var i = 0; i !== num; i++) {
			var manifold = dp.getManifoldByIndexInternal(i);

			var numContacts = manifold.getNumContacts();
			if (numContacts === 0) {
				continue;
			}

			var ptrA = manifold.getBody0();
			var ptrB = manifold.getBody1();
			var entityA = entities[ptrA];
			var entityB = entities[ptrB];

			if (ptrA > ptrB) {
				var tmp = entityA;
				entityA = entityB;
				entityB = tmp;
			}

			if (this._inContactLastStepA.indexOf(entityA) === -1) {
				this.emitBeginContact(entityA, entityB);
			} else {
				this.emitDuringContact(entityA, entityB);
			}

			this._inContactCurrentStepA.push(entityA);
			this._inContactCurrentStepB.push(entityB);
		}

		// Emit end contact events
		for (var i = 0; i !== this._inContactLastStepA.length; i++) {
			var entityA = this._inContactLastStepA[i];
			var entityB = this._inContactLastStepB[i];

			var found = false;
			for (var j = 0; j !== this._inContactCurrentStepA.length; j++) {
				if (entityA === this._inContactCurrentStepA[i] && entityB === this._inContactCurrentStepB[i]) {
					found = true;
					break;
				}
			}
			if (!found) {
				this.emitEndContact(entityA, entityB);
			}
		}
	};

	AmmoSystem.prototype.process = function (entities, tpf) {
		var N = entities.length;

		// Initialize bodies
		for (var i = 0; i !== N; i++) {
			var entity = entities[i];
			var rb = entity.ammoComponent;

			if (rb._dirty) {
				rb.initialize(entity, this);
				rb._dirty = false;
			}
		}

		// Initialize joints - must be done *after* all bodies were initialized
		for (var i = 0; i !== N; i++) {
			var entity = entities[i];

			var joints = entity.ammoComponent.joints;
			for (var j = 0; j < joints.length; j++) {
				var joint = joints[j];
				if (!joint._dirty) {
					continue;
				}
				entity.ammoComponent.initializeJoint(joint, entity, this);
				joint._dirty = false;
			}
		}

		this.step(tpf);

		// Update positions of entities from the physics data
		for (var i = 0; i !== N; i++) {
			var entity = entities[i];
			var rb = entity.ammoComponent;
			var tc = entity.transformComponent;
			rb.getPosition(tc.transform.translation);
			rb.getQuaternion(tmpQuat);
			tc.transform.rotation.copyQuaternion(tmpQuat);
			tc.transform.update();
			tc.setUpdated();
		}
	};

	return AmmoSystem;
});