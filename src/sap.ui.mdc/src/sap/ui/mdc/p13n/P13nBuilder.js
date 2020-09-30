/*
* ! ${copyright}
*/
sap.ui.define([
    "sap/m/Button",
    "sap/m/Bar",
    "sap/m/Title",
    "sap/base/util/merge",
    "sap/m/MessageBox"
], function(Button, Bar, Title, merge, MessageBox) {
    "use strict";

    var oRB = sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");

	/**
	 *  Internal Utility class to create personalization UI's
	 *
	 * @author SAP SE
	 * @private
	 * @since 1.81.0
	 * @alias sap.ui.mdc.p13n.P13nBuilder
	 */
	var P13nBuilder = {

        /**
         *
         * @param {object} oP13nUI Control displayed in the content area
         * @param {object} mDialogSettings Settings to overwrite popover default properties, such as: <code>contentHeight</code>
         * @param {object} [mDialogSettings.reset] Reset settings for the custom header creation
         * @param {Function} [mDialogSettings.reset.onExecute] Callback executed upon triggering a reset
         * @param {String} [mDialogSettings.reset.warningText] Warning which is displyed prior to executing the reset
         *
         * @returns {Promise} promise resolving in the Popover instance
         */
        createP13nPopover: function(oP13nUI, mDialogSettings) {

            return new Promise(function(resolve, reject){

                sap.ui.require(["sap/m/ResponsivePopover"], function(ResponsivePopover){
                    P13nBuilder["_checkSettings"](oP13nUI, mDialogSettings, reject);

                    var oPopover = new ResponsivePopover({
                        title: mDialogSettings.title,
                        horizontalScrolling: mDialogSettings.hasOwnProperty("horizontalScrolling") ? mDialogSettings.horizontalScrolling : false,
                        verticalScrolling: mDialogSettings.hasOwnProperty("verticalScrolling") ? mDialogSettings.verticalScrolling : false,
                        contentWidth: mDialogSettings.contentWidth ? mDialogSettings.contentWidth : "24rem",
                        resizable: mDialogSettings.hasOwnProperty("resizable") ? mDialogSettings.resizable : true,
                        contentHeight: mDialogSettings.contentHeight ? mDialogSettings.contentHeight : "35rem",
                        placement: mDialogSettings.placement ? mDialogSettings.placement : "Bottom",
                        content: oP13nUI,
                        afterClose: mDialogSettings.afterClose ? mDialogSettings.afterClose : function(){}
                    });

                    if (mDialogSettings.reset) {
                        var oCustomHeader = this._createResetHeader({
                            title: mDialogSettings.title,
                            reset: mDialogSettings.reset.onExecute,
                            warningText: mDialogSettings.reset.warningText
                        });
                        oPopover.setCustomHeader(oCustomHeader);
                    }

                    resolve(oPopover);
                },reject);
            });

        },

        /**
         *
         * @param {object} oP13nUI Control displayed in the content area
         * @param {object} mDialogSettings Settings to overwrite dialog default properties, such as: <code>contentHeight</code>
         * @param {object} [mDialogSettings.reset] Reset settings for the custom header creation
         * @param {Function} [mDialogSettings.reset.onExecute] Callback executed upon triggering a reset
         * @param {String} [mDialogSettings.reset.warningText] Warning which is displyed prior to executing the reset
         *
         * @returns {Promise} Promise resolving in the Dialog instance
         */
        createP13nDialog: function(oP13nUI, mDialogSettings) {

            return new Promise(function(resolve, reject){

                P13nBuilder["_checkSettings"](oP13nUI, mDialogSettings, reject);

                var sId = mDialogSettings.id;

                sap.ui.require(["sap/m/Dialog", "sap/m/Button"], function(Dialog, Button){
                    var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");
                    var oContainer = new Dialog(sId, {
                        title: mDialogSettings.title,
                        horizontalScrolling: mDialogSettings.hasOwnProperty("horizontalScrolling") ? mDialogSettings.horizontalScrolling : false,
                        verticalScrolling: mDialogSettings.hasOwnProperty("verticalScrolling") ? mDialogSettings.verticalScrolling : true,
                        contentWidth: mDialogSettings.contentWidth ? mDialogSettings.contentWidth : "40rem",
                        contentHeight: mDialogSettings.contentHeight ? mDialogSettings.contentHeight : "55rem",
                        draggable: true,
                        resizable: true,
                        stretch: "{device>/system/phone}",
                        content: oP13nUI,
                        buttons: [
                            new Button(sId ? sId + "-confirmBtn" : undefined, {
                                text:  mDialogSettings.confirm && mDialogSettings.confirm.text ?  mDialogSettings.confirm.text : oResourceBundle.getText("p13nDialog.OK"),
                                type: "Emphasized",
                                press: function() {
                                    if (mDialogSettings.confirm && mDialogSettings.confirm.handler) {
                                        mDialogSettings.confirm.handler.apply(oContainer, arguments);
                                    }
                                }

                            }), new Button(sId ? sId + "-cancelBtn" : undefined, {
                                text: oResourceBundle.getText("p13nDialog.CANCEL"),
                                press: function () {
                                    mDialogSettings.cancel.apply(oContainer, arguments);
                                }
                            })
                        ]
                    });

                    if (mDialogSettings.reset) {
                        var oCustomHeader = P13nBuilder._createResetHeader({
                            title: mDialogSettings.title,
                            reset: mDialogSettings.reset.onExecute,
                            warningText: mDialogSettings.reset.warningText
                        });
                        oContainer.setCustomHeader(oCustomHeader);
                    }

                    var aAdditionalButtons = mDialogSettings.additionalButtons;
                    if (aAdditionalButtons instanceof Array) {
                        aAdditionalButtons.forEach(function(oButton){
                            if (!oButton.isA("sap.m.Button")) {
                                reject("Please only provide sap.m.Button instances as 'additionalButtons'");
                            }
                            oContainer.addButton(oButton);
                        });
                    }
                    resolve(oContainer);
                }, reject);
            });

        },

        /**
         *
         * @param {object} mSettings Settings object to create a customHeader including a reset Button
         * @param {String} mSettings.title Title for the custom reset header
         * @param {function} mSettings.reset Control specific reset handling
         * @param {String} [mSettings.warningText] Text which is displayed prior to executing to reset execution
         *
         * @returns {sap.m.Bar} The created custom header Bar
         */
        _createResetHeader: function(mSettings) {

            var oBar = new Bar({
                contentLeft: [
                    new Title({
                        text: mSettings.title
                    })
                ]
            });

            if (mSettings.reset) {
                oBar.addContentRight(new Button({
                    text: sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc").getText("p13nDialog.RESET"),
                    press: function() {
                        var sResetText = mSettings.warningText ? mSettings.warningText : sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc").getText("filterbar.ADAPT_RESET_WARNING");
                        MessageBox.warning(sResetText, {
                            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                            emphasizedAction: MessageBox.Action.OK,
                            onClose: function (sAction) {
                                if (sAction === MessageBox.Action.OK) {
                                    mSettings.reset();
                                }
                            }
                        });
                    }
                }));
            }

            return oBar;
        },

        /**
         *
         * @param {object} oControlState Control state as defined in IxState interface <code>getCurrentState</code> method
         * @param {array} aInfoData Array of property info objects
         * @param {array} [aIgnoreAttributes] Optional array of key-value pairs to define ignored values <code>[{ignoreKey: "Key", ignoreValue:"Value"}]</code>
         * @param {string} [sP13nType] Optional p13n type definition - should not be used without AdaptationController
         *
         * @returns {object} Object structure to generate a p13n model
         */
        prepareP13nData: function(oControlState, aInfoData, aIgnoreAttributes, sP13nType) {

            aIgnoreAttributes = aIgnoreAttributes ? aIgnoreAttributes : [];
            var aItems = [], mItemsGrouped = {};
            var aItemState = oControlState.items || [];
            var aSortState = oControlState.sorters || [];

            var mExistingProperties = this.arrayToMap(aItemState);
            var mExistingSorters = this.arrayToMap(aSortState);
            var mExistingFilters = oControlState.filter || {};

            aInfoData.forEach(function (oProperty) {
                var mItem = {};

                if (P13nBuilder._isExcludeProperty(oProperty, aIgnoreAttributes)) {
                    return;
                }

                //use key for the item determiniation --> use the path as fallback
                var sKey = oProperty.name;
                var oExistingProperty = mExistingProperties[sKey];

                //add general information
                mItem.selected = oExistingProperty ? true : false;
                mItem.position = oExistingProperty ? oExistingProperty.position : -1;
                mItem = merge(mItem, oProperty, oExistingProperty);
                mItem.label = oProperty.label || oProperty.name;
                mItem.tooltip = oProperty.tooltip ? oProperty.tooltip : oProperty.label;
                mItem.visibleInDialog = oProperty.hasOwnProperty("visibleInDialog") ? oProperty.visibleInDialog : true;

                //Add sort info
                if (sP13nType == "Sort"){//TODO: remove workaround for FlexUtil ungeneric changecontent check
                    mItem.isSorted = mExistingSorters[sKey] ? true : false;
                    mItem.sortPosition = mExistingSorters[sKey] ? mExistingSorters[sKey].position : -1;
                    mItem.descending = mExistingSorters[sKey] ? mExistingSorters[sKey].descending : false;
                }

                if (oControlState.filter){
                    //Add filter info
                    var aExistingFilters = mExistingFilters[sKey];
                    mItem.isFiltered = aExistingFilters && aExistingFilters.length > 0 ? true : false;
                }
                mItem.group = mItem.group ? mItem.group : "BASIC";
                mItemsGrouped[mItem.group] = mItemsGrouped[mItem.group] ? mItemsGrouped[mItem.group] : [];
                mItemsGrouped[mItem.group].push(mItem);

                aItems.push(mItem);

            });

            if (sP13nType){
                this._sortP13nData(sP13nType, aItems);
            }

            return {
                items: aItems,
                itemsGrouped: this._builtGroupStructure(mItemsGrouped)
            };
        },

        //TODO: generify
        _sortP13nData: function (sP13nType, aItems) {

            var mP13nTypeSorting = this._getSortAttributes()[sP13nType];

            var sPositionAttribute = mP13nTypeSorting.position;
            var sSelectedAttribute = mP13nTypeSorting.visible;

            var sLocale = sap.ui.getCore().getConfiguration().getLocale().toString();

            var oCollator = window.Intl.Collator(sLocale, {});

            // group selected / unselected --> sort alphabetically in each group
            aItems.sort(function (mField1, mField2) {
                if (mField1[sSelectedAttribute] && mField2[sSelectedAttribute]) {
                    return (mField1[sPositionAttribute] || 0) - (mField2[sPositionAttribute] || 0);
                } else if (mField1[sSelectedAttribute]) {
                    return -1;
                } else if (mField2[sSelectedAttribute]) {
                    return 1;
                } else if (!mField1[sSelectedAttribute] && !mField2[sSelectedAttribute]) {
                    return oCollator.compare(mField1.label, mField2.label);
                }
            });

        },

        _getSortAttributes: function(){
            return {
                Item: {
                    position: "position",
                    visible: "selected"
                },
                Sort: {
                    position: "sortPosition",
                    visible: "isSorted"
                },
                Filter: {
                    position: "position",
                    visible: "selected"
                },
                generic: {
                    position: undefined,
                    visible: undefined
                }
            };
        },

        _builtGroupStructure: function(mItemsGrouped) {
            var aGroupedItems = [];
            Object.keys(mItemsGrouped).forEach(function(sGroupKey){
                this._sortP13nData("generic", mItemsGrouped[sGroupKey]);
                aGroupedItems.push({
                    group: sGroupKey,
                    groupLabel: mItemsGrouped[sGroupKey][0].groupLabel || oRB.getText("p13nDialog.FILTER_DEFAULT_GROUP"),//Grouplabel might not be necessarily be propagated to every item
                    groupVisible: true,
                    items: mItemsGrouped[sGroupKey]
                });
            }.bind(this));
            return aGroupedItems;

        },

        _isExcludeProperty: function(oProperty, aIgnoreAttributes){

            return aIgnoreAttributes.some(function(oKeyValuePair){
                var sIgnoreKey = oKeyValuePair.ignoreKey;
                var vIgnoreValue = oKeyValuePair.ignoreValue;
                return oProperty[sIgnoreKey] === vIgnoreValue;
            });

        },

        _checkSettings: function(oP13nUI, mDialogSettings, fnOnError) {
            if (!mDialogSettings) {
                fnOnError("Please provide a settings object for p13n creation");
            }

            if (!mDialogSettings.title && !mDialogSettings.customHeader) {
                fnOnError("Please provide a title or customHeader in the settings object for p13n creation");
            }
        },

        arrayToMap: function(aArray) {
            return aArray.reduce(function(mMap, oProp, iIndex){
                mMap[oProp.name] = oProp;
                mMap[oProp.name].position = iIndex;
                return mMap;
            }, {});
        }

    };


	return P13nBuilder;
});
