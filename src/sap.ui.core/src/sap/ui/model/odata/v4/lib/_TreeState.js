/*!
 * ${copyright}
 */

//Provides class sap.ui.model.odata.v4.lib._TreeState
sap.ui.define([
	"./_Helper"
], function (_Helper) {
	"use strict";

	//*********************************************************************************************
	// _TreeState
	//*********************************************************************************************
	/**
	 * A class holding the tree state for recursive hierarchies. It keeps track which nodes have
	 * been manually expanded resp. collapsed and is able to build the "ExpandLevels" parameter for
	 * the "TopLevels" request (see {@link #getExpandLevels}).
	 *
	 * @alias sap.ui.model.odata.v4.lib._TreeState
	 * @private
	 */
	class _TreeState {
		// maps predicate to node id and number of levels to expand
		oExpandLevels = new Map();

		/**
		 * Constructor for a new _TreeState.
		 * The tree state is only kept if a <code>sNodeProperty</code> is given.
		 *
		 * @param {string} [sNodeProperty] - The path to the node id property
		 *
		 * @public
		 */
		constructor(sNodeProperty) {
			this.sNodeProperty = sNodeProperty;
		}

		/**
		 * Collapse a node.
		 *
		 * @param {object} oNode - The node
		 *
		 * @public
		 */
		collapse(oNode) {
			if (!this.sNodeProperty) {
				return;
			}

			const sPredicate = _Helper.getPrivateAnnotation(oNode, "predicate");
			const oExpandLevel = this.oExpandLevels.get(sPredicate);
			if (oExpandLevel && oExpandLevel.Levels) {
				this.oExpandLevels.delete(sPredicate);
			} else {
				// must have NodeId as the node may be missing when calling #getExpandLevels
				const sNodeId = _Helper.drillDown(oNode, this.sNodeProperty);
				this.oExpandLevels.set(sPredicate, {NodeID : sNodeId, Levels : 0});
			}
		}

		/**
		 * Delete a node.
		 *
		 * @param {object} oNode - The node
		 *
		 * @public
		 */
		delete(oNode) {
			if (!this.sNodeProperty) {
				return;
			}

			const sPredicate = _Helper.getPrivateAnnotation(oNode, "predicate");
			this.oExpandLevels.delete(sPredicate);
		}

		/**
		 * Expand a node.
		 *
		 * @param {object} oNode - The node
		 *
		 * @public
		 */
		expand(oNode) {
			if (!this.sNodeProperty) {
				return;
			}

			const sPredicate = _Helper.getPrivateAnnotation(oNode, "predicate");
			const oExpandLevel = this.oExpandLevels.get(sPredicate);
			if (oExpandLevel && !oExpandLevel.Levels) {
				this.oExpandLevels.delete(sPredicate);
			} else {
				// must have NodeId as the node may be missing when calling #getExpandLevels
				const sNodeId = _Helper.drillDown(oNode, this.sNodeProperty);
				this.oExpandLevels.set(sPredicate, {NodeID : sNodeId, Levels : 1});
			}
		}

		/**
		 * Returns the ExpandLevels parameter to the TopLevels function describing the tree state in
		 * $apply.
		 *
		 * @returns {string|undefined} The ExpandLevels or undefined if no tree state is kept
		 *
		 * @public
		 */
		getExpandLevels() {
			const aExpandLevels = [...this.oExpandLevels.values()];
			return aExpandLevels.length ? JSON.stringify(aExpandLevels) : undefined;
		}

		/**
		 * Resets the tree state.
		 *
		 * @public
		 */
		reset() {
			this.oExpandLevels.clear();
		}
	}

	return _TreeState;
});
