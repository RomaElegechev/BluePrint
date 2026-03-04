let variables = {};
let output = [];
let errors = [];
let blocks = [];
let connections = [];
let drawingLine = null;
let selectedPort = null;

const blockPortsConfig = {
    'var-declare':  { inputs: 0, outputs: 1 },
    'var-assign':   { inputs: 2, outputs: 1 },
    'var-get':      { inputs: 1, outputs: 1 },
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
    'control-if':   { inputs: 1, outputs: 2 },
    'control-begin': { inputs: 0, outputs: 1 },
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
    
    const target = event.target.closest('.then-blocks, .else-blocks, .begin-blocks');
    
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
    if (placeholder) {
        placeholder.remove();
    }
    
    const block = document.createElement('div');
    block.className = 'workspace-block';
    block.id = blockId;
    block.style.position = containerId ? 'relative' : 'absolute';
    block.style.left = x + 'px';
    block.style.top = y + 'px';
    
    let title = '';
    let content = '';
    
    switch(type) {
        case 'var-declare':
            title = 'Создать переменную';
            content = '<input type="text" value="x, y" placeholder="имена через запятую" onchange="updateBlockData(\'' + blockId + '\', \'names\', this.value)">';
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
        case 'compare-ge':
            title = 'Больше или равно';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> >= <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'compare-le':
            title = 'Меньше или равно';
            content = '<input type="text" value="a" placeholder="a" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'a\', this.value)"> <= <input type="text" value="b" placeholder="b" style="width:60px" onchange="updateBlockData(\'' + blockId + '\', \'b\', this.value)">';
            break;
        case 'control-if':
            title = 'Если';
            content = `
                <div class="if-condition">
                    <input type="text" value="условие" placeholder="условие" onchange="updateBlockData('${blockId}', 'condition', this.value)">
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
        <div class="block-content">
            ${content}
        </div>
    `;
    
    if (containerId) {
        const container = document.getElementById(containerId);
        container.appendChild(block);
        const placeholder = container.querySelector('div[style*="color:#999"]');
        if (placeholder) placeholder.remove();
    } else {
        workspace.appendChild(block);
    }
    
    addPortsToBlock(block, type);
    
    const blockData = {
        id: blockId,
        type: type,
        data: {},
        value: undefined,
        executed: false
    };
    blocks.push(blockData);
    
    updateUI();
}

function addPortsToBlock(block, type) {
    const config = blockPortsConfig[type] || { inputs: 1, outputs: 1 };
    
    const hitArea = document.createElement('div');
    hitArea.style.position = 'absolute';
    hitArea.style.top = '0';
    hitArea.style.left = '0';
    hitArea.style.width = '100%';
    hitArea.style.height = '100%';
    hitArea.style.pointerEvents = 'none';
    block.appendChild(hitArea);
    
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
        port.title = `Вход ${i + 1}`;
        port.addEventListener('mousedown', onPortMouseDown);
        port.addEventListener('mouseenter', () => {
            port.style.transform = 'scale(1.3)';
            port.style.backgroundColor = '#e3f2fd';
        });
        port.addEventListener('mouseleave', () => {
            port.style.transform = 'scale(1)';
            port.style.backgroundColor = 'white';
        });
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
        port.title = `Выход ${i + 1}`;
        port.addEventListener('mousedown', onPortMouseDown);
        port.addEventListener('mouseenter', () => {
            port.style.transform = 'scale(1.3)';
            port.style.backgroundColor = '#ffebee';
        });
        port.addEventListener('mouseleave', () => {
            port.style.transform = 'scale(1)';
            port.style.backgroundColor = 'white';
        });
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

    if (drawingLine) {
        return;
    }

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
    
    const validationErrors = validateConnections();
    if (validationErrors.length > 0) {
        errors = validationErrors;
        updateOutput();
        updateErrors();
        return;
    }
    
    blocks.forEach(block => {
        block.value = undefined;
        block.executed = false;
    });
    
    output.push('🚀 Запуск программы...');
    
    const graph = buildDependencyGraph();
    const executionOrder = topologicalSort(graph);
    
    if (executionOrder === null) {
        errors.push('❌ Обнаружен цикл в зависимостях!');
        updateOutput();
        updateErrors();
        return;
    }
    
    executionOrder.forEach(blockId => {
        const block = blocks.find(b => b.id === blockId);
        if (!block || block.executed) return;
        
        try {
            const inputValues = getInputValues(blockId);
            executeBlock(block, inputValues);
            block.executed = true;
        } catch (e) {
            errors.push(`❌ Ошибка в блоке ${block.id}: ${e.message}`);
        }
    });
    
    output.push('✅ Готово');
    updateOutput();
    updateErrors();
    updateVariables();
}

function validateConnections() {
    const errors = [];
    
    blocks.forEach(block => {
        const config = blockPortsConfig[block.type];
        if (!config) return;
        
        const blockElement = document.getElementById(block.id);
        if (!blockElement) return;
        
        const inputs = blockElement.querySelectorAll('input');
        
        for (let i = 0; i < config.inputs; i++) {
            const hasConnection = connections.some(c => c.toBlock === block.id && c.toPortIndex === i);
            
            if (block.type === 'var-assign') {
                if (i === 1 && !hasConnection) {
                    if (inputs[1] && inputs[1].value.trim() !== '') {
                        continue;
                    } else {
                        errors.push(`❌ Блок "Присвоить значение" должен иметь значение (либо подключение, либо заполненное поле)`);
                    }
                }
                continue;
            }
            
            const requiredTypes = ['math-add', 'math-sub', 'math-mul', 'math-div', 'math-mod',
                                  'compare-eq', 'compare-neq', 'compare-gt', 'compare-lt',
                                  'compare-ge', 'compare-le', 'print'];
            
            if (requiredTypes.includes(block.type) && !hasConnection) {
                const inputField = inputs[i];
                if (inputField && inputField.value.trim() !== '') {
                    continue;
                } else {
                    const portNames = ['первый', 'второй'];
                    errors.push(`❌ Блок "${block.type}" требует значение для ${portNames[i] || i+1} входа (подключите или введите число)`);
                }
            }
        }
    });
    
    return errors;
}

function buildDependencyGraph() {
    const graph = {};
    
    blocks.forEach(block => {
        graph[block.id] = {
            id: block.id,
            dependencies: [],
            dependents: []
        };
    });
    
    connections.forEach(conn => {
        if (graph[conn.toBlock] && graph[conn.fromBlock]) {
            graph[conn.toBlock].dependencies.push(conn.fromBlock);
            graph[conn.fromBlock].dependents.push(conn.toBlock);
        }
    });
    
    return graph;
}

function topologicalSort(graph) {
    const result = [];
    const queue = [];
    const inDegree = {};
    
    Object.keys(graph).forEach(id => {
        inDegree[id] = graph[id].dependencies.length;
        if (inDegree[id] === 0) {
            queue.push(id);
        }
    });
    
    while (queue.length > 0) {
        const current = queue.shift();
        result.push(current);
        
        graph[current].dependents.forEach(dependent => {
            inDegree[dependent]--;
            if (inDegree[dependent] === 0) {
                queue.push(dependent);
            }
        });
    }
    
    if (result.length !== Object.keys(graph).length) {
        return null;
    }
    
    return result;
}

function getInputValues(blockId) {
    const values = {};
    const block = blocks.find(b => b.id === blockId);
    if (!block) return values;
    
    const config = blockPortsConfig[block.type];
    if (!config) return values;
    
    for (let i = 0; i < config.inputs; i++) {
        const connection = connections.find(c => c.toBlock === blockId && c.toPortIndex === i);
        if (connection) {
            const sourceBlock = blocks.find(b => b.id === connection.fromBlock);
            if (sourceBlock && sourceBlock.value !== undefined) {
                values[`input${i}`] = sourceBlock.value;
            }
        }
    }
    
    return values;
}

function executeBlock(block, inputValues) {
    const blockEl = document.getElementById(block.id);
    if (!blockEl) return;
    
    const inputs = blockEl.querySelectorAll('input');
    let result = undefined;
    
    const getValue = (index, defaultValue = 0) => {
        if (inputValues[`input${index}`] !== undefined) {
            return inputValues[`input${index}`];
        }
        if (inputs[index]) {
            const val = evaluateExpression(inputs[index].value);
            return val !== undefined ? val : defaultValue;
        }
        return defaultValue;
    };
    
    switch(block.type) {
        case 'var-declare':
            const names = inputs[0].value.split(',').map(n => n.trim());
            names.forEach(name => {
                variables[name] = 0;
            });
            result = names[0] || '';
            output.push(`📦 Созданы переменные: ${names.join(', ')}`);
            break;
            
        case 'var-assign':
            const varName = inputs[0].value;
            const val = getValue(1);
            variables[varName] = val;
            result = val;
            output.push(`📝 ${varName} = ${val}`);
            break;
            
        case 'var-get':
            const varname = inputs[0].value;
            result = variables[varname] !== undefined ? variables[varname] : 0;
            output.push(`🔍 ${varname} = ${result}`);
            break;
        
        case 'math-add':
            result = getValue(0) + getValue(1);
            output.push(`➕ ${getValue(0)} + ${getValue(1)} = ${result}`);
            break;
            
        case 'math-sub':
            result = getValue(0) - getValue(1);
            output.push(`➖ ${getValue(0)} - ${getValue(1)} = ${result}`);
            break;
            
        case 'math-mul':
            result = getValue(0) * getValue(1);
            output.push(`✖️ ${getValue(0)} * ${getValue(1)} = ${result}`);
            break;
            
        case 'math-div':
            const divisor = getValue(1);
            if (divisor === 0) {
                throw new Error('Деление на ноль');
            } else {
                result = Math.floor(getValue(0) / divisor);
                output.push(`➗ ${getValue(0)} / ${divisor} = ${result}`);
            }
            break;
            
        case 'math-mod':
            const modDivisor = getValue(1);
            if (modDivisor === 0) {
                throw new Error('Остаток от деления на ноль');
            } else {
                result = getValue(0) % modDivisor;
                output.push(`🔄 ${getValue(0)} % ${modDivisor} = ${result}`);
            }
            break;
        
        case 'compare-eq':
            result = (getValue(0) == getValue(1)) ? 1 : 0;
            output.push(`⚖️ ${getValue(0)} == ${getValue(1)} = ${result === 1 ? 'true' : 'false'}`);
            break;
            
        case 'compare-neq':
            result = (getValue(0) != getValue(1)) ? 1 : 0;
            output.push(`⚖️ ${getValue(0)} != ${getValue(1)} = ${result === 1 ? 'true' : 'false'}`);
            break;
            
        case 'compare-gt':
            result = (getValue(0) > getValue(1)) ? 1 : 0;
            output.push(`⚖️ ${getValue(0)} > ${getValue(1)} = ${result === 1 ? 'true' : 'false'}`);
            break;
            
        case 'compare-lt':
            result = (getValue(0) < getValue(1)) ? 1 : 0;
            output.push(`⚖️ ${getValue(0)} < ${getValue(1)} = ${result === 1 ? 'true' : 'false'}`);
            break;
            
        case 'compare-ge':
            result = (getValue(0) >= getValue(1)) ? 1 : 0;
            output.push(`⚖️ ${getValue(0)} >= ${getValue(1)} = ${result === 1 ? 'true' : 'false'}`);
            break;
            
        case 'compare-le':
            result = (getValue(0) <= getValue(1)) ? 1 : 0;
            output.push(`⚖️ ${getValue(0)} <= ${getValue(1)} = ${result === 1 ? 'true' : 'false'}`);
            break;
        
        case 'control-if':
            const condition = getValue(0);
            output.push(`🤔 Если: ${condition ? 'истина' : 'ложь'}`);
            result = condition ? 1 : 0;
            break;
            
        case 'control-begin':
            result = 0;
            break;
        
        case 'print':
            const printVal = getValue(0);
            output.push(`📢 > ${printVal}`);
            result = printVal;
            break;
    }
    
    block.value = result;
}

function evaluateExpression(expr) {
    if (typeof expr !== 'string') return expr;
    if (expr.trim() === '') return 0;
    
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
        html += '<div class="variable-item">' +
                '<span class="variable-name">' + name + '</span>' +
                '<span class="variable-value">' + variables[name] + '</span>' +
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
        '✅ Ошибок нет';
}

function updateUI() {
    document.getElementById('nodeCount').textContent = blocks.length;
}