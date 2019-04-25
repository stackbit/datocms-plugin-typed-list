function deserializeValue(value) {
    if (!value) {
        return [];
    }
    return JSON.parse(value);
}

function getFieldValue(plugin) {
    const fieldValue = plugin.getFieldValue(plugin.fieldPath);
    return deserializeValue(fieldValue);
}

function setFieldValue(plugin, value) {
    return plugin.setFieldValue(plugin.fieldPath, JSON.stringify(value));
}

function getFieldType(plugin) {
    let type = _.get(plugin, 'parameters.type');
    if (!_.includes(['string', 'number'], type)) {
        console.error('illegal type "' + type + '" for datocms-plugin-typed-list')
        return 'string';
    }
    return type;
}

function getOptions(plugin) {
    let type = getFieldType(plugin);
    if (type === 'string') {
        let options = _.get(plugin, 'parameters.options', '');
        let optionsArr = _.chain(options).split(',').map(option => _.trim(option)).compact().value();
        return _.isEmpty(optionsArr) ? null : optionsArr;
    } else {
        return null;
    }
}

function showSelect(options, inputElm, selectElm, selectWrapperElm) {
    inputElm.style.display = 'none';
    selectWrapperElm.style.display = '';
    _.forEach([''].concat(options), option => {
        let optionElm = document.createElement('option');
        optionElm.name = option;
        optionElm.appendChild(document.createTextNode(option));
        selectElm.appendChild(optionElm);
    });
}

function resetList(list, listElm, plugin) {
    while (listElm.firstChild) {
        listElm.removeChild(listElm.firstChild);
    }
    _.forEach(list, item => {
        listElm.appendChild(createListItem(item, listElm, list, plugin));
    });
    listElm.style.display = '';
}

function createListItem(value, listElm, list, plugin) {
    let liElm = document.createElement('li');
    let buttonElm = document.createElement('span');
    let removeIcon = document.createElement('i');
    let span = document.createElement('span');
    let textNode = document.createTextNode(value);
    span.className = 'item-value';
    buttonElm.className = 'remove-button';
    removeIcon.className = 'fas fa-times fa-lg';
    buttonElm.appendChild(removeIcon);
    span.appendChild(textNode);
    liElm.appendChild(span);
    liElm.appendChild(buttonElm);

    buttonElm.addEventListener('click', function() {
        removeItem(liElm, listElm, list, plugin);
    });

    return liElm;
}

function addItem(inputElm, list, listElm, plugin, type, options) {
    let value = inputElm.value;
    if (value !== '') {
        if (type === 'string') {
            if (_.isEmpty(options) || _.includes(options, value)) {
                inputElm.value = '';
                list.push(value);
                listElm.appendChild(createListItem(value, listElm, list, plugin));
                listElm.style.display = '';
                setFieldValue(plugin, list);
            }
        } else if (type === 'number') {
            let number = _.toNumber(value);
            if (_.isNumber(number)) {
                inputElm.value = '';
                list.push(number);
                listElm.appendChild(createListItem(value, listElm, list, plugin));
                listElm.style.display = '';
                setFieldValue(plugin, list);
            }
        }
    }
}

function removeItem(liElm, listElm, list, plugin) {
    let index = _.indexOf(listElm.childNodes, liElm);
    _.pullAt(list, [index]);
    listElm.removeChild(liElm);
    setFieldValue(plugin, list);
    if (listElm.childNodes.length === 0) {
        listElm.style.display = 'none';
    }
}

function init(plugin) {

    plugin.startAutoResizer();

    let type = getFieldType(plugin);
    let options = getOptions(plugin);
    let list = getFieldValue(plugin);
    let inputElm = document.getElementById('itemInput');
    let selectElm = document.getElementById('optionSelect');
    let selectWrapperElm = document.getElementById('selectWrapper');
    let listElm = document.getElementById('list');
    let addItemButtonElm = document.getElementById('addItemButton');

    if (!_.isEmpty(options)) {
        showSelect(options, inputElm, selectElm, selectWrapperElm);
    }
    resetList(list, listElm, plugin);

    if (type === 'number') {
        inputElm.type = 'number';
    }

    plugin.addFieldChangeListener(plugin.fieldPath, function(newValue) {
        list = deserializeValue(newValue);
        resetList(list, listElm, plugin);
    });

    addItemButtonElm.addEventListener('click', function() {
        let formElement = _.isEmpty(options) ? inputElm : selectElm;
        addItem(formElement, list, listElm, plugin, type, options);
    });

    inputElm.addEventListener("keyup", function(event) {
        if ((event.keyCode === 13 || event.key === 'Enter')) {
            addItem(inputElm, list, listElm, plugin, type, options);
        }
    });
}

if (_.isUndefined(DatoCmsPlugin)) {
    DatoCmsPlugin.init(init);
} else {
    init({
        startAutoResizer: () => {},
        addFieldChangeListener: () => {},
        getFieldValue: () => JSON.stringify(["foo", "bar"]),
        setFieldValue: () => {},
        fieldPath: null,
        parameters: {
            type: 'string',
        }
    });
}
