/*!
 * ${copyright}
 */
sap.ui.define([
	'sap/ui/Device',
	'sap/ui/mdc/enum/EditMode',
	'sap/ui/mdc/enum/FieldDisplay',
	'sap/ui/mdc/enum/ConditionValidated',
	'sap/ui/mdc/field/FieldBaseRenderer',
	'sap/ui/mdc/condition/FilterOperatorUtil',
	'sap/ui/mdc/condition/Condition',
	'sap/ui/mdc/condition/ConditionValidateException',
	'sap/ui/mdc/field/ConditionType',
	'sap/ui/mdc/field/ConditionsType',
	'sap/ui/mdc/field/splitValue',
	'sap/ui/mdc/enum/BaseType',
	'sap/ui/mdc/field/content/ContentFactory',
	'sap/ui/mdc/Control',
	"sap/ui/mdc/util/loadModules",
	'sap/ui/core/library',
	'sap/ui/core/LabelEnablement',
	'sap/ui/core/message/MessageMixin',
	'sap/base/util/deepEqual',
	'sap/base/util/merge',
	'sap/base/Log',
	'sap/ui/dom/containsOrEquals',
	'sap/ui/model/BindingMode',
	'sap/ui/model/FormatException',
	'sap/ui/model/ParseException',
	'sap/ui/model/ValidateException',
	'sap/ui/model/base/ManagedObjectModel',
	'sap/ui/base/ManagedObjectObserver',
	'sap/ui/base/SyncPromise',
	'sap/base/util/restricted/_debounce',
	'sap/ui/events/KeyCodes'
], function(
	Device,
	EditMode,
	FieldDisplay,
	ConditionValidated,
	FieldBaseRenderer,
	FilterOperatorUtil,
	Condition,
	ConditionValidateException,
	ConditionType,
	ConditionsType,
	splitValue,
	BaseType,
	ContentFactory,
	Control,
	loadModules,
	coreLibrary,
	LabelEnablement,
	MessageMixin,
	deepEqual,
	merge,
	Log,
	containsOrEquals,
	BindingMode,
	FormatException,
	ParseException,
	ValidateException,
	ManagedObjectModel,
	ManagedObjectObserver,
	SyncPromise,
	debounce,
	KeyCodes
) {
	"use strict";

	var ValueState = coreLibrary.ValueState;
	var TextAlign = coreLibrary.TextAlign;
	var TextDirection = coreLibrary.TextDirection;

	/**
	 * Modules for {@link sap.ui.mdc.Field Field} and {@link sap.ui.mdc.FilterField FilterField}
	 * @namespace
	 * @name sap.ui.mdc.field
	 * @since 1.58.0
	 * @private
	 * @experimental As of version 1.58
	 * @ui5-restricted sap.ui.mdc sap.fe
	 * @MDC_PUBLIC_CANDIDATE
	 */

	/**
	 * Constructor for a new <code>FieldBase</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * The <code>FieldBase</code> control is the base class for the {@link sap.ui.mdc.Field Field}, {@link sap.ui.mdc.MultiValueField MultiValueField}
	 * and {@link sap.ui.mdc.FilterField FilterField} controls.
	 * It must not be used stand-alone.
	 *
	 * @extends sap.ui.mdc.Control
	 * @implements sap.ui.core.IFormContent, sap.ui.core.ISemanticFormContent, sap.m.IOverflowToolbarContent
	 *
	 * @author SAP SE
	 * @version ${version}
	 *
	 * @constructor
	 * @alias sap.ui.mdc.field.FieldBase
	 * @since 1.58.0
	 * @abstract
	 *
	 * @borrows sap.ui.core.ISemanticFormContent.getFormFormattedValue as #getFormFormattedValue
	 * @borrows sap.ui.core.ISemanticFormContent.getFormValueProperty as #getFormValueProperty
	 *
	 * @private
	 * @ui5-restricted sap.fe
	 * @MDC_PUBLIC_CANDIDATE
	 * @experimental As of version 1.58
	 */
	var FieldBase = Control.extend("sap.ui.mdc.field.FieldBase", /* @lends sap.ui.mdc.field.FieldBase.prototype */ {
		metadata: {
			interfaces: ["sap.ui.core.IFormContent", "sap.ui.core.ISemanticFormContent", "sap.m.IOverflowToolbarContent"],
			designtime: "sap/ui/mdc/designtime/field/FieldBase.designtime",
			library: "sap.ui.mdc",
			properties: {
				/**
				 * The type of data handled by the field.
				 * This type is used to parse, format, and validate the value.
				 */
				dataType: {
					type: "string",
					group: "Data",
					defaultValue: 'sap.ui.model.type.String'
				},

				/**
				 * The constraints of the type specified in <code>dataType</code>.
				 */
				dataTypeConstraints: {
					type: "object",
					group: "Data",
					defaultValue: null
				},

				/**
				 * The format options of the type specified in <code>dataType</code>.
				 */
				dataTypeFormatOptions: {
					type: "object",
					group: "Data",
					defaultValue: null
				},

				/**
				 * Determines whether the field is editable, read-only, or disabled.
				 */
				editMode: {
					type: "sap.ui.mdc.enum.EditMode",
					group: "Data",
					defaultValue: EditMode.Editable
				},

				/**
				 * Indicates that user input is required.
				 */
				required: {
					type: "boolean",
					group: "Data",
					defaultValue: false
				},

				/**
				 * Defines whether the value and/or description of the field is shown and in what order.
				 */
				display: {
					type: "sap.ui.mdc.enum.FieldDisplay",
					defaultValue: FieldDisplay.Value
				},

				/**
				 * Defines the horizontal alignment of the text that is shown inside the input field.
				 *
				 * <b>Note:</b> If the rendered control doesn't support this feature, this property is ignored.
				 */
				textAlign: {
					type: "sap.ui.core.TextAlign",
					group: "Appearance",
					defaultValue: TextAlign.Initial
				},

				/**
				 * Defines the text directionality of the input field, for example <code>RTL</code>, <code>LTR</code>.
				 *
				 * <b>Note:</b> If the rendered control doesn't support this feature, this property is ignored.
				 */
				textDirection: {
					type: "sap.ui.core.TextDirection",
					group: "Appearance",
					defaultValue: TextDirection.Inherit
				},

				/**
				 * Defines a short hint intended to aid the user with data entry when the control has no value.
				 * If the value is <code>null</code> no placeholder is shown.
				 *
				 * <b>Note:</b> If the rendered control doesn't support this feature, this property is ignored.
				 */
				placeholder: {
					type: "string",
					group: "Misc",
					defaultValue: ""
				},

				/**
				 * Visualizes the validation state of the control, for example <code>Error</code>, <code>Warning</code>, <code>Success</code>.
				 *
				 * <b>Note:</b> The visualization of the <code>ValueState</code> property is handled by the inner rendered control.
				 * If a control is set (using <code>content</code>, <code>contentEdit</code>, or <code>contentDisplay</code>), this control needs to support
				 * the <code>valueState</code> behavior, otherwise <code>valueState</code> is not visualized.
				 */
				valueState: {
					type: "sap.ui.core.ValueState",
					group: "Appearance",
					defaultValue: ValueState.None
				},

				/**
				 * Defines the text that appears in the value state message pop-up. If this has not specified, a default text from the resource bundle is shown.
				 */
				valueStateText: {
					type: "string",
					group: "Misc",
					defaultValue: null
				},

				/**
				 * Defines the width of the control.
				 */
				width: {
					type: "sap.ui.core.CSSSize",
					group: "Dimension",
					defaultValue: null
				},

				/**
				 * If set, the <code>Field</code> is rendered using a multi-line control.
				 *
				 * This property only affects types that support multiple lines.
				 *
				 * This property is only used for single-value fields.
				 *
				 * <b>Note</b> If the data type used doesn't support multiple lines an error is thrown.
				 */
				multipleLines: {
					type: "boolean",
					group: "Appearance",
					defaultValue: false
				},

				/**
				 * Sets the maximum amount of conditions that are allowed for this field.
				 *
				 * The default value of -1 indicates that an unlimited amount of conditions can be defined.
				 *
				 * <b>Note</b> If the data type used doesn't support multiple conditions, an error is thrown.
				 */
				maxConditions: {
					type: "int",
					group: "Behavior",
					defaultValue: -1
				},

				/**
				 * Sets the conditions that represent the values of the field.
				 *
				 * This should be bound to a {@link sap.ui.mdc.condition.ConditionModel ConditionModel} using the corresponding fieldPath.
				 *
				 * <b>Note:</b> For {@link sap.ui.mdc.FilterField FilterField} controls, the <code>conditions</code> property must be used to bind
				 * {@link sap.ui.mdc.FilterField FilterField} to a {@link sap.ui.mdc.condition.ConditionModel ConditionModel}.</br>
				 * For example, for a {@link sap.ui.mdc.FilterField FilterField} control inside a {@link sap.ui.mdc.FilterBar FilterBar} control the binding looks like this:</br>
				 * <code>conditions="{$filters>/conditions/propertyPath}"</code> with the following data:
				 * <ul>
				 * <li><code>$filters</code> as the name of the condition model</li>
				 * <li><code>/conditions/</code> as a required static part of the binding</li>
				 * <li><code>propertyPath</code> as the property name</li>
				 * </ul>
				 *
				 * For an Any (see {@link sap.ui.model.FilterOperator}) {@link sap.ui.mdc.FilterField FilterField} control, the binding looks like this:</br>
				 * <code>conditions='{$filters>/conditions/navPath&#42;/propertyPath}'</code> with the following data:
				 * <ul>
				 * <li><code>$filters</code> as the name of the condition model</li>
				 * <li><code>/conditions/</code> as a required static part of the binding</li>
				 * <li><code>navPath&#42;/</code> as the navigation property name</li>
				 * <li><code>propertyPath</code> as the property name</li>
				 * </ul>
				 * Between <code>navPath</code> and <code>propertyPath</code>, <b>&#42;/</b> is required.
				 *
				 * <b>Note:</b> A condition must have the structure of {@link sap.ui.mdc.condition.ConditionObject ConditionObject}.
				 */
				conditions: {
					type: "object[]",
					group: "Data",
					defaultValue: [],
					byValue: true,
					bindable: "bindable"
				},

				/**
				 * Defines the label text for the field.
				 *
				 * This can be used by {@link sap.ui.mdc.FilterBar FilterBar} or {@link sap.ui.layout.form.Form Form} controls to create a {@link sap.m.Label Label} control for the field.
				 *
				 * @experimental
				 * @since 1.62.0 Disclaimer: this property is in a beta state - incompatible API changes may be done before its official public release. Use at your own discretion.
				 */
				label: {
					type: "string",
					group: "Misc",
					defaultValue: ""
				},

				/**
				 * Path to <code>FieldBaseDelegate</code> module that provides the required APIs to execute model-specific logic.<br>
				 * <b>Note:</b> Ensure that the related file can be requested (any required library has to be loaded before that).<br>
				 * Do not bind or modify the module. Once the required module is associated, this property might not be needed any longer.
				 *
				 * @since 1.72.0
				 * @experimental
				 */
				delegate: {
					type: "object",
					defaultValue: {
						name: "sap/ui/mdc/field/FieldBaseDelegate",
						payload: {}
					}
				},

				/**
				 * If set, an empty <code>Field</code> renders an empty-indicator in display mode.
				 *
				 * This property only takes effect if <code>editMode</code> is set to <code>Display</code>.
				 *
				 * <b>Note</b> Empty means the <code>Field</code> holds no value. If an empty string is a valid value,
				 * the <code>Field</code> might show nothing, depending on the <code>display</code> settings and assigned description
				 * or <code>FieldHelp</code>.
				 *
				 * @since 1.85.0
				 */
				showEmptyIndicator: {
					type: "boolean",
					group: "Appearance",
					defaultValue: false
				},

				/**
				 * Internal property to bind the <code>showValueHelp</code> property of the internal <code>Input</code> control.
				 */
				_fieldHelpEnabled: {
					type: "boolean",
					group: "Appearance",
					defaultValue: false,
					visibility: "hidden"
				},

				/**
				 * Sets the ARIA attributes added to the inner control.
				 *
				 * The object contains ARIA attributes in an <code>aria</code> node.
				 * Additional attributes, such as <code>role</code>, <code>autocomplete</code> or <code>valueHelpEnabled</code>, are added on root level.
				 */
				_ariaAttributes: {
					type: "object",
					defaultValue: {},
					byValue: true,
					visibility: "hidden"
				},

				/**
				 * Internal property to bind the operators to the internal <code>DynamicDateRange</code> (or other) control.
				 */
				_operators: {
					type: "string[]",
					defaultValue: [],
					visibility: "hidden"
				}

			},
			aggregations: {
				/**
				 * Optional content that can be rendered.
				 *
				 * Per default, depending on <code>editMode</code>, <code>multipleLines</code> and used data type a content control is rendered. For simple string types a {@link sap.m.Text Text}
				 * control is rendered in display mode and a {@link sap.m.Input Input} control in edit mode. If a control is assigned in the <code>content</code> aggregation this will be
				 * rendered instead.
				 *
				 * <b>Note:</b> Bind the value-holding property of the control to <code>'$field>/conditions'</code>
				 * using {@link sap.ui.mdc.field.ConditionsType ConditionsType} as type.
				 *
				 * If the control needs to show multiple conditions, bind its aggregation to </code>'$field>/conditions'</code>.
				 * Bind the item controls value-holding property using {@link sap.ui.mdc.field.ConditionType ConditionType} as type.
				 *
				 * <b>Warning:</b> Only controls allowed in a {@link sap.ui.layout.form.Form Form} are allowed to be used for this optional content.
				 * Other controls might break the layout.
				 * This means the {@link sap.ui.core.IFormContent IFormContent} interface needs to be implemented by these controls.
				 */
				content: {
					type: "sap.ui.core.Control",
					multiple: false
				},

				/**
				 * Optional content to be rendered if the <code>editMode</code> property is not set to <code>Display</code>.
				 *
				 * Per default, depending on <code>multipleLines</code> and used data type a content control is rendered in edit mode. For simple string types a {@link sap.m.Input Input}
				 * control is rendered in edit mode. If a control is assigned in the <code>contentEdit</code> aggregation this will be rendered instead.
				 *
				 * <b>Note:</b> If a control is assigned to the <code>content</code> aggregation, this one is ignored.
				 *
				 * <b>Note:</b> Bind the value-holding property of the control to <code>'$field>/conditions'</code>
				 * using {@link sap.ui.mdc.field.ConditionsType ConditionsType} as type.
				 *
				 * If the control needs to show multiple conditions, bind its aggregation to </code>'$field>/conditions'</code>.
				 * Bind the item controls value-holding property using {@link sap.ui.mdc.field.ConditionType ConditionType} as type.
				 *
				 * <b>Warning:</b> Only controls allowed in a {@link sap.ui.layout.form.Form Form} are allowed to be used for this optional content.
				 * Other controls might break the layout.
				 * This means the {@link sap.ui.core.IFormContent IFormContent} interface needs to be implemented by these controls.
				 *
				 * @since 1.61.0
				 */
				contentEdit: {
					type: "sap.ui.core.Control",
					multiple: false
				},

				/**
				 * Optional content to be rendered  if the <code>editMode</code> property is set to <code>Display</code>.
				 *
				 * Per default, depending on <code>multipleLines</code> and used data type a content control is rendered in display mode. For simple string types a {@link sap.m.Text Text}
				 * control is rendered in display mode. If a control is assigned in the <code>contentEdit</code> aggregation this will be rendered instead.
				 *
				 * <b>Note:</b> If a control is assigned to the <code>content</code> aggregation, this one is ignored.
				 *
				 * <b>Note:</b> Bind the value-holding property of the control to <code>'$field>/conditions'</code>
				 * using {@link sap.ui.mdc.field.ConditionsType ConditionsType} as type.
				 *
				 * If the control needs to show multiple conditions, bind its aggregation to </code>'$field>/conditions'</code>.
				 * Bind the item controls value-holding property using {@link sap.ui.mdc.field.ConditionType ConditionType} as type.
				 *
				 * <b>Warning:</b> Only controls allowed in a {@link sap.ui.layout.form.Form Form} are allowed to be used for this optional content.
				 * Other controls might break the layout.
				 * This means the {@link sap.ui.core.IFormContent IFormContent} interface needs to be implemented by these controls.
				 *
				 * @since 1.61.0
				 */
				contentDisplay: {
					type: "sap.ui.core.Control",
					multiple: false
				},

				/**
				 * Internal content if no control set from outside.
				 */
				_content: {
					type: "sap.ui.core.Control",
					multiple: true,
					visibility: "hidden"
				},

				/**
				 * Optional <code>FieldInfo</code> used for detail information. This is only active in display mode.
				 * Especially {@link sap.ui.mdc.Link} can be used to activate link features.
				 *
				 * <b>Note:</b> If a special data type is defined or a content control is set, this is ignored.
				 */
				fieldInfo: {
					type: "sap.ui.mdc.field.FieldInfoBase",
					multiple: false
				}
			},
			associations: {
				/**
				 * Optional <code>FieldHelp</code>.
				 *
				 * This is an association that allows the usage of one <code>ValueHelp</code> instance for multiple fields.
				 *
				 * <b>Note:</b> If the field is inside of a table, do not set the <code>ValueHelp</code> instance as <code>dependent</code>
				 * to the field. If you do, every field instance in every table row gets a clone of it.
				 * Put the <code>ValueHelp</code> instance e.g. as dependent on the table or page.
				 * The <code>FieldHelp</code> instance must be somewhere in the control tree, otherwise there might
				 * be rendering or update issues.
				 *
				 * <b>Note:</b> For <code>Boolean</code> fields, no <code>ValueHelp</code> should be added, but a default <code>ValueHelp</code> used instead.
				 * @deprecated as of 1.114.0, replaced by {@link #setValueHelp valueHelp} association
				 */
				fieldHelp: {
					type: "sap.ui.mdc.ValueHelp",
					multiple: false
				},

				/**
				 * Optional <code>ValueHelp</code>.
				 *
				 * This is an association that allows the usage of one <code>ValueHelp</code> instance for multiple fields.
				 *
				 * <b>Note:</b> If the field is inside of a table, do not set the <code>ValueHelp</code> instance as <code>dependent</code>
				 * to the field. If you do, every field instance in every table row gets a clone of it.
				 * Put the <code>ValueHelp</code> instance e.g. as dependent on the table or page.
				 * The <code>ValueHelp</code> instance must be somewhere in the control tree, otherwise there might
				 * be rendering or update issues.
				 *
				 * <b>Note:</b> For <code>Boolean</code> fields, no <code>ValueHelp</code> should be added, but a default <code>ValueHelp</code> used instead.
				 */
				valueHelp: {
					type: "sap.ui.mdc.ValueHelp",
					multiple: false
				},

				/**
				 * Association to controls / IDs that label this control (see WAI-ARIA attribute aria-labelledby).
				 */
				ariaLabelledBy: { type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy" }
			},
			events: {
				/**
				 * This event is fired when the value of the field is changed, for example, each time a key is pressed.
				 *
				 * <b>Note</b> This event is only triggered if the used content control has a <code>liveChange</code> event.
				 */
				liveChange: {
					parameters: {
						/**
						 * The new value of the input
						 */
						value: { type: "string" },

						/**
						 * Indicates that the ESC key triggered the event
						 */
						escPressed: { type: "boolean" },

						/**
						 * The value of the input before pressing ESC key
						 */
						previousValue: { type: "string" }
					}
				},
				/**
				 * This event is fired if the inner control has a </code>press</code> event and this is fired.
				 */
				press: {},
				/**
				 * This event is fired when the user presses <kbd>Enter</kbd>.
				 * It allows the application to implement some submit logic.
				 *
				 * <b>Note</b> This event is only triggered if the field is editable.
				 *
				 * @since 1.82.0
				 */
				submit: {
					parameters: {
						/**
						 * Returns a <code>Promise</code> for the change. The <code>Promise</code> returns the value if it is resolved.
						 * If the last <code>change</code> event is synchronous, the <code>Promise</code> has already been resolved. If it is asynchronous,
						 * it will be resolved after the value has been updated.
						 */
						promise: { type: "Promise" }
					}
				}
			},
			publicMethods: [],
			defaultAggregation: "content"
		},
		renderer: FieldBaseRenderer,
		_oManagedObjectModel: null,
		_oInvalidInput: null
	});

	// apply the message mixin so all message on the input will get the associated label-texts injected
	MessageMixin.call(FieldBase.prototype);

	var oContentEventDelegateBefore = {
		onsapup: _handleKeybordEvent,
		onsapdown: _handleKeybordEvent,
		onsaphome: _handleKeybordEvent,
		onsapend: _handleKeybordEvent,
		onsappageup: _handleKeybordEvent,
		onsappagedown: _handleKeybordEvent,

		onsapbackspace: _handleKeybordEvent,
		onchange: _handleContentOnchange,
		onsapfocusleave: _handleContentOnsapfocusleave,
		onpaste: _handlePaste
	};

	var oContentEventDelegateAfter = {
		onsapenter: _handleEnter
	};

	var mDefaultHelps;

	// private function to initialize globals for qUnit tests
	FieldBase._init = function() {

		if (mDefaultHelps && mDefaultHelps.bool && mDefaultHelps.bool.control) {
			mDefaultHelps.bool.control.destroy();
		}
		if (mDefaultHelps && mDefaultHelps.defineConditions && mDefaultHelps.defineConditions.control) {
			mDefaultHelps.defineConditions.control.destroy();
		}

		mDefaultHelps = {
			bool: {
				modules: ["sap/ui/mdc/ValueHelp", "sap/ui/mdc/valuehelp/Popover", "sap/ui/mdc/valuehelp/content/Bool"],
				id: "BoolDefaultHelp",
				contentProperties: {},
				dialog: false,
				control: undefined,
				updateTitle: function (oValueHelp, sTitle) {
					// no title needed for boolean help (just dropdown)
				}
			},
			defineConditions: {
				modules: ["sap/ui/mdc/ValueHelp", "sap/ui/mdc/valuehelp/Dialog", "sap/ui/mdc/valuehelp/content/Conditions"],
				id: "Field-DefineConditions-Help",
				contentProperties: {},
				dialog: true,
				control: undefined,
				updateTitle: function (oValueHelp, sTitle) {
					oValueHelp.getDialog().setTitle(sTitle);
					oValueHelp.getDialog().getContent()[0].setLabel(sTitle);
				}
			}
		};

	};

	FieldBase._init();

	FieldBase.prototype.init = function() {

		Control.prototype.init.apply(this, arguments);

		this._oObserver = new ManagedObjectObserver(this.observeChanges.bind(this));

		this._oObserver.observe(this, {
			properties: ["display", "editMode", "dataType", "dataTypeFormatOptions", "dataTypeConstraints",
				"multipleLines", "maxConditions", "conditions", "delegate"],
			aggregations: ["fieldInfo", "content", "contentEdit", "contentDisplay"],
			associations: ["fieldHelp", "valueHelp", "ariaLabelledBy"]
		});

		this.attachEvent("modelContextChange", this.handleModelContextChange, this);

		this._oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");

		this._aAsyncChanges = [];

		this._bPreventGetDescription = false; // set in navigate or select from field help

		this._oContentFactory = this.getContentFactory();

		this._oCreateContentPromise = undefined;

		this._sFilterValue = "";

	};

	/**
	 * @protected
	 * @returns {sap.ui.mdc.field.content.ContentFactory} oContentFactory the ContentFactory of the Field
	 */
	 FieldBase.prototype.getContentFactory = function() {
		if (this._bIsBeingDestroyed || this.bIsDestroyed) {
			return;
		}
		if (!this._oContentFactory) {
			this._oContentFactory = new ContentFactory(this.getId() + "-contentFactory", {
				field: this,
				handleTokenUpdate: _handleTokenUpdate.bind(this),
				handleContentChange: _handleContentChange.bind(this),
				handleContentLiveChange: _handleContentLiveChange.bind(this),
				handleValueHelpRequest: _handleValueHelpRequest.bind(this),
				handleEnter: _handleEnter.bind(this),
				handleContentPress: _handleContentPress.bind(this)
			});
		}
		return this._oContentFactory;
	};

	var _setFocusTimer = function (oEvent) {
		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp && !this._iFocusTimer && oFieldHelp.shouldOpenOnFocus() && !oFieldHelp.isOpen()) {
			this._iFocusTimer = setTimeout(function () {
				if (!this.bIsDestroyed && !oFieldHelp.isOpen()) {
					_handleValueHelpRequest.call(this, oEvent, true); // open typeahead
					this._redirectFocus(oEvent, oFieldHelp);
				}
				this._iFocusTimer = null;
			}.bind(this),300);
		}
	};

	var _clearFocusTimer = function () {
		if (this._iFocusTimer) {
			clearTimeout(this._iFocusTimer);
			this._iFocusTimer = null;
		}
	};

	FieldBase.prototype.exit = function() {

		_clearFocusTimer.call(this);

		var oFieldInfo = this.getFieldInfo();
		if (oFieldInfo) {
			// as aggregations are destroyed after exit
			oFieldInfo.detachEvent("dataUpdate", _handleInfoDataUpdate, this);
		}

		var oContent = this.getContent();
		if (oContent) {
			_detachContentHandlers.call(this, oContent);
		}
		var oContentEdit = this.getContentEdit();
		if (oContentEdit) {
			_detachContentHandlers.call(this, oContentEdit);
		}
		var oContentDisplay = this.getContentDisplay();
		if (oContentDisplay) {
			_detachContentHandlers.call(this, oContentDisplay);
		}

		if (this._oManagedObjectModel) {
			this._oManagedObjectModel.destroy();
			delete this._oManagedObjectModel;
		}

		this._oObserver.disconnect();
		this._oObserver = undefined;
		this._oCreateContentPromise = undefined;

		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp) {
			oFieldHelp.detachEvent("dataUpdate", _handleHelpDataUpdate, this);
			if (this._bConnected) {
				_disconnectFieldhelp.call(this, oFieldHelp); // remove event listeners
				oFieldHelp.connect(); // disconnect FieldHelp to remove callbacks
			}
		}

		if (this._oContentFactory) {
			this._oContentFactory.destroy();
			this._oContentFactory = undefined;
		}

		// do not trigger async suggestion
		_clearLiveChangeTimer.call(this);
		delete this._fnLiveChangeTimer;

	};

	FieldBase.prototype.applySettings = function() {
		Control.prototype.applySettings.apply(this, arguments);
		if (!this.bDelegateInitialized && !this.bDelegateLoading) {
			this.initControlDelegate();
		}
		this.triggerCheckCreateInternalContent();

		this._bSettingsApplied = true;

		return this;
	};

	FieldBase.prototype.setProperty = function(sPropertyName, vValue, bSuppressInvalidate) {

		// most properties are rendered from content controls. Only invalidate whole Field if needed
		// (multipleLines mostly changed together with editMode -> update once on rendering)
		if (sPropertyName === "editMode") {
			// only invalidate if switched between edit and display, not for redonly or disabled
			var sOld = this.getEditMode();
			if (sOld !== EditMode.Display && sOld !== EditMode.EditableDisplay && vValue !== EditMode.Display && vValue !== EditMode.EditableDisplay) {
				bSuppressInvalidate = true;
			}
		} else if (sPropertyName !== "width" && sPropertyName !== "multipleLines" && sPropertyName !== "showEmptyIndicator") {
			bSuppressInvalidate = true;
		}

		return Control.prototype.setProperty.apply(this, [sPropertyName, vValue, bSuppressInvalidate]);

	};

	FieldBase.prototype.onBeforeRendering = function() {

		_createInternalContentWrapper.call(this);

	};

	FieldBase.prototype.onAfterRendering = function() {

	};

	FieldBase.prototype.onfocusin = function(oEvent) {
		_connectFieldhelp.call(this);
		_setFocusTimer.call(this, oEvent);
	};

	FieldBase.prototype.onsapfocusleave = function(oEvent) {
		_clearFocusTimer.call(this);
		_clearLiveChangeTimer.call(this);
	};

	// fire change event only if unit and currency field are left
	function _validateFieldGroup(aFieldGroupIds) {

		var iIndex = aFieldGroupIds.indexOf(this.getId());
		if (iIndex > -1) { //own FieldGroup left
			if (this._bPendingChange) {
				var oFocusedElement = document.activeElement;
				var oFieldHelp = _getFieldHelp.call(this);
				if (!(oFocusedElement && oFieldHelp && containsOrEquals(oFieldHelp.getDomRef(), oFocusedElement))) {
					var oPromise = _getAsyncPromise.call(this);

					if (oPromise) {
						_executeChange.call(this, undefined, undefined, undefined, oPromise);
					} else {
						_executeChange.call(this, this.getConditions(), !this.isInvalidInput());
					}
				}
			}

			if (aFieldGroupIds.length > 1) {
				// if there are other FieldGrops fire event without internal FieldGroup
				aFieldGroupIds.splice(iIndex, 1);

				this.fireValidateFieldGroup({
					fieldGroupIds : aFieldGroupIds
				});
			}
		}

	}
	FieldBase.prototype.onsapup = function(oEvent) {
		this._handleNavigate(oEvent, -1);
	};

	FieldBase.prototype.onsapdown = function(oEvent) {
		this._handleNavigate(oEvent, 1);
	};

	FieldBase.prototype.onsaphome = function(oEvent) {
		this._handleNavigate(oEvent, -9999); // iStep are relative and can not be set to the last item
	};

	FieldBase.prototype.onsappageup = function(oEvent) {
		this._handleNavigate(oEvent, -10);
	};

	FieldBase.prototype.onsappagedown = function(oEvent) {
		this._handleNavigate(oEvent, 10);
	};

	FieldBase.prototype.onsapend = function(oEvent) {
		this._handleNavigate(oEvent, 9999); // iStep are relative and can not be set to the last item
	};

	FieldBase.prototype._handleNavigate = function(oEvent, iStep) {

		if (this.getEditMode() === EditMode.Editable) {
			var oFieldHelp = _getFieldHelp.call(this);
			var oSource = oEvent.srcControl;

			if (oFieldHelp) {
				if (oFieldHelp.isNavigationEnabled(iStep) && // if open let ValueHelp decide if and how to navigate
					(!this.getContentFactory().isMeasure() || oSource.getShowValueHelp())) { // for Currenncy/Unit field navigate only in part with valueHelp
					// if only type-ahead but no real value help, only navigate if open
					oEvent.preventDefault();
					oEvent.stopPropagation();
					oFieldHelp.setFilterValue(this._sFilterValue); // to be sure to filter for typed value
					oFieldHelp.navigate(iStep);
				}
			}
		}

	};

	FieldBase.prototype.onsapenter = function(oEvent) {

		// if same value is entered again no change event is triggered, So we need to close the suggestion here
		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp && oFieldHelp.isOpen()) {
			oFieldHelp.close();
		}
		this._sFilterValue = "";

	};

	FieldBase.prototype.onsapescape = function(oEvent) {

		// close FieldHelp also if escape pressed without changing value
		this.onsapenter(oEvent);

	};

	FieldBase.prototype._redirectFocus = function (oEvent, oFieldHelp) {
		var oSource = oEvent.srcControl;
		if (oFieldHelp.isOpen() && (!this.getContentFactory().isMeasure() || (oSource.getShowValueHelp && oSource.getShowValueHelp()))) {
			oSource.addStyleClass("sapMFocus"); // to show focus outline again after navigation
			oFieldHelp.removeFocus();
		}
	};

	FieldBase.prototype.ontap = function(oEvent) {

		// in "Select"-case the suggestion help should open on click into field
		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp) {
			if (oFieldHelp.shouldOpenOnClick() && !oFieldHelp.isOpen()) {
				_handleValueHelpRequest.call(this, oEvent, true); // open typeahead
			}
			this._redirectFocus(oEvent, oFieldHelp);
		}

	};

	FieldBase.prototype.clone = function(sIdSuffix, aLocalIds) {

		// detach event handler before cloning to not have it twice on the clone
		// attach it after clone again
		this.detachEvent("modelContextChange", this.handleModelContextChange, this);

		var oContent = this.getContent();
		if (oContent) {
			_detachContentHandlers.call(this, oContent);
		}
		var oContentEdit = this.getContentEdit();
		if (oContentEdit) {
			_detachContentHandlers.call(this, oContentEdit);
		}
		var oContentDisplay = this.getContentDisplay();
		if (oContentDisplay) {
			_detachContentHandlers.call(this, oContentDisplay);
		}

		var oFieldInfo = this.getFieldInfo();
		if (oFieldInfo) {
			oFieldInfo.detachEvent("dataUpdate", _handleInfoDataUpdate, this);
		}

		var oClone = Control.prototype.clone.apply(this, arguments);

		this.attachEvent("modelContextChange", this.handleModelContextChange, this);

		if (oContent) {
			_attachContentHandlers.call(this, oContent);
		}
		if (oContentEdit) {
			_attachContentHandlers.call(this, oContentEdit);
		}
		if (oContentDisplay) {
			_attachContentHandlers.call(this, oContentDisplay);
		}

		if (oFieldInfo) {
			oFieldInfo.attachEvent("dataUpdate", _handleInfoDataUpdate, this);
		}

		if (this._bTriggerable) {
			// render Link as default on clone if Link rendered on original (only change if needed in _handleInfoDataUpdate)
			oClone._bTriggerable = this._bTriggerable;
		}

		return oClone;

	};

	/**
	 * Gets <code>fieldPath</code>.
	 *
	 * If the <code>conditions</code> are bound to a <code>ConditionModel</code>, the <code>FieldPath</code> is determined from this binding.
	 *
	 * @returns {string} fieldPath of the field
	 * @private
	 * @ui5-restricted sap.ui.mdc.filterbar.FilterBarBase
	 */
	FieldBase.prototype.getFieldPath = function() {

		var sBindingPath = this.getBindingPath("conditions");
		if (sBindingPath && sBindingPath.startsWith("/conditions/")) {
			return sBindingPath.slice(12);
		} else {
			return "";
		}

	};

	function _triggerChange(aConditions, bValid, vWrongValue, oPromise) {

		if (this.getCurrentContent().length > 1) {
			// in unit/currency field fire Change only if ENTER pressed or field completely left. Not on focus between number and unit
			this._bPendingChange = true;
		} else {
			_executeChange.call(this, aConditions, bValid, vWrongValue, oPromise);
		}

	}

	function _executeChange(aConditions, bValid, vWrongValue, oPromise) {

		if (!oPromise) {
			// not promise -> change is synchronously -> return resolved SyncPromise
			if (bValid) {
				oPromise = Promise.resolve(this.getResultForChangePromise(aConditions));
			} else {
				var oException = this._getInvalidInputException();
				if (oException) {
					oPromise = Promise.reject(oException);
				} else { // maybe e.g. DatePicker fires change with valid=false but no exception
					oPromise = Promise.reject(vWrongValue);
				}
			}
		}

		this.fireChangeEvent(aConditions, bValid, vWrongValue, oPromise);

		this._bPendingChange = false;

	}

	/**
	 * Here inheriting controls need to fire the control specific change event
	 * @protected
	 */
	FieldBase.prototype.fireChangeEvent = function(aConditions, bValid, vWrongValue, oPromise) {
		// to be implemented by Filed and FilterField
	};

	function _handleEnter(oEvent) {

		var sEditMode = this.getEditMode();

		if (ContentFactory._getEditable(sEditMode) && (this.hasListeners("submit") || this._bPendingChange)) {
			// collect all pending promises for ENTER, only if all resolved it's not pending. (Normally there should be only one.)
			var oPromise = _getAsyncPromise.call(this);
			var bPending = false;

			if (oPromise) {
				bPending = true;
			} else if (this.isInvalidInput()) {
				oPromise = Promise.reject();
			} else {
				oPromise = Promise.resolve(this.getResultForChangePromise(this.getConditions()));
			}

			if (this._bPendingChange) {
				if (bPending) {
					_executeChange.call(this, undefined, undefined, undefined, oPromise);
				} else {
					_executeChange.call(this, this.getConditions(), !this.isInvalidInput(), undefined, oPromise);
				}
			}

			this.fireSubmit({ promise: oPromise });
		}

	}

	function _handlePaste(oEvent) {

		var iMaxConditions = this.getMaxConditions();

		if (iMaxConditions === 1) { // only for multi-value
			return;
		}

		// for the purpose to copy from column in excel and paste in FilterField/MultiValueField
		var sOriginalText = oEvent.originalEvent.clipboardData.getData('text/plain');
		var aSeparatedText = splitValue(sOriginalText, true); // check without BT support as if TAB is inside the Paste logic needs to be used anyhow

		if (aSeparatedText.length <= 1) {
			// only one entry -> use default logic
			return;
		}

		var oControl = oEvent.srcControl;
		var sBoundProperty;
		for (var sProperty in oControl.getMetadata().getAllProperties()) {
			if (oControl.getBindingPath(sProperty) === "/conditions") {
				sBoundProperty = sProperty;
				break;
			}
		}
		oControl.updateModelProperty(sBoundProperty, sOriginalText, oControl.getProperty(sBoundProperty)); // Use normal parsing functionality to habe Async-handling and error handling

		oEvent.stopImmediatePropagation(true); // to prevent MultiInputs own logic
		oEvent.preventDefault(); // to prevent pasting string into INPUT

		oEvent.source = oEvent.srcControl; // to align with other events
		oEvent.parameters = {}; // to align with other events
		// as change might be async
		var iLength = this._aAsyncChanges.length;
		var oPromise;
		var bValid;
		var aConditions;
		if (iLength > 0) {
			this._aAsyncChanges[iLength - 1].changeFired = true;
			this._aAsyncChanges[iLength - 1].changeEvent = oEvent;
			oPromise = this._aAsyncChanges[iLength - 1].promise;
		} else {
			bValid = !this._bParseError;
			aConditions = this.getConditions();
		}
		_triggerChange.call(this, aConditions, bValid, undefined, oPromise);

	}

	/**
	 * Initializes internal data-types and dependent objects.
	 * @protected
	 */
	FieldBase.prototype.initDataType = function() {
		if (this.getContentFactory().getDataType()) {
			this.getContentFactory().getDataType().destroy();
			this.getContentFactory().setDataType(undefined);
		}

		if (this.getContentFactory().getDateOriginalType()) {
			if (this.getContentFactory().getDateOriginalType()._bCreatedByField) {
				// do not destroy if used in Field binding
				this.getContentFactory().getDateOriginalType().destroy();
			}
			this.getContentFactory().setDateOriginalType(undefined);
		}

		if (this.getContentFactory().getUnitOriginalType()) {
			if (this.getContentFactory().getUnitOriginalType()._bCreatedByField) {
				// do not destroy if used in Field binding
				this.getContentFactory().getUnitOriginalType().destroy();
			}
			this.getContentFactory().setUnitOriginalType(undefined);
		}

		this.getContentFactory().setIsMeasure(false);
	};

	function _getDataTypeName() {
		var oDataType = this.getContentFactory().getDateOriginalType() || this.getContentFactory().getUnitOriginalType() || this.getContentFactory().getDataType(); // use original data type
		if (oDataType && typeof oDataType === "object") {
			return oDataType.getMetadata().getName();
		} else if (this.bDelegateInitialized) {
			return this.getTypeMap().getDataTypeClassName(this.getDataType());
		} else {
			return this.getDataType();
		}
	}

	function _getDataTypeConstraints() {
		var oDataType = this.getContentFactory().getDateOriginalType() || this.getContentFactory().getUnitOriginalType() || this.getContentFactory().getDataType(); // use original data type
		if (oDataType && typeof oDataType === "object" && oDataType.getConstraints()) {
			return oDataType.getConstraints();
		} else {
			return this.getDataTypeConstraints();
		}
	}

	function _getDataTypeFormatOptions() {
		var oDataType = this.getContentFactory().getDateOriginalType() || this.getContentFactory().getUnitOriginalType() || this.getContentFactory().getDataType(); // use original data type
		if (oDataType && typeof oDataType === "object" && oDataType.getFormatOptions()) {
			return oDataType.getFormatOptions();
		} else {
			return this.getDataTypeFormatOptions();
		}
	}

	/**
	 * Determines the <code>BaseType</code> of the currently used data type
	 * @returns {sap.ui.mdc.enum.BaseType} BaseType
	 * @protected
	 */
	FieldBase.prototype.getBaseType = function() {
		var sDataType = _getDataTypeName.call(this);
		var oDataTypeConstraints = _getDataTypeConstraints.call(this);
		var oDataTypeFormatOptions = _getDataTypeFormatOptions.call(this);
		var sBaseType = this.getTypeMap().getBaseType(sDataType, oDataTypeFormatOptions, oDataTypeConstraints);

		return sBaseType;
	};

	function _handleConditionsChange(aConditions, aConditionsOld) {

		var oFieldHelp = _getFieldHelp.call(this);

		if (oFieldHelp && this._bConnected) {
			_setConditionsOnFieldHelp.call(this, aConditions, oFieldHelp);
		}

	}

	/**
	 * Gets the currently used content controls
	 * @returns {sap.ui.core.Conterol[]} Array of content controls
	 * @protected
	 */
	FieldBase.prototype.getCurrentContent = function() {

		var oContent = this.getContent();

		if (!oContent) {
			if (this.getEditMode() === EditMode.Display) {
				oContent = this.getContentDisplay();
			} else {
				oContent = this.getContentEdit();
			}
		}

		if (oContent) {
			return [oContent];
		} else {
			return this.getAggregation("_content", []);
		}

	};

	/**
	 * Handler of the <code>ModelContextChange</code> event
	 * @param {object} oEvent event
	 * @protected
	 */
	FieldBase.prototype.handleModelContextChange = function(oEvent) {

		// let empty as overwritten in Field

	};

	// function _setUIMessage(sMsg) {

	// 	this.setValueState(ValueState.Error);
	// 	this.setValueStateText(sMsg);

	// }

	FieldBase.prototype._removeUIMessage = function() {

		this.setValueState(ValueState.None);
		this.setValueStateText();

	};

	/**
	 * Observes changes.
	 *
	 * To be enhanced by {@link sap.ui.mdc.Field Field}, {@link sap.ui.mdc.MultiValueField MultiValueField},
	 * {@link sap.ui.mdc.FilterField FilterField} or other inherited controls.
	 *
	 * @param {object} oChanges Changes
	 * @protected
	 */
	FieldBase.prototype.observeChanges = function(oChanges) {

		if (oChanges.name === "dataType") {
			// check only if different type (in Field type might be already taken from binding)
			if (this.getContentFactory().getDataType()) {
				var fnCheck = function(sType) {
					this.getContentFactory().checkDataTypeChanged(sType).then(function(bChanged) {
						if (bChanged && !this._bIsBeingDestroyed) {
							this.initDataType();
							this.destroyAggregation("_content");
							this.getContentFactory().updateConditionType();
						}
					}.bind(this)).catch(function(oError) {
						throw oError;
					});
				}.bind(this);
				if (!this.bDelegateInitialized) {
					// wait until delegate is loaded
					this.awaitControlDelegate().then(function() { fnCheck.call(this, oChanges.current); }.bind(this));
					return;
				}
				fnCheck.call(this, oChanges.current);
			}
		}

		if (oChanges.name === "dataTypeFormatOptions" || oChanges.name === "dataTypeConstraints") {
			// if type is not created right now nothing to do
			if (this.getContentFactory().getDataType()) {
				this.initDataType();
				this.destroyAggregation("_content");
				this.getContentFactory().updateConditionType();
			}
		}

		if (oChanges.name === "maxConditions") {
			this.updateInternalContent();
		}

		if (oChanges.name === "conditions") {
			this.resetInvalidInput(); // if conditions updated from outside parse error is obsolete. If updated from inside no parse error occurs
			_handleConditionsChange.call(this, oChanges.current, oChanges.old);

			// try to find the corresponding async. change
			var bFound = false;
			var i = 0;
			for (i = 0; i < this._aAsyncChanges.length; i++) {
				var oChange = this._aAsyncChanges[i];
				if (oChange.waitForUpdate && deepEqual(oChange.result, oChanges.current)) {
					_performContentChange.call(this, oChange);
					bFound = true;
					break;
				}
			}
			if (bFound) {
				this._aAsyncChanges.splice(i, 1);
			}

			// in display mode rerender if changed from or to empty (show or hide empty-indicator)
			if ((oChanges.current.length === 0 || oChanges.old.length === 0) && this.getShowEmptyIndicator() && this.getEditMode() === EditMode.Display && !this.getContent() && !this.getContentDisplay()) {
				this.invalidate();
			}
		}

		if (oChanges.name === "display") {
			this.destroyInternalContent(); // as bound property can change
			this.getContentFactory().updateConditionType();
		}

		if ((oChanges.name === "fieldHelp" || oChanges.name === "valueHelp") && oChanges.ids) {
			_fieldHelpChanged.call(this, oChanges.ids, oChanges.mutation);
			this.getContentFactory().updateConditionType();
		}

		if (oChanges.name === "fieldInfo" && oChanges.child) {
			_fieldInfoChanged.call(this, oChanges.child, oChanges.mutation);
		}

		if (oChanges.name === "content" && oChanges.child) {
			_contentChanged.call(this, oChanges.child, oChanges.mutation, oChanges.name);
		}

		if (oChanges.name === "contentEdit" && oChanges.child) {
			_contentChanged.call(this, oChanges.child, oChanges.mutation, oChanges.name);
		}

		if (oChanges.name === "contentDisplay" && oChanges.child) {
			_contentChanged.call(this, oChanges.child, oChanges.mutation, oChanges.name);
		}

		if (oChanges.name === "delegate" && !this.bDelegateInitialized && !this.bDelegateLoading) {
			this.initControlDelegate.call(this);
		}

		if (oChanges.name === "ariaLabelledBy" && oChanges.ids) {
			_ariaLabelledByChanged.call(this, oChanges.ids, oChanges.mutation);
		}

		if (oChanges.name === "editMode") {
			_refreshLabel.call(this); // as required-idicator might set or removed on Label
			if (this._bSettingsApplied && (oChanges.old === EditMode.Display || oChanges.old === EditMode.EditableDisplay || oChanges.current === EditMode.Display || oChanges.current === EditMode.EditableDisplay)) {
				// edit mode changed after settings applied (happens if edit mode is bound and binding updates after control initialization)
				this.triggerCheckCreateInternalContent();
			}
		}
	};

	/**
	 * Triggers an update of the internal content controls
	 *
	 * Should be calles if propertes are changed that might influence the content control
	 * @protected
	 */
	FieldBase.prototype.updateInternalContent = function() {
		if (this.getAggregation("_content", []).length > 0) {
			_createInternalContentWrapper.call(this);
			this.getContentFactory().updateConditionType(); // if control is not excanged at least ConditionType needs to be updated
		}
	};

	// return the focus DOM elementof the used control
	FieldBase.prototype.getFocusDomRef = function() {

		var aContent = this.getCurrentContent();

		if (aContent.length > 0) {
			return aContent[0].getFocusDomRef();
		} else {
			return this.getDomRef();
		}

	};

	// return the ID of the label DOM elementof the used control
	FieldBase.prototype.getIdForLabel = function() {

		var sId;
		var aContent = this.getCurrentContent();
		if (aContent.length > 0) {
			sId = aContent[0].getIdForLabel();
		} else {
			sId = _getIdForInternalControl.call(this); // if not rendered use ID for later created inner control
		}

		return sId;

	};

	// return editable as boolean as this is checked in the FormElement to show required-indicator
	FieldBase.prototype.getEditable = function() {

		return ContentFactory._getEditable(this.getEditMode());

	};

	/**
	 * Returns the control the value help is attached to.
	 *
	 * In the case that number and unit are shown in different controls, this is the unit control, not the number control.
	 *
	 * @returns {sap.ui.core.Control} Control for value help
	 * @private
	 */
	 FieldBase.prototype.getControlForSuggestion = function() {

		var aContent = this.getCurrentContent();
		if (aContent.length > 0) {
			if (this.getContentFactory().isMeasure()) {
				return aContent[1];
			} else {
				return aContent[0];
			}
		} else {
			return this;
		}

	};

	/**
	 * Returns the control the value help should focus (or popover should open on)
	 *
	 * In the case that number and unit are shown in different controls, this is the unit control, not the number control.
	 *
	 * @param {boolean} bTypeahead Flag that determines whether value help is opened for type-ahead or for complex help
	 * @returns {sap.ui.core.Control} Control for value help
	 * @private
	 * @ui5-restricted sap.ui.mdc.valueHelp.base.Container
	 */
	FieldBase.prototype.getFocusElementForValueHelp = function(bTypeahead) {
		var oSuggestControl = this.getControlForSuggestion();
		var aIcons = oSuggestControl && oSuggestControl.getMetadata().getAllPrivateAggregations()._endIcon && oSuggestControl.getAggregation("_endIcon", []);
		var oIcon;
		if (aIcons) {
			for (var i = 0; i < aIcons.length; i++) { // as MultiInput can have a invisible icon before visible icon
				if (aIcons[i].getVisible()) {
					oIcon = aIcons[i];
					break;
				}
			}
		}
		return bTypeahead || !oIcon ? oSuggestControl : oIcon;
	};

	/**
	 * In the case that number and unit are shown in different controls, only one unit is supported.
	 * So the value help needs to be in single selection mode.
	 *
	 * @returns {int} maxConditions used for valueHelp
	 * @private
	 */
	FieldBase.prototype.getMaxConditionsForHelp = function() {

		if (this.getContentFactory().isMeasure()) {
			return 1; // only one unit allowed in help
		} else {
			return this.getMaxConditions();
		}

	};

	/*
	 * If Field is inside of a {@link sap.ui.layout.form.SemanticFormElement SemanticFormElement} return formatted value in display mode
	 *
	 * @returns {string} formatted value of the field
	 * @private
	 * @ui5-restricted sap.ui.layout.form.SemanticFormElement
	 */
	FieldBase.prototype.getFormFormattedValue = function() {

		var aConditions = this.getConditions();
		var bShowEmptyIndicator = this.getShowEmptyIndicator() && aConditions.length === 0 && !this.getContent() && !this.getContentDisplay();

		if (bShowEmptyIndicator) {
			if (!this._oResourceBundleM) {
				this._oResourceBundleM = sap.ui.getCore().getLibraryResourceBundle("sap.m");
			}
			return this._oResourceBundleM.getText("EMPTY_INDICATOR"); // TODO: clarify accessibility support for semantic conected fields
		} else if (this.getContentFactory().isMeasure() && this.getContentFactory().getUnitOriginalType()) {
			// in unit case use original data type for formatting (as internal type hides unit)
			var aValue = aConditions.length > 0 ? aConditions[0].values[0] : [0, null]; // TODO: support multiple conditions or other operator than EQ?
			return this.getContentFactory().getUnitOriginalType().formatValue(aValue, "string");
		} else if (this.getContentFactory().getDateOriginalType()) {
			// in date case use original data type for formatting (as internal type formats to ISO format)
			var vValue = aConditions.length > 0 ? aConditions[0].values[0] : null; // TODO: support multiple conditions or other operator than EQ?
			return this.getContentFactory().getDateOriginalType().formatValue(vValue, "string");
		} else {
			var oConditionsType = this.getContentFactory().getConditionsType();
			var oFormatOptions = oConditionsType.getFormatOptions();
			var bNoFormatting = oFormatOptions.noFormatting;
			oFormatOptions.noFormatting = false; // for display text always format
			oConditionsType.setFormatOptions(oFormatOptions);
			var sResult = oConditionsType.formatValue(aConditions);
			oFormatOptions.noFormatting = bNoFormatting; // turn back
			oConditionsType.setFormatOptions(oFormatOptions);
			return sResult;
		}

	};

	/*
	 * If Field is inside of a {@link sap.ui.layout.form.SemanticFormElement SemanticFormElement} return value holding property (don't use "value" property of Field as conditions are updated async)
	 *
	 * @returns {string} name of the value holding property
	 * @private
	 * @ui5-restricted sap.ui.layout.form.SemanticFormElement
	 */
	FieldBase.prototype.getFormValueProperty = function() {

		return "conditions";

	};

	/**
	 * Required by the {@link sap.m.IOverflowToolbarContent} interface.
	 * Registers invalidations event which is fired when width of the control is changed.
	 *
	 * @protected
	 * @returns {object} Configuration information for the <code>sap.m.IOverflowToolbarContent</code> interface.
	 */
	FieldBase.prototype.getOverflowToolbarConfig = function() {
		return {
			canOverflow: true,
			invalidationEvents: [],
			propsUnrelatedToSize: ["conditions", "editMode", "display", "valueState", "valueStateText"] // only add properties that are normally changed during livetime
		};
	};

	/*
	 * If Field is inside of a Form use Forms aria logic for label
	 */
	FieldBase.prototype.enhanceAccessibilityState = function(oElement, mAriaProps) {

		var oParent = this.getParent();

		if (oParent && oParent.enhanceAccessibilityState) {
			// use Field as control, but aria properties of rendered inner control.
			oParent.enhanceAccessibilityState(this, mAriaProps);
		}

	};

	/*
	 * @returns {object} Current accessibility state of the control.
	 * @see sap.ui.core.Control#getAccessibilityInfo
	 * @protected
	 */
	FieldBase.prototype.getAccessibilityInfo = function() {

		var aContent = this.getCurrentContent();
		if (aContent.length > 0 && aContent[0].getAccessibilityInfo) {
			return aContent[0].getAccessibilityInfo(); // TODO: unit field
		} else {
			// content not known
			return {};
		}

	};

	function _ariaLabelledByChanged(sId, sMutation) {

		// forward to all content controls (internal and external
		var aContent = this.getAggregation("_content", []);
		var oContent = this.getContent();
		if (oContent) {
			aContent.push(oContent);
		}

		oContent = this.getContentDisplay();
		if (oContent) {
			aContent.push(oContent);
		}

		oContent = this.getContentEdit();
		if (oContent) {
			aContent.push(oContent);
		}

		for (var i = 0; i < aContent.length; i++) {
			oContent = aContent[i];
			if (oContent.getMetadata().getAllAssociations().ariaLabelledBy) {
				if (sMutation === "remove") {
					oContent.removeAriaLabelledBy(sId);
				} else if (sMutation === "insert") {
					oContent.addAriaLabelledBy(sId);
				}
			}
		}

	}

	function _setAriaAttributes(bOpen, sItemId) {

		var oAttributes = { aria: {} };
		var oFieldHelp = _getFieldHelp.call(this);

		if (oFieldHelp) {
			var oAriaAttributes = oFieldHelp.getAriaAttributes(this.getMaxConditionsForHelp());
			var sRoleDescription = oAriaAttributes.roleDescription;
			oAttributes["role"] = oAriaAttributes.role;
			if (sRoleDescription) {
				oAttributes.aria["roledescription"] = sRoleDescription;
			}
			oAttributes.aria["haspopup"] = oAriaAttributes.ariaHasPopup;
			oAttributes["autocomplete"] = "off";
			if (bOpen) {
				if (oAriaAttributes.role) {
					oAttributes.aria["expanded"] = "true"; // only allowed for combobox, listbox...
				}
				oAttributes.aria["controls"] = oAriaAttributes.contentId;
				if (sItemId) {
					oAttributes.aria["activedescendant"] = sItemId;
				}
			} else if (oAriaAttributes.role) {
				oAttributes.aria["expanded"] = "false"; // only allowed for combobox, listbox...
			}
			oAttributes["valueHelpEnabled"] = oAriaAttributes.valueHelpEnabled;
		}

		this.setProperty("_ariaAttributes", oAttributes, true);

	}

	/**
	 * Assigns a <code>Label</code> control to the {@link sap.ui.mdc.Field Field}, {@link sap.ui.mdc.MultiValueField MultiValueField} or {@link sap.ui.mdc.FilterField FilterField} controls.
	 *
	 * The text of the label is taken from the {@link sap.ui.mdc.Field Field}, {@link sap.ui.mdc.MultiValueField MultiValueField} or {@link sap.ui.mdc.FilterField FilterField} controls.
	 * The <code>labelFor</code> association is set to the {@link sap.ui.mdc.Field Field}, {@link sap.ui.mdc.MultiValueField MultiValueField} or {@link sap.ui.mdc.FilterField FilterField} control.
	 *
	 * @param {sap.ui.core.Label} oLabel Label control
	 * @returns {this} Reference to <code>this</code> to allow method chaining
	 *
	 * @private
	 * @ui5-restricted sap.ui.mdc sap.fe
	 * @MDC_PUBLIC_CANDIDATE
	 * @experimental As of version 1.62.0
	 * @since 1.62.0 Disclaimer: this function is in a beta state - incompatible API changes may be done before its official public release. Use at your own discretion.
	 */
	FieldBase.prototype.connectLabel = function(oLabel) {

		_setModelOnContent.call(this, oLabel);
		oLabel.bindProperty("text", { path: "$field>/label" });
		oLabel.setLabelFor(this);

		return this;

	};

	/*
	 * If the inner control changes or the inner control is created after the Label is rendered
	 * the Label needs to be re-rendered. The DOM-node of the "for" attribute needs to be updated.
	 */
	function _refreshLabel() {

		var aLabels = LabelEnablement.getReferencingLabels(this);
		for (var i = 0; i < aLabels.length; i++) {
			var oLabel = sap.ui.getCore().byId(aLabels[i]);
			oLabel.invalidate();
		}

	}

	function _contentChanged(oContent, sMutation, sName) {

		if (sMutation === "remove") {
			_detachContentHandlers.call(this, oContent);
			_restoreKeyboardHandler.call(this, oContent);
			_restoreFieldGroupHandler.call(this, oContent);

			if (this.getContentFactory().getContentConditionTypes()) {
				delete this.getContentFactory().getContentConditionTypes()[sName];
			}
			oContent.setModel(null, "$field"); // remove binding to Field
			// let the internal control be created on rendering
		} else if (sMutation === "insert") {
			if (!oContent.isA("sap.ui.core.IFormContent")) {
				// TODO: allow different content than allowed in Form? Prevent Layouts and unsupported controls because of accessibiliy issues (label asignment, focus...)
				throw new Error(oContent + " is not a valid content! Only use valid content in " + this);
			}
			_modifyKeyboardHandler.call(this, oContent, true);
			_attachContentHandlers.call(this, oContent);
			_modifyFieldGroupHandler.call(this, oContent, true);
			// bind to ManagedObjectModel at rendering to prevent unneded updates

			if (this.getAggregation("_content", []).length > 0) {
				this.destroyInternalContent();
			}

			// as for edit and display different Types are possible switch them with edit mode
			if (!this.getContentFactory().getContentConditionTypes()) {
				this.getContentFactory().setContentConditionTypes({});
			}
			if (!this.getContentFactory().getContentConditionTypes()[sName]) {
				this.getContentFactory().getContentConditionTypes()[sName] = {};
			}
			this.getContentFactory().setNoFormatting(false); // initialize
			this.awaitControlDelegate().then(function() {
				if (!this.bIsDestroyed) {
					var bHideOperator = _isOnlyOneSingleValue.call(this, this.getSupportedOperators());
					if (bHideOperator !== this.getContentFactory().getHideOperator()) {
						this.getContentFactory().setHideOperator(bHideOperator); // in single value eq Field hide operator
						this.getContentFactory()._setUsedConditionType(this.getContent(), this.getContentEdit(), this.getContentDisplay(), this.getEditMode()); // if external content use it's conditionType
					}
				}
			}.bind(this));

			// find out what is bound to conditions
			var oBindingInfo;
			var sProperty;
			var bPropertyBound = false;
			for (sProperty in oContent.getMetadata().getAllProperties()) {
				if (oContent.getBindingPath(sProperty) === "/conditions") {
					oBindingInfo = oContent.getBindingInfo(sProperty);
					if (oBindingInfo && oBindingInfo.type && oBindingInfo.type instanceof ConditionsType) {
						this.getContentFactory().getContentConditionTypes()[sName].oConditionsType = oBindingInfo.type;
					}
					bPropertyBound = true;
				}
				if (sProperty === "editable" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/editMode", formatter: ContentFactory._getEditable });
				}
				if (sProperty === "enabled" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/editMode", formatter: ContentFactory._getEnabled });
				}
				if (sProperty === "displayOnly" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/editMode", formatter: ContentFactory._getDisplayOnly });
				}
				if (sProperty === "required" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/required" });
				}
				if (sProperty === "textAlign" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/textAlign" });
				}
				if (sProperty === "textDirection" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/textDirection" });
				}
				if (sProperty === "valueState" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/valueState" });
				}
				if (sProperty === "valueStateText" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/valueStateText" });
				}
				if (sProperty === "placeholder" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/placeholder" });
				}
				if (sProperty === "showValueHelp" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.bindProperty(sProperty, { path: "$field>/_fieldHelpEnabled" });
				}
				if (sProperty === "valueHelpIconSrc" && !oContent.getBindingPath(sProperty) && oContent.isPropertyInitial(sProperty)) {
					oContent.setValueHelpIconSrc(this._getFieldHelpIcon());
				}
			}

			for (var sAggregation in oContent.getMetadata().getAllAggregations()) {
				if (oContent.getBindingPath(sAggregation) === "/conditions") {
					oBindingInfo = oContent.getBindingInfo(sAggregation);
					if (oBindingInfo && oBindingInfo.template) {
						for (sProperty in oBindingInfo.template.getMetadata().getAllProperties()) {
							var oTemplateBindingInfo = oBindingInfo.template.getBindingInfo(sProperty);
							if (oTemplateBindingInfo && oTemplateBindingInfo.type && oTemplateBindingInfo.type instanceof ConditionType) {
								this.getContentFactory().getContentConditionTypes()[sName].oConditionType = oTemplateBindingInfo.type;
								if (bPropertyBound) { // both value and tokens are bound -> don't format Value, only parse it
									this.getContentFactory().setNoFormatting(true);
								}
								break;
							}
						}
					}
				}
				if (sAggregation === "tooltip" && !oContent.getBindingPath(sAggregation) && !oContent.getAggregation(sAggregation)) {
					// at least support string-tooltip
					oContent.bindProperty(sAggregation, { path: "$field>/tooltip" });
				}
			}

			if (oContent.getMetadata().getAllAssociations().ariaLabelledBy) {
				this.getContentFactory().setAriaLabelledBy(oContent);
			}
		}

	}

	function _attachContentHandlers(oContent) {

		if (oContent.getMetadata().getEvents().change) {
			// content has change event -> attach handler
			oContent.attachEvent("change", _handleContentChange, this);
		}
		if (oContent.getMetadata().getEvents().liveChange) {
			// content has liveChange event -> attach handler
			oContent.attachEvent("liveChange", _handleContentLiveChange, this);
		}
		if (oContent.getMetadata().getEvents().press) {
			// content has press event -> attach handler
			oContent.attachEvent("press", _handleContentPress, this);
		}
		if (oContent.getMetadata().getEvents().valueHelpRequest) {
			// content has valueHelpRequest event -> attach handler
			oContent.attachEvent("valueHelpRequest", _handleValueHelpRequest, this);
		}
		if (oContent.getMetadata().getEvents().tokenUpdate) {
			// content has tokenUpdate event -> attach handler
			oContent.attachEvent("tokenUpdate", _handleTokenUpdate, this);
		}
	}

	function _detachContentHandlers(oContent) {

		if (oContent.getMetadata().getEvents().change) {
			// oldContent has change event -> detach handler
			oContent.detachEvent("change", _handleContentChange, this);
		}
		if (oContent.getMetadata().getEvents().liveChange) {
			// oldContent has liveChange event -> detach handler
			oContent.detachEvent("liveChange", _handleContentLiveChange, this);
		}
		if (oContent.getMetadata().getEvents().press) {
			// oldContent has press event -> detach handler
			oContent.detachEvent("press", _handleContentPress, this);
		}
		if (oContent.getMetadata().getEvents().valueHelpRequest) {
			// oldContent has valueHelpRequest event -> detach handler
			oContent.detachEvent("valueHelpRequest", _handleValueHelpRequest, this);
		}
		if (oContent.getMetadata().getEvents().tokenUpdate) {
			// content has tokenUpdate event -> deattach handler
			oContent.detachEvent("tokenUpdate", _handleTokenUpdate, this);
		}
	}

	function _createInternalContentWrapper() {
		var fnCreateInternalContent = function() {
			if (!this.bDelegateInitialized) {
				// wait until delegate is loaded
				this.awaitControlDelegate().then(function() { _createInternalContentWrapper.call(this); }.bind(this));
			} else {
				_createInternalContent.call(this);
			}
		};

		if (this._oCreateContentPromise) {
			this._oCreateContentPromise.then(function() {
				_createInternalContentWrapper.call(this); // as already a Promise might be pending
			}.bind(this));
		} else {
			fnCreateInternalContent.call(this);
		}
	}

	/**
	 * Checks if all needed information are provided to create the internal content control.
	 * If possible create internal controls.
	 * @protected
	 */
	FieldBase.prototype.checkCreateInternalContent = function() {

		if (!this.bIsDestroyed && this.getVisible() && this.getContentFactory().getDataType()) {
			_createInternalContentWrapper.call(this);
		}

	};

	/**
	 * Triggers a check if all relevant properties are set to create the internal content control.
	 *
	 * To be sure that the check is not called multiple times it needs
	 * to be checked if there is a pending check.
	 * Multiple calls might happen if properties are changed often or
	 * the check is triggered in BindingContext update (what is often called in propagation).
	 * @protected
	 */
	FieldBase.prototype.triggerCheckCreateInternalContent = function() {

		if (!this._oCheckCreateInternalContentPromise) {
			this._oCheckCreateInternalContentPromise = this.awaitControlDelegate().then(function() {
				delete this._oCheckCreateInternalContentPromise;
				this.checkCreateInternalContent();
			}.bind(this));
		}

	};

	function _createInternalContent() {

		if (this._bIsBeingDestroyed || this.bIsDestroyed) {
			return; // for destroyed field do nothing on internal control
		}

		var sEditMode = this.getEditMode();
		var oContent = this.getContent();
		var oContentEdit = this.getContentEdit();
		var oContentDisplay = this.getContentDisplay();

		this.getContentFactory()._setUsedConditionType(oContent, oContentEdit, oContentDisplay, sEditMode); // if external content use it's conditionType
		_checkFieldHelpExist.call(this, this._getValueHelp()); // as ValueHelp might be created after ID is assigned to Field
		_setAriaAttributes.call(this, false);


		if (oContent ||
			(sEditMode === EditMode.Display && oContentDisplay) ||
			(sEditMode !== EditMode.Display && oContentEdit)) {
			this.destroyInternalContent();
			var aContent = this.getCurrentContent(); // external set content
			if (aContent.length === 1) {
				_setModelOnContent.call(this, aContent[0]); // bind to ManagedObjectModel
			}
			return;
		}

		// Moved to ContentFactory logic
		var iMaxConditions = this.getMaxConditions();
		var aOperators = this.getSupportedOperators();
		var sControlName;
		var aContentOld = this.getAggregation("_content", []);
		var oContentOld;
		var sControlNameOld;

		var bMultipleLines = this.getMultipleLines();
		var bIsTriggerable = this._bTriggerable;
		var oContentType = this.getContentFactory().getContentType(this.getBaseType(), this.getMaxConditions(), bIsTriggerable);

		if (aContentOld.length > 0) {
			oContentOld = aContentOld[0];
			sControlNameOld = oContentOld.getMetadata().getName().replace(/\./g, "/");
		}

		var sContentMode = this.getContentFactory().getContentMode(oContentType, sEditMode, iMaxConditions, bMultipleLines, aOperators);
		var aControlNames = oContentType.getControlNames(sContentMode, aOperators[0]);
		sControlName = aControlNames[0];
		if (sControlName !== sControlNameOld) {
			this.getContentFactory().setHideOperator(_isOnlyOneSingleValue.call(this, aOperators)); // in single value eq Field hide operator

			if (oContentOld) {
				this.destroyInternalContent();

				if (oContentOld.isA("sap.m.DateTimeField")) {
					// in case of DatePicker remove type with special format options
					this.initDataType();
				}

				this.getContentFactory().updateConditionType();
			}

			if (_useDefaultFieldHelp.call(this, oContentType, aOperators, sEditMode, iMaxConditions)) {
				// use default field help
				_createDefaultFieldHelp.call(this, oContentType.getUseDefaultFieldHelp().name);
			} else if (this._sDefaultFieldHelp) {
				delete this._sDefaultFieldHelp; // do not destroy as might used on other Fields too
			}

			var sId = _getIdForInternalControl.call(this);
			this._oCreateContentPromise = this.getContentFactory().createContent(oContentType, sContentMode, sId);
			this._oCreateContentPromise.then(function(aControls) {
				delete this._oCreateContentPromise; // after finished new creation request can be sync again (clear at the beginning as error might break function before end)
				for (var iIndex = 0; iIndex < aControls.length; iIndex++) {
					var oControl = aControls[iIndex];
					oControl.attachEvent("parseError", _handleParseError, this);
					oControl.attachEvent("validationError", _handleValidationError, this);
					oControl.attachEvent("validationSuccess", _handleValidationSuccess, this);
					_modifyKeyboardHandler.call(this, oControl, oContentType.getUseDefaultEnterHandler());
					_modifyFieldGroupHandler.call(this, oControl, false);
					_setModelOnContent.call(this, oControl);
					this.addAggregation("_content", oControl);
				}

				_refreshLabel.call(this);
			}.bind(this)).catch(function(oException) {
				delete this._oCreateContentPromise; // clean up to not run into endless loop
				throw oException;
			}.bind(this));
		}
	}

	function _getIdForInternalControl() {

		return this.getId() + "-inner";

	}

	/**
	 * Destroys the internal content controls
	 * @protected
	 */
	FieldBase.prototype.destroyInternalContent = function () {

		// if the internalContent must be new created the data type must be switched back to original one
		// so new creation of control is using original data
		this.destroyAggregation("_content");

		if (this.getContentFactory().getDateOriginalType()) {
			this.getContentFactory().setDataType(this.getContentFactory().getDateOriginalType());
			this.getContentFactory().setDateOriginalType(undefined);
		} else if (this.getContentFactory().getUnitOriginalType()) {
			this.getContentFactory().setDataType(this.getContentFactory().getUnitOriginalType());
			this.getContentFactory().setUnitOriginalType(undefined);
		}

		if (this.isInvalidInput()) {
			// as wrong input get lost if content control is destroyed.
			this.resetInvalidInput();
			this._removeUIMessage();
		}

		if (this.getContentFactory().isMeasure()) {
			this.getContentFactory().setIsMeasure(false);
		}

	};

	function _setModelOnContent(oContent) {
		if (!this._oManagedObjectModel && !this._bIsBeingDestroyed) {
			this._oManagedObjectModel = new ManagedObjectModel(this);
		}
		oContent.setModel(this._oManagedObjectModel, "$field");
	}

	function _handleKeybordEvent(oEvent) {
		// if FieldHelp is open, do not use native arrow handling of control

		var bPrevent = false;
		var oFieldHelp = _getFieldHelp.call(this);

		if (!oFieldHelp) {
			return; // no FieldHelp -> just use logic of content control
		} else { // not if only type-ahead
			// FieldHelp closed, but enabled, prevent only arrow up and down as used to navigate
			switch (oEvent.type) {
				case "sapup":
					bPrevent = oFieldHelp.isNavigationEnabled(-1);
					break;
				case "sapdown":
					bPrevent = oFieldHelp.isNavigationEnabled(1);
					break;
				case "saphome":
					bPrevent = oFieldHelp.isNavigationEnabled(-9999);
					break;
				case "sapend":
					bPrevent = oFieldHelp.isNavigationEnabled(9999);
					break;
				case "sappageup":
					bPrevent = oFieldHelp.isNavigationEnabled(-10);
					break;
				case "sappagedown":
					bPrevent = oFieldHelp.isNavigationEnabled(10);
					break;
				default:
					bPrevent = oFieldHelp.isOpen();
					break;
			}
		}

		if (bPrevent) {
			oEvent.stopPropagation();
			oEvent.stopImmediatePropagation(true);

			// call handler directly
			switch (oEvent.type) {
				case "sapup":
					this.onsapup(oEvent);
					break;
				case "sapdown":
					this.onsapdown(oEvent);
					break;
				case "saphome":
					this.onsaphome(oEvent);
					break;
				case "sapend":
					this.onsapend(oEvent);
					break;
				case "sappageup":
					this.onsappageup(oEvent);
					break;
				case "sappagedown":
					this.onsappagedown(oEvent);
					break;

				default:
					break;
			}
		}

	}

	function _modifyKeyboardHandler(oControl, bUseEnterDelegate) {

		oControl.addDelegate(oContentEventDelegateBefore, true, this);

		if (bUseEnterDelegate) {
			oControl.addDelegate(oContentEventDelegateAfter, false, this);
		}

	}

	function _restoreKeyboardHandler(oControl) {

		oControl.removeDelegate(oContentEventDelegateBefore);
		oControl.removeDelegate(oContentEventDelegateAfter);

	}

	function _modifyFieldGroupHandler(oControl, bEnableResore) {

		if (bEnableResore) {
			oControl._OriginalGetFieldGroupIds = oControl._getFieldGroupIds;
			oControl._OriginalTriggerValidateFieldGroup = oControl.triggerValidateFieldGroup;
		}

		oControl._getFieldGroupIds = function() {
			var aFieldGroupIds = this.getFieldGroupIds();
			var oParent = this.getParent();

			if (oParent) { // if in destruction, parent might be removed
				// always add IDs of Field or FilterField (as Unit Field has internal FieldGroup
				aFieldGroupIds = aFieldGroupIds.concat(oParent._getFieldGroupIds());
			}

			return aFieldGroupIds;
		};

		oControl.triggerValidateFieldGroup = function (aFieldGroupIds) {
			// fire event on Field or FilterField, not on internal control but remove internal FieldGroup
			var oParent = this.getParent();
			if (oParent) { // if in destruction, parent might be removed
				var iIndex = aFieldGroupIds.indexOf(oParent.getId());
				if (iIndex > -1) { //own FieldGroup left
					// handle internal FieldGroup
					_validateFieldGroup.call(oParent, aFieldGroupIds);
				} else {
					// fire event directly
					oParent.fireValidateFieldGroup({
						fieldGroupIds : aFieldGroupIds
					});
				}
			}
		};

	}

	function _restoreFieldGroupHandler(oControl) {

		if (oControl._OriginalGetFieldGroupIds && oControl._OriginalTriggerValidateFieldGroup) {
			oControl._getFieldGroupIds = oControl._OriginalGetFieldGroupIds;
			delete oControl._OriginalGetFieldGroupIds;
			oControl.triggerValidateFieldGroup = oControl._OriginalTriggerValidateFieldGroup;
			delete oControl._OriginalTriggerValidateFieldGroup;
		}

	}

	function _createDefaultFieldHelp(sType) {

		this._sDefaultFieldHelp = mDefaultHelps[sType].id;

		var oValueHelp = mDefaultHelps[sType].control;

		if (oValueHelp && oValueHelp.bIsDestroyed) {
			// someone destroyed FieldHelp -> initialize
			mDefaultHelps[sType].control = undefined;
			oValueHelp = undefined;
		}

		if (!oValueHelp) {
			if (mDefaultHelps[sType].promise) {
				mDefaultHelps[sType].promise.then(_defaultFieldHelpUpdate.bind(this, mDefaultHelps[sType].id));
			} else {
				mDefaultHelps[sType].promise = loadModules(mDefaultHelps[sType].modules).catch(function(oError) {
					throw new Error("loadModules promise rejected in sap.ui.mdc.field.FieldBase:_createDefaultFieldHelp function call - could not load controls " + JSON.stringify(mDefaultHelps[sType].modules));
				}).then(function(aModules) {
					var ValueHelp = aModules[0];
					var Container = aModules[1];
					var Content = aModules[2];
					oValueHelp = new ValueHelp(mDefaultHelps[sType].id, {
						delegate: {name: "sap/ui/mdc/ValueHelpDelegate", payload: {isDefaultHelp: true}} // use base-delegate as TypeUtil of delegate is not used in current ValueHelp implementation as we transfer the Type of the Field into the ValueHelp (oConfig)
					});
					var oContainer = new Container(mDefaultHelps[sType].id + "-container", {
						content: [new Content(mDefaultHelps[sType].id + "-content", mDefaultHelps[sType].contentProperties)]
					});
					oValueHelp._bIsDefaultHelp = true;
					oValueHelp._sDefaultHelpType = sType;
					mDefaultHelps[sType].control = oValueHelp;
					if (mDefaultHelps[sType].dialog) {
						oValueHelp.setDialog(oContainer);
					} else {
						oValueHelp.setTypeahead(oContainer);
					}
					//				this.addDependent(oValueHelp); // TODO: where to add to control tree
					oValueHelp.connect(this); // to forward dataType
					_defaultFieldHelpUpdate.call(this, mDefaultHelps[sType].id);
				}.bind(this)).unwrap();
			}
		} else {
			_defaultFieldHelpUpdate.call(this, mDefaultHelps[sType].id);
		}

		_setAriaAttributes.call(this, false);

	}

	function _defaultFieldHelpUpdate(sId) {

		_fieldHelpChanged.call(this, sId, "insert");

	}

	function _useDefaultFieldHelp(oContentType, aOperators, sEditMode, iMaxConditions) {

		var oUseDefaultFieldHelp = oContentType.getUseDefaultFieldHelp();
		if (oUseDefaultFieldHelp && !this._getValueHelp() && sEditMode !== EditMode.Display) {
			if ((iMaxConditions === 1 && oUseDefaultFieldHelp.single) || (iMaxConditions !== 1 && oUseDefaultFieldHelp.multi)) {
				if (aOperators.length === 1) {
					var bIsSingleValue = _isOnlyOneSingleValue.call(this, aOperators); // if operator not exists unse no field help
					// not if operator is handled by special control (like DatePicker)
					if (iMaxConditions === 1) {
						if (!(oContentType.getEditOperator() && oContentType.getEditOperator()[aOperators[0]]) &&
								(oUseDefaultFieldHelp.oneOperatorSingle || !bIsSingleValue)) {
							// "bool" case (always default field help) or operator needs more than one value (e.g. between)
							return true;
						}
					} else if (oUseDefaultFieldHelp.oneOperatorMulti || !bIsSingleValue) {
						// DatePicker case - in multi-value use default help to get DatePicker controls
						return true;
					}
				} else {
					// multiple operators -> default help needed
					return true;
				}
			}
		}

		return false;

	}

	function _isOnlyOneSingleValue(aOperators) {

		if (aOperators.length === 1) {
			var oOperator = FilterOperatorUtil.getOperator(aOperators[0]);
			return !oOperator || oOperator.isSingleValue();
		} else {
			return false;
		}

	}

	FieldBase.prototype._setInvalidInput = function(oException, vValue, sReason) {

		this._oInvalidInput = {exception: oException, value: vValue, reason: sReason};

	};

	FieldBase.prototype._getInvalidInputException = function() {

		return this._oInvalidInput && this._oInvalidInput.exception;

	};

	/**
	 * Resets invalid input information.
	 *
	 * Might be called if Binding changes or field is initialized.
	 * @protected
	 */
	FieldBase.prototype.resetInvalidInput = function() {

		this._oInvalidInput = null;

	};

	/**
	 * Checks if there is invalid input
	 * @returns {boolean} True if there is invalid input
	 * @protected
	 */
	FieldBase.prototype.isInvalidInput = function() {

		return !!this._oInvalidInput;

	};

	function _handleParseError(oEvent) {

		// as change event if inner control is fired even Input is wrong, check parse exception from binding
		var vValue = oEvent.getParameter("newValue");
		var oException = oEvent.getParameter("exception");
		this._setInvalidInput(oException, vValue, "ParseError");
		this._sFilterValue = "";

	}

	function _handleValidationError(oEvent) {

		// as change event if inner control is fired even Input is wrong, check validation exception from binding
		var vValue = oEvent.getParameter("newValue");
		var oException = oEvent.getParameter("exception");
		this._setInvalidInput(oException, vValue, "ValidationError");
		this._sFilterValue = "";

		// try to find the corresponding async. change and reject it
		var aWrongConditions = oException && oException instanceof ConditionValidateException && oException.getConditions(); // we store the conditions in the ConditionValidationException
		var bFound = false;
		var i = 0;

		for (i = 0; i < this._aAsyncChanges.length; i++) {
			var oChange = this._aAsyncChanges[i];
			if (oChange.waitForUpdate && Array.isArray(oChange.result)) {
				if (oChange.result.length === 0 && vValue === "") {
					// for empty string no condition is created
					oChange.reject(oEvent.getParameter("exception"));
					bFound = true;
					break;
				} else if (deepEqual(oChange.result, aWrongConditions)) { // compare parsing result with conditions used for validation -> must be the same
					oChange.reject(oException);
					bFound = true;
					break;
				}
			}
		}
		if (bFound) {
			this._aAsyncChanges.splice(i, 1);
		}

	}

	function _handleValidationSuccess(oEvent) {

		this.resetInvalidInput(); // if last valid value is entered again no condition is updated

	}

	function _handleContentChange(oEvent) {

		var oChangeEvent = { parameters: merge({}, oEvent.getParameters()), source: oEvent.getSource() };
		var iLength = this._aAsyncChanges.length;

		if (iLength > 0 && !this._aAsyncChanges[iLength - 1].changeFired) {
			// as change event in Input is directly fired after setValue this must be the change event corresponding to the last async change.
			// as there might be a sync change after it, do not handle it twice.
			this._aAsyncChanges[iLength - 1].changeFired = true;
			this._aAsyncChanges[iLength - 1].changeEvent = oChangeEvent;
			_triggerChange.call(this, undefined, undefined, undefined, this._aAsyncChanges[iLength - 1].promise);
			return;
		}

		var oChange = { changeEvent: oChangeEvent };

		_performContentChange.call(this, oChange);

	}

	function _performContentChange(oChange) {

		var aConditions = this.getConditions();
		var bValid = true;
		var vWrongValue;
		var oSource = oChange.changeEvent.source;

		if (oChange.changeEvent.parameters.hasOwnProperty("valid")) {
			bValid = oChange.changeEvent.parameters["valid"];
		} else if (this.isInvalidInput()) {
			// this might be result of a value that cannot be parsed
			bValid = false;
		}
		if (!bValid && oChange.changeEvent.parameters.hasOwnProperty("value")) {
			vWrongValue = oChange.changeEvent.parameters["value"];
		}

		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp && this._bConnected) {
			if (sap.ui.getCore().getCurrentFocusedControlId() === oSource.getId()) {
				oFieldHelp.close(); // if focus is not in field, Field help closes automatically
			}
			this._sFilterValue = "";
			if (bValid) {
				_setConditionsOnFieldHelp.call(this, aConditions, oFieldHelp);
				oFieldHelp.onControlChange();
			}
			// do not trigger async suggestion
			_clearLiveChangeTimer.call(this);
		}

		if (this._oNavigateCondition) {
			this._oNavigateCondition = undefined; // navigation now finished
			this.getContentFactory().updateConditionType();
		}

		if (oChange.resolve) {
			// async promise needs to be resolved
			_resolveAsyncChange.call(this, oChange);
		} else {
			_triggerChange.call(this, aConditions, bValid, vWrongValue);
		}

	}

	function _handleContentLiveChange(oEvent) {

		var vValue;
		var vPreviousValue;
		var bEscPressed = false;
		var oSource = oEvent.getSource();

		this._oNavigateCondition = undefined; // navigation item is not longer valid
		this.getContentFactory().updateConditionType();

		if ("value" in oEvent.getParameters()) {
			vValue = oEvent.getParameter("value");
		} else if ("newValue" in oEvent.getParameters()) {
			// SearchField
			vValue = oEvent.getParameter("newValue");
		}

		if ("escPressed" in oEvent.getParameters()) {
			bEscPressed = oEvent.getParameter("escPressed");
		}

		if ("previousValue" in oEvent.getParameters()) {
			vPreviousValue = oEvent.getParameter("previousValue");
		} else {
			var aConditions = this.getConditions();
			vPreviousValue = aConditions[0] && aConditions[0].values[0];
		}

		var oFieldHelp = _getFieldHelp.call(this);

		if (oFieldHelp && (!this.getContentFactory().isMeasure() || oSource.getShowValueHelp())) {
			if (bEscPressed) {
				// close FieldHelp if escape pressed and not repoen it for last typed characters
				if (oFieldHelp.isOpen()) {
					oFieldHelp.close();
					_setConditionsOnFieldHelp.call(this, this.getConditions(), oFieldHelp); // reset conditions
					_clearLiveChangeTimer.call(this);
					this._sFilterValue = "";
				}
			} else {
				var aOperators = this.getSupportedOperators(); // show suggestion only if equal operators are supported
				var bUseFieldHelp = false;

				// check if at least one operator supports field help
				// TODO: let field help decide what operator to use
				for (var i = 0; i < aOperators.length; i++) {
					var oOperator = FilterOperatorUtil.getOperator(aOperators[i]);
					if (oOperator.validateInput) {
						bUseFieldHelp = true;
						break;
					}
				}

				if (bUseFieldHelp) {
					this._bIgnoreInputValue = false; // after typing the input value is the current one and should be used
					this._vLiveChangeValue = vValue;
					if (!this._fnLiveChangeTimer) {

						_clearFocusTimer.call(this);

						this._fnLiveChangeTimer = debounce(function() {
							var sDisplay = this.getDisplay();
							// remove "(", ")" from serach string
							// TODO: better solution to search in this case?

							if (typeof this._vLiveChangeValue !== "undefined") {
								this._sFilterValue = "";
							}

							if (this._vLiveChangeValue) {
								// use EQ operator
								var oOperator = FilterOperatorUtil.getEQOperator();
								var aParts = oOperator.getValues(this._vLiveChangeValue, sDisplay, true);
								if (aParts[0]) {
									this._sFilterValue = aParts[0];
									if (aParts[1]) {
										this._sFilterValue = this._sFilterValue + " ";
									}
								}
								if (aParts[1]) {
									this._sFilterValue = this._sFilterValue + aParts[1];
								}
							}

							var _handleTypeahead = function () {
								var oFocusedElement = document.activeElement;
								if (oFocusedElement && (containsOrEquals(this.getDomRef(), oFocusedElement))) { // only if still connected and focussed
									var bIsFHOpen = oFieldHelp.isOpen();
									oFieldHelp.setFilterValue(this._sFilterValue);
									if (this.getMaxConditionsForHelp() === 1 && oFieldHelp.getConditions().length > 0) {
										// While single-suggestion no item is selected
										oFieldHelp.setConditions([]);
									}
									if (!bIsFHOpen) {
										/*
											sap.ui.mdc.ValueHelp can only be "asked" to open a typeahead by a connected control.
											It will then decide on actual opening after content initialization via ValueHelpDelegate.showTypeahead which can be customized by applications.
											An already open typeahead content will consult showTypeahead again on any every filtervalue update and eventually close.
										*/
										oFieldHelp.open(true);
									}
									_setAriaAttributes.call(this, true);
									delete this._vLiveChangeValue;
								}
							}.bind(this);

							if (this._bConnected && this.getCurrentContent()[0]) {
								oFieldHelp.isTypeaheadSupported().then(function (bTypeahead) {
									return !!bTypeahead && _handleTypeahead();
								});
								delete this._vLiveChangeValue;
							}
						}.bind(this), 300, { leading: false, trailing: true });

						// on first call init FieldHelp (trigger loading metadata on first typing)
						oFieldHelp.initBeforeOpen(true);
					}
					var vOpenByTyping = oFieldHelp.isTypeaheadSupported(); // trigger determination of search functionality
					if (vOpenByTyping instanceof Promise) {
						vOpenByTyping.then(function(bOpenByTyping) {
							// trigger open after Promise resolved
							var oFocusedElement = document.activeElement;
							if (oFocusedElement && (containsOrEquals(this.getDomRef(), oFocusedElement)) && this._fnLiveChangeTimer) { // if destroyed this._fnLiveChangeTimer is removed
								this._fnLiveChangeTimer(); // if resolved while initial debounce-time frame, it will not triggered twice
							}
							this._bOpenByTyping = bOpenByTyping;
						}.bind(this));
					}
					this._fnLiveChangeTimer();
				}
			}
		}

		this.fireLiveChange({ value: vValue, escPressed: bEscPressed, previousValue: vPreviousValue });

	}

	function _clearLiveChangeTimer() {

		if (this._fnLiveChangeTimer) {
			// do not trigger async suggestion
			this._fnLiveChangeTimer.cancel();
			delete this._vLiveChangeValue;
		}

	}

	function _handleContentPress(oEvent) {

		var oFieldInfo = this.getFieldInfo();
		if (oFieldInfo) {
			oFieldInfo.getTriggerHref().then(function(sHref) {
				if (!sHref) {
					oFieldInfo.open(this.getCurrentContent()[0]);
					_setAriaAttributes.call(this, true);
				}
			}.bind(this));
		}

		this.firePress();

	}

	function _handleTokenUpdate(oEvent) {

		if (oEvent.getParameter("type") === "removed") {
			var aRemovedTokens = oEvent.getParameter("removedTokens");
			var aConditions = this.getConditions();
			var sUnit;
			var oPayload;
			var i;

			for (i = 0; i < aRemovedTokens.length; i++) {
				var oRemovedToken = aRemovedTokens[i];
				var sPath = oRemovedToken.getBindingContext("$field").sPath;
				var iIndex = parseInt(sPath.slice(sPath.lastIndexOf("/") + 1));
				aConditions[iIndex].delete = true;
			}

			for (i = aConditions.length - 1; i >= 0; i--) {
				if (aConditions[i].delete) {
					if (this.getContentFactory().isMeasure()) {
						// store for dummy condition if all conditions are removed
						sUnit = aConditions[i].values[0][1];
						oPayload = aConditions[i].payload;
					}
					aConditions.splice(i, 1);
				}
			}

			if (this.getContentFactory().isMeasure() && sUnit && aConditions.length === 0) {
				// create dummy condition for unit
				aConditions = [Condition.createItemCondition([undefined, sUnit], undefined, undefined, undefined, oPayload)];
			}

			this.setProperty("conditions", aConditions, true); // do not invalidate whole field
			_executeChange.call(this, aConditions, true); // removing Token don't need to wait for processing both fields in unit case
			oEvent.preventDefault(true);
		}

	}

	function _fieldHelpChanged(sId, sMutation) {

		var oFieldHelp;

		if (sMutation === "remove") {
			oFieldHelp = sap.ui.getCore().byId(sId);
			if (oFieldHelp) {
				_disconnectFieldhelp.call(this, oFieldHelp);
				oFieldHelp.detachEvent("dataUpdate", _handleHelpDataUpdate, this);
			}
			this.resetProperty("_fieldHelpEnabled");
		} else if (sMutation === "insert") {
			if (this._sDefaultFieldHelp && sId !== this._sDefaultFieldHelp) { // remove default help
				_fieldHelpChanged.call(this, this._sDefaultFieldHelp, "remove");
				delete this._sDefaultFieldHelp; // do not destroy as might used on other Fields too
			}
			_checkFieldHelpExist.call(this, sId);

			// update icon (on remove not necessary as hidden)
			var oControl = this.getCurrentContent()[0];
			if (oControl && oControl.setValueHelpIconSrc) {
				oControl.setValueHelpIconSrc(this._getFieldHelpIcon());
			}
		}

		_handleConditionsChange.call(this, this.getConditions()); // to update descriptions

	}

	function _checkFieldHelpExist(sId) {

		if (sId && this.isPropertyInitial("_fieldHelpEnabled")) {
			var oFieldHelp = sap.ui.getCore().byId(sId);
			if (oFieldHelp) {
				oFieldHelp.attachEvent("dataUpdate", _handleHelpDataUpdate, this);
				if (oFieldHelp.getIcon()) { //if there is no icon, the value help is only used as typeahead
					this.setProperty("_fieldHelpEnabled", true, true);
				}
			}
		}

	}

	// TODO: remove this function and replace by getValueHelp once FieldHelp association is completetly removed.
	FieldBase.prototype._getValueHelp = function() {

		return this.getValueHelp() || (this.getFieldHelp && this.getFieldHelp()); // as getFieldHelp not exist in legacy-free UI5

	};

	function _getFieldHelp() {

		var sId = this._getValueHelp();
		var oFieldHelp;

		if (!sId && this._sDefaultFieldHelp) {
			sId = this._sDefaultFieldHelp;
		}

		if (sId) {
			oFieldHelp = sap.ui.getCore().byId(sId);
		}

		return oFieldHelp;

	}

	function _setConditionsOnFieldHelp(aConditions, oFieldHelp) {

		if (!oFieldHelp) {
			oFieldHelp = _getFieldHelp.call(this);
		}

		var aHelpConditions;
		if (this.isInvalidInput() && this.getMaxConditionsForHelp() === 1) {
			// if parsing error and single value case do not see the old (outdated) condition as selected
			// TODO: handling if error only on unit or number part
			aHelpConditions = [];
		} else if (this.getContentFactory().isMeasure()) {
			// for unit or curreny add only the unit/currency to FieldHelp
			aHelpConditions = [];
			for (var i = 0; i < aConditions.length; i++) {
				var oCondition = aConditions[i];
				if (oCondition.values[0] && oCondition.values[0][1]) {
					var oHelpCondition = Condition.createItemCondition(oCondition.values[0][1], undefined, oCondition.inParameters, oCondition.outParameters, oCondition.payload);
					aHelpConditions.push(oHelpCondition);
				}
			}
		} else {
			aHelpConditions = aConditions;
		}

		oFieldHelp.setConditions(aHelpConditions);

	}

	function _handleValueHelpRequest(oEvent, bOpenAsTypeahed) { // if triggered by valueHelpRequest event alway open as dialog, if called from Tap or Focus as typeahead

		var oFieldHelp = _getFieldHelp.call(this);

		if (oFieldHelp) {
			if (this._fnLiveChangeTimer) { // as live change might pending we need to update the filterValue
				this._fnLiveChangeTimer.flush();
			}
			oFieldHelp.setFilterValue(this._sFilterValue); // use types value for filtering, even if reopening FieldHelp
			var aConditions = this.getConditions();
			_setConditionsOnFieldHelp.call(this, aConditions, oFieldHelp);
			oFieldHelp.toggleOpen(!!bOpenAsTypeahed);
			if (!oFieldHelp.isFocusInHelp()) {
				// need to reset bValueHelpRequested in Input, otherwise on focusout no change event and navigation don't work
				var oContent = oEvent.srcControl || oEvent.getSource(); // as, if called from Tap or other brwowser event getSource is not available
				if (oContent.bValueHelpRequested) {
					oContent.bValueHelpRequested = false; // TODO: need API
				}
			}
		}

	}

	function _handleFieldHelpSelect(oEvent) {

		var aConditions = this.getConditions();
		var aNewConditions = oEvent.getParameter("conditions");
		var bAdd = oEvent.getParameter("add");
		var bClose = oEvent.getParameter("close");
		var oFieldHelp = oEvent.oSource;
		var iMaxConditions = this.getMaxConditions();
		var oCondition;
		var oContent = this.getControlForSuggestion();
		var sDOMValue;
		var i = 0;

		if (this.getContentFactory().isMeasure()) {
			if (aNewConditions.length > 1) {
				throw new Error("Only one item must be selected! " + this);
			}
			if (aNewConditions[0].operator !== "EQ") {
				throw new Error("Only EQ allowed! " + this);
			}

			if (aConditions.length > 0) {
				// TODO: update all conditions?
				for (i = 0; i < aConditions.length; i++) {
					aConditions[i].values[0][1] = aNewConditions[0].values[0];
					if (aConditions[i].operator === "BT") {
						aConditions[i].values[1][1] = aNewConditions[0].values[0];
					}
					if (aNewConditions[0].inParameters) {
						aConditions[i].inParameters = aNewConditions[0].inParameters;
					}
					if (aNewConditions[0].outParameters) {
						aConditions[i].outParameters = aNewConditions[0].outParameters;
					}
					if (aNewConditions[0].payload) {
						aConditions[i].payload = aNewConditions[0].payload;
					}
				}
			} else {
				var oOperator = FilterOperatorUtil.getEQOperator(this.getSupportedOperators());
				var aValue = this.getControlDelegate().enhanceValueForUnit(this.getPayload(), [null, aNewConditions[0].values[0]], this._oTypeInitialization); // Delegate must be initialized right now
				oCondition = Condition.createCondition(oOperator.name, [aValue], aNewConditions[0].inParameters, aNewConditions[0].outParameters, ConditionValidated.NotValidated, aNewConditions[0].payload);
				aConditions.push(oCondition);
				var oConditionType = this.getContentFactory().getConditionType(true);
				var oConditionsType = this.getContentFactory().getUnitConditionsType(true);
				// TODO: format once to update current value in type (as empty condtions are not displayed as token)
				if (oConditionType) {
					sDOMValue = oConditionType.formatValue(oCondition);
				} else if (oConditionsType) {
					sDOMValue = oConditionsType.formatValue(aConditions);
				}
			}
		} else {
			if (!bAdd) {
				aConditions = []; // remove all existing conditions
			}

			for (i = 0; i < aNewConditions.length; i++) {
				oCondition = aNewConditions[i];
				if (!_isValidOperator.call(this, oCondition.operator)) {
					continue;
				}

				// take what ever comes from field help as valid - even if it is an empty key
				var iIndex = bAdd ? FilterOperatorUtil.indexOfCondition(oCondition, aConditions) : -1; // check if already exist
				if (iIndex === -1) { // new -> add
					aConditions.push(oCondition);
				} else if (oCondition.validated === ConditionValidated.Validated && oCondition.values.length > 1 && (aConditions[iIndex].values.length === 1 || oCondition.values[1] !== aConditions[iIndex].values[1])) {
					// description changed -> use the current description
					aConditions[iIndex].values = oCondition.values;
				}
			}
		}

		if (iMaxConditions > 0 && iMaxConditions < aConditions.length) {
			// remove first conditions to meet maxConditions
			aConditions.splice(0, aConditions.length - iMaxConditions);
		}

		var bChangeAfterError = false;
		if (oContent && oContent.setDOMValue) {
			if (this.getMaxConditionsForHelp() === 1 && aConditions.length > 0) {
				// the focus is still in the Field. The update of the inner control is done via ManagedObjectModel binding.
				// The inner Input is configured to prefer user input in this case.
				// so we need to set the DOM value here. Otherwise it is not updated or, if empty, selected.
				if (this.getContentFactory().isMeasure() && this.getContentFactory().getUnitConditionsType()) {
					sDOMValue = this.getContentFactory().getUnitConditionsType().formatValue(aConditions);
				} else if (this.getContentFactory().getConditionType(true)) {
					sDOMValue = this.getContentFactory().getConditionType().formatValue(aConditions[0]);
				} else if (this.getContentFactory().getConditionsType(true)) {
					sDOMValue = this.getContentFactory().getConditionsType().formatValue(aConditions);
				}

				var fnUpdateDOMValue = function(sText) {
					var sOldDOMValue = oContent.getDOMValue();
					oContent.setDOMValue(""); // to overwrite it even if the text is the same -> otherwise cursor position could be wrong
					oContent.setDOMValue(sText);
					if (sOldDOMValue !== sText && iMaxConditions === 1) {
						this.fireLiveChange({value: aConditions[0].values[0]}); // use the key as value, like for navigation
					}
				}.bind(this);
				if (sDOMValue instanceof Promise) {
					// text is determined async (normally description should be delivered directly from field help)
					sDOMValue.then(function(sText) {
						fnUpdateDOMValue(sText);
					});
				} else {
					fnUpdateDOMValue(sDOMValue);
				}
				this._sFilterValue = "";
			} else if (bClose) {
				oContent.setDOMValue(""); // as value property of MultiInput control might still be empty during typing. So setValue (via Binding) doesn't updates DOM-value (as no change is recognized).
				this._sFilterValue = "";
				this._bIgnoreInputValue = false; // just clean up
			} else {
				this._bIgnoreInputValue = true; // after something is selected, the value just stays for filtering -> don't use to create token
			}

			// after selection input cannot be wrong
			if (this.isInvalidInput()) { // only remove messages set by Field itself, message from outside should stay.
				this.resetInvalidInput();
				this._removeUIMessage();
				bChangeAfterError = true;
			}
		}

		var aConditionsOld = this.getConditions();

		if (!deepEqual(aConditions, aConditionsOld)) {
			this._oNavigateCondition = undefined;
			this.getContentFactory().updateConditionType();

			this.setProperty("conditions", aConditions, true); // do not invalidate whole field

			if (!FilterOperatorUtil.compareConditionsArray(aConditions, aConditionsOld)) { // update only if real change
				// handle out-parameters
				oFieldHelp.onControlChange();
				_triggerChange.call(this, aConditions, true);
			}
		} else if (bChangeAfterError) { // last valif value choosen again
			_triggerChange.call(this, aConditions, true);
		}
	}

	function _handleFieldHelpNavigated(oEvent) {

		var sValue = oEvent.getParameter("value");
		var vKey = oEvent.getParameter("key");
		var oCondition = oEvent.getParameter("condition");
		var sItemId = oEvent.getParameter("itemId");
		var bLeaveFocus = oEvent.getParameter("leaveFocus");

		if (!oCondition && vKey) {
			oCondition = Condition.createItemCondition(vKey, sValue); // TODO: delete if outdated?
		}

		var sNewValue;
		var sDOMValue;
		var oContent = this.getControlForSuggestion();
		var oOperator = FilterOperatorUtil.getEQOperator(this.getSupportedOperators()); /// use EQ operator of Field (might be different one)
		var oFieldHelp = _getFieldHelp.call(this);

		if (bLeaveFocus) {
			// nothing to navigate, just set focus visualization back to field
			oContent.addStyleClass("sapMFocus");
			oContent.focus();
			oFieldHelp.removeFocus();
			return;
		}

		if (oCondition) {
			this._oNavigateCondition = merge({}, oCondition); // to keep In- and OutParameters
			this._oNavigateCondition.operator = oOperator.name;
			vKey = oCondition.values[0];
			sValue = oCondition.values[1];
		} else {
			this._oNavigateCondition = Condition.createCondition(oOperator.name, [vKey, sValue],undefined, undefined, ConditionValidated.Validated);
		}

		if (this.getContentFactory().isMeasure()) {
			var aConditions = this.getConditions();
			// use number of first condition. In Multicase all conditions must be updated in change event
			if (aConditions.length > 0) {
				this._oNavigateCondition.operator = aConditions[0].operator;
				this._oNavigateCondition.values[0] = [aConditions[0].values[0][0], vKey];
				if (aConditions[0].operator === "BT") {
					this._oNavigateCondition.values[1] = [aConditions[0].values[1][0], this._oNavigateCondition.values[0][1]];
				} else if (this._oNavigateCondition.values.length > 1) {
					this._oNavigateCondition.values.splice(1);
				}
			} else {
				this._oNavigateCondition.values = [this.getControlDelegate().enhanceValueForUnit(this.getPayload(), [null, vKey], this._oTypeInitialization)]; // Delegate must be initialized right now
			}
		}

		this._bPreventGetDescription = true; // if no description in navigated condition, no description exist. Don't try to read one
		this.getContentFactory().updateConditionType();

		// take what ever comes from field help as valid - even if it is an empty key
		// TODO: what if field is required?

		if (this.getDisplay() !== FieldDisplay.Value) {
			// value is used as key
			sNewValue = vKey;
		} else if (sValue) {
			sNewValue = sValue;
		} else {
			sNewValue = vKey;
		}

		var bOpen = oFieldHelp.isOpen();

		if (oContent && oContent.setDOMValue) {
			if (!sDOMValue) {
				if (this.getContentFactory().isMeasure() && this.getContentFactory().getUnitConditionsType() && this._oNavigateCondition) {
					sDOMValue = this.getContentFactory().getUnitConditionsType().formatValue([this._oNavigateCondition]);
				} else if (this.getContentFactory().getConditionType(true) && this._oNavigateCondition) {
					sDOMValue = this.getContentFactory().getConditionType().formatValue(this._oNavigateCondition);
				} else if (this.getContentFactory().getConditionsType(true) && this._oNavigateCondition) {
					sDOMValue = this.getContentFactory().getConditionsType().formatValue([this._oNavigateCondition]);
				} else {
					sDOMValue = sValue || vKey;
				}
			}
			oContent.setDOMValue(sDOMValue);
			if (oContent._doSelect) {
				oContent._doSelect();
			}
			if (bOpen) {
				oContent.removeStyleClass("sapMFocus"); // to have focus outline on navigated item only
			}
		}

		this._bPreventGetDescription = false; // back to default
		this.getContentFactory().updateConditionType();

		_setAriaAttributes.call(this, bOpen, sItemId);

		this._bIgnoreInputValue = false; // use value for input
		this.fireLiveChange({ value: sNewValue });

	}

	function _handleFieldHelpAfterClose(oEvent) {

		if (this._bIgnoreInputValue) {
			// remove filter value from input and don't use it as input
			var oContent = this.getControlForSuggestion();
			this._bIgnoreInputValue = false;
			oContent.setDOMValue("");
			this._sFilterValue = "";
			this.getContentFactory().updateConditionType();
			if (this.getMaxConditions() !== 1) {
				// clear "value" property of MultiInput as there might be an old value from a invalid input before
				this._oManagedObjectModel.checkUpdate(true); // forces update of value property via binding to conditions
			}
		}

		_setAriaAttributes.call(this, false);

		// sync conditions with FieldHelp as we cannot e sure that it still is in sync
		var oFieldHelp = oEvent.getSource();
		var aConditions = this.getConditions();
		_setConditionsOnFieldHelp.call(this, aConditions, oFieldHelp);

	}

	function _handleFieldHelpOpened(oEvent) {

		_setAriaAttributes.call(this, true);

	}

	function _handleFieldSwitchToValueHelp(oEvent) {

		var oContent = this.getControlForSuggestion();
		oContent.focus(); // move focus back to Field before opening valueHelp
		if (oContent.fireValueHelpRequest) {
			// fake valueHelp icon pressed
			oContent.bValueHelpRequested = true; // to prevent change event
			oContent.fireValueHelpRequest();
		}

	}

	function _handleHelpDataUpdate(oEvent) {

		var isEditing = this.getEditMode() === EditMode.Editable && this.getCurrentContent().length > 0 &&
			sap.ui.getCore().getCurrentFocusedControlId() === this.getCurrentContent()[0].getId();

		//		// also in display mode to get right text
		//		_handleConditionsChange.call(this, this.getConditions());
		if (!isEditing && !this._bPendingConditionUpdate && this.getConditions().length > 0 &&
			(this.getMaxConditions() !== 1 || (this.getDisplay() !== FieldDisplay.Value && !this.isInvalidInput()))
			&& this._oManagedObjectModel) {
			// update tokens in MultiValue
			// update text/value only if no parse error, otherwise wrong value would be removed
			// don't update if contidions are outdated (updated async in Field)
			this._oManagedObjectModel.checkUpdate(true);
		}

	}

	function _handleDisconnect(oEvent) {

		var oFieldHelp = _getFieldHelp.call(this);
		_disconnectFieldhelp.call(this, oFieldHelp);

	}

	function _disconnectFieldhelp(oFieldHelp) {

		if (this._bConnected) {
			oFieldHelp.detachEvent("select", _handleFieldHelpSelect, this);
			oFieldHelp.detachEvent("navigated", _handleFieldHelpNavigated, this);
			oFieldHelp.detachEvent("disconnect", _handleDisconnect, this);
			oFieldHelp.detachEvent("afterClose", _handleFieldHelpAfterClose, this); // TODO: remove
			oFieldHelp.detachEvent("switchToValueHelp", _handleFieldSwitchToValueHelp, this);
			oFieldHelp.detachEvent("closed", _handleFieldHelpAfterClose, this);
			oFieldHelp.detachEvent("opened", _handleFieldHelpOpened, this);
		this._bConnected = false;
		}

	}

	function _connectFieldhelp() {

		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp) { // as Config or BindingContext might change, update connection on every focus
			var oType;
			var bIsMeasure = this.getContentFactory().isMeasure();

			if (bIsMeasure) {
				// for value help, use the basic type of the unit part, not the unit type. (As ony this part is tranfered, not the composite-array.)
				var aCompositeTypes = this.getContentFactory().getCompositeTypes();
				if (aCompositeTypes && aCompositeTypes.length > 1) { // if no type is defined the default (String) will be used
					oType = aCompositeTypes[1];
				}
			} else {
				oType = this.getContentFactory().getDataType(); // use data type of Field
			}
			var oConfig = { // TODO: only what is needed (also for DefineConditions and Tokenizer)
					maxConditions: this.getMaxConditions(), // TODO: in unit case only 1?
					dataType: oType,
					operators: this.getSupportedOperators(),
					display: bIsMeasure ? FieldDisplay.Value : this.getDisplay(),
					delegate: this.getControlDelegate(),
					delegateName: this.getDelegate() && this.getDelegate().name,
					payload: this.getPayload(),
					defaultOperatorName: this.getDefaultOperator ? this.getDefaultOperator() : null
			};
			oFieldHelp.connect(this, oConfig);

			if (!this._bConnected) { // do not attach events again if already attached
				this._bConnected = true;
				oFieldHelp.attachEvent("select", _handleFieldHelpSelect, this);
				oFieldHelp.attachEvent("navigated", _handleFieldHelpNavigated, this);
				oFieldHelp.attachEvent("disconnect", _handleDisconnect, this);
				oFieldHelp.attachEvent("afterClose", _handleFieldHelpAfterClose, this); // TODO: remove
				oFieldHelp.attachEvent("switchToValueHelp", _handleFieldSwitchToValueHelp, this);
				oFieldHelp.attachEvent("closed", _handleFieldHelpAfterClose, this);
				oFieldHelp.attachEvent("opened", _handleFieldHelpOpened, this);
				var aConditions = this.getConditions();
				_setConditionsOnFieldHelp.call(this, aConditions, oFieldHelp);

				if (oFieldHelp._bIsDefaultHelp) {
					// use label as default title for FilterField
					mDefaultHelps[oFieldHelp._sDefaultHelpType].updateTitle(oFieldHelp, this.getLabel());
				}
			}
		}

	}

	function _handleContentOnsapfocusleave(oEvent) {

		var oFieldHelp = _getFieldHelp.call(this);
		var oContent = this.getControlForSuggestion();
		var oSourceControl = oEvent.srcControl;

		if (oFieldHelp && oContent === oSourceControl) { // in unit case only handle content with assigned value help
			var oFocusedControl = sap.ui.getCore().byId(oEvent.relatedControlId);
			if (oFocusedControl) {
				if (containsOrEquals(oFieldHelp.getDomRef(), oFocusedControl.getFocusDomRef())) {
					oEvent.stopPropagation(); // to prevent focusleave on Field itself
					oEvent.stopImmediatePropagation(true); // to prevent focusleave on content
					if (oContent.bValueHelpRequested) {
						oContent.bValueHelpRequested = false; // to enable change-event after closing value help
					}
				} else {
					oFieldHelp.skipOpening();
				}
			}
		}

	}

	function _handleContentOnchange(oEvent) {

		if (_getFieldHelp.call(this)) { // there is a similar logic in sap.m.Input to not execute change if ValueHelp or suggestion is used
			oEvent.stopImmediatePropagation(true);
		}

	}

	/**
	 * Gets the icon that needs to be rendered for used value help
	 * @returns {sap.ui.core.URI|null} Icon
	 */
	FieldBase.prototype._getFieldHelpIcon = function() {

		var oFieldHelp = _getFieldHelp.call(this);

		if (oFieldHelp) {
			return oFieldHelp.getIcon();
		}

	};

	function _fieldInfoChanged(oFieldInfo, sMutation) {

		if (sMutation === "remove") {
			oFieldInfo.detachEvent("dataUpdate", _handleInfoDataUpdate, this);
		} else if (sMutation === "insert") {
			oFieldInfo.attachEvent("dataUpdate", _handleInfoDataUpdate, this);
			_handleInfoDataUpdate.call(this); // to set already existing values
		}

	}

	function _handleInfoDataUpdate() {

		var oFieldInfo = this.getFieldInfo();
		var that = this;
		oFieldInfo.isTriggerable().then(function(bTriggerable) {
			that._bTriggerable = bTriggerable;
			var aContent = that.getAggregation("_content", []);
			if (aContent.length > 0 && that.getEditMode() === EditMode.Display) {
				_createInternalContentWrapper.call(that);
				if (that._bTriggerable) {
					aContent = that.getAggregation("_content", []);
					var oLink = aContent[0];
					oFieldInfo.getDirectLinkHrefAndTarget().then(function(oLinkItem) {
						ContentFactory._updateLink(oLink, oLinkItem);
					});
				}
			}
		});
	}

	// TODO: better API?
	/**
	 * Provides some internals of the field to be used in {@link sap.ui.mdc.field.ConditionsType ConditionsType} for format and parse the conditions.
	 *
	 * @returns {object} formatOptions of the field (see {@link sap.ui.mdc.field.ConditionsType ConditionsType})
	 * @protected
	 */
	FieldBase.prototype.getFormatOptions = function() {

		if (!this._asyncParsingCall) {
			this._asyncParsingCall = _asyncParsingCall.bind(this); //as variable to have the same function after each update of formatOptions. Otherwise it would be a change on FormatOption in ValueHelpPanel every time
		}

		return {
			valueType: this.getContentFactory().retrieveDataType(),
			originalDateType: this.getContentFactory().getDateOriginalType() || this.getContentFactory().getUnitOriginalType(),
			additionalType: this.getContentFactory().getUnitType(), // only set if unit or timezone
			compositeTypes: this.getContentFactory().getCompositeTypes(), // only set if CompositeType used
			display: this.getContentFactory().isMeasure() ? FieldDisplay.Value : this.getDisplay(),
			valueHelpID: this.getContentFactory().isMeasure() ? undefined : this._getValueHelp() || this._sDefaultFieldHelp,
			operators: this.getSupportedOperators(),
			hideOperator: this.getContentFactory().getHideOperator(),
			maxConditions: this.getMaxConditions(),
			bindingContext: this.getBindingContext(), // to dertmine text and key usding in/out-parameter using correct bindingContext (In Table FieldHelp might be connected to other row)
			asyncParsing: this._asyncParsingCall,
			navigateCondition: this._oNavigateCondition,
			delegate: this.getControlDelegate(),
			delegateName: this.getDelegate() && this.getDelegate().name,
			payload: this.getPayload(),
			preventGetDescription: this._bPreventGetDescription,
			convertWhitespaces: this.getEditMode() === EditMode.Display || this.getMaxConditions() !== 1, // also replace whitespaces in tokens
			control: this,
			defaultOperatorName : this.getDefaultOperator ? this.getDefaultOperator() : null,
			getConditions: this.getConditions.bind(this), // to add condition in multi-value case
			noFormatting: this.getContentFactory().getNoFormatting(),
			keepValue: this._bIgnoreInputValue ? this._sFilterValue : null
		};

	};

	/**
	 * If the value is the initial value of the type (String types) and
	 * the field does not show tokens or operators, no condition
	 * must be set as the field is then empty.
	 *
	 * @param {any} vValue Value to be checked
	 * @returns {boolean} true if value is initial
	 * @protected
	 */
	FieldBase.prototype.checkValueInitial = function(vValue) {

		if (vValue === null || vValue === undefined) {
			return true;
		}

		if (vValue === "" || (typeof (vValue) === "string" && vValue.match(/^0+$/))) { // if String is dig-sequence, initial value contains only "0"s
			var oType = this.getContentFactory().retrieveDataType();
			var vResult = oType.parseValue("", "string");
			if (vResult === vValue) {
				return true; // it's initial value
			} else {
				try {
					oType.validateValue(vResult);
				} catch (oError) {
					// if type is not nullable, empty is invalid, so it is initial
					return true;
				}
			}
		} else {
			var sDataType = _getDataTypeName.call(this);
			if (this.getTypeMap().getBaseType(sDataType) === BaseType.Unit
				&& Array.isArray(vValue) && vValue.length > 1 && (vValue[0] === undefined || vValue[0] === null) && !vValue[1]) { // as 0 is a valid number
				//no number and no unit -> initial
				return true;
			}
		}

		// TODO: other types?

		return false;

	};

	/**
	 * Provides some internals of the unit part of the field to be used in {@link sap.ui.mdc.field.ConditionsType ConditionsType} for format and parse the conditions.
	 *
	 * @returns {object} formatOptions of the field (see {@link sap.ui.mdc.field.ConditionsType ConditionsType})
	 * @protected
	 */
	FieldBase.prototype.getUnitFormatOptions = function() {

		if (!this._asyncParsingCall) { //as variable to have the same function after each update of formatOptions. Otherwise it would be a change on FormatOption in ValueHelpPanel every time
			this._asyncParsingCall = _asyncParsingCall.bind(this);
		}

		return {
			valueType: this.getContentFactory().getUnitType(),
			originalDateType: this.getContentFactory().getDateOriginalType() || this.getContentFactory().getUnitOriginalType(),
			additionalType: this.getContentFactory().retrieveDataType(), // use type of measure for currentValue
			compositeTypes: this.getContentFactory().getCompositeTypes(),
			display: this.getDisplay(),
			valueHelpID: this._getValueHelp() || this._sDefaultFieldHelp,
			operators: ["EQ"],
			hideOperator: true, // TODO: no operator for units
			maxConditions: 1, // TODO: only one unit allowed
			bindingContext: this.getBindingContext(), // to dertmine text and key usding in/out-parameter using correct bindingContext (In Table FieldHelp might be connected to other row)
			asyncParsing: this._asyncParsingCall,
			navigateCondition: this._oNavigateCondition,
			delegate: this.getControlDelegate(),
			delegateName: this.getDelegate() && this.getDelegate().name,
			payload: this.getPayload(),
			preventGetDescription: this._bPreventGetDescription,
			convertWhitespaces: this.getEditMode() === EditMode.Display || this.getEditMode() === EditMode.EditableDisplay,
			control: this,
			getConditions: this.getConditions.bind(this), // TODO: better solution to update unit in all conditions
			noFormatting: false
		};

	};

	function _asyncParsingCall(oPromise) {

		// close FieldHelp to prevent action on it during parsing (only if still focused, otherwise let autoclose do its work)
		var oFieldHelp = _getFieldHelp.call(this);
		if (oFieldHelp && oFieldHelp.isOpen()) {
			var oFocusedElement = document.activeElement;
			if (oFocusedElement
				&& (containsOrEquals(this.getDomRef(), oFocusedElement) || containsOrEquals(oFieldHelp.getDomRef(), oFocusedElement))) {
				oFieldHelp.close();
			}
		}

		// as async parsing can be called again while one is still running we have to map the promises to resolve the right one.
		var oChange = {};
		var oMyPromise = new Promise(function(fResolve, fReject) {
			oChange.resolve = fResolve;
			oChange.reject = fReject;

			oPromise.then(function(vResult) {// vResult can be a condition or an array of conditions
				oChange.result = vResult;
				this.resetInvalidInput();
				var aConditions = this.getConditions();
				if (deepEqual(vResult, aConditions)) {
					// parsingResult is same as current value -> no update will happen
					_resolveAsyncChange.call(this, oChange);
					_removeAsyncChange.call(this, oChange);
				} else {
					oChange.waitForUpdate = true;
				}
			}.bind(this)).catch(function(oException) {
				if (oException && !(oException instanceof ParseException) && !(oException instanceof FormatException) && !(oException instanceof ValidateException)) {// FormatException could also occur
					// unknown error -> just raise it
					throw oException;
				}
				this._setInvalidInput(oException, undefined, "AsyncParsing");
				fReject(oException);
				_removeAsyncChange.call(this, oChange);
			}.bind(this));
		}.bind(this));

		oChange.promise = oMyPromise;
		this._aAsyncChanges.push(oChange);

	}

	function _getAsyncPromise() {

		var aPromises = [];

		for (var i = 0; i < this._aAsyncChanges.length; i++) {
			aPromises.push(this._aAsyncChanges[i].promise);
		}

		if (aPromises.length > 0) {
			return Promise.all(aPromises).then(function() {
				return this.getResultForChangePromise(this.getConditions());
			}.bind(this));
		}

		return null;

	}

	/**
	 * Determines, based on conditions, the value returned by the <code>change</code> event
	 * @param {sap.ui.mdc.field.ConditionType[]} aConditions Array of conditions
	 * @returns {any} control dependent value for <code>change</code> event
	 * @protected
	 */
	FieldBase.prototype.getResultForChangePromise = function(aConditions) {

		// to be overwritten by Field - per default resolve conditions
		return aConditions;

	};

	function _resolveAsyncChange(oChange) {

		oChange.resolve(this.getResultForChangePromise(oChange.result));

	}

	function _removeAsyncChange(oChange) {

		var bFound = false;
		var i = 0;
		for (i = 0; i < this._aAsyncChanges.length; i++) {
			if (oChange === this._aAsyncChanges[i]) {
				bFound = true;
				break;
			}
		}
		if (bFound) {
			this._aAsyncChanges.splice(i, 1);
		}

		return bFound;

	}

	/**
	 * Returns the supported operators
	 *
	 * Needs to be overwritten by {@link sap.ui.mdc.Field Field}, {@link sap.ui.mdc.MultiValueField MultiValueField}
	 * and {@link sap.ui.mdc.FilterField FilterField}
	 * @returns {string[]} Array of operator names
	 * @protected
	 */
	FieldBase.prototype.getSupportedOperators = function() {

		var regexp = new RegExp("^\\*(.*)\\*|\\$search$");
		var aOperators;
		if (regexp.test(this.getFieldPath()) && this.getMaxConditions() === 1) {
			// for SearchField use Contains operator
			aOperators =  ["Contains"];
		} else {
			// get default operators for type
			var sBaseType = this.getBaseType(); // TODO what if delegate not loaded

			if (sBaseType === BaseType.Unit) {
				sBaseType = BaseType.Numeric;
			}

			aOperators = FilterOperatorUtil.getOperatorsForType(sBaseType);
		}

		this.setProperty("_operators", aOperators, true);
		return aOperators;

	};

	/*
	 * checks is a operator is valid
	 *
	 */
	function _isValidOperator(sOperator) {

		var aOperators = this.getSupportedOperators();

		for (var i = 0; i < aOperators.length; i++) {
			if (sOperator === aOperators[i]) {
				return true;
			}
		}

		return false;

	}

	FieldBase.prototype._isPropertyInitial = function(sPropertyName) {

		// as bound propertys are never initial even if there is no existing binding right now check the binding too
		if (this.isBound(sPropertyName) && !this.getBinding(sPropertyName)) {
			return !Object.prototype.hasOwnProperty.call(this.mProperties, sPropertyName);
		} else {
			return this.isPropertyInitial(sPropertyName);
		}

	};

	return FieldBase;

});
