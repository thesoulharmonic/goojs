define([
	'goo/entities/components/Component',
	'goo/entities/Bus'
],
/** @lends */
function (
	Component,
	Bus
) {
	"use strict";

	/**
	 * @class Machines!.
	 */
	function FSMComponent() {
		this.type = 'FSMComponent';

		this._bus = new Bus();
		this._machines = [];
		this.entity;
	}

	FSMComponent.prototype = Object.create(Component.prototype);

	FSMComponent.prototype.addMachine = function(machine) {
		machine._fsm = this;
		this._machines.push(machine);
	};

	FSMComponent.prototype.init = function() {
		for (var i = 0; i < this._machines.length; i++) {
			var machine = this._machines[i];
			machine.setRefs(this);
			machine.reset();
			machine.enter();
		}
	};

	FSMComponent.prototype.update = function() {
		for (var i = 0; i < this._machines.length; i++) {
			var machine = this._machines[i];
			machine.update();
		}
	};

	return FSMComponent;
});