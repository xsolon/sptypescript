///<reference path="../Definitions/SharePoint.d.ts" />
///<reference path="../extensions/typescripttemplates.ts" />

module _ {
    function init() {
        CSR.override(10003)
            .fieldNew("Master", SPFieldLookup_Search_Edit)
            .fieldEdit("Master", SPFieldLookup_Search_Edit)
            .register();
    }

    SP.SOD.executeOrDelayUntilScriptLoaded(init, "typescripttemplates.ts");

    SP.SOD.executeOrDelayUntilScriptLoaded(function () {
        RegisterModuleInit(SPClientTemplates.Utility.ReplaceUrlTokens("~site/Sample_FieldLookupBySearch/FieldLookupSearch.js"), init);
    }, "sp.js");


    function SPFieldLookup_Search_Edit(rCtx: SPClientTemplates.RenderContext_FieldInForm) {
        if (rCtx == null)
            return '';
        var _myData = SPClientTemplates.Utility.GetFormContextForCurrentField(rCtx);

        if (_myData == null || _myData.fieldSchema == null)
            return '';
        var _schema = <SPClientTemplates.FieldSchema_InForm_Lookup>_myData.fieldSchema;
        var _autoFillControl: SPClientAutoFill;
        var _textInputElt: HTMLInputElement;
        var _textInputId = _myData.fieldName + '_' + _myData.fieldSchema.Id + '_$TextField';
        var _autofillContainerId = _myData.fieldName + '_' + _myData.fieldSchema.Id + '_$AutoFill';
        var _valueStr = _myData.fieldValue != null ? _myData.fieldValue : '';
        var _selectedValue = SPClientTemplates.Utility.ParseLookupValue(_valueStr);
        var _noValueSelected = _selectedValue.LookupId == 0;

        if (_noValueSelected)
            _valueStr = '';

        _myData.registerInitCallback(_myData.fieldName, InitLookupControl);
        _myData.registerFocusCallback(_myData.fieldName, function () {
            if (_textInputElt != null)
                _textInputElt.focus();
        });
        _myData.registerValidationErrorCallback(_myData.fieldName, function (errorResult) {
            SPFormControl_AppendValidationErrorMessage(_textInputId, errorResult);
        });
        _myData.registerGetValueCallback(_myData.fieldName, GetCurrentLookupValue);
        _myData.updateControlValue(_myData.fieldName, _valueStr);
        return BuildLookupDropdownControl();
        function InitLookupControl() {
            _textInputElt = <HTMLInputElement>document.getElementById(_textInputId);
            SP.SOD.executeFunc("autofill.js", null, () => {
                _autoFillControl = new SPClientAutoFill(_textInputId, _autofillContainerId, OnPopulate);
                _autoFillControl.AutoFillMinTextLength = 2;
                _autoFillControl.VisibleItemCount = 15;
                _autoFillControl.AutoFillTimeout = 500;
            });

        }
        function OnPopulate(targetElement: HTMLInputElement) {
            var value = targetElement.value;
            _autoFillControl.PopulateAutoFill([_buildLoadingItem('Please wait...')], OnSelectItem);

            SP.SOD.executeFunc("sp.search.js", null, () => {
                var Search = Microsoft.SharePoint.Client.Search.Query;
                var ctx = SP.ClientContext.get_current();
                var query = new Search.KeywordQuery(ctx);
                query.set_rowLimit(15);
                query.set_queryText('contentclass:STS_ListItem ListID:{' + _schema.LookupListId + '} ' + value);
                var selectProps = query.get_selectProperties();
                selectProps.clear();
                selectProps.add('Title');
                selectProps.add('ListItemId');
                var executor = new Search.SearchExecutor(ctx);
                var result = executor.executeQuery(query);
                ctx.executeQueryAsync(
                    () => {
                        //TODO: Discover proper way to load collection
                        var tableCollection = new Search.ResultTableCollection();
                        tableCollection.initPropertiesFromJson(result.get_value());

                        var relevantResults = tableCollection.get_item(0);
                        var rows = relevantResults.get_resultRows();

                        var items = [];
                        for (var i = 0; i < rows.length; i++) {
                            items.push(_buildOptionItem(rows[i]["Title"], parseInt(rows[i]["ListItemId"], 10)));
                        }

                        items.push(_buildSeparatorItem());

                        if (relevantResults.get_totalRows() == 0)
                            items.push(_buildFooterItem("No results. Please refine your query."));
                        else
                            items.push(_buildFooterItem("Showing " + rows.length + " of" + relevantResults.get_totalRows() + " items!"));
                        
                        _autoFillControl.PopulateAutoFill(items, OnSelectItem);

                    },
                    (sender, args) => { alert(args.get_message()); }
                    );
            });


        }
        function _buildFooterItem(title: string) {

            var item = {};

            item[SPClientAutoFill.DisplayTextProperty] = title;
            item[SPClientAutoFill.MenuOptionTypeProperty] = SPClientAutoFill.MenuOptionType.Footer;

            return item;
        }
        function _buildOptionItem(name: string, id: number) {

            var item = {};

            item[SPClientAutoFill.KeyProperty] = id;
            item[SPClientAutoFill.DisplayTextProperty] = name;
            item[SPClientAutoFill.TitleTextProperty] = name;
            item[SPClientAutoFill.MenuOptionTypeProperty] = SPClientAutoFill.MenuOptionType.Option;

            return item;
        }
        
        function _buildSeparatorItem() {

            var item = {};

            item[SPClientAutoFill.MenuOptionTypeProperty] = SPClientAutoFill.MenuOptionType.Separator;

            return item;
        }

        function _buildLoadingItem(title:string) {

            var item = {};

            item[SPClientAutoFill.MenuOptionTypeProperty] = SPClientAutoFill.MenuOptionType.Loading;
            item[SPClientAutoFill.DisplayTextProperty] = title;
            return item;
        }
        
        function OnSelectItem(targetInputId, item: ISPClientAutoFillData) {
            var targetElement = <HTMLInputElement>document.getElementById(targetInputId);
            targetElement.value = item[SPClientAutoFill.DisplayTextProperty];
            _selectedValue.LookupId = item[SPClientAutoFill.KeyProperty];
            _selectedValue.LookupValue = item[SPClientAutoFill.DisplayTextProperty];
            OnLookupValueChanged();
        }
        function OnLookupValueChanged() {
            _myData.updateControlValue(_myData.fieldName, GetCurrentLookupValue());
        }
        function GetCurrentLookupValue() {
            return _selectedValue.LookupId == 0 || _selectedValue.LookupValue == '' ? '' : _selectedValue.LookupId + ';#' + _selectedValue.LookupValue;
        }
        function BuildLookupDropdownControl() {
            var result: string[] = [];
            result.push('<span dir="' + STSHtmlEncode(_myData.fieldSchema.Direction) + '">');
            result.push('<input type="text" id="' + STSHtmlEncode(_textInputId) + '" value="' + STSHtmlEncode(_selectedValue.LookupValue) + '" title="' + STSHtmlEncode(_myData.fieldSchema.Title) + '"/>');
            result.push('<br/>');

            //result += '<select id="' + STSHtmlEncode(_dropdownId) + '" title="' + STSHtmlEncode(_myData.fieldSchema.Title) + '">';
            //if (!_myData.fieldSchema.Required && _optionsArray.length > 0) {
            //    var noneOptSelectedStr = _noValueSelected ? 'selected="selected" ' : '';

            //    result += '<option ' + noneOptSelectedStr + 'value="0">' + STSHtmlEncode(<any>Strings.STS.L_LookupFieldNoneOption) + '</option>';
            //}
            //for (var choiceIdx = 0; choiceIdx < _optionsArray.length; choiceIdx++) {
            //    _optionsDictionary[_optionsArray[choiceIdx].LookupId] = _optionsArray[choiceIdx].LookupValue;
            //    var curValueSelected = !_noValueSelected && _selectedValue.LookupId == _optionsArray[choiceIdx].LookupId;
            //    var curValueSelectedStr = curValueSelected ? 'selected="selected" ' : '';

            //    result += '<option ' + curValueSelectedStr + 'value="' + STSHtmlEncode(_optionsArray[choiceIdx].LookupId) + '">';
            //    result += STSHtmlEncode(_optionsArray[choiceIdx].LookupValue) + '</option>';
            //}
            //result += '</select><br/></span>';
            result.push("</span>");
            result.push("<div class='sp-peoplepicker-autoFillContainer' id='" + STSHtmlEncode(_autofillContainerId) + "'></div>");

            return result.join("");
        }
    }
}