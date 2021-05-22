// global variables
var renderer, scene, camera;
var stats;
var markerKanji, markerHiro;
var arToolKitSource, arToolKitContext;

var raycaster, pickables;
var showHiro = false;
var _iOSDevice;
var listener;
var sunset, sunsetStartPos;
var startButton = document.getElementById('startButton');
startButton.addEventListener('click', init);

animate();

function init() {
    var overlay = document.getElementById('overlay');
    overlay.remove();

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
        sourceType: 'webcam',
    })

    arToolkitSource.init(function onReady() {
        onResize()
    })

    // handle resize
    window.addEventListener('resize', function () {
        onResize()
    })
    function onResize() {
        arToolkitSource.onResize()
        arToolkitSource.copySizeTo(renderer.domElement)
        if (arToolkitContext.arController !== null) {
            arToolkitSource.copySizeTo(arToolkitContext.arController.canvas)
        }
    }
    ////////////////////////////////////////////////////////////////////////////////
    //          initialize arToolkitContext
    ////////////////////////////////////////////////////////////////////////////////

    arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: './vendor/hw6/camera_para.dat',
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

    markerHiro = addMarkerHiro();
    scene.add(markerHiro);

    // create an AudioListener and add it to the camera
    listener = new THREE.AudioListener();
    camera.add(listener);
    // create a global audio source
    var sound = new THREE.Audio(listener);
    // load a sound and set it as the Audio object's buffer
    var audioLoader = new THREE.AudioLoader();
    audioLoader.load('./vendor/hw6/water.mp3', function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
    });
    var crowSound = new THREE.Audio(listener);
    audioLoader.load('./vendor/hw6/crow.mp3', function (buffer) {
        crowSound.setBuffer(buffer);
        crowSound.setLoop(true);
        crowSound.setVolume(0.5);
        crowSound.play();
    });

    stats = new Stats();
    document.body.appendChild(stats.dom);
}

function addMarkerHiro() {
    let markerRootHiro = new THREE.Group();
    var artoolkitMarker = new THREEx.ArMarkerControls(arToolkitContext, markerRootHiro, {
        type: 'pattern',
        patternUrl: './vendor/hw6/patt.broken'
    })
    sceneInit(markerRootHiro, 0.02);
    return markerRootHiro;
}

function sceneInit(markerRootHiro, scale) {
    let scaleGroup = new THREE.Group();
    let loader = new THREE.TextureLoader();
    //老樹https://kknews.cc/culture/p9k228.html
    let oldtreeTex = loader.load('./vendor/hw6/textures/oldtree.png');
    var oldtree = new THREE.Mesh(new THREE.PlaneGeometry(41.6, 60.0),
        new THREE.MeshPhongMaterial({
            map: oldtreeTex,
            side: THREE.DoubleSide,
            transparent: true
        })
    );
    var light = new THREE.PointLight(0xf06666, 2, 100);
    light.position.set(5, 5, 5);
    scene.add(light);
    oldtree.position.set(-20, 35, 0);
    scaleGroup.add(oldtree);
    //昏鴉
    let crowTex = loader.load('./vendor/hw6/textures/crow.png');
    let size = 16;
    var crow = new THREE.Mesh(new THREE.PlaneGeometry(107 / size, 134 / size),
        new THREE.MeshPhongMaterial({
            map: crowTex,
            side: THREE.DoubleSide,
            transparent: true
        })
    );
    crow.rotation.y = Math.PI;
    crow.position.set(-2, 25, 2);
    oldtree.add(crow);
    //斷腸人、瘦馬https://www.pinterest.com/pin/209980401361378204/
    let peopleHorseTex = loader.load('./vendor/hw6/textures/peoplehorse(black).png');
    size = 6;
    var peopleHorse = new THREE.Mesh(new THREE.PlaneGeometry(148 / size, 164 / size),
        new THREE.MeshPhongMaterial({
            map: peopleHorseTex,
            side: THREE.DoubleSide,
            transparent: true
        })
    );
    peopleHorse.position.set(-10, 164 / size / 2, 25);
    scaleGroup.add(peopleHorse);
    //小橋流水http://img01.jituwang.com/180509/256654-1P50914162513.jpg
    let bridgeTex = loader.load('./vendor/hw6/textures/bridge.png');
    size = 4;
    var bridge = new THREE.Mesh(new THREE.PlaneGeometry(598 / size, 185 / size),
        new THREE.MeshPhongMaterial({
            map: bridgeTex,
            side: THREE.DoubleSide,
            transparent: true
        })
    );
    bridge.position.set(100, 5, 15);
    bridge.rotation.y = Math.PI;
    scaleGroup.add(bridge);
    //夕陽http://www.nipic.com/show/2187761.html
    let sunsetTex = loader.load('./vendor/hw6/textures/sunset.png');
    size = 6;
    sunset = new THREE.Mesh(new THREE.PlaneGeometry(224 / size, 221 / size),
        new THREE.MeshPhongMaterial({
            map: sunsetTex,
            side: THREE.DoubleSide,
            transparent: true
        })
    );
    sunset.position.set(120, 80, -20);
    sunset.rotation.y = Math.PI;
    scaleGroup.add(sunset);
    //人家https://www.ertongtuku.com/hua/20161115/63116.html
    let houseTex = loader.load('./vendor/hw6/textures/house.png');
    size = 4;
    var house = new THREE.Mesh(new THREE.PlaneGeometry(346 / size, 188 / size),
        new THREE.MeshPhongMaterial({
            map: houseTex,
            side: THREE.DoubleSide,
            transparent: true
        })
    );
    house.position.set(-80, 188 / size / 2, -20);
    house.rotation.y = -Math.PI;
    scaleGroup.add(house);
    //書法https://j.17qq.com/article/gejpoegbz.html
    let poemTex = loader.load('./vendor/hw6/textures/poem.png');
    size = 6;
    var poem = new THREE.Mesh(new THREE.PlaneGeometry(663 / size, 663 / size),
        new THREE.MeshBasicMaterial({
            map: poemTex,
            side: THREE.DoubleSide,
            transparent: true
        })
    );
    poem.position.set(20, 50, -30);
    scaleGroup.add(poem);
    scaleGroup.scale.set(scale, scale, scale);
    markerRootHiro.add(scaleGroup);
}

function animate() {
    requestAnimationFrame(animate);

    if (arToolkitSource.ready === false) return
    arToolkitContext.update(arToolkitSource.domElement)

    if (sunset !== undefined) {
        if (sunsetStartPos == undefined)
            sunsetStartPos = sunset.position.clone();
        sunset.position.y -= 0.1;
        if (sunset.position.y <= -20)
            sunset.position.copy(sunsetStartPos);
    }

    renderer.render(scene, camera);
    stats.update();
}