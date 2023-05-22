/*!
 * ${copyright}
 */

sap.ui.define(function() {
    "use strict";

    /**
     *
     * Defines the personalization mode of the filter bar.
     *
     * @enum {string}
     * @alias sap.ui.mdc.enum.FilterBarP13nMode
     * @since 1.115
     * @private
     * @MDC_PUBLIC_CANDIDATE
     * @ui5-restricted sap.ui.mdc, sap.fe
     */
    var FilterBarP13nMode = {
        /**
         * Filter item personalization is enabled.
         *
         * @public
         */
        Item: "Item",
        /**
         * Condition personalization is enabled.
         *
         * @public
         */
        Value: "Value"
    };

    return FilterBarP13nMode;

}, /* bExport= */ true);