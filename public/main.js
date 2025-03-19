function deserializeValue(value) {
    if (!value) {
        return [];
    }
    return JSON.parse(value);
}

function getFieldValue(plugin) {
    var fieldValue = plugin.getFieldValue(plugin.fieldPath);
    return deserializeValue(fieldValue);
}

function setFieldValue(plugin, value) {
    return plugin.setFieldValue(plugin.fieldPath, JSON.stringify(value));
}

function getFieldType(plugin) {
    var type = _.get(plugin, 'parameters.instance.type', 'string');
    if (!_.includes(['string', 'number'], type)) {
        console.error('illegal type "' + type + '" for datocms-plugin-typed-list');
        return 'string';
    }
    return type;
}

function getOptions(plugin) {
    var type = getFieldType(plugin);
    if (type === 'string') {
        var options = _.get(plugin, 'parameters.instance.options', '');
        var optionsArr = _.chain(options).split(',').map(option => _.trim(option)).compact().value();
        return _.isEmpty(optionsArr) ? null : optionsArr;
    } else {
        return null;
    }
}

function showSelect(options, inputElm, selectElm, selectWrapperElm) {
    inputElm.style.display = 'none';
    selectWrapperElm.style.display = '';
    _.forEach([''].concat(options), option => {
        var optionElm = document.createElement('option');
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
        var liElm = createListItem(item, listElm, list, plugin);
        listElm.appendChild(liElm);
    });
    if (_.isEmpty(list)) {
        listElm.style.display = 'none';
    } else {
        listElm.style.display = '';
    }
}

function createListEditControls(liElm, span, value, plugin) {
    var editControls = document.createElement('div');
    var editInput = document.createElement('input');
    var editButton = document.createElement('span');
    var editButtonIcon = document.createElement('i');

    editControls.style.display = 'none';
    editControls.className = 'edit-controls';
    editButtonIcon.className = 'fas fa-check';
    editInput.className = 'edit-input';
    editButton.className = 'edit-button';

    editControls.appendChild(editInput);
    editControls.appendChild(editButton);
    editButton.appendChild(editButtonIcon);

    span.addEventListener('click', function() {
        editInput.style.height = span.parentElement.clientHeight + 'px';
        span.style.display = 'none';
        editControls.style.display = 'block';
        editInput.value = value;
        editInput.focus();
    });

    var commitEdit = function() {
        var value = editInput.value.trim();
        if (value) {
            var list = getFieldValue(plugin);
            editItem(liElm, liElm.parentElement, list, value, plugin);
        }
        editControls.style.display = 'none';
        span.style.display = 'block';
    };

    editButton.addEventListener('click', commitEdit);

    editInput.addEventListener("keyup", function(event) {
        if ((event.keyCode === 13 || event.key === 'Enter')) {
            commitEdit();
        }
        if ((event.keyCode === 27 || event.key === 'Escape')) {
            editControls.style.display = 'none';
            span.style.display = 'block';
        }
    });

    return editControls;
}

function createListItem(value, listElm, list, plugin) {
    var liElm = document.createElement('li');
    var buttonElm = document.createElement('span');
    var removeIcon = document.createElement('img');
    var dragContainer = document.createElement('span');
    var dragIcon = document.createElement('img');
    var span = document.createElement('span');
    var textNode = document.createTextNode(value);
    var editControls = createListEditControls(liElm, span, value, plugin);

    var iconSize = 24;
    span.className = 'item-value';
    buttonElm.className = 'remove-button';
    removeIcon.className = 'remove-icon';
    removeIcon.src = "xmark-solid.svg";
    removeIcon.width = iconSize;
    removeIcon.height = iconSize;
    dragContainer.className = 'drag-handle';
    dragIcon.className = 'drag-icon';
    dragIcon.src = "grip-lines-solid.svg";
    dragIcon.width = iconSize;
    dragIcon.height = iconSize;
    dragContainer.appendChild(dragIcon);
    buttonElm.appendChild(removeIcon);
    span.appendChild(textNode);

    liElm.setAttribute('draggable', 'true');
    liElm.appendChild(dragContainer);
    liElm.appendChild(span);
    liElm.append(editControls);
    liElm.appendChild(buttonElm);

    buttonElm.addEventListener('click', function() {
        removeItem(liElm, listElm, list, plugin);
    });

    return liElm;
}

function addItem(inputElm, list, listElm, plugin, type, options) {
    var value = inputElm.value;
    if (value !== '') {
        if (type === 'string') {
            if (_.isEmpty(options) || _.includes(options, value)) {
                inputElm.value = '';
                list.push(value);
                setFieldValue(plugin, list);
            }
        } else if (type === 'number') {
            var number = _.toNumber(value);
            if (_.isNumber(number)) {
                inputElm.value = '';
                list.push(number);
                setFieldValue(plugin, list);
            }
        }
    }
}

function removeItem(liElm, listElm, list, plugin) {
    var index = _.indexOf(listElm.childNodes, liElm);
    _.pullAt(list, [index]);
    setFieldValue(plugin, list);
}

function editItem(liElm, listElm, list, value, plugin) {
    var index = _.indexOf(listElm.childNodes, liElm);
    list[index] = value;
    setFieldValue(plugin, list);
}

function parentElement(el, sel) {
    do {
        if (el.matches(sel)) {
            return el;
        }
    } while (el = el.parentElement);
    return null;
}

function initReorder(listElm, plugin) {
    listElm.addEventListener('dragstart', handleDrag);
    listElm.addEventListener('dragover', handleDrag);
    listElm.addEventListener('dragenter', handleDrag);
    listElm.addEventListener('dragend', handleDrag);

    var currentDraggedEl = null;
    var currentDraggedElIndex = null;

    function handleDrag(e) {
        var target = parentElement(e.target, 'li');

        switch (e.type) {
            case 'dragstart':
                currentDraggedEl = target;
                currentDraggedEl.parentElement.classList.add('is-dragging');
                currentDraggedElIndex = _.indexOf(currentDraggedEl.parentElement.childNodes, currentDraggedEl);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', currentDraggedEl.textContent);
                setTimeout(function() {
                    currentDraggedEl.classList.add('moving');
                });
                break;

            case 'dragover':
                if (e.preventDefault) {
                    e.preventDefault();
                }
                e.dataTransfer.dropEffect = 'move';
                return false;

            case 'dragenter':
                if (!currentDraggedEl) {
                    return;
                }
                if (target && target !== currentDraggedEl) {
                    var children = [].slice.call(target.parentElement.children);
                    var isToBottom = children.indexOf(currentDraggedEl) < children.indexOf(target);

                    currentDraggedEl.parentElement.removeChild(currentDraggedEl);
                    target.parentElement.insertBefore(currentDraggedEl, isToBottom ? target.nextSibling : (target.previousSibling || target));
                }
                break;

            case 'dragend':
                currentDraggedEl.classList.remove('moving');
                currentDraggedEl.parentElement.classList.remove('is-dragging');

                var list = getFieldValue(plugin);
                var newIndex = _.indexOf(currentDraggedEl.parentElement.childNodes, currentDraggedEl);
                var el = list[currentDraggedElIndex];

                list.splice(currentDraggedElIndex, 1);
                list.splice(newIndex, 0, el);

                setFieldValue(plugin, list);

                currentDraggedEl = null;
                break;
        }
    }
}

function init(plugin) {

    plugin.startAutoResizer();

    var type = getFieldType(plugin);
    var options = getOptions(plugin);
    var list = getFieldValue(plugin);
    var inputElm = document.getElementById('itemInput');
    var selectElm = document.getElementById('optionSelect');
    var selectWrapperElm = document.getElementById('selectWrapper');
    var listElm = document.getElementById('list');
    var addItemButtonElm = document.getElementById('addItemButton');

    if (!_.isEmpty(options)) {
        showSelect(options, inputElm, selectElm, selectWrapperElm);
    }

    resetList(list, listElm, plugin);
    initReorder(listElm, plugin);

    if (type === 'number') {
        inputElm.type = 'number';
    }

    plugin.addFieldChangeListener(plugin.fieldPath, function(newValue) {
        list = deserializeValue(newValue);
        resetList(list, listElm, plugin);
    });

    addItemButtonElm.addEventListener('click', function() {
        var formElement = _.isEmpty(options) ? inputElm : selectElm;
        addItem(formElement, list, listElm, plugin, type, options);
    });

    inputElm.addEventListener("keyup", function(event) {
        if ((event.keyCode === 13 || event.key === 'Enter')) {
            addItem(inputElm, list, listElm, plugin, type, options);
        }
    });
}

if (!_.isUndefined(DatoCmsPlugin) && window.parent !== window) {
    DatoCmsPlugin.init(init);
} else {
    var list = JSON.stringify(["foo", "bar"]);
    init({
        callbacks: {},
        startAutoResizer: () => {},
        addFieldChangeListener: function(fieldPath, callback) {
            this.callbacks[fieldPath] = callback;
        },
        getFieldValue: () => list,
        setFieldValue: function(fieldPath, value) {
            list = value;
            _.invoke(this.callbacks, fieldPath, [value]);
        },
        fieldPath: 'some_field',
        parameters: {
            instance: {
                type: 'string'
            }
        }
    });
}
