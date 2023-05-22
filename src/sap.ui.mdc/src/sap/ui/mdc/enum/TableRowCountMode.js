/*!
 * ${copyright}
 */

sap.ui.define(function() {
    "use strict";

    /**
     *
     * Defines the row count mode of the GridTable.
     *
     * @enum {string}
     * @alias sap.ui.mdc.enum.TableRowCountMode
     * @since 1.115
     * @private
     * @ui5-restricted sap.ui.mdc
     * @MDC_PUBLIC_CANDIDATE
     */
    var TableRowCountMode = {
        /**
         * The table automatically fills the height of the surrounding container.
         *
         * @public
         */
        Auto: "Auto",
        /**
         * The table always has as many rows as defined in the <code>rowCount</code> property of <code>GridTableType</code>.
         *
         * @public
         */
        Fixed: "Fixed"
    };

    return TableRowCountMode;

}, /* bExport= */ true);