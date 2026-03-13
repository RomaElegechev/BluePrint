let variables = {};
let arrays = {};
let output = [];
let errors = [];
let blocks = [];
let connections = [];
let drawingLine = null;
let selectedPort = null;
let dragTimeout = null;

const blockPortsConfig = {
    'var-declare':  { inputs: 0, outputs: 1 },
    'var-assign':   { inputs: 1, outputs: 0 },
    'var-get':      { inputs: 0, outputs: 1 },
    'math-add':     { inputs: 2, outputs: 1 },
    'math-sub':     { inputs: 2, outputs: 1 },
    'math-mul':     { inputs: 2, outputs: 1 },
    'math-div':     { inputs: 2, outputs: 1 },
    'math-mod':     { inputs: 2, outputs: 1 },
    'compare-eq':   { inputs: 2, outputs: 1 },
    'compare-neq':  { inputs: 2, outputs: 1 },
    'compare-gt':   { inputs: 2, outputs: 1 },
    'compare-lt':   { inputs: 2, outputs: 1 },
    'compare-ge':   { inputs: 2, outputs: 1 },
    'compare-le':   { inputs: 2, outputs: 1 },
    'logic-and':    { inputs: 2, outputs: 1 },
    'logic-or':     { inputs: 2, outputs: 1 },
    'logic-not':    { inputs: 1, outputs: 1 },
    'array-declare': { inputs: 0, outputs: 1 },
    'array-get':     { inputs: 1, outputs: 1 },
    'array-set':     { inputs: 2, outputs: 0 },
    'control-if':    { inputs: 1, outputs: 0 },
    'control-while': { inputs: 1, outputs: 0 },
    'control-begin': { inputs: 0, outputs: 0 },
    'print':         { inputs: 1, outputs: 0 },
    'constant':      { inputs: 0, outputs: 1 },
    'string-length': { inputs: 1, outputs: 1 },
    'string-concat': { inputs: 2, outputs: 1 },
    'string-substring': { inputs: 3, outputs: 1 },
    'to-string':     { inputs: 1, outputs: 1 },
    'to-number':     { inputs: 1, outputs: 1 },
    'char-code':     { inputs: 1, outputs: 1 },
    'from-char-code': { inputs: 1, outputs: 1 }
};

document.addEventListener('DOMContentLoaded', function() {
    const items = document.querySelectorAll('.node-item');
    items.forEach(item => {
        item.addEventListener('dragstart', function(event) {
            event.dataTransfer.setData('text/plain', this.dataset.nodeType);
            this.style.opacity = '0.5';
        });
        item.addEventListener('dragend', function(event) {
            this.style.opacity = '1';
        });
    });

    const workspace = document.getElementById('workspace');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'connections-svg');
    svg.classList.add('connections-svg');
    workspace.appendChild(svg);

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.getElementById(tabId + 'Tab').classList.add('active');
        });
    });
});

function allowDrop(event) {
    event.preventDefault();
    document.getElementById('workspace').classList.add('drag-over');
}

function drop(event) {
    event.preventDefault();
    const workspace = document.getElementById('workspace');
    workspace.classList.remove('drag-over');
    
    const nodeType = event.dataTransfer.getData('text/plain');
    if (!nodeType) return;
    
    const target = event.target.closest('.then-blocks, .else-blocks, .begin-blocks, .body-blocks');
    
    if (target) {
        const containerRect = target.getBoundingClientRect();
        const x = event.clientX - containerRect.left;
        const y = event.clientY - containerRect.top;
        createBlock(nodeType, x, y, target.id);
    } else {
        const rect = workspace.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        createBlock(nodeType, x, y);
    }
}

function createBlock(type, x, y, containerId = null) {
    const workspace = document.getElementById('workspace');
    const blockId = 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const placeholder = workspace.querySelector('.workspace-placeholder');
    if (placeholder) placeholder.remove();

    let parentId = null;
    let containerType = null;
    if (containerId) {
        if (containerId.startsWith('then_')) {
            parentId = containerId.substring(5);
            containerType = 'then';
        } else if (containerId.startsWith('else_')) {
            parentId = containerId.substring(5);
            containerType = 'else';
        } else if (containerId.startsWith('body_')) {
            parentId = containerId.substring(5);
            containerType = 'body';
        }
    }

    const block = document.createElement('div');
    block.className = 'workspace-block';
    block.id = blockId;
    block.style.position = containerId ? 'relative' : 'absolute';
    block.style.left = x + 'px';
    block.style.top = y + 'px';

    let title = '';
    let content = '';

    switch (type) {
        case 'var-declare':
            title = 'Объявить переменные';
            content = `
                <select onchange="updateBlockData('${blockId}', 'type', this.value)">
                    <option value="int">int</option>
                    <option value="float">float</option>
                    <option value="string">string</option>
                    <option value="char">char</option>
                </select>
                <input type="text" value="x, y" placeholder="имена через запятую" onchange="updateBlockData('${blockId}', 'names', this.value)">
            `;
            break;
        case 'var-assign':
            title = 'Присвоить';
            content = '<input type="text" value="x" placeholder="переменная" style="width:80px" onchange="updateBlockData(\'' + blockId + '\', \'var\', this.value)"> = ⬅️';
            break;
        case 'var-get':
            title = 'Переменная';
            content = '<input type="text" value="x" placeholder="имя" style="width:80px" onchange="updateBlockData(\'' + blockId + '\', \'var\', this.value)"> ➔';
            break;
        case 'math-add':
            title = '➕ Сложение / Конкатенация';
            content = '';
            break;
        case 'math-sub':
            title = '➖ Вычитание';
            content = '';
            break;
        case 'math-mul':
            title = '✖️ Умножение';
            content = '';
            break;
        case 'math-div':
            title = '➗ Деление (вещественное)';
            content = '';
            break;
        case 'math-mod':
            title = '🔄 Остаток от деления';
            content = '';
            break;
        case 'compare-eq':
            title = '⚖️ Равно (==)';
            content = '';
            break;
        case 'compare-neq':
            title = '⚖️ Не равно (!=)';
            content = '';
            break;
        case 'compare-gt':
            title = '⚖️ Больше (>)';
            content = '';
            break;
        case 'compare-lt':
            title = '⚖️ Меньше (<)';
            content = '';
            break;
        case 'compare-ge':
            title = '⚖️ Больше или равно (>=)';
            content = '';
            break;
        case 'compare-le':
            title = '⚖️ Меньше или равно (<=)';
            content = '';
            break;
        case 'logic-and':
            title = 'AND';
            content = '';
            break;
        case 'logic-or':
            title = 'OR';
            content = '';
            break;
        case 'logic-not':
            title = 'NOT';
            content = '';
            break;
        case 'array-declare':
            title = 'Создать массив';
            content = `
                <select onchange="updateBlockData('${blockId}', 'type', this.value)">
                    <option value="int">int</option>
                    <option value="float">float</option>
                    <option value="string">string</option>
                </select>
                <input type="text" value="arr" placeholder="имя" style="width:60px" onchange="updateBlockData('${blockId}', 'name', this.value)">
                [ <input type="number" value="5" placeholder="размер" style="width:50px" onchange="updateBlockData('${blockId}', 'size', this.value)"> ]
            `;
            break;
        case 'array-get':
            title = 'Элемент массива';
            content = '<input type="text" value="arr" placeholder="имя" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'name\', this.value)"> [ ⬅️индекс ] ➔';
            break;
        case 'array-set':
            title = 'Присвоить элементу';
            content = '<input type="text" value="arr" placeholder="имя" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'name\', this.value)"> [ ⬅️индекс ] = ⬅️значение';
            break;
        case 'control-if':
            title = 'Если (If)';
            content = `
                <div class="if-condition">
                    ⬅️ <input type="text" value="1" placeholder="условие" style="width:100px" onchange="updateBlockData('${blockId}', 'condition', this.value)">
                </div>
                <div class="if-then">
                    <div class="then-label">Тогда:</div>
                    <div class="then-blocks" id="then_${blockId}"></div>
                </div>
                <div class="if-else">
                    <div class="else-label">Иначе:</div>
                    <div class="else-blocks" id="else_${blockId}"></div>
                </div>
            `;
            break;
        case 'control-while':
            title = 'Пока (While)';
            content = `
                <div class="while-condition">
                    ⬅️ <input type="text" value="1" placeholder="условие" style="width:100px" onchange="updateBlockData('${blockId}', 'condition', this.value)">
                </div>
                <div class="while-body">
                    <div class="body-label">Тело:</div>
                    <div class="body-blocks" id="body_${blockId}"></div>
                </div>
            `;
            break;
        case 'control-begin':
            title = 'Begin-End';
            content = `
                <div class="begin-blocks" id="body_${blockId}">
                    <div style="color:#999; text-align:center; padding:10px;">Перетащите блоки сюда</div>
                </div>
            `;
            break;
        case 'print':
            title = 'Вывести';
            content = '⬅️ значение';
            break;
        case 'constant':
            title = 'Константа';
            content = `
                <select onchange="updateBlockData('${blockId}', 'type', this.value)">
                    <option value="int">int</option>
                    <option value="float">float</option>
                    <option value="string">string</option>
                </select>
                <input type="number" value="0" placeholder="значение" onchange="updateBlockData('${blockId}', 'value', this.value)">
                ➔
            `;
            break;
        case 'string-length':
            title = 'Длина строки';
            content = '⬅️ строка ➔';
            break;
        case 'string-concat':
            title = 'Конкатенация';
            content = '⬅️ стр1 + стр2 ➔';
            break;
        case 'string-substring':
            title = 'Подстрока';
            content = '⬅️ строка | start | length ➔';
            break;
        case 'to-string':
            title = 'В строку';
            content = '⬅️ значение ➔';
            break;
        case 'to-number':
            title = 'В число';
            content = '⬅️ строка ➔';
            break;
        case 'char-code':
            title = 'Код символа';
            content = '⬅️ символ ➔';
            break;
        case 'from-char-code':
            title = 'Символ из кода';
            content = '⬅️ код ➔';
            break;
        default:
            title = type;
            content = '';
    }

    block.innerHTML = `
        <div class="block-header" onmousedown="startDragBlock('${blockId}', event)">
            <span>${title}</span>
            <button class="delete-btn" onclick="deleteBlock('${blockId}')">✕</button>
        </div>
        <div class="block-content">
            ${content}
        </div>
    `;

    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.appendChild(block);
            const placeholderInside = container.querySelector('div[style*="color:#999"]');
            if (placeholderInside) placeholderInside.remove();
        } else {
            workspace.appendChild(block);
        }
    } else {
        workspace.appendChild(block);
    }

    addPortsToBlock(block, type);

    const blockData = {
        id: blockId,
        type: type,
        data: {},
        value: undefined,
        executed: false,
        parentId: parentId,
        thenChildren: [],
        elseChildren: [],
        bodyChildren: []
    };
    blocks.push(blockData);

    if (parentId) {
        const parent = blocks.find(b => b.id === parentId);
        if (parent) {
            if (containerType === 'then') parent.thenChildren.push(blockId);
            else if (containerType === 'else') parent.elseChildren.push(blockId);
            else if (containerType === 'body') parent.bodyChildren.push(blockId);
        }
    }

    updateUI();
}

function addPortsToBlock(block, type) {
    const config = blockPortsConfig[type] || { inputs: 1, outputs: 1 };
    const portsContainer = document.createElement('div');
    portsContainer.className = 'block-ports';

    for (let i = 0; i < config.inputs; i++) {
        const port = document.createElement('div');
        port.className = `port port-input port-left`;
        port.setAttribute('data-block-id', block.id);
        port.setAttribute('data-port-type', 'input');
        port.setAttribute('data-port-index', i);
        const topPercent = (i + 0.5) / config.inputs * 100;
        port.style.top = topPercent + '%';
        let label = 'Вход ' + (i+1);
        if (type.startsWith('math') || type.startsWith('compare') || type.startsWith('logic')) {
            label = i === 0 ? 'Левый операнд' : 'Правый операнд';
        } else if (type === 'var-assign' && i === 0) label = 'Значение';
        else if (type === 'array-get' && i === 0) label = 'Индекс';
        else if (type === 'array-set') {
            if (i === 0) label = 'Индекс';
            else if (i === 1) label = 'Значение';
        } else if (type === 'control-if' || type === 'control-while') label = 'Условие';
        else if (type === 'print') label = 'Значение';
        else if (type === 'string-length' && i === 0) label = 'Строка';
        else if (type === 'string-concat') {
            if (i === 0) label = 'Строка 1';
            else if (i === 1) label = 'Строка 2';
        } else if (type === 'string-substring') {
            if (i === 0) label = 'Строка';
            else if (i === 1) label = 'Начало';
            else if (i === 2) label = 'Длина';
        } else if (type === 'to-string' || type === 'to-number' || type === 'char-code' || type === 'from-char-code') {
            label = i === 0 ? 'Вход' : 'Вход ' + (i+1);
        }
        port.title = label;
        port.addEventListener('mousedown', onPortMouseDown);
        portsContainer.appendChild(port);
    }

    for (let i = 0; i < config.outputs; i++) {
        const port = document.createElement('div');
        port.className = `port port-output port-right`;
        port.setAttribute('data-block-id', block.id);
        port.setAttribute('data-port-type', 'output');
        port.setAttribute('data-port-index', i);
        const topPercent = (i + 0.5) / config.outputs * 100;
        port.style.top = topPercent + '%';
        let label = 'Выход';
        if (type === 'var-get') label = 'Значение переменной';
        else if (type === 'math-add') label = 'Сумма / Конкатенация';
        else if (type === 'math-sub') label = 'Разность';
        else if (type === 'math-mul') label = 'Произведение';
        else if (type === 'math-div') label = 'Частное';
        else if (type === 'math-mod') label = 'Остаток';
        else if (type.startsWith('compare')) label = 'Результат (1/0)';
        else if (type.startsWith('logic')) label = 'Результат (1/0)';
        else if (type === 'array-get') label = 'Значение элемента';
        else if (type === 'constant') label = 'Константа';
        else if (type === 'string-length') label = 'Длина';
        else if (type === 'string-concat') label = 'Результат';
        else if (type === 'string-substring') label = 'Подстрока';
        else if (type === 'to-string') label = 'Строка';
        else if (type === 'to-number') label = 'Число';
        else if (type === 'char-code') label = 'Код';
        else if (type === 'from-char-code') label = 'Символ';
        port.title = label;
        port.addEventListener('mousedown', onPortMouseDown);
        portsContainer.appendChild(port);
    }

    block.appendChild(portsContainer);
}

function onPortMouseDown(event) {
    event.stopPropagation();
    const port = event.currentTarget;
    const blockId = port.dataset.blockId;
    const portType = port.dataset.portType;
    const portIndex = parseInt(port.dataset.portIndex);

    if (drawingLine) return;

    selectedPort = { blockId, portType, portIndex, element: port };

    const pos = getPortPosition(blockId, portType, portIndex);
    if (!pos) return;

    const svg = document.getElementById('connections-svg');
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('stroke', '#999');
    tempPath.setAttribute('stroke-width', '3');
    tempPath.setAttribute('stroke-dasharray', '8,8');
    tempPath.setAttribute('fill', 'none');
    tempPath.setAttribute('pointer-events', 'none');
    tempPath.classList.add('temp-path');
    svg.appendChild(tempPath);

    drawingLine = {
        fromBlock: blockId,
        fromPortType: portType,
        fromPortIndex: portIndex,
        startX: pos.x,
        startY: pos.y,
        tempPath: tempPath
    };

    document.addEventListener('mousemove', onMouseMoveDrawing);
    document.addEventListener('mouseup', onMouseUpDrawing);

    event.preventDefault();
}

function onMouseMoveDrawing(event) {
    if (!drawingLine) return;

    const workspaceRect = document.getElementById('workspace').getBoundingClientRect();
    const currentX = event.clientX - workspaceRect.left;
    const currentY = event.clientY - workspaceRect.top;

    const startX = drawingLine.startX;
    const startY = drawingLine.startY;
    const pathData = `M ${startX},${startY} C ${startX + 80},${startY} ${currentX - 80},${currentY} ${currentX},${currentY}`;
    drawingLine.tempPath.setAttribute('d', pathData);
}

function onMouseUpDrawing(event) {
    if (!drawingLine) {
        cleanupDrawing();
        return;
    }

    const threshold = 20;
    let targetPort = null;
    
    const allPorts = document.querySelectorAll('.port');
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    
    let minDistance = threshold;
    allPorts.forEach(port => {
        const rect = port.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
        
        if (distance < minDistance) {
            minDistance = distance;
            targetPort = port;
        }
    });

    if (targetPort) {
        const targetBlockId = targetPort.dataset.blockId;
        const targetPortType = targetPort.dataset.portType;
        const targetPortIndex = parseInt(targetPort.dataset.portIndex);

        if (targetBlockId !== drawingLine.fromBlock &&
            ((drawingLine.fromPortType === 'output' && targetPortType === 'input') ||
             (drawingLine.fromPortType === 'input' && targetPortType === 'output'))) {

            let fromBlock, fromPortIndex, toBlock, toPortIndex;
            if (drawingLine.fromPortType === 'output') {
                fromBlock = drawingLine.fromBlock;
                fromPortIndex = drawingLine.fromPortIndex;
                toBlock = targetBlockId;
                toPortIndex = targetPortIndex;
            } else {
                fromBlock = targetBlockId;
                fromPortIndex = targetPortIndex;
                toBlock = drawingLine.fromBlock;
                toPortIndex = drawingLine.fromPortIndex;
            }

            const existingConnection = connections.find(c => c.toBlock === toBlock && c.toPortIndex === toPortIndex);
            if (existingConnection) {
                removeConnection(existingConnection.id);
            }

            const connId = 'conn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const newConn = {
                id: connId,
                fromBlock: fromBlock,
                fromPortIndex: fromPortIndex,
                toBlock: toBlock,
                toPortIndex: toPortIndex
            };
            connections.push(newConn);
            drawConnection(newConn);
        }
    }

    cleanupDrawing();
}

function cleanupDrawing() {
    if (drawingLine && drawingLine.tempPath) {
        drawingLine.tempPath.remove();
    }
    drawingLine = null;
    selectedPort = null;
    document.removeEventListener('mousemove', onMouseMoveDrawing);
    document.removeEventListener('mouseup', onMouseUpDrawing);
}

function getPortPosition(blockId, portType, portIndex) {
    const block = document.getElementById(blockId);
    if (!block) return null;
    const port = block.querySelector(`.port-${portType}[data-port-index="${portIndex}"]`);
    if (!port) return null;
    const portRect = port.getBoundingClientRect();
    const workspaceRect = document.getElementById('workspace').getBoundingClientRect();
    return {
        x: portRect.left + portRect.width/2 - workspaceRect.left,
        y: portRect.top + portRect.height/2 - workspaceRect.top
    };
}

function drawConnection(conn) {
    const svg = document.getElementById('connections-svg');
    const fromPos = getPortPosition(conn.fromBlock, 'output', conn.fromPortIndex);
    const toPos = getPortPosition(conn.toBlock, 'input', conn.toPortIndex);

    if (!fromPos || !toPos) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', `conn-${conn.id}`);
    
    const dx = toPos.x - fromPos.x;
    const ctrl1X = fromPos.x + dx * 0.25;
    const ctrl2X = fromPos.x + dx * 0.75;
    
    const d = `M ${fromPos.x},${fromPos.y} C ${ctrl1X},${fromPos.y} ${ctrl2X},${toPos.y} ${toPos.x},${toPos.y}`;
    path.setAttribute('d', d);
    path.setAttribute('stroke', '#333');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('pointer-events', 'auto');
    path.setAttribute('data-conn-id', conn.id);

    path.addEventListener('click', function(e) {
        e.stopPropagation();
        const connId = this.dataset.connId;
        removeConnection(connId);
    });
    
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '12');
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('pointer-events', 'auto');
    hitPath.setAttribute('data-conn-id', conn.id);
    hitPath.addEventListener('click', function(e) {
        e.stopPropagation();
        const connId = this.dataset.connId;
        removeConnection(connId);
    });
    
    svg.appendChild(hitPath);
    svg.appendChild(path);
}

function removeConnection(connId) {
    connections = connections.filter(c => c.id !== connId);
    const path = document.getElementById(`conn-${connId}`);
    if (path) path.remove();
    const hitPaths = document.querySelectorAll(`[data-conn-id="${connId}"]`);
    hitPaths.forEach(p => p.remove());
}

function removeConnectionsWithBlock(blockId) {
    const toRemove = connections.filter(conn => conn.fromBlock === blockId || conn.toBlock === blockId);
    toRemove.forEach(conn => removeConnection(conn.id));
}

function updateAllConnections() {
    const svg = document.getElementById('connections-svg');
    svg.innerHTML = '';
    connections.forEach(conn => drawConnection(conn));
}

function startDragBlock(blockId, event) {
    if (dragTimeout) clearTimeout(dragTimeout);
    
    const block = document.getElementById(blockId);
    if (!block) return;

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const blockLeft = parseFloat(block.style.left) || 0;
    const blockTop = parseFloat(block.style.top) || 0;

    function onMouseMove(e) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        block.style.left = (blockLeft + dx) + 'px';
        block.style.top = (blockTop + dy) + 'px';
        updateAllConnections();
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function deleteBlock(blockId) {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const childrenIds = [
        ...(block.thenChildren || []),
        ...(block.elseChildren || []),
        ...(block.bodyChildren || [])
    ];
    childrenIds.forEach(childId => deleteBlock(childId));

    if (block.parentId) {
        const parent = blocks.find(b => b.id === block.parentId);
        if (parent) {
            if (parent.thenChildren) parent.thenChildren = parent.thenChildren.filter(id => id !== blockId);
            if (parent.elseChildren) parent.elseChildren = parent.elseChildren.filter(id => id !== blockId);
            if (parent.bodyChildren) parent.bodyChildren = parent.bodyChildren.filter(id => id !== blockId);
        }
    }

    removeConnectionsWithBlock(blockId);
    const blockEl = document.getElementById(blockId);
    if (blockEl) blockEl.remove();
    blocks = blocks.filter(b => b.id !== blockId);
    updateUI();
}

function updateBlockData(blockId, field, value) {
    const block = blocks.find(b => b.id === blockId);
    if (block) block.data[field] = value;
}

function runProgram() {
    output = [];
    errors = [];
    arrays = {};
    variables = {};

    blocks.forEach(b => { b.executed = false; b.value = undefined; });

    output.push('Запуск программы...');

    const rootBlocks = blocks.filter(b => !b.parentId);
    rootBlocks.sort((a, b) => {
        const elA = document.getElementById(a.id);
        const elB = document.getElementById(b.id);
        if (!elA || !elB) return 0;
        return parseFloat(elA.style.top) - parseFloat(elB.style.top);
    });

    rootBlocks.forEach(block => {
        if (block && !block.executed) {
            executeBlockRecursive(block);
        }
    });

    output.push('Готово');
    updateOutput();
    updateErrors();
    updateVariables();
}

function executeBlockRecursive(block) {
    if (block.executed) return block.value;

    const blockEl = document.getElementById(block.id);
    if (!blockEl) return undefined;

    const inputs = blockEl.querySelectorAll('input, select');
    let result = undefined;

    const resolveInput = (index) => {
        const conn = connections.find(c => c.toBlock === block.id && c.toPortIndex === index);
        if (conn) {
            const sourceBlock = blocks.find(b => b.id === conn.fromBlock);
            if (sourceBlock) {
                return executeBlockRecursive(sourceBlock);
            }
        }
        if (inputs[index] && inputs[index].tagName === 'INPUT') {
            return evaluateExpression(inputs[index].value);
        }
        return 0;
    };

    const executeChildren = (childIds) => {
        const childrenWithPos = childIds
            .map(id => {
                const child = blocks.find(b => b.id === id);
                const el = document.getElementById(id);
                return { child, top: el ? parseFloat(el.style.top) : 0 };
            })
            .filter(item => item.child)
            .sort((a, b) => a.top - b.top);
        for (let item of childrenWithPos) {
            executeBlockRecursive(item.child);
        }
    };

    try {
        switch (block.type) {
            case 'var-declare': {
                const typeSelect = inputs[0];
                const namesInput = inputs[1];
                const type = typeSelect.value;
                const names = namesInput.value.split(',').map(n => n.trim());
                names.forEach(name => {
                    if (type === 'int' || type === 'float') variables[name] = 0;
                    else if (type === 'string') variables[name] = '';
                    else if (type === 'char') variables[name] = '';
                });
                result = names[0] || '';
                output.push(`Созданы переменные (${type}): ${names.join(', ')}`);
                break;
            }
            case 'var-assign': {
                const varName = inputs[0].value;
                const val = resolveInput(0);
                variables[varName] = val;
                result = val;
                output.push(`${varName} = ${JSON.stringify(val)}`);
                break;
            }
            case 'var-get': {
                const varName = inputs[0].value;
                result = variables[varName] !== undefined ? variables[varName] : 0;
                output.push(`${varName} = ${JSON.stringify(result)}`);
                break;
            }
            case 'math-add':
                result = resolveInput(0) + resolveInput(1);
                output.push(` = ${JSON.stringify(result)}`);
                break;
            case 'math-sub':
                result = resolveInput(0) - resolveInput(1);
                output.push(` = ${result}`);
                break;
            case 'math-mul':
                result = resolveInput(0) * resolveInput(1);
                output.push(` = ${result}`);
                break;
            case 'math-div': {
                const divisor = resolveInput(1);
                if (divisor === 0) throw new Error('Деление на ноль');
                result = resolveInput(0) / divisor;
                output.push(` = ${result}`);
                break;
            }
            case 'math-mod': {
                const divisor = resolveInput(1);
                if (divisor === 0) throw new Error('Остаток от деления на ноль');
                result = resolveInput(0) % divisor;
                output.push(` = ${result}`);
                break;
            }
            case 'compare-eq':
                result = (resolveInput(0) === resolveInput(1)) ? 1 : 0;
                output.push(` === ${result ? 'true' : 'false'}`);
                break;
            case 'compare-neq':
                result = (resolveInput(0) !== resolveInput(1)) ? 1 : 0;
                output.push(` !== ${result ? 'true' : 'false'}`);
                break;
            case 'compare-gt':
                result = (resolveInput(0) > resolveInput(1)) ? 1 : 0;
                output.push(` > ${result ? 'true' : 'false'}`);
                break;
            case 'compare-lt':
                result = (resolveInput(0) < resolveInput(1)) ? 1 : 0;
                output.push(` < ${result ? 'true' : 'false'}`);
                break;
            case 'compare-ge':
                result = (resolveInput(0) >= resolveInput(1)) ? 1 : 0;
                output.push(` >= ${result ? 'true' : 'false'}`);
                break;
            case 'compare-le':
                result = (resolveInput(0) <= resolveInput(1)) ? 1 : 0;
                output.push(` <= ${result ? 'true' : 'false'}`);
                break;
            case 'logic-and':
                result = (resolveInput(0) && resolveInput(1)) ? 1 : 0;
                output.push(` AND = ${result}`);
                break;
            case 'logic-or':
                result = (resolveInput(0) || resolveInput(1)) ? 1 : 0;
                output.push(` OR = ${result}`);
                break;
            case 'logic-not':
                result = resolveInput(0) ? 0 : 1;
                output.push(` NOT = ${result}`);
                break;
            case 'array-declare': {
                const typeSelect = inputs[0];
                const nameInput = inputs[1];
                const sizeInput = inputs[2];
                const arrName = nameInput.value.trim();
                const size = parseInt(sizeInput.value);
                const type = typeSelect.value;
                if (isNaN(size) || size < 0) throw new Error('Некорректный размер массива');
                arrays[arrName] = new Array(size);
                for (let i = 0; i < size; i++) {
                    if (type === 'int' || type === 'float') arrays[arrName][i] = 0;
                    else arrays[arrName][i] = '';
                }
                result = arrName;
                output.push(`Создан массив ${arrName}[${size}] типа ${type}`);
                break;
            }
            case 'array-get': {
                const arrName = inputs[0].value.trim();
                const index = resolveInput(0);
                if (!arrays[arrName]) throw new Error(`Массив ${arrName} не объявлен`);
                if (index < 0 || index >= arrays[arrName].length) throw new Error(`Индекс ${index} вне границ массива ${arrName}`);
                result = arrays[arrName][index];
                output.push(`${arrName}[${index}] = ${JSON.stringify(result)}`);
                break;
            }
            case 'array-set': {
                const arrName = inputs[0].value.trim();
                const index = resolveInput(0);
                const value = resolveInput(1);
                if (!arrays[arrName]) throw new Error(`Массив ${arrName} не объявлен`);
                if (index < 0 || index >= arrays[arrName].length) throw new Error(`Индекс ${index} вне границ массива ${arrName}`);
                arrays[arrName][index] = value;
                result = value;
                output.push(`${arrName}[${index}] = ${JSON.stringify(value)}`);
                break;
            }
            case 'control-if': {
                const condition = resolveInput(0);
                output.push(`Условие: ${condition ? 'истина' : 'ложь'}`);
                if (condition) {
                    executeChildren(block.thenChildren);
                } else {
                    executeChildren(block.elseChildren);
                }
                result = condition ? 1 : 0;
                break;
            }
            case 'control-while': {
                let condition = resolveInput(0);
                while (condition) {
                    output.push(`Итерация цикла (условие истинно)`);
                    executeChildren(block.bodyChildren);
                    condition = resolveInput(0);
                }
                output.push(`Цикл завершён`);
                result = 0;
                break;
            }
            case 'control-begin': {
                executeChildren(block.bodyChildren);
                result = 0;
                break;
            }
            case 'print': {
                const val = resolveInput(0);
                output.push(`> ${JSON.stringify(val)}`);
                result = val;
                break;
            }
            case 'constant': {
                const typeSelect = inputs[0];
                const valueInput = inputs[1];
                const type = typeSelect.value;
                const raw = valueInput.value;
                if (type === 'int') result = parseInt(raw) || 0;
                else if (type === 'float') result = parseFloat(raw) || 0.0;
                else if (type === 'string') result = raw;
                output.push(`Константа: ${JSON.stringify(result)}`);
                break;
            }
            case 'string-length': {
                const str = String(resolveInput(0));
                result = str.length;
                output.push(`Длина = ${result}`);
                break;
            }
            case 'string-concat': {
                const a = String(resolveInput(0));
                const b = String(resolveInput(1));
                result = a + b;
                output.push(`Конкатенация = ${JSON.stringify(result)}`);
                break;
            }
            case 'string-substring': {
                const str = String(resolveInput(0));
                const start = Number(resolveInput(1));
                const len = Number(resolveInput(2));
                if (isNaN(start) || isNaN(len)) throw new Error('Индексы должны быть числами');
                result = str.substr(start, len);
                output.push(`Подстрока = ${JSON.stringify(result)}`);
                break;
            }
            case 'to-string': {
                const val = resolveInput(0);
                result = String(val);
                output.push(`В строку = ${JSON.stringify(result)}`);
                break;
            }
            case 'to-number': {
                const str = String(resolveInput(0));
                result = parseFloat(str);
                if (isNaN(result)) result = 0;
                output.push(`В число = ${result}`);
                break;
            }
            case 'char-code': {
                const str = String(resolveInput(0));
                if (str.length === 0) result = 0;
                else result = str.charCodeAt(0);
                output.push(`Код символа = ${result}`);
                break;
            }
            case 'from-char-code': {
                const code = Number(resolveInput(0));
                result = String.fromCharCode(code);
                output.push(`Символ из кода = ${JSON.stringify(result)}`);
                break;
            }
            default:
                output.push(`Неизвестный тип блока: ${block.type}`);
        }

        block.value = result;
        block.executed = true;
        return result;
    } catch (e) {
        errors.push(`Ошибка в блоке ${block.id}: ${e.message}`);
        block.executed = true;
        return undefined;
    }
}

function evaluateExpression(expr) {
    if (typeof expr !== 'string') return expr;
    if (expr.trim() === '') return 0;
    
    if (expr.includes('Function') || expr.includes('eval') || expr.includes('constructor')) {
        errors.push('Недопустимое выражение');
        return 0;
    }

    let result = expr;
    for (let name in variables) {
        result = result.replace(new RegExp('\\b' + name + '\\b', 'g'), variables[name]);
    }

    for (let arrName in arrays) {
        const regex = new RegExp('\\b' + arrName + '\\[(\\d+)\\]', 'g');
        result = result.replace(regex, (match, index) => {
            const idx = parseInt(index);
            if (arrays[arrName] && idx >= 0 && idx < arrays[arrName].length) {
                return arrays[arrName][idx];
            } else {
                errors.push(`Обращение к несуществующему элементу массива ${arrName}[${idx}]`);
                return 0;
            }
        });
    }

    try {
        return Function('"use strict";return (' + result + ')')();
    } catch {
        return expr;
    }
}

function resetProgram() {
    variables = {};
    arrays = {};
    output = [];
    errors = [];
    updateVariables();
    updateOutput();
    updateErrors();
}

function clearAll() {
    const workspace = document.getElementById('workspace');
    workspace.innerHTML = '<div class="workspace-placeholder">Перетащите блоки сюда</div>';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'connections-svg');
    svg.classList.add('connections-svg');
    workspace.appendChild(svg);

    blocks = [];
    connections = [];
    resetProgram();
    updateUI();
}

function updateVariables() {
    const list = document.getElementById('variablesList');
    let html = '';
    
    for (let name in variables) {
        let val = variables[name];
        if (typeof val === 'string') val = '"' + val + '"';
        html += '<div class="variable-item">' +
                '<span class="variable-name">' + name + '</span>' +
                '<span class="variable-value">' + val + '</span>' +
                '</div>';
    }
    
    list.innerHTML = html || 'Нет переменных';
}

function updateOutput() {
    const consoleEl = document.getElementById('outputConsole');
    consoleEl.innerHTML = output.map(line => '<div class="console-line">' + line + '</div>').join('');
}

function updateErrors() {
    const list = document.getElementById('errorsList');
    list.innerHTML = errors.length ? 
        errors.map(err => '<div class="error-item">' + err + '</div>').join('') : 
        'Ошибок нет';
}

function updateUI() {
    document.getElementById('nodeCount').textContent = blocks.length;
}