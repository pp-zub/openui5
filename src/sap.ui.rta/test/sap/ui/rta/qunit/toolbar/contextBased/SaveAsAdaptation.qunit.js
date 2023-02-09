/*global QUnit*/

sap.ui.define([
	"../../RtaQunitUtils",
	"sap/ui/core/Core",
	"sap/ui/core/Control",
	"sap/ui/core/Fragment",
	"sap/ui/fl/Layer",
	"sap/ui/fl/write/api/ContextBasedAdaptationsAPI",
	"sap/ui/fl/write/api/Version",
	"sap/ui/model/json/JSONModel",
	"sap/ui/rta/toolbar/Adaptation",
	"sap/ui/rta/toolbar/contextBased/SaveAsAdaptation",
	"sap/ui/thirdparty/sinon-4"
], function(
	RtaQunitUtils,
	Core,
	Control,
	Fragment,
	Layer,
	ContextBasedAdaptationsAPI,
	Version,
	JSONModel,
	Adaptation,
	SaveAsAdaptation,
	sinon
) {
	"use strict";

	var sandbox = sinon.createSandbox();

	function getToolbarRelatedControl(oToolbar, sControlID) {
		return oToolbar.getControl("addAdaptationDialog--" + sControlID);
	}

	function getControl(sId) {
		return Core.byId(sId);
	}

	function initializeToolbar() {
		var aVersions = [{
			version: "1",
			title: "Version Title",
			type: Version.Type.Active,
			isPublished: true,
			importedAt: "2022-05-09 15:00:00.000"
		}, {
			version: "2",
			type: Version.Type.Inactive,
			isPublished: false,
			activatedAt: "2022-05-10 15:00:00.000"
		}];
		var oVersionsModel = new JSONModel({
			versioningEnabled: true,
			versions: aVersions,
			draftAvailable: true,
			displayedVersion: Version.Number.Draft
		});

		var oToolbarControlsModel = RtaQunitUtils.createToolbarControlsModel();
		var oToolbar = new Adaptation({
			textResources: Core.getLibraryResourceBundle("sap.ui.rta"),
			rtaInformation: {
				flexSettings: {
					layer: Layer.CUSTOMER
				},
				rootControl: new Control()
			}
		});
		oToolbar.setModel(oVersionsModel, "versions");
		oToolbar.setModel(oToolbarControlsModel, "controls");

		oToolbar.animation = false;
		oToolbar.placeAt("qunit-fixture");
		Core.applyChanges();
		return oToolbar;
	}

	QUnit.module("Given a Toolbar with enabled context-based adaptations feature", {
		beforeEach: function() {
			this.oToolbar = initializeToolbar();
			this.oSaveAsAdaptation = new SaveAsAdaptation({ toolbar: this.oToolbar });
			this.oEvent = {
				getSource: function() {
					return this.oToolbar.getControl("manageAdaptations");
				}.bind(this)
			};
			return this.oToolbar.onFragmentLoaded().then(function() {
				return this.oToolbar.show();
			}.bind(this));
		},
		afterEach: function() {
			this.oToolbar.destroy();
			sandbox.restore();
		}
	}, function() {
		QUnit.module("the save as adaptation dialog is created with empty data", {
			beforeEach: function() {
				this.oSaveAsAdaptation = new SaveAsAdaptation({ toolbar: this.oToolbar });
				sandbox.stub(ContextBasedAdaptationsAPI, "load").resolves(
					new JSONModel({
						adaptations: []
					})
				);
				this.oFragmentLoadSpy = sandbox.spy(Fragment, "load");
				return this.oSaveAsAdaptation.openAddAdaptationDialog().then(function (oDialog) {
					this.oDialog = oDialog;
					return this.oToolbar._pFragmentLoaded;
				}.bind(this));
			}
		}, function() {
			QUnit.test("and save as adaptation dialog is visible", function(assert) {
				assert.strictEqual(this.oFragmentLoadSpy.callCount, 1, "the fragment was loaded");
				assert.ok(this.oDialog.isOpen(), "the dialog is opened");
			});

			QUnit.test("and opend a second time", function(assert) {
				// simulate user selection
				this.oDialog.close();
				return this.oSaveAsAdaptation.openAddAdaptationDialog()
				.then(function(oDialog) {
					assert.strictEqual(this.oFragmentLoadSpy.callCount, 1, "the fragment was loaded not again");
					assert.ok(oDialog.isOpen(), "the dialog is opened");
					assert.deepEqual(oDialog.getModel("prioritySelectionModel").getProperty("/priority"),
						[{ key: 0, title: "Insert before all (Priority '1')" }], "only one priority entry is visibile data was reset");
				}.bind(this));
			});
		});

		QUnit.module("the save as adaptation dialog is opened and two context-based adaptations already exist", {
			beforeEach: function() {
				this.sManageAdaptationsDialog = "manageAdaptationDialog";
				this.oContextBasedAdaptatations = new JSONModel({
					adaptations: [{
						id: "id-1591275572834-1",
						contexts: {
							role: ["SALES"]
						},
						title: "German Admin",
						description: "ACH Admin for Germany",
						createdBy: "Test User 1",
						createdAt: "May 25, 2022",
						changedBy: "Test User 1",
						changedAt: "May 27, 2022"
					},
					{
						id: "id-1591275572835-1",
						contexts: {
							role: ["MARKETING_MANAGER"]
						},
						title: "DLM Copilot",
						description: "DLM copilot contexts for Europe",
						createdBy: "Test User 2",
						createdAt: "May 17, 2022",
						changedBy: "Test User 2",
						changedAt: "SEPTEMBER 07, 2022"
					}]
				});
				this.aPriorityList = [
					{ key: 0, title: "Insert before all (Priority '1')" },
					{ key: "1", title: "Insert after 'German Admin' (Priority '2')" },
					{ key: "2", title: "Insert after 'DLM Copilot' (Priority '3')" }
				];
				sandbox.stub(ContextBasedAdaptationsAPI, "load").resolves(this.oContextBasedAdaptatations);
				this.oFragmentLoadSpy = sandbox.spy(Fragment, "load");
				return this.oSaveAsAdaptation.openAddAdaptationDialog().then(function (oDialog) {
					this.oDialog = oDialog;
					return this.oToolbar._pFragmentLoaded;
				}.bind(this))
				.then(function() {
					return this.oSaveAsAdaptation._oContextComponentInstance.rootControlLoaded();
				}.bind(this));
			}
		}, function() {
			QUnit.test("and the save as adaptations dialog is visible and correctly formatted", function(assert) {
				assert.strictEqual(this.oFragmentLoadSpy.callCount, 1, "the fragment was loaded");
				assert.ok(this.oDialog.isOpen(), "the dialog is opened");
				assert.deepEqual(this.oDialog.getModel("prioritySelectionModel").getProperty("/priority"), this.aPriorityList, "the correct priority list is shown");
			});

			QUnit.test("and the mandatory data is entered", function(assert) {
				var oSaveButton = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-saveButton");
				var oTitleInput = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-title-input");
				var oContextVisibility = getControl("contextSharingContainer");
				var oPrioritySelect = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-rank-select");
				var contextVisibilityComponent = getControl("contextSharingContainer");
				assert.ok(oContextVisibility.getVisible(), "context visibility container is visible");
				oTitleInput.setValue("first context-based adaptation");
				assert.strictEqual(oTitleInput.getValue(), "first context-based adaptation", "correct value is written");
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");
				oPrioritySelect.setSelectedItem(oPrioritySelect.getItemAt(2));
				assert.strictEqual(oPrioritySelect.getSelectedItem().getText(), this.aPriorityList[2].title, "the correct priority is selected");
				contextVisibilityComponent.getComponentInstance().setSelectedContexts({role: ["Role 1", "Role 2"]});
				assert.ok(oSaveButton.getEnabled(), "save button is enabled");
			});

			QUnit.test("and an empty title or title with spaces only is entered", function(assert) {
				var oSaveButton = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-saveButton");
				var oTitleInput = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-title-input");

				oTitleInput.setValue("");
				assert.strictEqual(oTitleInput.getValue(), "", "correct value is written");
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");

				oTitleInput.setValue(" ");
				assert.strictEqual(oTitleInput.getValue(), " ", "correct value is written");
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");

				oTitleInput.setValue("German Admin");
				assert.strictEqual(oTitleInput.getValue(), "German Admin", "correct value is written");
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");
			});

			QUnit.test("and an already existing context-based adaptation title is entered", function(assert) {
				var oSaveButton = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-saveButton");
				var oTitleInput = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-title-input");

				oTitleInput.setValue("German Admin");
				assert.strictEqual(oTitleInput.getValue(), "German Admin", "correct value is written");
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");

				oTitleInput.setValue(" German Admin");
				assert.strictEqual(oTitleInput.getValue(), " German Admin", "correct value is written");
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");

				oTitleInput.setValue("German Admin ");
				assert.strictEqual(oTitleInput.getValue(), "German Admin ", "correct value is written");
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");

				oTitleInput.setValue(" German Admin ");
				assert.strictEqual(oTitleInput.getValue(), " German Admin ", "correct value is written");
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");
			});

			QUnit.test("and mandatory information is entered except contexts", function(assert) {
				var oSaveButton = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-saveButton");
				var oTitleInput = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-title-input");
				var oContextVisibility = getControl("contextSharingContainer");
				var oPrioritySelect = getToolbarRelatedControl(this.oToolbar, "saveAdaptation-rank-select");
				var contextVisibilityComponent = getControl("contextSharingContainer");
				var aRemoveRoles = getControl("contextSharing---ContextVisibility--removeAllButton");
				assert.ok(oContextVisibility.getVisible(), "context visibility container is visible");
				oTitleInput.setValue("first context-based adaptation");
				assert.strictEqual(oTitleInput.getValue(), "first context-based adaptation", "correct value is written");
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");
				oPrioritySelect.setSelectedItem(oPrioritySelect.getItemAt(2));
				assert.strictEqual(oPrioritySelect.getSelectedItem().getText(), this.aPriorityList[2].title, "the correct priority is selected");
				contextVisibilityComponent.getComponentInstance().setSelectedContexts({role: ["Role 1", "Role 2"]});
				assert.ok(oSaveButton.getEnabled(), "save button is enabled");

				aRemoveRoles.firePress();
				assert.notOk(oSaveButton.getEnabled(), "save button is not enabled");
			});
		});
	});
});