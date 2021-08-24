sap.ui.define([
	"sap/ui/core/Core",
	"sap/ui/core/Control",
	"sap/ui/core/Renderer",
	"sap/ui/core/RenderManager",
	"sap/ui/core/InvisibleText",
	"sap/ui/core/EnabledPropagator",
	"sap/ui/core/dnd/DragInfo",
	"sap/ui/qunit/utils/createAndAppendDiv"
], function(Core, Control, Renderer, RenderManager, InvisibleText, EnabledPropagator, DragInfo, createAndAppendDiv) {

	"use strict";
	/*global QUnit,sinon*/

	createAndAppendDiv("uiArea1");
	createAndAppendDiv("uiArea2");

	function cleanupMutations(aMutations) {
		for (var i = aMutations.length - 1; i > -1; i--) {
			if (aMutations[i].attributeName == "data-sap-ui-stylekey") {
				aMutations.splice(--i, 2);
			} else if (aMutations[i].attributeName == "data-sap-ui-render") {
				aMutations.splice(i, 1);
			}
		}

		return aMutations;
	}

	var StringControl = Control.extend("test.StringControl", {
		metadata: {
			properties: {
				header: { type: "string", defaultValue: "StringControl" },
				width: { type: "string", defaultValue: "100%" },
				icon: { type: "sap.ui.core.URI", defaultValue: "" },
				enabled: {type : "boolean", defaultValue : true },
				renderNothing: { type: "boolean", defaultValue: false },
				doSomething: { type: "function" }
			},
			aggregations: {
				items: { type: "sap.ui.core.Control", multiple: true }
			},
			associations: {
				ariaLabelledBy: { type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy" }
			}
		},
		renderer: function(rm, oControl) {
			/*
			 * NOTE: this renderer intentionally uses apiVersion 1 and must not be migrated!
			 */
			if (oControl.getRenderNothing()) {
				return;
			}

			rm.openStart("div", oControl);
			rm.accessibilityState(oControl);
			rm.attr("title", oControl.getTooltip_AsString() || "StringControl");
			rm.attr("aria-describedby", InvisibleText.getStaticId("sap.ui.core", "ARIA_DESCRIBEDBY")); /* during rerendering this will create new RM not to invalidate static UIArea */
			rm.attr("tabindex", 0);
			rm.style("width", oControl.getWidth());
			rm.style("background-color", "red");
			rm.class("StringControl");
			if (!oControl.getEnabled()) {
				rm.class("Disabled");
			}
			if (oControl.getDoSomething()) {
				oControl.getDoSomething()(rm, oControl);
			}
			rm.openEnd();
			rm.openStart("header").openEnd();
			if (oControl.getIcon()) {
				rm.icon(oControl.getIcon());
			}
			rm.text(oControl.getHeader(), true);
			rm.close("header");
			rm.voidStart("hr").voidEnd();
			oControl.getItems().forEach(function(oChild) {
				rm.renderControl(oChild);
			});
			rm.close("div");
		}
	});

	var PatchingControl = Control.extend("test.PatchingControl", {
		metadata: {
			properties: {
				header: { type: "string", defaultValue: "PatchingControl" },
				width: { type: "string", defaultValue: "100%" },
				icon: { type: "sap.ui.core.URI", defaultValue: "" },
				renderNothing: { type: "boolean", defaultValue: false },
				doSomething: { type: "function" }
			},
			aggregations: {
				items: { type: "sap.ui.core.Control", multiple: true, dnd: true }
			},
			associations: {
				ariaLabelledBy: { type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy" }
			}
		},
		renderer: {
			apiVersion: 2,
			render: function(rm, oControl) {
				if (oControl.getRenderNothing()) {
					return;
				}

				rm.openStart("div", oControl);
				rm.accessibilityState(oControl);
				rm.attr("title", oControl.getTooltip_AsString() || "PatchingControl");
				rm.attr("aria-describedby", InvisibleText.getStaticId("sap.ui.core", "ARIA_DESCRIBEDBY"));
				rm.attr("tabindex", 0);
				rm.style("width", oControl.getWidth());
				rm.style("background-color", "green");
				rm.class("PatchingControl");
				if (!oControl.getEnabled()) {
					rm.class("Disabled");
				}
				if (oControl.getDoSomething()) {
					oControl.getDoSomething()(rm, oControl);
				}
				rm.openEnd();
				rm.openStart("header").openEnd();
				if (oControl.getIcon()) {
					rm.icon(oControl.getIcon());
				}
				rm.text(oControl.getHeader(), true);
				rm.close("header");
				rm.voidStart("hr").voidEnd();
				oControl.getItems().forEach(function(oChild) {
					rm.renderControl(oChild);
				});
				rm.close("div");
			}
		}
	});
	EnabledPropagator.call(PatchingControl.prototype);

	QUnit.module("RenderManager");

	QUnit.test("Custom RM writing text nodes and styles", function(assert) {
		var oRoot = document.createElement("div");
		var oRM = Core.createRenderManager();
		oRM.openStart("div").style("width", "100px").openEnd().text("DivText").close("div");
		oRM.text("TextNode");
		oRM.unsafeHtml("<b>BoldText</b>");
		oRM.flush(oRoot);
		oRM.destroy();

		assert.equal(oRoot.outerHTML, '<div><div style="width: 100px;">DivText</div>TextNode<b>BoldText</b></div>', "styles and text nodes are written correctly");
	});

	QUnit.test("Custom RM writing svg elements", function(assert) {
		var oRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		var oRM = Core.createRenderManager();
		oRM.openStart("circle", "circle").openEnd().close("circle");
		oRM.flush(oRoot, false, true);

		assert.equal(oRoot.outerHTML, '<svg><circle id="circle"></circle></svg>', "styles and svg elements are written correctly");
		assert.equal(oRoot.namespaceURI, oRoot.firstChild.namespaceURI, "circle element is created as an SVG element");

		oRoot = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
		oRM.voidStart("input").voidEnd();
		oRM.flush(oRoot, false, true);
		oRM.destroy();
		assert.notEqual(oRoot.namespaceURI, oRoot.firstChild.namespaceURI, "div element within the foreignObject is created different than SVG context");
	});

	QUnit.test("String rendering output and events", function(assert) {
		var oStringControl = new StringControl();
		var onBeforeRenderingSpy = sinon.spy();
		var onAfterRenderingSpy = sinon.spy();

		oStringControl.setHeader("New Header");
		oStringControl.addStyleClass("styleclass");
		oStringControl.setIcon("sap-icon://favorite");
		oStringControl.data("key", "value", true);
		oStringControl.addAriaLabelledBy("aria");
		oStringControl.addEventDelegate({
			onBeforeRendering: onBeforeRenderingSpy,
			onAfterRendering: onAfterRenderingSpy
		});

		oStringControl.placeAt("qunit-fixture");
		Core.applyChanges();

		assert.equal(onAfterRenderingSpy.callCount, 1, "onAfterRendering is called");
		assert.equal(onBeforeRenderingSpy.callCount, 1, "onBeforeRendering is called");
		assert.notOk(onBeforeRenderingSpy.getCall(0).args[0].domInterface, "domInterface=false for the string-based rendering controls");

		var oDomRef = oStringControl.getDomRef();
		assert.equal(oDomRef.tagName, "DIV", "root tag name is correct");
		assert.equal(oDomRef.title, "StringControl", "Tooltip is set");
		assert.equal(oDomRef.getAttribute("aria-labelledby"), "aria", "aria-labelledby is set");
		assert.ok(oDomRef.getAttribute("aria-describedby"), "aria-describedby is set");
		assert.ok(oDomRef.classList.contains("StringControl"), "class is added");
		assert.ok(oDomRef.classList.contains("styleclass"), "custom style class is added");
		assert.equal(oDomRef.getAttribute("data-key"), "value", "data is written to dom");
		assert.equal(oDomRef.tabIndex, 0, "tabindex attribute is set");
		assert.equal(oDomRef.style.width, "100%", "width property is set");
		assert.equal(oDomRef.style.backgroundColor, "red", "background-color is set correctly");
		assert.equal(oDomRef.firstChild.tagName, "HEADER", "header is rendered");
		assert.ok(oDomRef.firstChild.firstChild.classList.contains("sapUiIcon"), "icon is rendered");
		assert.equal(oDomRef.textContent, "New Header", "header is written to the dom");
		assert.equal(oDomRef.lastChild.tagName, "HR", "void hr tag is rendered");

		oStringControl.invalidate();
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 2, "onAfterRendering is called again");
		assert.equal(onBeforeRenderingSpy.callCount, 2, "onBeforeRendering is called again");

		oStringControl.destroy();
	});

	QUnit.test("String rendering style checks", function(assert) {
		var oStringControl = new StringControl("root", {
			width: "99.9%",
			items: [new StringControl("child1", {
				width: "calc(-3rEm + 50vW)"
			}), new StringControl("child2", {
				width: '500px;" hack="true"'
			})]
		});

		oStringControl.placeAt("qunit-fixture");
		Core.applyChanges();

		assert.equal(document.getElementById("root").style.width, "99.9%", "Width is set correctly for the root");
		assert.equal(document.getElementById("child1").style.width, "calc(-3rem + 50vw)", "Width is set correctly for the 1st child");
		assert.equal(document.getElementById("child2").style.width, "500px", "Width is set for the 2nd child");
		assert.notOk(document.getElementById("child2").hasAttribute("hack"), "Hack attribute is not set");
		oStringControl.destroy();
	});

	QUnit.test("New rendering output and events", function(assert) {
		var oPatchingControl = new PatchingControl();
		var onBeforeRenderingSpy = sinon.spy();
		var onAfterRenderingSpy = sinon.spy();

		oPatchingControl.setHeader("New Header");
		oPatchingControl.addStyleClass("styleclass");
		oPatchingControl.setIcon("sap-icon://favorite");
		oPatchingControl.data("key", "value", true);
		oPatchingControl.addAriaLabelledBy("aria");
		oPatchingControl.addEventDelegate({
			onBeforeRendering: onBeforeRenderingSpy,
			onAfterRendering: onAfterRenderingSpy
		});

		oPatchingControl.placeAt("qunit-fixture");
		Core.applyChanges();

		assert.equal(onAfterRenderingSpy.callCount, 1, "onAfterRendering is called");
		assert.equal(onBeforeRenderingSpy.callCount, 1, "onBeforeRendering is called");

		var oDomRef = oPatchingControl.getDomRef();
		assert.equal(oDomRef.tagName, "DIV", "root tag name is correct");
		assert.equal(oDomRef.title, "PatchingControl", "Tooltip is set");
		assert.equal(oDomRef.getAttribute("aria-labelledby"), "aria", "aria-labelledby is set");
		assert.ok(oDomRef.getAttribute("aria-describedby"), "aria-describedby is set");
		assert.ok(oDomRef.classList.contains("PatchingControl"), "class is added");
		assert.ok(oDomRef.classList.contains("styleclass"), "custom style class is added");
		assert.equal(oDomRef.getAttribute("data-key"), "value", "data is written to dom");
		assert.equal(oDomRef.tabIndex, 0, "tabindex attribute is set");
		assert.equal(oDomRef.style.width, "100%", "width property is set");
		assert.equal(oDomRef.style.backgroundColor, "green", "background-color is set correctly");
		assert.equal(oDomRef.firstChild.tagName, "HEADER", "header is rendered");
		assert.ok(oDomRef.firstChild.firstChild.classList.contains("sapUiIcon"), "icon is rendered");
		assert.equal(oDomRef.textContent, "New Header", "header is written to the dom");
		assert.equal(oDomRef.lastChild.tagName, "HR", "void hr tag is rendered");

		oPatchingControl.invalidate();
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 2, "onAfterRendering is called again");
		assert.equal(onBeforeRenderingSpy.callCount, 2, "onBeforeRendering is called again");

		oPatchingControl.destroy();
	});

	QUnit.test("DOM rendering style checks", function(assert) {
		var oPatchingControl = new PatchingControl("root", {
			width: "99.9%",
			items: [new PatchingControl("child1", {
				width: "calc(-3rEm + 50vW)"
			}), new PatchingControl("child2", {
				width: '500px;" hack="true"'
			})]
		});

		oPatchingControl.placeAt("qunit-fixture");
		Core.applyChanges();

		assert.equal(document.getElementById("root").style.width, "99.9%", "Width is set correctly for the root");
		assert.equal(document.getElementById("child1").style.width, "calc(-3rem + 50vw)", "Width is set correctly for the 1st child");
		assert.notEqual(document.getElementById("child2").style.width, "500px", "Width is not set for the 2nd child since we initially do dom-based rendering");
		assert.notOk(document.getElementById("child2").hasAttribute("hack"), "Hack attribute is not set");

		Core.byId("child2").setWidth('300px;" hack="true"');
		Core.applyChanges();
		assert.notEqual(document.getElementById("child2").style.width, "300px", "Width is not set for the 2nd child since patching encodes semicolon");
		assert.notOk(document.getElementById("child2").hasAttribute("hack"), "Hack attribute is not set");

		oPatchingControl.destroy();
	});

	QUnit.test("Create RenderManager during the rendering", function(assert) {
		var oPatchingControl = new PatchingControl({
			header: "root",
			items: new PatchingControl({
				header: "child"
			})
		});

		oPatchingControl.placeAt("qunit-fixture");
		Core.applyChanges();

		oPatchingControl.setHeader("root2").getItems()[0].setDoSomething(function() {
			var oRM = Core.createRenderManager();
			var oNew = new PatchingControl({ header: "new" });
			var oDom = document.createElement("section");

			oRM.render(oNew, oDom);
			oNew.destroy();
			oRM.destroy();
		}).setHeader("child2");

		Core.applyChanges();
		assert.equal(oPatchingControl.getDomRef().textContent, "root2child2");

		oPatchingControl.destroy();
	});

	QUnit.test("Mix rendering style checks", function(assert) {
		var oPatchingControl = new PatchingControl("root", {
			width: "99.9%",
			items: [new StringControl("child1", {
				width: "calc(-3rEm + 50vW)"
			}), new StringControl("child2", {
				width: '500px;" hack="true"'
			})]
		});

		oPatchingControl.placeAt("qunit-fixture");
		Core.applyChanges();

		assert.equal(document.getElementById("root").style.width, "99.9%", "Width is set correctly for the root");
		assert.equal(document.getElementById("child1").style.width, "calc(-3rem + 50vw)", "Width is set correctly for the 1st child");
		assert.equal(document.getElementById("child2").style.width, "500px", "Width is set for the 2nd child");
		assert.notOk(document.getElementById("child2").hasAttribute("hack"), "Hack attribute is not set");
		oPatchingControl.destroy();
	});

	QUnit.test("Invalidation in the onBeforeRendering", function(assert) {
		var oPatchingControl = new PatchingControl({
			items: new PatchingControl()
		});
		var onBeforeRenderingSpy = sinon.spy();
		var done = assert.async();

		oPatchingControl.addEventDelegate({
			onBeforeRendering: function() {
				oPatchingControl.invalidate();
				oPatchingControl.getItems()[0].invalidate();
			}
		}).addEventDelegate({
			onBeforeRendering: onBeforeRenderingSpy
		});

		setTimeout(function() {
			assert.equal(onBeforeRenderingSpy.callCount, 1, "onBeforeRendering is called only once");
			onBeforeRenderingSpy.resetHistory();
			setTimeout(function() {
				assert.equal(onBeforeRenderingSpy.callCount, 1, "onBeforeRendering is called only once");
				done();
			});
			oPatchingControl.invalidate();
			Core.applyChanges();
		});
		oPatchingControl.placeAt("qunit-fixture");
		Core.applyChanges();
	});

	QUnit.test("Rerendering mutations", function(assert) {
		var oRemovedChild = null;
		var fnCreateRenderManager = function() {
			var oRM = Core.createRenderManager();
			oRM.openStart("div").openEnd().close("div");
			oRM.destroy();
		};
		var oPatchingControl = new PatchingControl({
			doSomething: fnCreateRenderManager
		});
		oPatchingControl.data("KEY", "VALUE");

		oPatchingControl.placeAt("qunit-fixture");
		Core.applyChanges();

		var aMutations;
		var oDomRef = oPatchingControl.getDomRef();
		var oObserver = new MutationObserver(function() {});

		oObserver.observe(oDomRef, {
			characterDataOldValue: true,
			attributeOldValue: true,
			characterData: true,
			attributes: true,
			childList: true,
			subtree: true
		});

		oPatchingControl.invalidate();
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(aMutations.length, 0, "Rerendering needs no mutation");

		oPatchingControl.setHeader("H/");
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.textContent, "H/", "Header is changed");
		assert.equal(aMutations.length, 1, "Only header is changed");

		oPatchingControl.setTooltip("T");
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.title, "T", "Title is changed");
		assert.equal(aMutations.length, 1, "Only title is changed");

		oPatchingControl.setWidth("100px");
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.style.width, "100px", "Width is changed");
		assert.equal(aMutations.length, 1, "Only width is changed");

		oPatchingControl.addStyleClass("A").invalidate();
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.ok(oDomRef.classList.contains("A"), "Class A is added");
		assert.equal(aMutations.length, 1, "Only class is changed");

		oPatchingControl.addStyleClass("Z").invalidate();
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.ok(oDomRef.classList.contains("A"), "Class Z is added");
		assert.equal(aMutations.length, 1, "Only class is changed");

		oPatchingControl.data("key", "value", true).invalidate();
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.getAttribute("data-key"), "value", "Data attribute is set");
		assert.equal(aMutations.length, 1, "Only data-key attribute is set");

		oPatchingControl.addItem(new PatchingControl({header: "A", doSomething: fnCreateRenderManager}));
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.lastChild.textContent, "A", "Child A is added");
		assert.equal(aMutations.length, 1, "Only child A is added");

		oPatchingControl.addItem(new PatchingControl({header: "B"}));
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.lastChild.textContent, "B", "Child B is added");
		assert.equal(aMutations.length, 1, "Only child B is added");

		oPatchingControl.addItem(new PatchingControl({header: "C"}));
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.lastChild.textContent, "C", "Child C is added");
		assert.equal(aMutations.length, 1, "Only child C is added");

		assert.equal(oDomRef.textContent, "H/ABC", "Rendering is valid after PatchingControls are added");

		oPatchingControl.getItems()[1].setVisible(false);
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.textContent, "H/AC", "Child B is not visible");
		assert.equal(aMutations.length, 1, "Child B DOM is replaced with the invisible placeholder");

		oPatchingControl.invalidate();
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(aMutations.length, 0, "No DOM update");

		oPatchingControl.getItems()[1].setVisible(true);
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.textContent, "H/ABC", "Child B is visible again");
		assert.equal(aMutations.length, 1, "Invisible placeholder is replaced with Child B");
		assert.ok(aMutations[0].removedNodes[0].id.endsWith(aMutations[0].addedNodes[0].id), "Invisible placeholder is replaced via old rendering");

		oRemovedChild = oPatchingControl.removeItem(0);
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.textContent, "H/BC", "Child A is removed");
		assert.equal(aMutations.length, 5, "Remove B from 2nd, Insert B to 1st / Remove C from 3nd, Insert C to 1st / Remove A");

		oPatchingControl.insertItem(oRemovedChild, 0);
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.textContent, "H/ABC", "Child A is inserted to the 1st position");
		assert.equal(aMutations.length, 1, "Only Child A is inserted");

		oRemovedChild = oPatchingControl.removeItem(1);
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.textContent, "H/AC", "Child B is removed");
		assert.equal(aMutations.length, 3, "A is not changed / Remove C from 3nd, Insert C to 1st / Remove B");

		oPatchingControl.insertItem(oRemovedChild, 1);
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.textContent, "H/ABC", "Child B is inserted to the 2nd position");
		assert.equal(aMutations.length, 1, "Only Child B is inserted");

		oRemovedChild = oPatchingControl.removeItem(2);
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.textContent, "H/AB", "Child C is removed");
		assert.equal(aMutations.length, 1, "A is not changed / B is not changed / Remove C");

		oPatchingControl.insertItem(oRemovedChild, 2);
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(oDomRef.textContent, "H/ABC", "Child C is inserted to the 3nd position");
		assert.equal(aMutations.length, 1, "Only Child C is inserted");

		oPatchingControl.invalidate();
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(aMutations.length, 0, "No DOM update");

		oPatchingControl.addItem(new StringControl({header: "X", doSomething: fnCreateRenderManager}));
		Core.applyChanges();
		aMutations = cleanupMutations(oObserver.takeRecords());
		assert.equal(oDomRef.lastChild.textContent, "X", "Child X is added via String Rendering");
		assert.equal(aMutations.length, 1, "Only child X is added");

		assert.equal(oDomRef.textContent, "H/ABCX", "Rendering is valid after StringControl is added");

		oPatchingControl.invalidate();
		Core.applyChanges();
		aMutations = cleanupMutations(oObserver.takeRecords());
		assert.equal(aMutations.length, 2, "StringControl is replaced(removed from DOM and added again)");

		oPatchingControl.setWidth("200px");
		Core.applyChanges();
		aMutations = cleanupMutations(oObserver.takeRecords());
		assert.equal(oDomRef.style.width, "200px", "Width is changed");
		assert.equal(aMutations.length, 3, "Only width of Patching control is changed and StringControl is replaced");

		oRemovedChild = oPatchingControl.removeItem(3);
		oPatchingControl.insertItem(oRemovedChild, 2);
		Core.applyChanges();
		aMutations = cleanupMutations(oObserver.takeRecords());
		assert.equal(oDomRef.textContent, "H/ABXC", "Child X inserted to right position");
		assert.equal(aMutations.length, 2, "StringControl is added to 3rd position and old one is removed");

		oPatchingControl.insertItem(new StringControl({header: "Y"}), 0);
		Core.applyChanges();
		aMutations = cleanupMutations(oObserver.takeRecords());
		assert.equal(oDomRef.textContent, "H/YABXC", "Child Y inserted to first position");
		assert.equal(aMutations.length, 3, "StringControl Y is added to first position, StringControl X is replaced");

		oPatchingControl.removeAllItems();
		Core.applyChanges();
		aMutations = oObserver.takeRecords();
		assert.equal(aMutations.length, 5, "All children are removed");
		assert.equal(oDomRef.textContent, "H/", "Parent is alone");

		oObserver.disconnect();
		oPatchingControl.destroy();
	});

	QUnit.test("UIArea Rendering", function(assert) {
		var oPatchingControl = new PatchingControl();
		oPatchingControl.placeAt("uiArea1");
		Core.applyChanges();

		oPatchingControl.setHeader("New Header");
		oPatchingControl.placeAt("uiArea2");
		Core.applyChanges();

		var oDomRef = oPatchingControl.getDomRef();
		assert.equal(oDomRef.textContent, "New Header", "Header is updated");
		assert.equal(oDomRef.parentNode.id, "uiArea2", "Control is moved to uiArea2");
		assert.equal(document.getElementById("uiArea1").childElementCount, 0, "uiAreaa has no more child");

		oPatchingControl.destroy();
	});

	QUnit.test("No Rendering Output", function(assert) {
		var onBeforeRenderingSpy = sinon.spy();
		var onAfterRenderingSpy = sinon.spy();
		var oRootControl = new PatchingControl({
			header: "R/",
			items: [
				new StringControl({
					header: "S",
					renderNothing: true
				}).addEventDelegate({
					onBeforeRendering: onBeforeRenderingSpy,
					onAfterRendering: onAfterRenderingSpy
				}),
				new PatchingControl({
					header: "P",
					renderNothing: true
				}).addEventDelegate({
					onBeforeRendering: onBeforeRenderingSpy,
					onAfterRendering: onAfterRenderingSpy
				})
			]
		});
		oRootControl.placeAt("qunit-fixture");
		Core.applyChanges();
		var oDomRef = oRootControl.getDomRef();

		assert.equal(onAfterRenderingSpy.callCount, 0, "onAfterRendering is not called");
		assert.equal(onBeforeRenderingSpy.callCount, 2, "onBeforeRendering is called");
		assert.equal(oDomRef.textContent, "R/", "Children have no output");

		oRootControl.invalidate();
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 0, "onAfterRendering is not called");
		assert.equal(onBeforeRenderingSpy.callCount, 4, "onBeforeRendering is called");
		assert.equal(oDomRef.textContent, "R/", "Children have still no output");

		oRootControl.getItems()[0].setRenderNothing(false);
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 1, "onAfterRendering is called");
		assert.equal(onBeforeRenderingSpy.callCount, 6, "onBeforeRendering is called");
		assert.equal(oDomRef.textContent, "R/S", "StringControl child has output");

		oRootControl.getItems()[0].setRenderNothing(true);
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 1, "onAfterRendering is not called");
		assert.equal(onBeforeRenderingSpy.callCount, 7, "onBeforeRendering is called");
		assert.equal(oDomRef.textContent, "R/", "StringControl has no output anymore");

		oRootControl.getItems()[1].setRenderNothing(false);
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 2, "onAfterRendering is called");
		assert.equal(onBeforeRenderingSpy.callCount, 9, "onBeforeRendering is called");
		assert.equal(oDomRef.textContent, "R/P", "PatchingControl child has output");

		oRootControl.getItems()[1].setRenderNothing(true);
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 2, "onAfterRendering is not called");
		assert.equal(onBeforeRenderingSpy.callCount, 10, "onBeforeRendering is called");
		assert.equal(oDomRef.textContent, "R/", "PatchingControl child has no output anymore");

		oRootControl.destroy();
	});

	QUnit.test("Invisible Rendering", function(assert) {
		var onBeforeRenderingSpy = sinon.spy();
		var onAfterRenderingSpy = sinon.spy();
		var oRootControl = new PatchingControl({
			header: "R/",
			items: [
				new StringControl({
					header: "S",
					visible: false
				}).addEventDelegate({
					onBeforeRendering: onBeforeRenderingSpy,
					onAfterRendering: onAfterRenderingSpy
				}).addStyleClass("S"),
				new PatchingControl({
					header: "P",
					visible: false
				}).addEventDelegate({
					onBeforeRendering: onBeforeRenderingSpy,
					onAfterRendering: onAfterRenderingSpy
				}).addStyleClass("P")
			]
		});

		function getInvisibleDomRef(iIndex) {
			return document.getElementById(RenderManager.createInvisiblePlaceholderId(oRootControl.getItems()[iIndex]));
		}

		oRootControl.placeAt("qunit-fixture");
		Core.applyChanges();
		var oDomRef = oRootControl.getDomRef();

		assert.equal(onAfterRenderingSpy.callCount, 0, "onAfterRendering is not called");
		assert.equal(onBeforeRenderingSpy.callCount, 2, "onBeforeRendering is called");
		assert.equal(oDomRef.textContent, "R/", "Children have no output");
		assert.ok(getInvisibleDomRef(0), "Invisible placeholder is rendered for the 1st child");
		assert.ok(getInvisibleDomRef(0).classList.contains("sapUiHiddenPlaceholder"), "Invisible placeholder of the 1st child contains sapUiHiddenPlaceholder class");
		assert.notOk(getInvisibleDomRef(0).classList.contains("S"), "Custom style class is not exist for the 1st childs invisible placeholder");
		assert.ok(getInvisibleDomRef(1), "Invisible placeholder is rendered for the 2nd child");
		assert.ok(getInvisibleDomRef(1).classList.contains("sapUiHiddenPlaceholder"), "Invisible placeholder of the 2nd child contains sapUiHiddenPlaceholder class");
		assert.notOk(getInvisibleDomRef(1).classList.contains("P"), "Custom style class is not exist for the 2nd childs invisible placeholder");
		onBeforeRenderingSpy.resetHistory();
		onAfterRenderingSpy.resetHistory();

		oRootControl.invalidate();
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 0, "onAfterRendering is not called during rerender");
		assert.equal(onBeforeRenderingSpy.callCount, 2, "onBeforeRendering is called during rerender");
		assert.equal(oDomRef.textContent, "R/", "Children have still no output");
		assert.ok(getInvisibleDomRef(0), "Invisible placeholder is rendered for the 1st child");
		assert.ok(getInvisibleDomRef(0).classList.contains("sapUiHiddenPlaceholder"), "Invisible placeholder of the 1st child contains sapUiHiddenPlaceholder class");
		assert.notOk(getInvisibleDomRef(0).classList.contains("S"), "Custom style class is not exist for the 1st childs invisible placeholder");
		assert.ok(getInvisibleDomRef(1), "Invisible placeholder is still exists for the 2nd child");
		assert.ok(getInvisibleDomRef(1).classList.contains("sapUiHiddenPlaceholder"), "Invisible placeholder of the 2nd child contains sapUiHiddenPlaceholder class");
		assert.notOk(getInvisibleDomRef(1).classList.contains("P"), "Custom style class is not exist for the 2nd childs invisible placeholder");
		onBeforeRenderingSpy.resetHistory();
		onAfterRenderingSpy.resetHistory();

		oRootControl.getItems()[0].setVisible(true);
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 1, "onAfterRendering is called for string rendering, visible=true");
		assert.equal(onBeforeRenderingSpy.callCount, 1, "onBeforeRendering is called for string rendering, visible=true");
		assert.equal(oDomRef.textContent, "R/S", "StringControl child has output");
		onBeforeRenderingSpy.resetHistory();
		onAfterRenderingSpy.resetHistory();

		oRootControl.getItems()[0].setVisible(false);
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 0, "onAfterRendering is not called for string rendering, visible=false");
		assert.equal(onBeforeRenderingSpy.callCount, 1, "onBeforeRendering is called for string rendering, visible=false");
		assert.equal(oDomRef.textContent, "R/", "StringControl has no output anymore");
		onBeforeRenderingSpy.resetHistory();
		onAfterRenderingSpy.resetHistory();

		oRootControl.getItems()[1].setVisible(true);
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 1, "onAfterRendering is called  for patching control, visible=true");
		assert.equal(onBeforeRenderingSpy.callCount, 1, "onBeforeRendering is called for patching control, visible=true");
		assert.equal(oDomRef.textContent, "R/P", "PatchingControl child has output");
		onBeforeRenderingSpy.resetHistory();
		onAfterRenderingSpy.resetHistory();

		oRootControl.getItems()[1].setVisible(false);
		Core.applyChanges();
		assert.equal(onAfterRenderingSpy.callCount, 0, "onAfterRendering is not called for patching control, visible=false");
		assert.equal(onBeforeRenderingSpy.callCount, 1, "onBeforeRendering is called for patching control, visible=false");
		assert.equal(oDomRef.textContent, "R/", "PatchingControl child has no output anymore");
		onBeforeRenderingSpy.resetHistory();
		onAfterRenderingSpy.resetHistory();

		oRootControl.destroy();
	});

	QUnit.test("Nested Mixture Rendering", function(assert) {
		var oBeforeRenderingSpy = sinon.spy();
		var oDelegate = { onBeforeRendering: oBeforeRenderingSpy };
		var oRootControl = new PatchingControl({
			header: "R/",
			items: [
				new StringControl({
					header: "1S/",
					items: [
						new PatchingControl({
							header: "1.1P/"
						}).addEventDelegate(oDelegate),
						new StringControl({
							header: "1.2S/"
						})
					]
				}),
				new PatchingControl({
					header: "2P/",
					items: [
						new StringControl({
							header: "2.1S/"
						}),
						new PatchingControl({
							header: "2.2P/"
						})
					]
				})
			]
		});
		oRootControl.placeAt("qunit-fixture");
		Core.applyChanges();

		var o1_1P = oRootControl.getItems()[0].getItems()[0];
		assert.notOk(oBeforeRenderingSpy.getCall(0).args[0].domInterface, "domInterface=false for the 1.1P/ because its string rendering parent 1S/ force it to render string as well");
		oBeforeRenderingSpy.resetHistory();

		o1_1P.invalidate();
		Core.applyChanges();
		o1_1P.removeEventDelegate(oDelegate);
		oBeforeRenderingSpy.resetHistory();

		var oDomRef = oRootControl.getDomRef();
		var oObserver = new MutationObserver(function() {});

		oObserver.observe(oDomRef, {
			characterDataOldValue: true,
			attributeOldValue: true,
			characterData: true,
			attributes: true,
			childList: true,
			subtree: true
		});

		var oDomRef = oRootControl.getDomRef();
		assert.equal(oDomRef.textContent, "R/1S/1.1P/1.2S/2P/2.1S/2.2P/", "Content is correct after initial rendering");

		oRootControl.invalidate();
		Core.applyChanges();

		var aMutations = cleanupMutations(oObserver.takeRecords());
		assert.equal(aMutations.length, 4, "Only 1S/ and 2.1S/ String controls need to be replaced");
		assert.equal(aMutations[0].addedNodes[0].textContent, "1S/1.1P/1.2S/", "New 1S/ String control is inserted with its children");
		assert.equal(aMutations[1].removedNodes[0].textContent, "1S/1.1P/1.2S/", "Old 1S/ String control is removed with its childre");
		assert.equal(aMutations[2].addedNodes[0].textContent, "2.1S/", "New 2.1S/ String control is inserted");
		assert.equal(aMutations[3].removedNodes[0].textContent, "2.1S/", "Old 2.1S/ String control is removed");
		assert.equal(oDomRef.textContent, "R/1S/1.1P/1.2S/2P/2.1S/2.2P/", "Content is still correct after re-rendering");

		oObserver.disconnect();
		oRootControl.destroy();
	});

	QUnit.test("Preserved Area and Patching", function(assert) {
		var oPatchingControl = new PatchingControl();
		oPatchingControl.placeAt("qunit-fixture");
		Core.applyChanges();

		oPatchingControl.getDomRef().setAttribute("data-sap-ui-preserve", oPatchingControl.getId());
		RenderManager.preserveContent(oPatchingControl.getDomRef(), true);
		oPatchingControl.setHeader("New Header");
		Core.applyChanges();

		assert.equal(oPatchingControl.getDomRef().textContent, "PatchingControl", "PatchingControl control in the preserved area is not patched");

		oPatchingControl.destroy();
	});

	QUnit.test("apiVersion of Renderers - Old Renderer.extend syntax", function(assert) {
		var StringControlRenderer = StringControl.getMetadata().getRenderer();
		var PatchingControlRenderer = PatchingControl.getMetadata().getRenderer();

		assert.equal(RenderManager.getApiVersion(StringControlRenderer), 1, "apiVersion does not exists on the Renderer");
		assert.equal(RenderManager.getApiVersion(PatchingControlRenderer), 2, "apiVersion is own property of the Renderer");

		var StringControlRenderer1 = Renderer.extend(StringControlRenderer);
		assert.equal(RenderManager.getApiVersion(StringControlRenderer1), 1, "apiVersion does not exists on the base");

		var StringControlRenderer2 = Renderer.extend(StringControlRenderer);
		StringControlRenderer2.apiVersion = 2;
		assert.equal(RenderManager.getApiVersion(StringControlRenderer2), 2, "apiVersion is own property of the subclass");

		var PatchingControlRenderer1 = Renderer.extend(PatchingControlRenderer);
		assert.equal(RenderManager.getApiVersion(PatchingControlRenderer1), 1, "apiVersion is not inherited from the base class");
	});

	QUnit.test("apiVersion of Renderers - New Renderer.extend syntax", function(assert) {
		var StringControlRenderer = Renderer.extend("my.StringControlRenderer", {
			render: function(rm, oControl) {
				rm.openStart("div").openEnd().close("div");
			}
		});
		var PatchingControlRenderer = Renderer.extend("my.PatchingControlRenderer", {
			apiVersion: 2,
			render: function(rm, oControl) {
				rm.openStart("div").openEnd().close("div");
			}
		});

		assert.equal(RenderManager.getApiVersion(StringControlRenderer), 1, "apiVersion does not exists on the Renderer");
		assert.equal(RenderManager.getApiVersion(PatchingControlRenderer), 2, "apiVersion is own property of the Renderer");

		var StringControlRenderer1 = StringControlRenderer.extend("my.StringControlRenderer1");
		assert.equal(RenderManager.getApiVersion(StringControlRenderer1), 1, "apiVersion does not exists on the base");

		var StringControlRenderer2 = StringControlRenderer.extend("my.StringControlRenderer2", {
			apiVersion: 2
		});
		assert.equal(RenderManager.getApiVersion(StringControlRenderer2), 2, "apiVersion is own property of the subclass");

		var PatchingControlRenderer1 = PatchingControlRenderer.extend("my.PatchingControlRenderer1");
		assert.equal(RenderManager.getApiVersion(PatchingControlRenderer1), 1, "apiVersion is not inherited from the base class");
	});

	QUnit.test("apiVersion of Renderers - ElementMetadata inheritance", function(assert) {
		var NewStringControl = StringControl.extend("my.NewStringControl", {
			renderer: {}
		});
		var NewPatchingControl = PatchingControl.extend("my.NewPatchingControl", {
			renderer: {}
		});
		var NewestPatchingControl = PatchingControl.extend("my.NewPatchingControl", {
			renderer: {
				doSomething: function() {}
			}
		});

		var NewStringControlRenderer = NewStringControl.getMetadata().getRenderer();
		var NewPatchingControlRenderer = NewPatchingControl.getMetadata().getRenderer();
		var NewestPatchingControlRenderer = NewestPatchingControl.getMetadata().getRenderer();

		assert.equal(RenderManager.getApiVersion(NewStringControlRenderer), 1, "apiVersion does not exists on the Renderer, so default value is returned");
		assert.equal(RenderManager.getApiVersion(NewPatchingControlRenderer), 1, "apiVersion is not inherited from the base class");
		assert.equal(RenderManager.getApiVersion(NewestPatchingControlRenderer), 1, "apiVersion is not inherited from the base class");
	});

	QUnit.test("Focus Handler for Patching Controls", function(assert) {
		var oChild1 = new PatchingControl({
			header: "1P"
		});
		var oChild2 = new PatchingControl({
			header: "2P"
		});
		var oRootControl = new PatchingControl({
			header: "R/",
			items: [
				oChild1, oChild2
			]
		});
		oRootControl.placeAt("qunit-fixture");
		Core.applyChanges();

		var oChild1GetFocusInfoSpy = sinon.spy(oChild1, "getFocusInfo");
		var oChild1ApplyFocusInfoSpy = sinon.spy(oChild1, "applyFocusInfo");
		var oChild2GetFocusInfoSpy = sinon.spy(oChild2, "getFocusInfo");
		var oChild2ApplyFocusInfoSpy = sinon.spy(oChild2, "applyFocusInfo");

		oChild1.focus();
		oChild1.invalidate();
		Core.applyChanges();
		assert.ok(oChild1GetFocusInfoSpy.called, "Child1.getFocusInfo is called");
		assert.ok(oChild1ApplyFocusInfoSpy.called, "Child1.applyFocusInfo is called");
		assert.equal(document.activeElement, oChild1.getFocusDomRef(), "Child1 has still focus after rendering");

		oChild2.invalidate();
		Core.applyChanges();
		assert.notOk(oChild2GetFocusInfoSpy.called, "Child2.getFocusInfo is not called");
		assert.notOk(oChild2ApplyFocusInfoSpy.called, "Child2.applyFocusInfo is not called");
		assert.equal(document.activeElement, oChild1.getFocusDomRef(), "Child1 has still focus after Child2 rendering");

		oChild2.focus();
		oRootControl.invalidate();
		Core.applyChanges();
		assert.ok(oChild2GetFocusInfoSpy.called, "Child2.getFocusInfo is called");
		assert.ok(oChild2ApplyFocusInfoSpy.called, "Child2.applyFocusInfo is called");
		assert.equal(document.activeElement, oChild2.getFocusDomRef(), "Child2 has still focus after parent rendering");

		oChild1GetFocusInfoSpy.restore();
		oChild1ApplyFocusInfoSpy.restore();
		oChild2GetFocusInfoSpy.restore();
		oChild2ApplyFocusInfoSpy.restore();
		oRootControl.destroy();
	});

	var SkipRenderingModule = function(fnInitControlTree) {
		return {
			initControlTree: fnInitControlTree,
			before: function() {
				this.oApiVerionStub = sinon.stub(PatchingControl.getMetadata().getRenderer(), "apiVersion").value(4);
				this.oBeforeRenderingSpy = sinon.spy(Control.prototype, "onBeforeRendering");
			},
			beforeEach: function() {
				this.initControlTree();
				this.oRootControl.placeAt("qunit-fixture");
				Core.applyChanges();

				this.oBeforeRenderingSpy.resetHistory();
				this.oDomRef = this.oRootControl.getDomRef();
				this.oObserver = new MutationObserver(function() {});
				this.oObserver.observe(this.oDomRef, {
					characterData: true,
					attributes: true,
					childList: true,
					subtree: true
				});
			},
			act: function(fnAct) {
				this.oBeforeRenderingSpy.resetHistory();
				this.oObserver.takeRecords();
				fnAct.call(this);
				Core.applyChanges();
			},
			afterEach: function() {
				this.oObserver.disconnect();
				this.oRootControl.destroy(true);
			},
			after: function() {
				this.oBeforeRenderingSpy.restore();
				this.oApiVerionStub.restore();
			}
		};
	};

	QUnit.module("Skip rendering - There are only apiVersion:4 controls in the control tree", SkipRenderingModule(function() {
		this.oRootControl = new PatchingControl({
			header: "R/",
			items: [
				this.o1P = new PatchingControl({
					header: "1P/",
					items: [
						this.o1_1P = new PatchingControl({
							header: "1.1P/"
						}),
						this.o1_2P = new PatchingControl({
							header: "1.2P/"
						})
					]
				})
			]
		});
	}));

	QUnit.test("Initial rendering output", function(assert) {
		assert.equal(this.oDomRef.textContent, "R/1P/1.1P/1.2P/", "Content is correct after initial rendering");
	});

	QUnit.test("Insert a new aggregation", function(assert) {
		var oNewControl = new PatchingControl({header: "2P/"});
		this.act(function() {
			this.oRootControl.addItem(oNewControl);
		});

		assert.equal(this.oDomRef.textContent, "R/1P/1.1P/1.2P/2P/", "The new control has been rendered correctly");
		assert.equal(this.oObserver.takeRecords().length, 1, "Only the new control has been rendered");
		assert.equal(this.oBeforeRenderingSpy.callCount, 2, "oBeforeRenderingSpy is only called for the root and new control");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.oRootControl), "oBeforeRenderingSpy is called on the root control");
		assert.ok(this.oBeforeRenderingSpy.getCall(1).calledOn(oNewControl), "oBeforeRenderingSpy is called on the new control");
	});

	QUnit.test("Make a parent control invisible and then visible", function(assert) {
		this.act(function() {
			this.o1P.setVisible(false);
		});

		assert.equal(this.oDomRef.textContent, "R/", "1P/ control and its children are not rendered");
		assert.equal(this.oObserver.takeRecords().length, 1, "Control 1P/ DOM node and its children replaced with the invisible placeholder");
		assert.ok(document.getElementById(RenderManager.createInvisiblePlaceholderId(this.o1P)), "Invisible placeholder has been rendered");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.o1P), "oBeforeRenderingSpy is called on the 1P Control");

		this.act(function() {
			this.o1P.setVisible(true);
		});
		assert.equal(this.oDomRef.textContent, "R/1P/1.1P/1.2P/", "Visible item and its children are rendered correctly");
		assert.equal(this.oObserver.takeRecords().length, 1, "invisible placeholder DOM is replaced with the item DOM that contains children");
		assert.equal(this.oBeforeRenderingSpy.callCount, 3, "oBeforeRenderingSpy is called for the root invisible control and its children");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.o1P), "oBeforeRenderingSpy is called for the root invisible item 1P/");
		assert.ok(this.oBeforeRenderingSpy.getCall(1).calledOn(this.o1_1P), "oBeforeRenderingSpy is called for the invisible item 1.1P/");
		assert.ok(this.oBeforeRenderingSpy.getCall(2).calledOn(this.o1_2P), "oBeforeRenderingSpy is called for the invisible item 1.2P/");
	});

	QUnit.test("Child invalidation while parent rendering can be skipped", function(assert) {
		this.act(function() {
			this.oRootControl.setHeader("RNew/");
			this.o1_1P.setHeader("1.1PNew/");
			assert.ok(this.oRootControl._bNeedsRendering, "parent of 1P/ is invalidated");
			assert.ok(this.o1_1P._bNeedsRendering, "child of 1P/ is invalidated");
			assert.notOk(this.o1P._bNeedsRendering, "1P/ is not invalidated");
		});

		assert.equal(this.oDomRef.textContent, "RNew/1P/1.1PNew/1.2P/", "New headers are rendered correctly");
		assert.equal(this.oObserver.takeRecords().length, 2, "Header for the root control and header for 1.1P/ are set");
		assert.equal(this.oBeforeRenderingSpy.callCount, 2, "oBeforeRenderingSpy is only called for the root control and the 1.1P/ control");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.oRootControl), "oBeforeRenderingSpy is called on the root control");
		assert.ok(this.oBeforeRenderingSpy.getCall(1).calledOn(this.o1_1P), "oBeforeRenderingSpy is called on the 1.1P/ control");
	});

	QUnit.test("Make an invisible child visible while parent rendering can be skipped", function(assert) {
		this.act(function() {
			this.o1_1P.setVisible(false);
		});

		assert.equal(this.oDomRef.textContent, "R/1P/1.2P/", "1.1P/ control made invisible");

		this.act(function() {
			this.oRootControl.setHeader("RNew/");
			this.o1_1P.setVisible(true);
		});

		assert.equal(this.oDomRef.textContent, "RNew/1P/1.1P/1.2P/", "New header is rendered correctly and 1.1P/ control is now visible");
	});

	QUnit.test("Rearrange aggregations", function(assert) {
		this.act(function() {
			this.o1P.insertItem(this.o1P.removeItem(0), 1); // swap 1.1P/ and 1.2P/
		});

		assert.equal(this.oDomRef.textContent, "R/1P/1.2P/1.1P/", "Reordered items  are rendered correctly");
		assert.equal(this.oObserver.takeRecords().length, 2, "Only reordered item DOM nodes are swapped");
		assert.equal(this.oBeforeRenderingSpy.callCount, 1, "oBeforeRenderingSpy is called only once for the parent control 1P/");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.o1P), "oBeforeRenderingSpy is called on the 1P/ control, moving items do not invalidate items");
	});

	QUnit.test("Invalidations while controls are not in a UIArea", function(assert) {
		this.act(function() {
			var o1P = this.oRootControl.removeItem(0);
			assert.notOk(o1P.getUIArea(), "1P/ has no UIArea");
			o1P.getItems()[0].setHeader("1.1PNew/");
			this.oRootControl.addItem(o1P);
		});

		assert.equal(this.oDomRef.textContent, "R/1P/1.1PNew/1.2P/", "Header of the item is applied correctly, even invalidation is happened while the control had no UIArea");
		assert.equal(cleanupMutations(this.oObserver.takeRecords()).length, 1, "Only the text content of the item is changed");
		assert.equal(this.oBeforeRenderingSpy.callCount, 3, "oBeforeRenderingSpy is called on the root control, 1P/ and 1.1P/");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.oRootControl), "oBeforeRenderingSpy is called on the RootControl");
		assert.ok(this.oBeforeRenderingSpy.getCall(1).calledOn(this.o1P), "oBeforeRenderingSpy is called on the 1P/ since invalidation of child bubbled while child has no UIArea ");
		assert.ok(this.oBeforeRenderingSpy.getCall(2).calledOn(this.o1_1P), "oBeforeRenderingSpy is called on the 1.1P/");
	});

	QUnit.test("Rendering event delegates and data-sap-ui-render marker", function(assert) {
		["onAfterRendering", "onBeforeRendering"].forEach(function(sRenderingDelegate) {
			var oDelegate = {};
			oDelegate[sRenderingDelegate] = Function.prototype;

			assert.notOk(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is not yet set for the 1P/");
			this.o1P.addEventDelegate(oDelegate);
			assert.ok(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is set for the 1P/ after the rendering delegate is added");

			this.act(function() {
				this.oRootControl.invalidate();
			});
			assert.ok(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is set for the 1P/ after rerendering");
			assert.equal(this.oBeforeRenderingSpy.callCount, 2, "oBeforeRenderingSpy is called on the root and 1P/ since data-sap-ui-render marker does not allow skipping for 1P/");

			this.o1P.removeEventDelegate(oDelegate);
			assert.notOk(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is removed since there is no more rendering delegate for the 1P/");

			oDelegate.canSkipRendering = true;
			this.o1P.addEventDelegate(oDelegate);
			assert.notOk(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is not set since canSkipRendering is true");

			this.act(function() {
				this.oRootControl.invalidate();
			});
			assert.notOk(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is still not set for the 1P/ after rerendering");
			assert.equal(this.oBeforeRenderingSpy.callCount, 1, "oBeforeRenderingSpy is called only on the root control since 1P/ rendering can be skipped");
		}, this);
	});

	QUnit.test("enhanceAccessibilityState and data-sap-ui-render marker", function(assert) {
		assert.notOk(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is not yet set for the 1P/");

		this.act(function() {
			this.oRootControl.enhanceAccessibilityState = function(oItem, mAriaProps) {
				mAriaProps.role = "RoleFromParent";
			};
			this.o1P.invalidate();
		});
		assert.ok(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is set for the 1P/ because parent implements the enhanceAccessibilityState");
		assert.equal(this.o1P.getDomRef().getAttribute("role"), "RoleFromParent", "role attribute of 1P/ is taken from the parent#enhanceAccessibilityState");

		this.act(function() {
			this.oRootControl.enhanceAccessibilityState = function(oItem, mAriaProps) { /*nothing is changed here intentionally for testing */ };
			this.o1P.invalidate();
		});
		assert.notOk(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is not set because the enhanceAccessibilityState does not change anything");
		assert.notOk(this.o1P.getDomRef().getAttribute("role"), "There is no role set for the 1P/ since parent#enhanceAccessibilityState is empty");

		this.act(function() {
			this.oRootControl.enhanceAccessibilityState = function(oItem, mAriaProps) {
				mAriaProps.role = "RoleFromParent";
				mAriaProps.canSkipRendering = true;
			};
			this.o1P.invalidate();
		});
		assert.notOk(this.o1P.getDomRef().hasAttribute("data-sap-ui-render"), "data-sap-ui-render marker is not set because the enhanceAccessibilityState uses canSkipRendering flag");
	});

	QUnit.test("enhanceAccessibilityState and rendering skip", function(assert) {
		this.oRootControl.enhanceAccessibilityState = function(oItem, mAriaProps) {
			mAriaProps.role = "newRoleFromParent";
			mAriaProps.setsize = this.getItems().length;
			mAriaProps.posinset = this.indexOfItem(oItem) + 1;
		};

		this.act(function() {
			this.o1P.invalidate();
		});
		assert.equal(this.o1P.getDomRef().getAttribute("role"), "newRoleFromParent", "enhanceAccessibilityState is called on the parent and role is set correctly for 1P/");
		assert.equal(this.o1P.getDomRef().getAttribute("aria-posinset"), 1, "enhanceAccessibilityState is called on the parent and posinset is set correctly for 1P/");
		assert.equal(this.o1P.getDomRef().getAttribute("aria-setsize"), 1, "enhanceAccessibilityState is called on the parent and setsize is set correctly for 1P/");

		var oNewControl = new PatchingControl({header: "0P/"});
		this.act(function() {
			this.oRootControl.insertItem(oNewControl, 0);
		});
		assert.equal(this.oDomRef.textContent, "R/0P/1P/1.1P/1.2P/", "The new 0P/ control is rendered in correct position");
		assert.equal(this.oBeforeRenderingSpy.callCount, 3, "oBeforeRenderingSpy called on the root, 0P/ and 1P/. Although children are not invalidated the rendering cannot be skipped");
		this.oRootControl.getItems().forEach(function(oItem, iIndex, aItems) {
			assert.equal(oItem.getDomRef().getAttribute("role"), "newRoleFromParent", "enhanceAccessibilityState is called on the parent and role is set correctly for the child");
			assert.equal(oItem.getDomRef().getAttribute("aria-posinset"), iIndex + 1, "enhanceAccessibilityState is called on the parent and posinset is set correctly for the child");
			assert.equal(oItem.getDomRef().getAttribute("aria-setsize"), aItems.length, "enhanceAccessibilityState is called on the parent and setsize is set correctly for the child");
		});
	});

	QUnit.test("DragInfo and DragInfo invalidations", function(assert) {
		var oDragInfo = new DragInfo({
			sourceAggregation: "items"
		});

		this.act(function() {
			this.oRootControl.addDragDropConfig(oDragInfo);
		});
		assert.ok(this.o1P.getDomRef().draggable, "Item is draggable after rendering, although invalidation was only on the root control the rendering of the item is not skipped");
		assert.equal(this.oBeforeRenderingSpy.callCount, 2, "oBeforeRenderingSpy is called on the root and 1P/");

		this.act(function() {
			oDragInfo.setEnabled(false);
		});
		assert.notOk(this.o1P.getDomRef().draggable, "Item is not draggable, although invalidation was only on the root control the rendering of the item is not skipped");
		assert.equal(this.oBeforeRenderingSpy.callCount, 2, "oBeforeRenderingSpy is called on the root and 1P/");
	});

	QUnit.module("Skip rendering - There are apiVersion:1 and 4 controls in the control tree", SkipRenderingModule(function() {
		this.oRootControl = new PatchingControl({
			header: "R/",
			items: [
				this.o1P = new PatchingControl({
					header: "1P/",
					items: [
						this.o1_1P = new PatchingControl({
							header: "1.1P/"
						}),
						this.o1_2S = new StringControl({
							header: "1.2S/"
						})
					]
				})
			]
		});
	}));

	QUnit.test("Initial rendering output", function(assert) {
		assert.equal(this.oDomRef.textContent, "R/1P/1.1P/1.2S/", "Content is correct after initial rendering");
	});

	QUnit.test("Insert a new aggregation", function(assert) {
		var oNewControl = new PatchingControl({header: "2P/"});
		this.act(function() {
			this.oRootControl.addItem(oNewControl);
		});

		assert.equal(this.oDomRef.textContent, "R/1P/1.1P/1.2S/2P/", "New control (2P) is rendered correctly");
		assert.equal(cleanupMutations(this.oObserver.takeRecords()).length, 3, "The new control (2P) is rendered and string control(1.2S) is replaced(removed+inserted)");
		assert.equal(this.oBeforeRenderingSpy.callCount, 4, "oBeforeRenderingSpy is called for all controls except the PatchingControl 1.1P/");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.oRootControl), "oBeforeRenderingSpy is called on the root control, since it contains a StringControl we cannot skip its rendering");
		assert.ok(this.oBeforeRenderingSpy.getCall(1).calledOn(this.o1P), "oBeforeRenderingSpy is called on the 1P, since it contains a StringControl we cannot skip its rendering");
		assert.ok(this.oBeforeRenderingSpy.getCall(2).calledOn(this.o1_2S), "oBeforeRenderingSpy is called on the StringControl");
		assert.ok(this.oBeforeRenderingSpy.getCall(3).calledOn(oNewControl), "oBeforeRenderingSpy is called on the new control");
	});

	QUnit.test("Child invalidation while parent rendering can be skipped", function(assert) {
		this.act(function() {
			this.oRootControl.setHeader("RNew/");
			this.o1_1P.setHeader("1.1PNew/");
			assert.ok(this.oRootControl._bNeedsRendering, "parent of 1P/ is invalidated");
			assert.ok(this.o1_1P._bNeedsRendering, "child of 1P/ is invalidated");
			assert.notOk(this.o1P._bNeedsRendering, "1P/ is not invalidated");
		});

		assert.equal(this.oDomRef.textContent, "RNew/1P/1.1PNew/1.2S/", "New headers are rendered correctly");
		assert.equal(cleanupMutations(this.oObserver.takeRecords()).length, 4, "Characterdata for root/child are set and the StringControl is replaced even though its parent is not invalidated");
		assert.equal(this.oBeforeRenderingSpy.callCount, 4, "oBeforeRenderingSpy is called for all controls");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.oRootControl), "oBeforeRenderingSpy is called on the root control, since it contains StringControl");
		assert.ok(this.oBeforeRenderingSpy.getCall(1).calledOn(this.o1P), "oBeforeRenderingSpy is called on the first child control(1P), since it contains StringControl");
		assert.ok(this.oBeforeRenderingSpy.getCall(2).calledOn(this.o1_1P), "oBeforeRenderingSpy is called on the 1.1P/, since its header is invalidated");
		assert.ok(this.oBeforeRenderingSpy.getCall(3).calledOn(this.o1_2S), "oBeforeRenderingSpy is called on the StringControl");
	});

	QUnit.test("Re-rendering", function(assert) {
		this.act(function() {
			this.oRootControl.invalidate();
		});

		assert.equal(this.oDomRef.textContent, "R/1P/1.1P/1.2S/", "Content is not changed after rerendering");
		assert.equal(this.oBeforeRenderingSpy.callCount, 3, "oBeforeRenderingSpy is called for the StringControl and its parents, since rendering skip is blocked by the StringControl");
		assert.equal(cleanupMutations(this.oObserver.takeRecords()).length, 2, "The StringControl is replaced(removed+inserted)");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.oRootControl), "oBeforeRenderingSpy is called on the root control, since it contains StringControl");
		assert.ok(this.oBeforeRenderingSpy.getCall(1).calledOn(this.o1P), "oBeforeRenderingSpy is called on the first child control(1P), since it contains StringControl");
		assert.ok(this.oBeforeRenderingSpy.getCall(2).calledOn(this.o1_2S), "oBeforeRenderingSpy is called on the StringControl");
	});

	QUnit.test("EnabledPropagator", function(assert) {
		this.act(function() {
			this.oRootControl.setEnabled(false);
		});

		assert.ok(this.oRootControl.$().hasClass("Disabled"), "Root control is disabled");
		assert.ok(this.o1P.$().hasClass("Disabled"), "Child PatchingControl(1P) is disabled via EnabledPropagator");
		assert.ok(this.o1_1P.$().hasClass("Disabled"), "Grand child PatchingControl(1.1P/) is disabled via EnabledPropagator as well");
		assert.notOk(this.o1_2S.$().hasClass("Disabled"), "StringControl is not disabled since EnabledPropagator is not implemented by the StringControl");

		this.act(function() {
			this.oRootControl.setEnabled(true);
		});

		assert.notOk(this.oRootControl.$().hasClass("Disabled"), "Root control is enabled");
		assert.notOk(this.o1P.$().hasClass("Disabled"), "Child PatchingControl(1P) is enabled via EnabledPropagator");
		assert.notOk(this.o1_1P.$().hasClass("Disabled"), "Grand child PatchingControl(1.1PNew) is enabled via EnabledPropagator as well");
		assert.notOk(this.o1_2S.$().hasClass("Disabled"), "StringControl was not disabled anyway since EnabledPropagator was not implemented by the StringControl");

		this.act(function() {
			this.o1_1P.useEnabledPropagator(false);
			this.oRootControl.setEnabled(false);
		});

		assert.ok(this.o1P.$().hasClass("Disabled"), "Control 1P/ is disabled since EnabledPropagator implemented by Patching controls");
		assert.notOk(this.o1_1P.$().hasClass("Disabled"), "Control 1.1P/ is not disabled since it is excluded from the EnabledPropagator with useEnabledPropagator method");
	});

	QUnit.test("Rearrange aggregations", function(assert) {
		this.act(function() {
			this.o1P.insertItem(this.o1P.removeItem(0), 1); // swap 1.1P/ and 1.2S/
		});

		assert.equal(this.oDomRef.textContent, "R/1P/1.2S/1.1P/", "Reordered items are rendered correctly");
		assert.equal(cleanupMutations(this.oObserver.takeRecords()).length, 2, "String control DOM node is not reused, a new string control DOM created and the original one is removed");
		assert.equal(this.oBeforeRenderingSpy.callCount, 2, "oBeforeRenderingSpy is called for the parent control 1P/ but also for the String control");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.o1P), "oBeforeRenderingSpy is called on the 1P/ control, moving items do not invalidate items");
		assert.ok(this.oBeforeRenderingSpy.getCall(1).calledOn(this.o1_2S), "oBeforeRenderingSpy is called on the string control since its rendering cannot be skipped");
	});

	QUnit.test("Make a parent control invisible", function(assert) {
		this.act(function() {
			this.o1P.setVisible(false);
		});

		assert.equal(this.oDomRef.textContent, "R/", "1P/ control and its children are not rendered");
		assert.equal(this.oObserver.takeRecords().length, 1, "Control 1P/ DOM node and its children replaced with the invisible placeholder");
		assert.ok(document.getElementById(RenderManager.createInvisiblePlaceholderId(this.o1P)), "Invisible placeholder has been rendered");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.o1P), "oBeforeRenderingSpy is called on the 1P Control");

		this.act(function() {
			this.oRootControl.invalidate();
		});

		assert.equal(this.oDomRef.textContent, "R/", "Dom output is correct when the root is rerendered while it has invisible item");
		assert.equal(this.oBeforeRenderingSpy.callCount, 1, "oBeforeRenderingSpy is called only for the root control");
		assert.ok(this.oBeforeRenderingSpy.getCall(0).calledOn(this.oRootControl), "oBeforeRenderingSpy is called on the root control");
		assert.equal(this.oObserver.takeRecords().length, 0, "No mutation parent control is a Patching control");
	});

	QUnit.test("No rendering skip", function(assert) {
		this.act(function() {
			this.oApiVerionStub.restore();
			this.oRootControl.invalidate();
		});

		assert.equal(this.oBeforeRenderingSpy.callCount, 4, "oBeforeRenderingSpy is called for the root control and every control within the root control");
		assert.equal(cleanupMutations(this.oObserver.takeRecords()).length, 2, "String rendering control must be removed and inserted on parent rerendering");
	});

});
