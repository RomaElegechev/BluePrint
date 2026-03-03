let variables = {};
let output = [];
let errors = [];
let blocks = [];               
let connections = [];           
let drawingLine = null;        
let selectedPort = null;        

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
    'control-if':   { inputs: 1, outputs: 2 },
    'control-while':{ inputs: 1, outputs: 1 },
    'print':        { inputs: 1, outputs: 0 }
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

    const rect = workspace.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    createBlock(nodeType, x, y);
}

function createBlock(type, x, y) {
    const workspace = document.getElementById('workspace');
    const blockId = 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const placeholder = workspace.querySelector('.workspace-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    const block = document.createElement('div');
    block.className = 'workspace-block';
    block.id = blockId;
    block.style.position = 'absolute';
    block.style.left = x + 'px';
    block.style.top = y + 'px';

    let title = '';
    let content = '';
    switch(type) {
        case 'var-declare':
            title = 'Создать переменную';
            content = '<input type="text" value="x, y" placeholder="имена" onchange="updateBlockData(\'' + blockId + '\', \'names\', this.value)">';
            break;
        case 'var-assign':
            title = 'Присвоить значение';
            content = '<input type="text" value="x" placeholder="переменная" style="width:70px" onchange="updateBlockData(\'' + blockId + '\', \'var\', this.value)"> = <input type="text" value="0" placeholder="значение" style="width:70px" onchange="updateBlockData(\'' + blockId + '\', \'value\', this.value)">';
            break;
        case 'var-get':
            title = 'Получить переменную';
            content = '<input type="text" value="x" placeholder="имя" onchange="updateBlockData(\'' + blockId + '\', \'var\', this.value)">';
            break;
        case 'math-add':
            title = 'Сложение';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> + <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'math-sub':
            title = 'Вычитание';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> - <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'math-mul':
            title = 'Умножение';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> * <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'math-div':
            title = 'Деление';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> / <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'math-mod':
            title = 'Остаток';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> % <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'compare-eq':
            title = 'Равно';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> == <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'compare-neq':
            title = 'Не равно';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> != <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'compare-gt':
            title = 'Больше';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> > <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'compare-lt':
            title = 'Меньше';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> < <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'control-if':
            title = 'Если';
            content = '<input type="text" value="условие" placeholder="условие" onchange="updateBlockData(\'' + blockId + '\', \'condition\', this.value)">';
            break;
        case 'control-while':
            title = 'Цикл';
            content = '<input type="text" value="условие" placeholder="условие" onchange="updateBlockData(\'' + blockId + '\', \'condition\', this.value)">';
            break;
        case 'print':
            title = 'Вывести';
            content = '<input type="text" value="0" placeholder="значение" onchange="updateBlockData(\'' + blockId + '\', \'value\', this.value)">';
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
        <div class="block-content" id="content_${blockId}">
            ${content}
        </div>
    `;

    workspace.appendChild(block);

    addPortsToBlock(block, type);

    const blockData = {
        id: blockId,
        type: type,
        data: {}
    };
    blocks.push(blockData);

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
        port.style.transform = 'translateY(-50%)'; 
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
        port.style.transform = 'translateY(-50%)';
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
    tempPath.setAttribute('stroke-width', '2');
    tempPath.setAttribute('stroke-dasharray', '5,5');
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
    const pathData = `M ${startX},${startY} C ${startX + 50},${startY} ${currentX - 50},${currentY} ${currentX},${currentY}`;
    drawingLine.tempPath.setAttribute('d', pathData);
}

function onMouseUpDrawing(event) {
    if (!drawingLine) {
        cleanupDrawing();
        return;
    }

    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    if (targetElement && targetElement.classList.contains('port')) {
        const targetBlockId = targetElement.dataset.blockId;
        const targetPortType = targetElement.dataset.portType;
        const targetPortIndex = parseInt(targetElement.dataset.portIndex);

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

            connections = connections.filter(conn => {
                if (conn.toBlock === toBlock && conn.toPortIndex === toPortIndex) {
                    const oldPath = document.getElementById(`conn-${conn.id}`);
                    if (oldPath) oldPath.remove();
                    return false;
                }
                return true;
            });

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
    const d = `M ${fromPos.x},${fromPos.y} C ${fromPos.x + 50},${fromPos.y} ${toPos.x - 50},${toPos.y} ${toPos.x},${toPos.y}`;
    path.setAttribute('d', d);
    path.setAttribute('stroke', '#000');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('pointer-events', 'auto');
    path.setAttribute('data-conn-id', conn.id);

    path.addEventListener('click', function(e) {
        e.stopPropagation();
        const connId = this.dataset.connId;
        removeConnection(connId);
    });

    svg.appendChild(path);
}

function removeConnection(connId) {
    connections = connections.filter(c => c.id !== connId);
    const path = document.getElementById(`conn-${connId}`);
    if (path) path.remove();
}

function removeConnectionsWithBlock(blockId) {
    connections = connections.filter(conn => {
        if (conn.fromBlock === blockId || conn.toBlock === blockId) {
            const path = document.getElementById(`conn-${conn.id}`);
            if (path) path.remove();
            return false;
        }
        return true;
    });
}

function updateAllConnections() {
    const svg = document.getElementById('connections-svg');
    svg.innerHTML = ''; 
    connections.forEach(conn => drawConnection(conn));
}

function startDragBlock(blockId, event) {
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
    removeConnectionsWithBlock(blockId);
    const block = document.getElementById(blockId);
    if (block) block.remove();
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
    output.push('Запуск программы...');
    blocks.forEach(block => {
        try {
            executeBlock(block);
        } catch (e) {
            errors.push('Ошибка: ' + e.message);
        }
    });
    output.push('Готово');
    updateOutput();
    updateErrors();
}

function executeBlock(block) {
    const blockEl = document.getElementById(block.id);
    if (!blockEl) return;
    const inputs = blockEl.querySelectorAll('input');

    switch(block.type) {
        case 'var-declare':
            const names = inputs[0].value.split(',').map(n => n.trim());
            names.forEach(name => variables[name] = 0);
            output.push('Созданы: ' + names.join(', '));
            break;
        case 'var-assign':
            const varName = inputs[0].value;
            const val = evaluateExpression(inputs[1].value);
            variables[varName] = val;
            output.push(varName + ' = ' + val);
            break;
        case 'var-get':
            const varname = inputs[0].value;
            const value = variables[varname] !== undefined ? variables[varname] : 0;
            output.push('Получено: ' + varname + ' = ' + value);
            break;
        case 'math-add':
            const a = evaluateExpression(inputs[0].value);
            const b = evaluateExpression(inputs[1].value);
            output.push('Сложение: ' + a + ' + ' + b + ' = ' + (a + b));
            break;
        case 'math-sub':
            const a1 = evaluateExpression(inputs[0].value);
            const b1 = evaluateExpression(inputs[1].value);
            output.push('Вычитание: ' + a1 + ' - ' + b1 + ' = ' + (a1 - b1));
            break;
        case 'math-mul':
            const a2 = evaluateExpression(inputs[0].value);
            const b2 = evaluateExpression(inputs[1].value);
            output.push('Умножение: ' + a2 + ' * ' + b2 + ' = ' + (a2 * b2));
            break;
        case 'math-div':
            const a3 = evaluateExpression(inputs[0].value);
            const b3 = evaluateExpression(inputs[1].value);
            if (b3 === 0) {
                errors.push('Деление на ноль');
            } else {
                output.push('Деление: ' + a3 + ' / ' + b3 + ' = ' + (a3 / b3));
            }
            break;
        case 'math-mod':
            const a4 = evaluateExpression(inputs[0].value);
            const b4 = evaluateExpression(inputs[1].value);
            if (b4 === 0) {
                errors.push('Остаток от деления на ноль');
            } else {
                output.push('Остаток: ' + a4 + ' % ' + b4 + ' = ' + (a4 % b4));
            }
            break;
        case 'compare-eq':
            const a5 = evaluateExpression(inputs[0].value);
            const b5 = evaluateExpression(inputs[1].value);
            output.push('Равно: ' + a5 + ' == ' + b5 + ' = ' + (a5 == b5));
            break;
        case 'compare-neq':
            const a6 = evaluateExpression(inputs[0].value);
            const b6 = evaluateExpression(inputs[1].value);
            output.push('Не равно: ' + a6 + ' != ' + b6 + ' = ' + (a6 != b6));
            break;
        case 'compare-gt':
            const a7 = evaluateExpression(inputs[0].value);
            const b7 = evaluateExpression(inputs[1].value);
            output.push('Больше: ' + a7 + ' > ' + b7 + ' = ' + (a7 > b7));
            break;
        case 'compare-lt':
            const a8 = evaluateExpression(inputs[0].value);
            const b8 = evaluateExpression(inputs[1].value);
            output.push('Меньше: ' + a8 + ' < ' + b8 + ' = ' + (a8 < b8));
            break;
        case 'control-if':
            break;
        case 'control-while':
            break;
        case 'print':
            const val2 = evaluateExpression(inputs[0].value);
            output.push('> ' + val2);
            break;
    }
    updateVariables();
}

function evaluateExpression(expr) {
    if (typeof expr !== 'string') return expr;
    let result = expr;
    for (let name in variables) {
        result = result.replace(new RegExp('\\b' + name + '\\b', 'g'), variables[name]);
    }
    try {
        return Function('"use strict";return (' + result + ')')();
    } catch {
        return expr;
    }
}

function resetProgram() {
    variables = {};
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
        html += '<div class="variable-item"><span class="variable-name">' + name + '</span> <span class="variable-value">' + variables[name] + '</span></div>';
    }
    list.innerHTML = html || 'Нет переменных';
}

function updateOutput() {
    const consoleEl = document.getElementById('outputConsole');
    consoleEl.innerHTML = output.map(line => '<div class="console-line">' + line + '</div>').join('');
}

function updateErrors() {
    const list = document.getElementById('errorsList');
    list.innerHTML = errors.length ? errors.map(err => '<div class="error-item">⚠️ ' + err + '</div>').join('') : 'Ошибок нет';
}

function updateUI() {
    document.getElementById('nodeCount').textContent = blocks.length;
}