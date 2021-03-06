import { MMDAnimationHelper } from 'https://cdn.jsdelivr.net/npm/three@0.113.0/examples/jsm/animation/MMDAnimationHelper.js';
var miku, mikuPoseHelper, mikuObj;
//檢查FPS
javascript: (function () { var script = document.createElement('script'); script.onload = function () { var stats = new Stats(); stats.dom.style.opacity = 0.75; document.body.appendChild(stats.dom); requestAnimationFrame(function loop() { stats.update(); requestAnimationFrame(loop) }); }; script.src = 'https://mrdoob.github.io/stats.js/build/stats.min.js'; document.head.appendChild(script); })();
var scene, camera, renderer, gyro;
var width = window.innerWidth;
var height = window.innerHeight - document.querySelector("body > nav").offsetHeight;
var floor, bgm, dLight;

var firstSetupMiku = true;

//一次走多遠
const LS = 40;
//大腿長=50.01957231662671-26.907079400184326
const L2 = 23.11249291644238;
//膝蓋離地高度(小腿長度)
const L1 = 26.907079400184326;

const Lh = 3.3;
//腰部離地高度
const Hh = 51;// tunable ...
//身體上下高度變化的cos函數幅度
const Hr = 0.6;
//每跨一步隻時間
const Ts = 1.2;
//腳離地面最高高度
const Fc = 10;
//動一次的移動速度
const Vf = LS / Ts;

var leftFoot, rightFoot;
// markers ...
var body;
var bodyball, leftfootball, rightfootball;
var leftpos = [0, 0];
var rightpos = [LS, 0];
var bodypos = [LS / 2, 0];
//時鐘
var clock, nowTime = 0;
var toriiCnt = 1, floorCnt = 1, toriis = [];

function loadMiku(parent) {
    mikuPoseHelper = new MMDAnimationHelper();
    var modelFile = "./vendor/models/miku/miku.pmx";
    // var vpdFile = "./vendor/models/miku/4.vpd";
    var loader = new THREE.MMDLoader();
    loader.load(modelFile, function (mesh) {
        mikuObj = mesh;
        miku = unitize(mesh, 80);
        miku.position.set(15, 0, 20);
        parent.add(miku);
        // loader.loadVPD(vpdFile, false, function (vpd) {
        //     mikuPoseHelper.pose(mesh, vpd);
        // }, onProgress, null);
    }, onProgress, null);
}

class MikuFoot {
    constructor(miku, foot, knee) {
        //預設值不能為0，怕會算到0有問題
        this.thetaGroin = 0.31;
        //預設值不能為0，怕會算到0有問題
        this.thetaKnee = 0.6;
        this.target = new THREE.Vector3();
        this.body = miku;
        this.thigh = foot;
        this.leg = knee;
    }

    update(targetPos) {
        this.body.position.set(bodypos[0], bodypos[1], 0);
        let thetas = [0, 0];
        this.target.copy(this.body.worldToLocal(new THREE.Vector3(targetPos[0], targetPos[1], 0)));
        this.ccdSys.solve(this.target, thetas);
        this.thetaGroin = thetas[0];
        this.thetaKnee = thetas[1];

        this.thigh.rotation.x = -this.thetaGroin;
        this.leg.rotation.x = -this.thetaKnee;
    }
}

function fk(theta, joints) {  // all memory assumed in place
    joints[0].set(0, 0, 0);

    var localzero = new THREE.Vector3(0, 0, 0);
    var m = new THREE.Matrix4();
    m.makeRotationZ(theta[0]);
    m.multiply(new THREE.Matrix4().makeTranslation(0, -L2, 0));
    localzero.applyMatrix4(m);
    joints[1].copy(localzero);

    localzero.set(0, 0, 0);
    m.multiply(new THREE.Matrix4().makeRotationZ(theta[1]));
    m.multiply(new THREE.Matrix4().makeTranslation(0, -L1, 0));
    localzero.applyMatrix4(m);
    joints[2].copy(localzero);
}

function trackers(tt) {
    var body = [LS / 2 + LS * tt / Ts, Hh - Hr / 2 * Math.cos(2 * Math.PI * tt / Ts)];
    var n = Math.floor(tt / Ts);

    //return bodyElevation & footElevation
    return [Hh - Hr / 2 * Math.cos(2 * Math.PI * tt / Ts),
    Fc / 2 - Fc / 2 * Math.cos(2 * Math.PI * tt / Ts)];
}

function ccdSlove(bodypos, data, dt, tt) {
    bodypos[0] += Vf * dt;
    bodypos[1] = data[0];

    var n = Math.floor(tt / Ts);
    // n is even: left is swing
    // n is odd:  right is swing
    if (Math.floor(n / 2) * 2 === n) { // n is even
        leftpos[1] = data[1];
        leftpos[0] += 2 * Vf * dt;
        let i = tt / Ts - n < 0.5 ? -1 : 1;
        miku.getObjectByName('右肩').rotation.x = -((tt / Ts - n) - 0.5);
        miku.getObjectByName('左肩').rotation.x = (tt / Ts - n) - 0.5;
    } else { // n is odd
        rightpos[1] = data[1];
        rightpos[0] += 2 * Vf * dt;
        miku.getObjectByName('右肩').rotation.x = ((tt / Ts - n) - 0.5);
        miku.getObjectByName('左肩').rotation.x = -(tt / Ts - n) + 0.5;
    }
}

function walkAnimate() {
    var tt = clock.getElapsedTime();
    var data = trackers(tt);

    // compute my own delta ...
    var dt = tt - nowTime;
    nowTime = tt;
    ccdSlove(bodypos, data, dt, tt)
    leftFoot.update(leftpos);
    rightFoot.update(rightpos);
    rightFoot.body.position.z += 10;
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
    camera.position.set(0, 60, 250);

    //listenter
    listenerInit();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x888888);
    //陰影
    renderer.shadowMap.enabled = true;
    //2=PCFSoftShadowMap
    renderer.shadowMap.type = 2;

    $('body').append(renderer.domElement);

    body = new THREE.Object3D();
    loadMiku(body);
    sceneInit();
    lightInit();
}

function modelInit() {
    miku.position.y -= Hh;
    leftFoot = new MikuFoot(body, miku.getObjectByName('左足'), miku.getObjectByName('左ひざ'));
    rightFoot = new MikuFoot(body, miku.getObjectByName('右足'), miku.getObjectByName('右ひざ'));
    miku.getObjectByName('右肩').rotation.z += 0.5;
    miku.getObjectByName('左肩').rotation.z -= 0.5;
    leftFoot.ccdSys = new CCDSys(fk);
    //大腿
    leftFoot.ccdSys.setCCDAxis(new THREE.Vector3(0, 0, 1), 0, -Math.PI / 2, Math.PI / 2);
    //小腿
    leftFoot.ccdSys.setCCDAxis(new THREE.Vector3(0, 0, 1), 1, -Math.PI, -1e-3);
    rightFoot.ccdSys = new CCDSys(fk);
    //大腿
    rightFoot.ccdSys.setCCDAxis(new THREE.Vector3(0, 0, 1), 0, -Math.PI / 2, Math.PI / 2);
    //小腿
    rightFoot.ccdSys.setCCDAxis(new THREE.Vector3(0, 0, 1), 1, -Math.PI, -1e-3);

    //在這邊讓gyro去追蹤腰部
    gyro = new THREE.Gyroscope();
    scene.add(gyro);
    gyro.add(camera);
    miku.add(gyro);
}

function newTorii() {
    let torii = scene.getObjectByName('Torii').clone();
    torii.position.x = toriiCnt * 100;
    scene.add(torii);
    toriis.push(torii);
    toriiCnt++;
}

function checkTorii() {
    camera.updateMatrix();
    camera.updateMatrixWorld();
    var frustum = new THREE.Frustum();
    frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    // 檢查每個鳥居是否有出現在螢幕上
    for (let i = 0; i < toriis.length; i++) {
        var pos = toriis[i].position;
        if (frustum.containsPoint(pos)) return;
        scene.remove(toriis[0]);
        toriis.splice(0, 1);
        newTorii();
        return;
    }
}

function newFloor() {
    let newOne = floor.clone();
    newOne.position.x = floorCnt * 1600;
    newOne.name = 'floor' + floorCnt;
    newOne.position.x = floorCnt * 1600;
    scene.add(newOne);
    floorCnt++;
}

function checkFloor() {
    let no = Math.floor(body.position.x / 1600) - 1;
    let name = 'floor' + no;
    let thisFloor = scene.getObjectByName(name);
    if (thisFloor) {
        scene.remove(thisFloor);
        newFloor();
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (mikuObj !== undefined && scene.getObjectByName('Torii') !== undefined) {
        if (firstSetupMiku) {
            modelInit();
            scene.add(body);
            dLight.target = body;
            window.clock = clock;
            window.miku = miku;
            window.scene = scene;
            window.mikuObj = mikuObj;
            window.floor = floor;
            firstSetupMiku = false;
            scene.getObjectByName('Torii').position.z = miku.position.z + 20;
            toriis.push(scene.getObjectByName('Torii'));
            for (toriiCnt = 1; toriiCnt < 10; toriiCnt++) {
                let torii = scene.getObjectByName('Torii').clone();
                torii.position.x = toriiCnt * 100;
                toriis.push(torii);
                scene.add(torii);
            }
            for (let i = 1; i < 3; i++) {
                newFloor();
            }
            clock = new THREE.Clock();
        }
        else {
            animate = () => {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
                walkAnimate();
                checkTorii();
                checkFloor();
                dLight.position.x = 200 + body.position.x;
                camera.lookAt(body.position);
            }
        }
    }
}

function listenerInit() {
    // create an AudioListener and add it to the camera
    let listener = new THREE.AudioListener();
    camera.add(listener);
    // create a global audio source
    bgm = new THREE.Audio(listener);

    // // load a bgm and set it as the Audio object's buffer
    var audioLoader = new THREE.AudioLoader();
    audioLoader.load('vendor/sounds/senbonzakura.mp3', function (buffer) {
        bgm.setBuffer(buffer);
        bgm.setLoop(true);
        bgm.setVolume($('#bgmVolume').val() * 0.01);
        bgm.play();
    });
}

function sceneInit() {
    let textureLoader = new THREE.TextureLoader();
    scene.background = textureLoader.load('vendor/textures/senbonzakura.jpg');
    readModel('Torii', 'Torii', 220, scene);
    let grass = new THREE.TextureLoader().load('vendor/textures/mountainrock.jpg');
    grass.wrapS = THREE.RepeatWrapping;
    grass.wrapT = THREE.RepeatWrapping;
    grass.repeat.set(40, 40);
    floor = new THREE.Object3D();
    let plane = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600),
        new THREE.MeshLambertMaterial({
            polygonOffset: true,
            polygonOffsetFactor: 0.1,
            map: grass,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        })
    );
    plane.position.x = -800;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    plane.position.x = -0.1;
    floor.add(plane);
    let floor0 = floor.clone();
    floor0.name = 'floor0';
    scene.add(floor0);
}

function lightInit() {
    // directional light
    dLight = new THREE.DirectionalLight(0xffffff, 1);
    dLight.position.set(80, 160, -50);
    dLight.castShadow = true;
    dLight.shadow.camera.left = -1000;
    dLight.shadow.camera.top = -1000;
    dLight.shadow.camera.right = 1000;
    dLight.shadow.camera.bottom = 1000;
    dLight.shadow.camera.near = -1000;
    dLight.shadow.camera.far = 1000;
    dLight.shadow.mapSize.width = dLight.shadow.mapSize.height = 4096;
    // dLight.shadow.bias = -.05;
    scene.add(dLight);
    //環境光
    let ambientLight = new THREE.AmbientLight(0x888888);
    scene.add(ambientLight);
}

function loadCubemap(path) {
    var format = '.jpg';
    var files = [
        path + 'posx' + format, path + 'negx' + format,
        path + 'posy' + format, path + 'negy' + format,
        path + 'posz' + format, path + 'negz' + format
    ];
    var loader = new THREE.CubeTextureLoader();
    var cubeMap = loader.load(files);
    cubeMap.format = THREE.RGBFormat;
    return cubeMap;
}

//視窗resize
window.addEventListener('resize', canvasResize);

function canvasResize() {
    //抓出新的長寬值
    width = window.innerWidth;
    height = window.innerHeight - document.querySelector("body > nav").offsetHeight;
    //canvas的長寬改掉
    $('canvas:eq(0)').width(width);
    $('canvas:eq(0)').height(height);
    //更新ProjectionMatrix
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    //渲染器改長寬
    renderer.setSize(width, height);
}

$('#bgmVolume').on("change mousemove", function () {
    bgm.setVolume($('#bgmVolume').val() * 0.01);
});

export { init, animate };