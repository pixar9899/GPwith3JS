var scene, camera, renderer;
//歐逼康啜
var controls;
var width = window.innerWidth;
var height = window.innerHeight - document.querySelector("body > nav").offsetHeight;

var gyro, useGyro = false, gyroCamera;

//時鐘
var clock;
var startTime;
var listener, bgm;

//載入obj的等待畫面
var sceneLoad, cameraLoad, loadCube, loadCubeMat, loadCnt = 0, countText;
var objNameList;
//人物
var debug = false;
var player;
var gcontrol;
var opc = 0.5, k = 10;
var footprints = [];
var keys = [
    [0, { "leftArm": -0.5487891617273497, "rightArm": 0.2331922099915325, "leftLeg": -0.29517358171041486, "leftCalf": 1.7822184589331076, "rightLeg": 0.12172734970364107, "rightCalf": 0, }],
    [1, { "leftArm": -0.25290431837425914, "rightArm": -0.3585774767146487, "leftLeg": -0.5235774767146488, "leftCalf": 1.2294665537679932, "rightLeg": 0.1737510584250636, "rightCalf": 0.5791701947502117, }],
    [2, { "leftArm": 0.12751905165114297, "rightArm": -0.4785774767146488, "leftLeg": -0.3585774767146487, "leftCalf": 0.35156646909398814, "rightLeg": 0.22577476714648614, "rightCalf": 1.3270110076206603, }],
    [3, { "leftArm": 0.12751905165114297, "rightArm": -0.4785774767146488, "leftLeg": -0.12609652836579166, "leftCalf": 0.4816257408975445, "rightLeg": 0.09571549534292989, "rightCalf": 0.5141405588484336, }],
    [4, { "leftArm": 0.12751905165114297, "rightArm": -0.4785774767146488, "leftLeg": -0.5487891617273497, "leftCalf": 0.8392887383573242, "rightLeg": 0.2777984758679085, "rightCalf": 0.3840812870448772, }],
    [5, { "leftArm": 0.12751905165114297, "rightArm": -0.4785774767146488, "leftLeg": -0.4853852667231161, "leftCalf": 0.2540220152413209, "rightLeg": 0.5639288738357322, "rightCalf": 0.4816257408975445, }],
    [6, { "leftArm": 0.12751905165114297, "rightArm": -0.4785774767146488, "leftLeg": -0.16836579170194738, "leftCalf": 0.2540220152413209, "rightLeg": 0.01767993226079584, "rightCalf": 0.4816257408975445, }],
    [7, { "leftArm": 0.2331922099915325, "rightArm": -0.5487891617273497, "leftLeg": 0.12172734970364107, "leftCalf": 0, "rightLeg": -0.29517358171041486, "rightCalf": 1.7822184589331076, }],
    [8, { "leftArm": -0.3585774767146487, "rightArm": -0.25290431837425914, "leftLeg": 0.1737510584250636, "leftCalf": 0.5791701947502117, "rightLeg": -0.5235774767146488, "rightCalf": 1.2294665537679932, }],
    [9, { "leftArm": -0.4785774767146488, "rightArm": 0.12751905165114297, "leftLeg": 0.22577476714648614, "leftCalf": 1.3270110076206603, "rightLeg": -0.3585774767146487, "rightCalf": 0.35156646909398814, }],
    [10, { "leftArm": -0.4785774767146488, "rightArm": 0.12751905165114297, "leftLeg": 0.09571549534292989, "leftCalf": 0.5141405588484336, "rightLeg": -0.12609652836579166, "rightCalf": 0.4816257408975445, }],
    [11, { "leftArm": -0.4785774767146488, "rightArm": 0.12751905165114297, "leftLeg": 0.2777984758679085, "leftCalf": 0.3840812870448772, "rightLeg": -0.5487891617273497, "rightCalf": 0.8392887383573242, }],
    [12, { "leftArm": -0.4785774767146488, "rightArm": 0.12751905165114297, "leftLeg": 0.5639288738357322, "leftCalf": 0.4816257408975445, "rightLeg": -0.4853852667231161, "rightCalf": 0.2540220152413209, }],
    [13, { "leftArm": -0.4785774767146488, "rightArm": 0.12751905165114297, "leftLeg": 0.01767993226079584, "leftCalf": 0.4816257408975445, "rightLeg": -0.16836579170194738, "rightCalf": 0.2540220152413209, }],
    [14, { "leftArm": -0.5487891617273497, "rightArm": 0.2331922099915325, "leftLeg": -0.29517358171041486, "leftCalf": 1.7822184589331076, "rightLeg": 0.12172734970364107, "rightCalf": 0, }]]

//自己去BPM檢測出來的是120但是動作太快了所以改成240
var T = 240 / 120;
var bgmFinished = false;

class Footprint {
    static texture = new THREE.TextureLoader().load('./vendor/textures/pinkpanther/footprint.png');
    constructor(position, rotation) {
        this.print = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshBasicMaterial({ map: Footprint.texture, alphaTest: 0.5, transparent: true, side: THREE.DoubleSide }));
        this.print.position.copy(position);
        this.print.rotation.x = Math.PI / 2;
        this.print.rotation.z = -rotation;
        scene.add(this.print);
        this.remove = false;
    }
    lost(dt) {
        this.print.material.opacity -= dt * 40;
        if (this.print.material.opacity <= 0) {
            scene.remove(this.print);
            this.remove = true;
        }
    }
}

class Player {
    constructor(k = 10, opc = 0.5, keys, T) {
        this.player = new THREE.Group();
        this.head = Player.makeHead(k, opc);
        this.torso = Player.makeTorso(k, opc);
        this.player.add(this.head, this.torso);
        this.head.position.y = 7.57 * k;
        this.torso.position.y = 4.09 * k;

        //左手
        this.lArm = Player.makeArm(k, opc, 'ZYX');
        this.player.add(this.lArm);
        this.lArm.position.set(1.26 * k + 0.62 * k, 7.57 * k, 0);
        //左腿
        [this.lLeg, this.lCalf, this.lSole] = Player.makeLeg(k, opc, 'ZYX');
        this.lLeg.position.set(0.63 * k, 4.09 * k, 0);
        this.player.add(this.lLeg);

        this.lArm.rotation.z = -Math.PI / 2;
        this.lLeg.rotation.z = -Math.PI / 2;

        //右手
        this.rArm = Player.makeArm(k, opc, 'ZYX');
        this.player.add(this.rArm);
        this.rArm.position.set(-(1.26 * k + 0.62 * k), 7.57 * k, 0);
        //右腿
        [this.rLeg, this.rCalf, this.rSole] = Player.makeLeg(k, opc, 'ZYX');
        this.rLeg.position.set(-0.63 * k, 4.09 * k, 0);
        this.player.add(this.rLeg);

        this.rArm.rotation.z = -Math.PI / 2;
        this.rLeg.rotation.z = -Math.PI / 2;

        this.keys = keys;
        this.T = T;

        this.footdown = {
            //0是不用1是右腳2是左腳3是兩腳一起
            "LR": [0, 1, 2, 3, 0, 1, 0, 2, 0, 1, 2, 2, 0, 3, 0],
            "prevkey": 0,
        };
        this.player.traverse((obj) => {
            obj.castShadow = true;
        })
    }

    pose(gcontrol) {
        this.lArm.rotation.y = gcontrol.leftArm;
        this.lLeg.rotation.y = gcontrol.leftLeg;
        this.rArm.rotation.y = gcontrol.rightArm;
        this.rLeg.rotation.y = gcontrol.rightLeg;
        this.lCalf.rotation.y = gcontrol.leftCalf;
        this.rCalf.rotation.y = gcontrol.rightCalf;
    }

    move(t, r) {
        this.player.position.x = Math.cos(t) * r;
        this.player.position.z = Math.sin(t) * r;
        this.player.rotation.y = -t;
    }

    footprint(i) {
        if (i != this.footdown.prevkey) {
            this.footdown.prevkey = i;
            let lr = this.footdown.LR[i];
            if (lr == 0) return undefined;
            let pos = new THREE.Vector3();
            let footprint = [];
            if (lr == 1) {
                this.rSole.getWorldPosition(pos);
                pos.y = 0;
                footprint.push(new Footprint(pos, this.player.rotation.y));
            }
            else if (lr == 2) {
                this.lSole.getWorldPosition(pos);
                pos.y = 0;
                footprint.push(new Footprint(pos, this.player.rotation.y));
            } else {
                this.rSole.getWorldPosition(pos);
                pos.y = 0;
                footprint.push(new Footprint(pos, this.player.rotation.y));
                this.lSole.getWorldPosition(pos);
                pos.y = 0;
                footprint.push(new Footprint(pos, this.player.rotation.y));
            }
            return footprint;
        } else return undefined;
    }

    keyframe(t, startTime) {
        var s = ((t - startTime) % this.T) / this.T * (this.keys.length - 1);

        for (var i = 1; i < this.keys.length; i++) {
            if (this.keys[i][0] > s) break;
        }
        // take i-1
        var ii = i - 1;
        var a = (s - this.keys[ii][0]) / (this.keys[ii + 1][0] - this.keys[ii][0]);
        let intKey = {
            'leftArm': (this.keys[ii][1].leftArm * (1 - a) + this.keys[ii + 1][1].leftArm * a),
            'leftLeg': (this.keys[ii][1].leftLeg * (1 - a) + this.keys[ii + 1][1].leftLeg * a),
            'rightArm': (this.keys[ii][1].rightArm * (1 - a) + this.keys[ii + 1][1].rightArm * a),
            'rightLeg': (this.keys[ii][1].rightLeg * (1 - a) + this.keys[ii + 1][1].rightLeg * a),
            'leftCalf': (this.keys[ii][1].leftCalf * (1 - a) + this.keys[ii + 1][1].leftCalf * a),
            'rightCalf': (this.keys[ii][1].rightCalf * (1 - a) + this.keys[ii + 1][1].rightCalf * a),
        };
        this.pose(intKey);
        //顯示腳印
        return this.footprint(i);
    }

    static makeArm(k, opc, order = 'XYZ') {
        var textureLoader = new THREE.TextureLoader();
        let path = './vendor/textures/pinkpanther/';
        var cubeMaterials =
            [
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_up.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_down.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_side.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_side.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_Z.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_Z.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
            ];
        var group = new THREE.Group();
        var mat = new THREE.MeshNormalMaterial({ transparent: true, opacity: opc });
        var body = new THREE.Mesh(new THREE.BoxGeometry(3.82 * k, 1.24 * k, 1.24 * k), cubeMaterials);

        group.add(body);
        body.position.x = 3.82 * k / 2;
        group.rotation.order = order;
        return group;
    }

    static makeLeg(k, opc, order = 'XYZ') {
        var textureLoader = new THREE.TextureLoader();
        let path = './vendor/textures/pinkpanther/';
        var legMat =
            [
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_up.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_down.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'leg_side.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'leg_side.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'leg_Z.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'leg_Z.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
            ];
        var calfMat =
            [
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_up.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'hand_down.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'calf_side.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'calf_side.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'calf_Z.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'calf_Z.png'), side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 0.1 }),
            ];
        var group = new THREE.Group();
        var mat = new THREE.MeshNormalMaterial({ transparent: true, opacity: opc });
        var thigh = new THREE.Mesh(new THREE.BoxGeometry(2.045 * k, 1.26 * k, 1.26 * k), legMat);
        var group2 = new THREE.Group();
        //小腿
        var calf = new THREE.Mesh(new THREE.BoxGeometry(2.045 * k, 1.26 * k, 1.26 * k), calfMat);
        //腳底一個偵測用的小圓(三角形)，用於腳印的位置用的
        var sole = new THREE.Mesh(new THREE.CircleGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 'cyan', transparent: true, opacity: 0 }));
        //挪動到腳底的位置
        sole.position.x = 2.045 * k;
        group2.add(sole);
        group.add(thigh);
        thigh.position.x = 2.045 * k / 2;
        group2.add(calf);
        calf.position.x = 2.045 * k / 2;
        group.add(group2);
        group2.position.x = 4.09 * k / 2;
        group.rotation.order = order;
        return [group, group2, sole];
    }

    static makeHead(k, opc) {
        var headGroup = new THREE.Group();
        var mat = new THREE.MeshNormalMaterial({ transparent: true, opacity: opc });
        var textureLoader = new THREE.TextureLoader();
        let path = './vendor/textures/pinkpanther/';
        var cubeMaterials =
            [
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'h2.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'h3.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'h4.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'h5.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'h1.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'h6.png'), side: THREE.DoubleSide, transparent: true })
            ];
        var headBody = new THREE.Mesh(new THREE.BoxGeometry(2.52 * k, 2.52 * k, 2.52 * k), cubeMaterials);
        var mouse = new THREE.Mesh(new THREE.PlaneGeometry(3.78 * k, 1.26 * k), new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'mouse.png'), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }))
        var left_ear = new THREE.Mesh(new THREE.PlaneGeometry(0.63 * k, 0.63 * k), new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'ear.png'), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }))
        var right_ear = new THREE.Mesh(new THREE.PlaneGeometry(0.63 * k, 0.63 * k), new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'ear.png'), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }))
        left_ear.position.set(-1.26 * k, 2.8 * k, 1.27 * k);
        right_ear.rotation.y = Math.PI;
        right_ear.position.set(1.26 * k, 2.8 * k, 1.27 * k);
        mouse.position.set(0, 0.315 * k, 1.27 * k);
        headGroup.add(mouse, headBody, left_ear, right_ear);
        headBody.position.y = 2.52 * k / 2;
        return headGroup;
    }

    static makeTorso(k, opc) {
        var textureLoader = new THREE.TextureLoader();
        let path = './vendor/textures/pinkpanther/';
        var cubeMaterials =
            [
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'body3.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'body3.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'body4.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'body5.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'body1.png'), side: THREE.DoubleSide, transparent: true }),
                new THREE.MeshBasicMaterial({ map: textureLoader.load(path + 'body2.png'), side: THREE.DoubleSide, transparent: true })
            ];
        var group = new THREE.Group();
        var body = new THREE.Mesh(new THREE.BoxGeometry(2.52 * k, 3.48 * k, 1.26 * k), cubeMaterials);
        group.add(body);
        body.position.y = 3.48 * k / 2;
        return group;
    }
}

function init() {
    scene = new THREE.Scene();

    //orbitcontrol用
    camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
    camera.position.set(300, 200, 300);
    gyroCamera = camera.clone();

    //listenter
    listenerInit();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x888888);
    //陰影
    renderer.shadowMap.enabled = true;
    //2=PCFSoftShadowMap
    renderer.shadowMap.type = 2;

    //歐逼康啜
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    //歐逼康啜
    gyroControls = new THREE.OrbitControls(gyroCamera, renderer.domElement);
    $('body').append(renderer.domElement);
    objNameList = ['chicken', 'nest'];
    lightInit();
    sceneLoadInit();
    sceneInit();
}

function listenerInit() {
    // create an AudioListener and add it to the camera
    listener = new THREE.AudioListener();
    camera.add(listener);
    // create a global audio source
    bgm = new THREE.Audio(listener);

    // // load a bgm and set it as the Audio object's buffer
    var audioLoader = new THREE.AudioLoader();
    audioLoader.load('vendor/sounds/pink-panther-theme.mp3', function (buffer) {
        bgm.setBuffer(buffer);
        bgm.setLoop(true);
        bgm.setVolume($('#bgmVolume').val() * 0.01);
        bgm.play();
        bgmFinished = true;
    });
}

function sceneInit() {
    clock = new THREE.Clock();
    startTime = clock.getElapsedTime();
    let grass = new THREE.TextureLoader().load('vendor/textures/grass.png');
    grass.wrapS = THREE.RepeatWrapping;
    grass.wrapT = THREE.RepeatWrapping;
    grass.repeat.set(40, 40);
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600),
        new THREE.MeshLambertMaterial({
            polygonOffset: true,
            polygonOffsetFactor: 0.1,
            map: grass,
            side: THREE.DoubleSide
        })
    );
    floor.position.x = -0.1;
    scene.add(floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    let cubeMap = loadCubemap('vendor/textures/cubeMap3/');
    scene.background = cubeMap;
    player = new Player(k, opc, keys, T);
    scene.add(player.player);
    gyro = new THREE.Gyroscope();
    scene.add(gyro);
    gyro.add(gyroCamera);
    player.player.add(gyro);
    //https://poly.google.com/view/dwqGR4r600F
    //made by Kyler Swanson
    readModel('minecraft_chicken', 'chicken', 40, scene);
    //https://poly.google.com/view/fq_bAKD1Khg
    //made by "Poly by Google"
    readModel('lowpoly_nest', 'nest', 40, scene);
}

function lightInit() {
    // directional light
    let dLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dLight.position.set(80, 160, -100);
    dLight.castShadow = true;
    dLight.shadow.camera.left = -500;
    dLight.shadow.camera.top = -500;
    dLight.shadow.camera.right = 500;
    dLight.shadow.camera.bottom = 500;
    dLight.shadow.camera.near = 1;
    dLight.shadow.camera.far = 500;
    dLight.target = scene;
    dLight.shadow.mapSize.width = dLight.shadow.mapSize.height = 2048;
    dLight.shadow.bias = -.05;
    scene.add(dLight);
    //環境光
    let ambientLight = new THREE.AmbientLight(0x888888);
    scene.add(ambientLight);
}

function sceneLoadInit() {
    sceneLoad = new THREE.Scene();
    cameraLoad = new THREE.PerspectiveCamera(
        80,
        width / height,
        1,
        1000
    );
    cameraLoad.position.set(0, 0, 50);
    let color = {
        "h": Math.random(),
        "s": Math.random() / 2 + 0.5,
        "l": Math.random() / 2 + 0.25
    }
    loadCubeMat = new THREE.MeshPhongMaterial();
    loadCubeMat.color = new THREE.Color().setHSL(color.h, color.s, color.l);
    loadCube = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), loadCubeMat);
    let loadPlight = new THREE.PointLight(0xffffff);
    loadPlight.position.set(10, 10, 10);
    //載入數量顯示
    var Text2D = THREE_Text.MeshText2D;
    var textAlign = THREE_Text.textAlign;
    countText = new Text2D(loadCnt + " / " + objNameList.length, {
        align: textAlign.center,
        font: '15px 微軟正黑體',
        fillStyle: '#ffffff',
        antialias: true,
        opacity: 1,
    });
    countText.position.set(0, -15, 0);
    countText.scale.set(0.5, 0.5, 0.5);
    sceneLoad.add(loadPlight, loadCube, countText);
}

function animate() {
    loadingAnimate();
    requestAnimationFrame(animate);
}

function loadingAnimate() {
    let isOK = true, nowCnt = 0;
    objNameList.forEach(function (name, index) {
        if (scene.getObjectByName(name) === undefined) {
            isOK = false;
        } else {
            //計算obj已加載數量
            nowCnt++;
        }
    });
    renderer.render(sceneLoad, cameraLoad);
    loadCube.rotation.x += 0.1;
    loadCube.rotation.y -= 0.1;
    //如果有載入任何新物件，loadCube換個顏色
    if (loadCnt != nowCnt) {
        //有載入新的就隨機上色
        let color = {
            "h": Math.random(),
            "s": Math.random() / 2 + 0.5,
            "l": Math.random() / 2 + 0.25
        }
        loadCubeMat.color = new THREE.Color().setHSL(color.h, color.s, color.l);
    }
    //更新已載入數量
    loadCnt = nowCnt;
    countText.text = loadCnt + " / " + objNameList.length;
    //檢測是否bgmload完成，才開始動作，否則動作搭不起來
    if (!bgmFinished) {
        isOK = false;
    }
    if (isOK) {
        let chicken = scene.getObjectByName('chicken');
        //找出雞頭，解決z-fighting問題
        let chickenHead = chicken.children[0].getObjectByName('mesh286481313');
        chickenHead.material.polygonOffset = true;
        chickenHead.material.polygonOffsetFactor = 0.1;
        chicken.position.set(290, 22, 300);
        let nest = scene.getObjectByName('nest');
        nest.position.set(330, 7.5, 350);
        animate = () => {
            if (debug)
                player.pose(gcontrol);
            else {
                let now = clock.getElapsedTime();
                player.move(now / 1.4, 250);
                //腳印與
                let footprint = player.keyframe(now, startTime);
                if (footprint !== undefined) {
                    footprint.forEach((v) => {
                        footprints.push(v);
                    })
                }
                let dt = clock.getDelta();
                //腳印
                for (let i = 0; i < footprints.length;) {
                    footprints[i].lost(dt);
                    if (footprints[i].remove) {
                        footprints.splice(i, 1);
                    } else {
                        i++;
                    }
                }
                let pantherPos = new THREE.Vector3().copy(player.player.position);
                pantherPos.y = 22;
                scene.getObjectByName('chicken').lookAt(pantherPos);
                scene.getObjectByName('chicken').rotation.y += Math.PI / 2;
            }
            if (useGyro)
                renderer.render(scene, gyroCamera);
            else {
                let headPos = new THREE.Vector3();
                player.head.getWorldPosition(headPos);
                camera.lookAt(headPos);
                renderer.render(scene, camera);
            }
            requestAnimationFrame(animate);
        }
    }
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

window.addEventListener('visibilitychange', hidePage);
function hidePage() {
    if (document.visibilityState === 'visible') {
        bgm.setVolume($('#bgmVolume').val() * 0.01);
    }
    else {
        bgm.setVolume(0);
    }
}

$('#bgmVolume').on("change mousemove", function () {
    bgm.setVolume($('#bgmVolume').val() * 0.01);
});
$('#gyroBtn').click(() => {
    useGyro = !useGyro;
    $('#gyroBtn').text(useGyro ? 'lookAt' : 'gyro');
});