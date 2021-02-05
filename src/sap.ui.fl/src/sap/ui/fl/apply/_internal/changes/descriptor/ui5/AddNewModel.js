
/*!
 * ${copyright}
 */

sap.ui.define([

], function(

) {
	"use strict";

	var SUPPORTED_MODEL_DATASOURCE_TYPES = ["OData", "INA", "XML", "JSON", "FHIR"];
	var SUPPORTED_DATASOURCE_TYPES = SUPPORTED_MODEL_DATASOURCE_TYPES.concat(["ODataAnnotation"]);

	/**
	 * Checks in the oChange if a dataSource has the type 'OData|INA|XML|JSON|FHIR|ODataAnnotation'.
	 * If no type is specified, the default value is 'OData'.
	 * @param {object} oChangeDataSource Path to dataSources
	 * @param {string} sDataSource DataSource name
	 * @returns {boolean} Result of the check
	 *
	 * @private
	 * @ui5-restricted sap.ui.fl.apply._internal
	 */
	function isDataSourceTypeSupported(oChangeDataSource, sDataSource, aSupportedTypes) {
		return !oChangeDataSource[sDataSource].type ||
			aSupportedTypes.indexOf(oChangeDataSource[sDataSource]["type"]) >= 0;
	}

	function isODataDefinedForODataAnnotation(oChangeDataSource, sODataAnnotationName) {
		var aDataSource = Object.keys(oChangeDataSource).map(function(e) {
			return oChangeDataSource[e];
		});
		return aDataSource.some(function(oDataSource) {
			return (!oDataSource.type || oDataSource["type"] === "OData") &&
			oDataSource["settings"]["annotations"].indexOf(sODataAnnotationName) >= 0;
		});
	}

	/**
	 * Checks in the change that defined model dataSource exists and is of the type 'OData|INA|XML|JSON|FHIR'.
	 * It also checks in the manifest that the defined model dataSource exists but must not be the type of 'ODataAnnotation' (an exception will be thrown).
	 * If no type is specified, the default value is 'OData'.
	 * @param {object} oManifestDataSource Path to dataSources in manifest
	 * @param {object} oChangeDataSource Path to dataSources in change
	 * @param {string} sDataSource DataSource name
	 * @returns {boolean} Result of the check
	 *
	 * @private
	 * @ui5-restricted sap.ui.fl.apply._internal
	 */
	function isReferencedModelDataSourceExisting(oManifestDataSource, oChangeDataSource, sDataSource) {
		return isExistingAndSupported(oChangeDataSource, sDataSource, SUPPORTED_MODEL_DATASOURCE_TYPES) || isDataSourceExistingInManifest(oManifestDataSource, sDataSource);
	}

	function isExistingAndSupported(oDataSources, sDataSource, aSupportedTypes) {
		return hasSearchType(oDataSources, sDataSource) && isDataSourceTypeSupported(oDataSources, sDataSource, aSupportedTypes);
	}

	function isDataSourceExistingInManifest(oDataSources, sDataSource) {
		if (hasSearchType(oDataSources, sDataSource)) {
			if (oDataSources[sDataSource].type && oDataSources[sDataSource]["type"] === "ODataAnnotation") {
				throw new Error("The already existing dataSource '" + sDataSource + "' in the manifest is type of 'ODataAnnotation'. A model must not reference to a dataSource which is of type 'ODataAnnotation'");
			}
			return true;
		}
		return false;
	}

	function hasSearchType(oToBeSearched, sSearchType) {
		return oToBeSearched && Object.keys(oToBeSearched).indexOf(sSearchType) >= 0;
	}

	function mergeChange(oManifestContent, oChangeContent, sErrorMessage) {
		if (oChangeContent) {
			Object.keys(oChangeContent).forEach(function(sNewModelName) {
				if (oManifestContent[sNewModelName]) {
					throw new Error("The " + sErrorMessage + " '" + sNewModelName + "' already exists");
				}
				oManifestContent[sNewModelName] = oChangeContent[sNewModelName];
			});
		}
	}

	function merge(oManifest, oChange, sRootPath, sChildPath, sModelPath) {
		if (!oManifest[sRootPath][sChildPath]) {
			oManifest[sRootPath][sChildPath] = {};
		}
		mergeChange(oManifest[sRootPath][sChildPath], oChange.getContent()[sModelPath], sModelPath);
		return oManifest[sRootPath][sChildPath];
	}

	function isChangeDataSourceUsedByChangeModel(oChangeDataSource, oChangeModel, sDataSource) {
		if (oChangeDataSource[sDataSource].type === "ODataAnnotation") {
			return true;
		}
		var aModels = Object.keys(oChangeModel).map(function(e) {
			return oChangeModel[e];
		});
		return aModels.some(function(oModel) {
			return oModel.dataSource && oModel["dataSource"] === sDataSource;
		});
	}

	function hasModelPropertyTypOrDataSource(oChangeModel, sModel) {
		return oChangeModel[sModel].type || oChangeModel[sModel].dataSource;
	}

	/**
	 * Descriptor change merger for change type <code>appdescr_ui5_addNewModel</code>.
	 * Adds a new model to the manifest.json under path sap.ui5.models. It can also make changes to the path sap.app.dataSources.
	 * It supports different types of models (for example: ResourceModel and OData).
	 *
	 * Available only for build {@link sap.ui.fl.apply._internal.changes.descriptor.RegistrationBuild}.
	 *
	 * @namespace sap.ui.fl.apply._internal.changes.descriptor.ui5.AddNewModel
	 * @experimental
	 * @since 1.87
	 * @version ${version}
	 * @private
	 * @ui5-restricted sap.ui.fl.apply._internal
	 */
	var AddNewModel = {

		/**
		 * Method to apply the <code>appdescr_ui5_addNewModel</code> change to the manifest.
		 * @param {object} oManifest Original manifest
		 * @param {object} oChange Change with type <code>appdescr_ui5_addNewModel</code>
		 * @returns {object} Updated manifest with merged content
		 *
		 * @private
		 * @ui5-restricted sap.ui.fl.apply._internal
		 */
		applyChange: function(oManifest, oChange) {
			var oChangeModel = oChange.getContent().model;
			var oChangeDataSource = oChange.getContent().dataSource;

			if (oChangeModel) {
				// This check could be removed in the future
				if (Object.keys(oChangeModel).length !== 1) {
					throw new Error("There are currently '" + Object.keys(oChangeModel).length + "' models in the change. Currently it is only allowed to add '1' model");
				}

				Object.keys(oChangeModel).forEach(function(sModel) {
					if (!hasModelPropertyTypOrDataSource(oChangeModel, sModel)) {
						throw new Error("There is no 'dataSource' or 'type' in the change model defined. Please define either 'type' or 'dataSource' in property '" + sModel + "'");
					}

					if (oChangeModel[sModel].dataSource) {
						if (!isReferencedModelDataSourceExisting(oManifest["sap.app"]["dataSources"], oChangeDataSource, oChangeModel[sModel]["dataSource"])) {
							throw new Error("The defined dataSource '" + oChangeModel[sModel]["dataSource"] + "' in the model does not exists as dataSource or must be allowed type of " + SUPPORTED_MODEL_DATASOURCE_TYPES.join("|"));
						}
					}
				});
			} else {
				throw new Error("No model defined");
			}

			if (oChangeDataSource) {
				Object.keys(oChangeDataSource).forEach(function(sDataSource) {
					if (!isDataSourceTypeSupported(oChangeDataSource, sDataSource, SUPPORTED_DATASOURCE_TYPES)) {
						throw new Error("The dataSource '" + sDataSource + "' has the type '" + oChangeDataSource[sDataSource]["type"] + "', but only dataSources with the follwing types are supported: " + SUPPORTED_DATASOURCE_TYPES.join("|"));
					}

					if (!isChangeDataSourceUsedByChangeModel(oChangeDataSource, oChangeModel, sDataSource)) {
						throw new Error("The dataSource in the change '" + sDataSource + "' is not used by any model in the change. A dataSource in the change must be used by model in the change");
					}

					if (oChangeDataSource[sDataSource]["type"] === "ODataAnnotation") {
						if (!isODataDefinedForODataAnnotation(oChangeDataSource, sDataSource)) {
							throw new Error("There is no dataSource with type 'OData' defined which includes the annotation '" + sDataSource + "'");
						}
					}
				});
			}

			merge(oManifest, oChange, "sap.ui5", "models", "model");
			merge(oManifest, oChange, "sap.app", "dataSources", "dataSource");

			return oManifest;
		}

	};

	return AddNewModel;
}, true);