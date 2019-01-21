odoo.define('web_autocomplete_text.field', function (require) {
'use strict';

var basic_fields = require('web.basic_fields');
var concurrency = require('web.concurrency');
var core = require('web.core');
var field_registry = require('web.field_registry');

var QWeb = core.qweb;

var FieldChar = basic_fields.FieldChar;

/**
 * FieldChar extension to suggest existing values.
 */
var FieldAutocompleteText = FieldChar.extend({
    className: 'o_field_autocomplete',
    debounceSuggestions: 400,
    resetOnAnyFieldChange: true,

    events: _.extend({}, FieldChar.prototype.events, {
        'keyup': '_onKeyup',
        'mousedown .o_autocomplete_suggestion': '_onMousedown',
        'focusout': '_onFocusout',
        'mouseenter .o_autocomplete_suggestion': '_onHoverDropdown',
        'click .o_autocomplete_suggestion': '_onSuggestionClicked',
    }),

    /**
     * @constructor
     * Prepares the basic rendering of edit mode by setting the root to be a
     * div.dropdown.open.
     * @see FieldChar.init
     */
    init: function () {
        this._super.apply(this, arguments);
        if (this.mode === 'edit') {
            this.tagName = 'div';
            this.className += ' dropdown open';
        }
        if (this.debounceSuggestions > 0) {
            this._suggestValue = _.debounce(this._suggestValue.bind(this), this.debounceSuggestions);
        }
        this._DropPrevious = new concurrency.DropPrevious();
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Gets data with the given value. The fetched data is saved to
     * the "suggestions" attribute.
     *
     * @private
     * @param {string} value - the value whose associated data have to
     *                       be fetched
     * @returns {Deferred} resolved when the  data has been fetched and
     *                     saved to the "suggestions" attribute
     */
    _getMatchedValues: function (value) {
        var self = this;
        var def = $.Deferred();
        var model = self.attrs.options.model;
        self._rpc({
            model:model,
            method:'name_search',
            kwargs: {
                name: value,
                args: [],
                operator: "ilike",
                context: self.record.context,
            }
        }).then(function(suggestions){
            var matchedValues = []
            suggestions.forEach(function(value){matchedValues.push(value[1])});
            self.suggestions =matchedValues
            def.resolve();
        });
        return this._DropPrevious.add(def);
    },
    /**
     * Removes the dropdown showing the  suggestions, if any.
     *
     * @private
     */
    _removeDropdown: function () {
        if (this.$dropdown) {
            this.$dropdown.remove();
            this.$dropdown = undefined;
        }
    },
    /**
     * Adds the <input/> element and prepares it. Note: the dropdown rendering
     * is handled outside of the rendering routine (but instead by reacting to
     * user input).
     *
     * @override
     * @private
     */
    _renderEdit: function () {
        this.$el.empty();
        // Prepare and add the input
        this._prepareInput().appendTo(this.$el);
    },
    /**
     * Shows the dropdown with the current  suggestions. If one is
     * already opened, it removes the old one before rerendering the dropdown.
     *
     * @private
     */
    _showDropdown: function () {
        this._removeDropdown();
        if (this.suggestions.length > 0){
            this.$dropdown = $(QWeb.render('web_autocomplete_text.dropdown', {
                suggestions: this.suggestions,
            }));
            this.$dropdown.appendTo(this.$el);
        }
    },
    /**
     * Selects the given suggestions by notifying changes to the view
     * for the field.
     */
    _selectValue: function (value) {
        var self = this;
        var oldVal = this.$input.val().split(' ');
        oldVal = oldVal.length-1 > 0 ? oldVal.slice(0, oldVal.length -1) : '';
        oldVal = oldVal ? oldVal.join(' ') : oldVal;
        this.$input.val(this._formatValue(oldVal +' '+ value)); // update the input's value directly
        this._removeDropdown();
    },
    /**
     * Shows  suggestions according to the given value.
     * Note: this method is debounced (@see init).
     *
     * @private
     * @param {string} value - the value whose associated  data have to
     *                       be fetched
     */
        _suggestValue: function (value) {
        if (value.length > 0) {
            var valuesList = value.split(' ')
            value = valuesList[valuesList.length - 1]
            this._getMatchedValues(value).then(this._showDropdown.bind(this));
        } else {
            this._removeDropdown();
        }
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @override of FieldChar (called when the user is typing text)
     * Checks the <input/> value and shows  suggestions according to
     * this value.
     *
     * @private
     */
    _onInput: function () {
        this._super.apply(this, arguments);
        this._suggestValue(this.$input.val());
    },
    /**
     * @override of FieldChar
     * Changes the "up" and "down" key behavior when the dropdown is opened (to
     * navigate through dropdown suggestions).
     * Triggered by keydown to execute the navigation multiple times when the
     * user keeps the "down" or "up" pressed.
     *
     * @private
     * @param {Event} e
     */
    _onKeydown: function (e) {
        switch (e.which) {
            case $.ui.keyCode.UP:
            case $.ui.keyCode.DOWN:
                if (!this.$dropdown) {
                    break;
                }
                e.preventDefault();
                var $suggestions = this.$dropdown.children();
                var $active = $suggestions.filter('.active');
                var $to;
                if ($active.length) {
                    $to = e.which === $.ui.keyCode.DOWN ?
                        $active.next() :
                        $active.prev();
                } else {
                    $to = $suggestions.first();
                }
                if ($to.length) {
                    $active.removeClass('active');
                    $to.addClass('active');
                }
                return;
        }
        this._super.apply(this, arguments);
    },
    /**
     * Called on keyup events to:
     * -> remove the suggestions dropdown when hitting the "escape" key
     * -> select the highlighted suggestion when hitting the "enter" key
     *
     * @private
     * @param {Event} e
     */
    _onKeyup: function (e) {
        switch (e.which) {
            case $.ui.keyCode.ESCAPE:
                e.preventDefault();
                this._removeDropdown();
                break;
            case $.ui.keyCode.ENTER:
                if (!this.$dropdown) {
                    break;
                }
                e.preventDefault();
                var $active = this.$dropdown.find('.active > .o_autocomplete_suggestion');
                if (!$active.length) {
                    return;
                }
                this._selectValue(this.suggestions[$active.data('index')]);
                break;
        }
    },
    /**
     * Called on mousedown event on a  suggestion -> prevent default
     * action so that the <input/> element does not lose the focus.
     *
     * @private
     * @param {Event} e
     */
    _onMousedown: function (e) {
        e.preventDefault(); // prevent losing focus on suggestion click
    },
    /**
     * Called on focusout -> removes the suggestions dropdown.
     *
     * @private
     */
    _onFocusout: function () {
        this._removeDropdown();
    },
    /**
     * Called when hovering a suggestion in the dropdown -> sets it as active.
     *
     * @private
     * @param {Event} e
     */
    _onHoverDropdown: function (e) {
        this.$dropdown.find('.active').removeClass('active');
        $(e.currentTarget).parent().addClass('active');
    },
    /**
     * Called when a dropdown suggestion is clicked -> trigger_up changes for
     * some fields in the view (not only this <input/> one) with the associated
     *  data (@see _selectValue).
     *
     * @private
     * @param {Event} e
     */
    _onSuggestionClicked: function (e) {
        e.preventDefault();
        this._selectValue(this.suggestions[$(e.currentTarget).data('index')]);
    },
});

field_registry.add('field_autocomplete_text', FieldAutocompleteText);

return FieldAutocompleteText;
});
