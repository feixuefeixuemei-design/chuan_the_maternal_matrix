let scene, camera, renderer, groups = [];
let targetZ = 150, mouseX = 0, mouseY = 0;
let textMouseX = 0, textMouseY = 0;
let recallCount = 0;
let memoryArray = [];
let inputHistory = []; 
let lastTemplateIndex = -1; // 防重复记录器
let initialWidth = window.innerWidth;
const sessionID = 'SESSION_' + Math.random().toString(36).substr(2, 9).toUpperCase();

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

async function checkWordExists(word) {
    word = word.toLowerCase().trim();
    if (word.length < 2 || !/^[a-z]+$/.test(word)) return false;
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        return response.ok; 
    } catch (e) { return word.length >= 2; }
}

async function sendToAirtable(concept, line) {
    const token = "patGbyomq5VJq71PG.883acc527f8983ac3d8a04ec4286353a53e036b55d8b08fd542badea9e3fba97"; 
    const baseId = "appfsblMYjyU3TqxR";           
    const tableName = "PoemArchive";     
    const body = { records: [{ fields: { "Concept": concept, "PoemLine": line, "SessionID": sessionID } }] };
    try {
        await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
    } catch (e) { console.error("Archive sync skipped."); }
}

async function sendFullPoemToAirtable(allLines, allConcepts) {
    const token = "patGbyomq5VJq71PG.883acc527f8983ac3d8a04ec4286353a53e036b55d8b08fd542badea9e3fba97"; 
    const baseId = "appfsblMYjyU3TqxR";           
    const tableName = "FullPoems"; 
    const body = { records: [{ fields: { "FullText": allLines.join("\n"), "ConceptsUsed": allConcepts.join(", "), "SessionID": sessionID } }] };
    try {
        await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
    } catch (e) { console.error("Full archive failed."); }
}

function autoFix(sentence) {
    let res = sentence.replace(/\s+/g, ' ').trim();
    res = res.replace(/\ba ([aeiou])/gi, 'an $1');
    res = res.replace(/\ban ([bcdfghjklmnpqrstvwxyz])/gi, 'a $1');
    res = res.replace(/\bthe the\b/gi, 'the');
    res = res.charAt(0).toUpperCase() + res.slice(1);
    
    // 强制最后三个词绑定
    let words = res.split(' ');
    if (words.length > 3) {
        let lastOne = words.pop();
        let lastTwo = words.pop();
        let lastThree = words.pop();
        words.push(lastThree + '\u00A0' + lastTwo + '\u00A0' + lastOne);
        res = words.join(' ');
    }
    return res;
}

function generatePoemLine(word) {
    let w = word.toLowerCase().trim(); 
    
    // 1. 核心意象池
    const concept = pick([
        `the pulse of ${w}`,
        `the weight of ${w}`,
        `the scent of ${w}`,
        `the ghost of ${w}`,
        `the marrow of ${w}`,
        `the anchor of ${w}`,       // 替换 echo (更稳重)
        `the grain of ${w}`,
        `the crystal of ${w}`,
        `the fiber of ${w}`,
        `the shivering ${w}`,
        `the breathing ${w}`,
        `the imprint of ${w}`,      // 替换 residue (更有痕迹感)
        `the kernel of ${w}`,       // 替换 hollow (从“空”变“实”)
        `the soft dust of ${w}`,
        `the warm ash of ${w}`,
        `the silk of ${w}`,
        `the sleeping ${w}`,
        `the stitched ${w}`,
        `the memory of ${w}`,
        `the golden light of ${w}`,
        `this quiet piece: ${w}`,
        `the slow heartbeat of ${w}`,
        `the inner skin of ${w}`,
        `the hidden root of ${w}`,
        `the morning breath of ${w}`,
        `the old story of ${w}`,
        `the seam of ${w}`,         // 替换 soft map (更有手工缝补感)
        `the simple shadow of ${w}`,
        `the drift of ${w}`,
        `the clay of ${w}`
    ]);

    // 2. 环境与动作词库 (保持朴实风格)
    const elements = {
        setting: [
            "Inside the red quiet", "From ancient soil", "Inside the womb", 
            "Through blood and bone", "At the source", "In the silences",
            "Beneath the warm cloth", "Under the golden skin", "Within the slow tide",
            "In the nursery of dust", "Beside the first fire", "In the hollow of a hand",
            "Through the softest gate", "Deep in the memory-well", "Under the amber light",
            "In the garden of ash", "Between the heartbeats", "Inside the heavy dark",
            "At the edge of a dream", "From the deep cradle", "Beneath the simple cotton",
            "Inside the breathing room", "Under the old roof",
            "Against the wooden beam",      
            "Behind the sleeping eyelid",   
            "Within the curve of a rib",    
            "Across the silent threshold",  
            "Below the breathing moss",     
            "Inside the cedar chest",       
            "Wrapped in the weight of wool", // 替换 Under，增加包裹感
            "Along the cathedral of veins",  // 替换 In，增加流动感
            "Amongst the rusted tin",        // 替换 Inside，增加堆积感
            "Within the house of breath",   
            "Beneath the milk-white sky",    // 替换 Under，更有压低感
            "Beside the cooling hearth",    
            "Hidden in the rough linen",     // 替换 Under，增加私密感
            "Inside the hollow oak",        
            "Deep beneath the earthen floor",// 增加层次
            "Upon the stone step",          
            "In the shadow of a wing",      
            "Resting in the cupped palms",   // 替换 Inside，增加温柔动作
            "Covered by the heavy quilt"     // 替换 Under，增加厚重感
        ],
        action: [
            "soft hands mend.", "the mother stays.", "we find home.",
            "everything breathes.", "dust turns to stars.", "ash turns to bloom.", "a seed awakens.",
            "the pulse continues.", "it is safe now.", "rest comes easy.",
            "the light is kept.", "we are forgiven.", "love is enough.",
            "nothing is lost.", "the water settles.", "a small fire burns.",
            "the story ends well.", "the pain grows quiet.", // 替换 is, 增加动态
            "the door clicks shut.",    // 替换 is, 增加声音感
            "the milk stays warm.",     // 替换 is, 增加守护感
            "the lamp brings light.",   // 改变句式
            "the rain softens.",        // 替换 stops, 更温柔
            "the hand feels warm.",     // 增加触觉
            "the soup feeds all.",      // 增加滋养感
            "the day gently ends.",     // 增加韵律
            "the bread is broken.",     // 替换 shared, 更具象
            "the bed waits ready.",     // 赋予床生命力
            "the heart finds its pace.",// 替换 slows down, 更具诗意
            "the fire breathes on.",    // 替换 stays lit, 更生动
            "the bird tends the nest.", // 增加抚育动作
            "the earth remains still."  // 增加永恒感
        ],
        shortDirect: [
            `${concept}—mended by hand.`,
            `${concept}—kept in the family.`,
            `${concept}—warmed by the light.`,
            `${concept}—cradled in the dark.`,
            `Before the fire: ${concept}.`,
            `After the silence: ${concept}.`,
            `${concept}—safe in the nest.`,
            `${concept}—carried by the mother.`,
            `${concept}—washed by the rain.`,
            `Beneath the blanket: ${concept}.`,  // 替换 Under
            `${concept}—tucked in for sleep.`,
            `${concept}—held like a stone.`,
            `${concept}—hidden in the soft.`,    // 替换 buried (buried 略显沉重)
            `Within the old box: ${concept}.`,   // 替换 In
            `${concept}—ready for home.`,
            `${concept}—loved like a child.`,
            `Amidst the small song: ${concept}.`,// 替换 Inside
            `${concept}—resting on the porch.`,  
            `${concept}—wrapped in clean wool.`, 
            `${concept}—found in the garden.`,   
            `Upon the tea tray: ${concept}.`,    // 替换 Beside the tea (更具体)
            `${concept}—dried by the sun.`,      
            `Within the heavy coat: ${concept}.`,// 替换 Under
            `${concept}—softened by time.`,      
            `${concept}—tucked into the drawer.`,// 替换 folded
            `${concept}—kept for the winter.`,   
            `Held in cupped hands: ${concept}.`, // 替换 Inside
            `${concept}—sharing the warmth.`,    
            `${concept}—asleep in the chair.`,   
            `Returning from the walk: ${concept}.`, // 增加动态感
            `${concept}—waiting by the door.`,   
            `${concept}—blessed by the hearth.`  
        ]
    };

    // 3. 结构模具 (7 种不重复的句式)
    const structuralTemplates = [
        () => `${pick(elements.setting)}: ${concept}.`,
        () => `${concept}; ${pick(elements.action)}`,
        () => pick(elements.shortDirect),
        () => `${pick(elements.setting)}; ${concept}.`,
        () => `Only this: ${concept}.`,
        () => `Witness ${concept}.`,
        () => `See ${concept} and ${pick(elements.action)}`
    ];

    // 4. 去重逻辑
    let templateIndex;
    do {
        templateIndex = Math.floor(Math.random() * structuralTemplates.length);
    } while (templateIndex === lastTemplateIndex); 
    
    lastTemplateIndex = templateIndex; 
    
    // 5. 最终交付 (autoFix 会处理大写和连词)
    return autoFix(structuralTemplates[templateIndex]());
}

async function handleSubmit() {
    const inputField = document.getElementById('input');
    const errorHint = document.getElementById('error-hint');
    const rawVal = inputField.value.trim();
    if(!rawVal) return;
    
    inputField.disabled = true;
    inputField.style.opacity = "0.3";
    inputField.placeholder = "verifying...";
    
    const exists = await checkWordExists(rawVal);
    if(!exists) {
        errorHint.innerText = "THE VOID REJECTS THIS ECHO";
        errorHint.style.opacity = 1;
        inputField.disabled = false;
        inputField.placeholder = "whisper a concept...";
        inputField.style.opacity = "1";
        setTimeout(() => errorHint.style.opacity = 0, 2000);
        return; 
    }

    const lastGroup = groups[groups.length-1];
    if(lastGroup) {
        lastGroup.children.forEach(p => { p.material.opacity = 1.0; p.material.size = 2.5; });
        setTimeout(() => { lastGroup.children.forEach(p => { p.material.opacity = 0.6; p.material.size = 1.4; }); }, 500);
    }

    recallCount++;
    inputHistory.push(rawVal);
    document.getElementById('count').innerText = recallCount;
    const sentence = generatePoemLine(rawVal);
    memoryArray.push(sentence);
    sendToAirtable(rawVal, sentence);
    
    if(recallCount >= 3) {
        document.getElementById('ui').classList.add('ui-hide');
        const manifesto = document.getElementById('poem-manifesto');
        document.getElementById('manifesto-text').innerHTML = memoryArray.join("<br><br>");
        manifesto.style.opacity = "1";
        manifesto.style.pointerEvents = "auto";
        sendFullPoemToAirtable(memoryArray, inputHistory);
    } else {
        document.getElementById('ui').classList.add('ui-hide');
        targetZ -= 120; 
        createWarmStrands(targetZ - 60, rawVal);
        for(let i=0; i<20; i++) setTimeout(() => spawnEchoText(sentence, i === 0), i * 80);
        setTimeout(() => { 
            document.getElementById('ui').classList.remove('ui-hide');
            inputField.disabled = false;
            inputField.style.opacity = "1";
            inputField.placeholder = "whisper a concept...";
            inputField.value = "";
            inputField.focus();
        }, 3000);
    }
}

document.getElementById('seal-archive-btn').onclick = () => {
    const overlay = document.getElementById('poem-overlay');
    document.getElementById('poem-meta').innerHTML = `INDEX: ${sessionID}<br>STATUS: SEALED`;
    document.getElementById('poem-content').innerHTML = memoryArray.join("<br>");
    
    renderer.render(scene, camera);
    const snapshot = document.getElementById('bg-snapshot');
    snapshot.src = renderer.domElement.toDataURL("image/png");

    const qrc = document.getElementById('qrcode-container');
    qrc.innerHTML = "";
    
    setTimeout(() => {
        new QRCode(qrc, { 
            text: window.location.href, 
            width: 80, 
            height: 80, 
            colorDark : "#ff9500", 
            colorLight : "#000000", 
            correctLevel : QRCode.CorrectLevel.M 
        });
    }, 300);

    document.getElementById('poem-manifesto').style.opacity = "0";
    document.getElementById('poem-manifesto').style.pointerEvents = "none";
    overlay.style.opacity = "1"; 
    overlay.style.pointerEvents = "auto";
};

function handleMovement(x, y) {
    mouseX = (x / window.innerWidth) * 2 - 1;
    mouseY = (y / window.innerHeight) * 2 - 1;
    const glow = document.getElementById('bg-glow');
    if(glow) {
        glow.style.setProperty('--bgX', x + 'px');
        glow.style.setProperty('--bgY', y + 'px');
    }
}

function init() {
    const leaveWarning = document.getElementById('leave-warning');

    // 浏览器关闭或刷新时的提示
    window.addEventListener('beforeunload', (e) => {
        if (recallCount > 0 && recallCount < 3) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // 桌面端：鼠标移出窗口显示警告
    document.addEventListener('mouseout', (e) => {
        if (!e.relatedTarget && recallCount > 0 && recallCount < 3) {
            leaveWarning.style.display = 'flex';
        }
    });

    // 桌面端：鼠标回到窗口隐藏警告
    document.addEventListener('mouseenter', () => {
        leaveWarning.style.display = 'none';
    });

    // 移动端 / 所有设备：切换标签页或离开页面时显示警告
    document.addEventListener('visibilitychange', () => {
        if (recallCount > 0 && recallCount < 3) {
            leaveWarning.style.display = document.hidden ? 'flex' : 'none';
        }
    });

    // 移动端触控滑动顶部近似“离开页面”
    let touchStartY = null;
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) touchStartY = e.touches[0].clientY;
    }, {passive: true});

    document.addEventListener('touchmove', (e) => {
        if (!touchStartY) return;
        const y = e.touches[0].clientY;
        if (y < 0 && recallCount > 0 && recallCount < 3) {
            leaveWarning.style.display = 'flex';
        }
    }, {passive: true});

    // 用户点击警告隐藏
    leaveWarning.addEventListener('click', () => {
        leaveWarning.style.display = 'none';
    });

    // Three.js 初始化、按钮事件绑定、鼠标/触控移动等保持不变
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 0, targetZ);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0); 
    renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    document.getElementById('enter-btn').onclick = handleSubmit;
    document.getElementById('input').addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSubmit(); });

    document.getElementById('shot-btn').onclick = () => {
        const btn = document.getElementById('shot-btn');
        btn.innerText = "...";
        const captureArea = document.querySelector("#capture-area");
        html2canvas(captureArea, { backgroundColor: "#000", scale: 3, useCORS: true })
            .then(canvas => {
                document.getElementById('final-image').src = canvas.toDataURL("image/png", 1.0);
                document.getElementById('mobile-save-hint').style.display = 'flex';
                btn.innerText = "IMAGE";
            });
    };

    document.getElementById('reset-btn').onclick = () => { location.reload(); };

    document.addEventListener('mousemove', (e) => handleMovement(e.clientX, e.clientY));
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) handleMovement(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) handleMovement(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    createWarmStrands(0, "ORIGIN"); 
    animate();
}

function spawnEchoText(text, isCenter = false) {
    const div = document.createElement('div');
    div.className = 'echo-text echo-animation';
    div.innerText = text;
    const isMobile = window.innerWidth < 1025;
    let sizeBase = isCenter ? (isMobile ? 1.3 : 2.2) : (isMobile ? 0.7 : 1.2);
    div.style.setProperty('--max-op', isCenter ? 0.9 : (0.15 + Math.random() * 0.3));
    div.style.setProperty('--dur', (isCenter ? 8 : (6 + Math.random() * 2)) + "s");
    div.style.setProperty('--glow', isCenter ? 25 : 8);
    div.style.fontSize = sizeBase + "rem";
    if (isCenter) {
        div.style.left = "50%"; div.style.top = "50%";
        div.style.setProperty('--rot', '0deg'); div.style.setProperty('--moveY', '0px');
        div.style.zIndex = "1000";
    } else {
        div.style.left = (15 + Math.random() * 70) + "%"; 
        div.style.top = (25 + Math.random() * 50) + "%"; 
        div.style.setProperty('--rot', (Math.random() - 0.5) * 15 + 'deg');
        div.style.setProperty('--moveY', -(100 + Math.random() * 150) + 'px');
    }
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 8000);
}

function createCircleTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 230, 150, 1)'); 
    gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.7)'); 
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}
const particleTexture = createCircleTexture();

function createWarmStrands(z, text) {
    const parentGroup = new THREE.Group();
    const chars = text.split("").slice(0, 10); 
    chars.forEach((char, index) => {
        const code = char.charCodeAt(0);
        const strandPoints = [];
        for(let j=0; j<25; j++) { 
            const angle = (index / chars.length) * Math.PI * 2 + j * 0.8 + (code % 12 * 0.1);
            const r = 4 + Math.abs(Math.cos(j * 0.13)) * 4 + Math.sin(j * 0.4) * 0.5;
            strandPoints.push(new THREE.Vector3(Math.cos(angle) * r, j * 10 - 125, Math.sin(angle) * r));
        }
        const curve = new THREE.CatmullRomCurve3(strandPoints);
        const positions = [];
        curve.getPoints(120).forEach(p => { for(let k=0; k<8; k++) positions.push(p.x + (Math.random()-0.5)*1.8, p.y + (Math.random()-0.5)*1.8, p.z + (Math.random()-0.5)*1.8); });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ color: 0xffaa00, size: 1.4, map: particleTexture, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
        parentGroup.add(new THREE.Points(geo, mat));
    });
    parentGroup.position.set(0, 0, z);
    scene.add(parentGroup); groups.push(parentGroup);
    if(groups.length > 5) scene.remove(groups.shift());
}

function animate() {
    requestAnimationFrame(animate);
    textMouseX += (mouseX * 30 - textMouseX) * 0.05;
    textMouseY += (mouseY * 30 - textMouseY) * 0.05;
    const echoes = document.getElementsByClassName('echo-text');
    for (let echo of echoes) { echo.style.setProperty('--mX', textMouseX + "px"); echo.style.setProperty('--mY', textMouseY + "px"); }
    if(camera) {
        camera.position.x += (mouseX * 5 - camera.position.x) * 0.03;
        camera.position.z += (targetZ - camera.position.z) * 0.05;
        camera.lookAt(0, 0, camera.position.z - 250);
    }
    groups.forEach((g) => { g.rotation.y += 0.005; });
    renderer.render(scene, camera);
}

window.onload = init;