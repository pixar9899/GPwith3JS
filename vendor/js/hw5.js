/////////////////////////////////////////////////////////
// global variables
//基本
var renderer, scene, camera;
//AR用
var arToolkitSource, arToolkitContext;
var markerRoot;
var _iOSDevice;

var targets = [], obstacles = [];
//鯊魚陣列
var agents = [];
//時間運算
var clock;
//鯊魚模型
var model;
//最少會有幾個目標在場景里
var minTargetCnt = 4;

//stats直接套這句
javascript: (function () { var script = document.createElement('script'); script.onload = function () { var stats = new Stats(); stats.dom.style.opacity = 0.75; document.body.appendChild(stats.dom); requestAnimationFrame(function loop() { stats.update(); requestAnimationFrame(loop) }); }; script.src = 'https://mrdoob.github.io/stats.js/build/stats.min.js'; document.head.appendChild(script); })();

function init() {

    arInit();
    // 初始化場景物件
    let nicePos = 0, total = 0;
    let allPos = [
        [0, 0],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
    ]
    allPos.forEach((pos) => {
        obstacles.push(new Obstacle(new THREE.Vector3(pos[0], 0, pos[1]), 0.2));
    })

    //目標陣列初始化
    for (let i = 0; i < 5; i++) {
        targets.push(Target.createOne(obstacles));
    }

    //讀取車子的model
    let other = { ar: true };
    model = new THREE.Group();
    //https://poly.google.com/view/8Ke5qCnWxsZ
    // readModel('shark', 'shark', 0.1, model,other);
    //////////////////////////////////////////////////////////////////////////	
    clock = new THREE.Clock();
    // //場景全亮
    let ambientLight = new THREE.AmbientLight(0xffffff);
    markerRoot.add(ambientLight);
    agent = new Agent(new THREE.Vector3(0.2, 0, 0.2), 0.1);
    agents.push(agent);
    for (let i = 1; i < 2; i++) {
        let pos = agent.pos.clone();
        pos.x += 0.02 * Math.random() - 0.01;
        pos.z += 0.02 * Math.random() - 0.01;
        agents.push(new Agent(pos, 0.1))
    }
    agents.forEach((agent) => {
        markerRoot.add(agent);
    })
}

function animate() {
    //新增車到場景，提供計算自己與鄰居的力量
    let dt = clock.getDelta();
    agents.forEach((agent) => {
        agent.update(dt);
    })

    // check agent crossing obstacles ...
    obstacles.forEach(function (obs) { obs.checkCollision(agent) });

    if (targets.length == minTargetCnt) {
        targets.push(Target.createOne(obstacles));
    }
    requestAnimationFrame(animate);
    render();
}

function render() {
    renderer.render(scene, camera);
    //AR相關
    if (arToolkitSource.ready === false) return
    arToolkitContext.update(arToolkitSource.domElement)
}

function onResize() {
    arToolkitSource.onResize()
    arToolkitSource.copySizeTo(renderer.domElement)
    if (arToolkitContext.arController !== null) {
        arToolkitSource.copySizeTo(arToolkitContext.arController.canvas)
    }
}

function arInit() {
    // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
    let _iOSDevice = !!navigator.platform.match(/iPhone|iPod|iPad/);

    console.log('iOS: ' + _iOSDevice)

    // init renderer
    renderer = new THREE.WebGLRenderer({
        // antialias	: true,
        alpha: true
    });

    renderer.setClearColor(new THREE.Color('lightgrey'), 0)
    // renderer.setPixelRatio( 1/2 );
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.top = '0px'
    renderer.domElement.style.left = '0px'
    document.body.appendChild(renderer.domElement);

    // init scene and camera
    scene = new THREE.Scene();

    //////////////////////////////////////////////////////////////////////////////////
    //		Initialize a basic camera
    //////////////////////////////////////////////////////////////////////////////////

    // Create a camera
    camera = new THREE.Camera();
    scene.add(camera);

    ////////////////////////////////////////////////////////////////////////////////
    //          handle arToolkitSource
    ////////////////////////////////////////////////////////////////////////////////

    arToolkitSource = new THREEx.ArToolkitSource({
        // to read from the webcam 
        sourceType: 'webcam',
    })

    arToolkitSource.init(function onReady() {
        onResize()
    })

    // handle resize
    window.addEventListener('resize', function () {
        onResize()
    })
    ////////////////////////////////////////////////////////////////////////////////
    //          initialize arToolkitContext
    ////////////////////////////////////////////////////////////////////////////////


    // create atToolkitContext
    arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: THREEx.ArToolkitContext.baseURL + 'camera_para.dat',
        detectionMode: 'mono',
        maxDetectionRate: 30,
        canvasWidth: 80 * 3,
        canvasHeight: 60 * 3,
    })
    // initialize it
    arToolkitContext.init(function onCompleted() {
        // copy projection matrix to camera
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
    })


    ////////////////////////////////////////////////////////////////////////////////
    //          Create a ArMarkerControls
    ////////////////////////////////////////////////////////////////////////////////

    markerRoot = new THREE.Group
    scene.add(markerRoot)
    var artoolkitMarker = new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
        type: 'pattern',
        patternUrl: THREEx.ArToolkitContext.baseURL + 'patt.hiro'
        // patternUrl : THREEx.ArToolkitContext.baseURL + '../data/data/patt.kanji'
    })

    ////////////////////////////////////////////////////////////////////
}

function randomPos() {
    return new THREE.Vector3(
        Math.random() * 2 - 1,
        0,
        Math.random() * 2 - 1);
}