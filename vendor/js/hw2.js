var scene, camera, renderer;
//歐逼康啜
var controls;
var width = window.innerWidth;
var height = window.innerHeight - document.querySelector("body > nav").offsetHeight;
//時鐘
var clock, dt;

//球
var pucks = [], puckCount = 20;
//外牆陣列
var walls = [];
//盒子陣列
var boxes = [];

var listener, bgm;

class Color {
    static randomHSL() {
        return {
            "h": Math.random(),
            "s": Math.random() / 2 + 0.5,
            "l": Math.random() / 2 + 0.25
        }
    }
}

class Puck {
    static speed = 80;
    static radius = 15;
    //半徑平方
    static r2 = Puck.radius * Puck.radius;
    //直徑平方
    static sqR = Puck.radius * 2 * Puck.radius * 2;
    constructor(listener) {
        let color = Color.randomHSL();
        let puckColor = new THREE.Color().setHSL(color.h, color.s, color.l);
        this.colorLight = new THREE.PointLight(puckColor, 1.2, 100);
        //拉高光源位置
        this.colorLight.position.y = 5;
        this.puck = new THREE.Mesh(
            new THREE.CylinderGeometry(Puck.radius, Puck.radius, 4, 64),
            new THREE.MeshBasicMaterial({ color: puckColor })
        );
        //拉到水平面
        this.puck.position.y = 2;
        //將光源加入puck
        this.puck.add(this.colorLight);
        //初始化物理屬性
        this.puckPropInit();
        //音效來源
        //http://tw.yisell.com/search_pop.htm?yn=p2014072916535926602_66366&ym=yc&id=cU7RuwHf7hs=&yc=22&yt=WKwj08EjydfJlrOuXWrGZ5Y3rDjL35tX1O6oquGPAIPIE7eo=
        // this.audioElement = document.createElement('audio');
        // this.audioElement.setAttribute('src', 'vendor/sounds/bound.mp3');

        // create a global audio source
        var sound = new THREE.PositionalAudio(listener);
        // load a sound and set it as the Audio object's buffer
        var audioLoader = new THREE.AudioLoader();
        audioLoader.load('vendor/sounds/bound.mp3', function (buffer) {
            sound.setBuffer(buffer);
            sound.setRefDistance(20);
            sound.setVolume(0.1);
        });
        this.puck.add(sound);
        this.sound = sound;
    }

    puckPropInit() {
        //球的受力
        this.force = new THREE.Vector3(0, 0, 0);
        //球的速度(初始設定隨機方向)
        this.vel = new THREE.Vector3(
            Math.floor(Math.random() < 0.5 ? Puck.speed : -Puck.speed),
            0,
            Math.floor(Math.random() < 0.5 ? Puck.speed : -Puck.speed)
        );
        //球的計算後位置
        this.pos = new THREE.Vector3(Math.random() * 370 - 185, 2, Math.random() * 370 - 185);
    }

    move(dt) {
        this.vel.add(this.force.clone().multiplyScalar(dt));
        this.pos.add(this.vel.clone().multiplyScalar(dt));
        this.puck.position.copy(this.pos);
    }

    isBound(play = true) {
        //兩顆球撞再一起，播放一顆就好了
        if (play) {
            this.sound.isPlaying = false;
            this.sound.play();
        }
        this.colorChange();
    }

    colorChange() {
        let color = Color.randomHSL();
        this.puck.material.color.setHSL(color.h, color.s, color.l);
        this.colorLight.color.setHSL(color.h, color.s, color.l);
    }
}

class Wall {
    //牆壁彈性碰撞係數
    static cR = 1.0;
    static eps = 1e-3; // 0.001 
    constructor(position, size, point, normal) {
        this.wall = new THREE.Mesh(
            new THREE.BoxGeometry(size.x, size.y, size.z),
            new THREE.MeshPhongMaterial({
                'transparent': true,
                'opacity': 0.6
            })
        );
        this.wall.position.copy(position);
        this.point = point;
        this.normal = normal;
    }
}

class Box {
    //方形彈性碰撞係數
    static cR = 1.0;
    static eps = 1e-3; // 0.001 
    constructor(pos, size) {
        this.size = size;
        this.box = new THREE.Mesh(
            new THREE.BoxGeometry(size.x, size.y, size.z),
            new THREE.MeshBasicMaterial({
                'transparent': true,
                'opacity': 0.7
            })
        );
        let color = Color.randomHSL();
        this.box.material.color.setHSL(color.h, color.s, color.l);
        this.box.position.copy(pos);
        this.max = new THREE.Vector3(pos.x + size.x / 2, 0, pos.z + size.z / 2);
        this.min = new THREE.Vector3(pos.x - size.x / 2, 0, pos.z - size.z / 2);
        this.normal = [
            new THREE.Vector3(1, 0, 0),//x軸正向
            new THREE.Vector3(-1, 0, 0),//x軸負向
            new THREE.Vector3(0, 0, 1),//z軸正向
            new THREE.Vector3(0, 0, -1),//z軸負向
        ];
        this.speed = 30;
    }

    move(dt) {
        //1秒60幀 一秒動/60距離
        if (Math.abs(this.box.position.x) >= (200 - this.size.x * 2)) {
            this.speed *= -1;
        }
        let x = this.speed * dt;
        this.box.position.x += x;
        this.max.x += x;
        this.min.x += x;
    }
}

class Bound {
    static boundPuck(puck1, puck2) {
        /*
        彈性碰撞(<>為內積)
        v1'=v1-(2*m2/m1+m2)*(<v1-v2,x1-x2>/||x1-x2||^2)*(x1-x2)
        v2'=v2-(2*m1/m1+m2)*(<v2-v1,x2-x1>/||x2-x1||^2)*(x2-x1)
        球體質量假設一樣，則(2*m2/m1+m2)與(2*m2/m1+m2)皆為1
        化簡為
        v1'=v1-(<v1-v2,x1-x2>/||x1-x2||^2)*(x1-x2)
        v2'=v2-(<v2-v1,x2-x1>/||x2-x1||^2)*(x2-x1)
        */
        //距離平方
        let sqDis = puck1.pos.distanceToSquared(puck2.pos);
        if (sqDis <= Puck.sqR) {
            //共用(算一次)
            let x1x2 = puck1.pos.clone().sub(puck2.pos);
            let x2x1 = x1x2.multiplyScalar(-1);
            //需要有個tempVel存放算好的puck1的速度
            //不能直接sub，因為puck2也需要原始的puck1的vel做計算
            let tempVel = puck1.vel.clone().sub( //v1-
                x1x2.clone().multiplyScalar( //x1-x2
                    puck1.vel.clone().sub(puck2.vel).dot( //v1-v2 dot
                        x1x2.clone() //x1-x2
                    ) / sqDis // 除以|x1-x2|^2
                )
            );
            puck2.vel.sub( //v2-
                x2x1.clone().multiplyScalar( //x2-x1
                    puck2.vel.clone().sub(puck1.vel).dot( //v2-v1 dot
                        x2x1.clone() //x2-x1
                    ) / sqDis // 除以|x1-x2|^2
                )
            );
            //puck2算好之後，在把puck1的vel放回去
            puck1.vel = tempVel;
            //修正位置
            //t=normalize(x2-x1)
            //d=2R-dis(x2,x1)
            let t = x2x1.clone().normalize();
            //假如這麼剛好t要拿來修正，但兩個puck的位置相同
            //那就修改他們的pos並且重跑一次bound然後後面修正把他們return掉
            if (t.x == 0) {
                if (t.z == 0) {
                    puck1.pos.x += Math.random() * 2;
                    puck1.pos.z += Math.random() * 2;
                    puck2.pos.x -= Math.random() * 2;
                    puck2.pos.z -= Math.random() * 2;
                    Puck.bound(puck1, puck2);
                    return;
                }
            }
            let d = Puck.radius * 2 - Math.sqrt(sqDis);
            let modify = t.multiplyScalar(d / 2);
            puck1.pos.sub(modify);
            puck2.pos.add(modify);

            puck1.isBound();
            //play sound false
            puck2.isBound(false);
        }
    }

    static boundWall(puck, wall) {
        if (puck.pos.clone().sub(wall.point).dot(wall.normal) < Wall.eps + Puck.radius) {
            //牆壁當一個水平面而言的
            //垂直分力
            let vN = wall.normal.clone().multiplyScalar(puck.vel.dot(wall.normal));
            //水平分力
            let vT = puck.vel.clone().sub(vN);
            puck.vel.copy(vT.add(vN.multiplyScalar(-Wall.cR)));
            //(R-(x-p)*N)*N
            //puck直徑-((原始位置-P點位置)dot N)倍的N
            let modify = wall.normal.clone().multiplyScalar(Puck.radius - (puck.pos.clone().sub(wall.point).dot(wall.normal)));
            puck.pos.add(modify);
            puck.isBound();
        }
    }

    static boundBox(puck, box) {
        /*
           |
        ---+-->X
           ↓ Z
        將XZ坐標系轉90度思考
           ↑ X
        ---+-->Z
           |
        */
        //要先判斷是哪種狀況
        let max = new THREE.Vector2(box.max.x - puck.pos.x, box.max.z - puck.pos.z);
        let min = new THREE.Vector2(box.min.x - puck.pos.x, box.min.z - puck.pos.z);
        let where = {
            'collision': false,
            'normal': null,
            'point': null
        };
        if (max.x < 0) {
            if (max.y < 0) {
                //方塊的右上角撞到(+X+Z)
                if (max.x * max.x + max.y * max.y < Puck.r2) {
                    where.collision = true;
                    where.point = new THREE.Vector3(box.max.x, puck.pos.y, box.max.z);
                    where.normal = puck.pos.clone().sub(where.point).normalize();
                }
            } else if (min.y > 0) {
                //方塊的左上角撞到(+X-Z)
                if (max.x * max.x + min.y * min.y < Puck.r2) {
                    where.collision = true;
                    where.point = new THREE.Vector3(box.max.x, puck.pos.y, box.min.z);
                    where.normal = puck.pos.clone().sub(where.point).normalize();
                }
            } else {
                //方塊的正上面撞上(+X)
                if (Math.abs(max.x) < Puck.radius) {
                    where.collision = true;
                    where.point = new THREE.Vector3(box.max.x, 0, 0);
                    where.normal = new THREE.Vector3(1, 0, 0);
                }
            }
        } else if (min.x > 0) {
            if (max.y < 0) {
                //方塊的右下角撞上(-X+Z)
                if (min.x * min.x + max.y * max.y < Puck.r2) {
                    where.collision = true;
                    where.point = new THREE.Vector3(box.min.x, puck.pos.y, box.max.z);
                    where.normal = puck.pos.clone().sub(where.point).normalize();
                }
            } else if (min.y > 0) {
                //方塊的左下角撞上(-X-Z)
                if (min.x * min.x + min.y * min.y < Puck.r2) {
                    where.collision = true;
                    where.point = new THREE.Vector3(box.min.x, puck.pos.y, box.min.z);
                    where.normal = puck.pos.clone().sub(where.point).normalize();
                }
            } else {
                //方塊的正下方撞上(-X)
                if (min.x < Puck.radius) {
                    where.collision = true;
                    where.point = new THREE.Vector3(box.min.x, 0, 0);
                    where.normal = new THREE.Vector3(-1, 0, 0);
                }
            }
        } else {
            if (max.y < 0) {
                //方塊的右邊撞到(+Z)
                if (Math.abs(max.y) < Puck.radius) {
                    where.collision = true;
                    where.point = new THREE.Vector3(0, 0, box.max.z);
                    where.normal = new THREE.Vector3(0, 0, 1);
                }
            } else if (min.y > 0) {
                //方塊的左邊撞到(-Z)
                if (min.y < Puck.radius) {
                    where.collision = true;
                    where.point = new THREE.Vector3(0, 0, box.min.z);
                    where.normal = new THREE.Vector3(0, 0, -1);
                }
            } else {
                //方塊穿過去啦！
                //暫時不處理，等發生例外再決定
            }
        }
        if (where.collision) {
            let vN = where.normal.clone().multiplyScalar(puck.vel.dot(where.normal));
            //水平分力
            let vT = puck.vel.clone().sub(vN);
            puck.vel.copy(vT.add(vN.multiplyScalar(-Box.cR)));
            //(R-(x-p)*N)*N
            //puck直徑-((原始位置-P點位置)dot N)倍的N
            let modify = where.normal.clone().multiplyScalar(Puck.radius - (puck.pos.clone().sub(where.point).dot(where.normal)));
            puck.pos.add(modify);
            puck.isBound();
        }
    }
}

function init() {
    scene = new THREE.Scene();

    //orbitcontrol用
    camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
    camera.position.set(0, 200, 320);

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
    $('body').append(renderer.domElement);
    initLight();

    sceneInit();

    pucksInit();

    wallsInit();

    boxesInit();

    clock = new THREE.Clock();
}

function listenerInit() {
    // create an AudioListener and add it to the camera
    listener = new THREE.AudioListener();
    camera.add(listener);
}

function pucksInit() {
    let puckY = 2;
    for (let i = 0; i < puckCount; i++) {
        pucks.push(new Puck(listener));
    }
    pucks.forEach((i) => {
        scene.add(i.puck);
    });
}

function wallsInit() {
    let wallHeight = 25;
    let wallInfo = [
        { "pos": [205, 0], "size": [10, 420], "point": [200, 0], "normal": [-1, 0] },
        { "pos": [-205, 0], "size": [10, 420], "point": [-200, 0], "normal": [1, 0] },
        { "pos": [0, 205], "size": [400, 10], "point": [0, 200], "normal": [0, -1] },
        { "pos": [0, -205], "size": [400, 10], "point": [0, -200], "normal": [0, 1] },
    ];
    wallInfo.forEach((i) => {
        walls.push(
            new Wall(
                new THREE.Vector3(i.pos[0], wallHeight / 2, i.pos[1]),//position
                new THREE.Vector3(i.size[0], wallHeight, i.size[1]),//size
                new THREE.Vector3(i.point[0], 0, i.point[1]),//point
                new THREE.Vector3(i.normal[0], 0, i.normal[1])//normal
            )
        );
    });
    walls.forEach((i) => {
        scene.add(i.wall);
    })
}

function boxesInit() {
    boxes = [
        new Box(new THREE.Vector3(120, 30, 30), new THREE.Vector3(60, 60, 30)),
        new Box(new THREE.Vector3(120, 30, -80), new THREE.Vector3(30, 60, 100)),
        new Box(new THREE.Vector3(-160, 30, 30), new THREE.Vector3(60, 60, 40)),
        new Box(new THREE.Vector3(-120, 30, 120), new THREE.Vector3(30, 60, 30))
    ];
    boxes.forEach((i) => {
        scene.add(i.box);
    })
}

function sceneInit() {
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshPhongMaterial());
    scene.add(floor);
    floor.rotation.x = -Math.PI / 2;
    let cubeMap = loadCubemap('vendor/textures/cubeMap2/');
    scene.background = cubeMap;
    // create a global audio source
    bgm = new THREE.Audio(listener);

    // load a bgm and set it as the Audio object's buffer
    var audioLoader = new THREE.AudioLoader();
    audioLoader.load('vendor/sounds/If_I_Had_a_Chicken.mp3', function (buffer) {
        bgm.setBuffer(buffer);
        bgm.setLoop(true);
        bgm.setVolume($('#bgmVolume').val() * 0.01);
        bgm.play();
    });
}

function initLight() {
    //環境光
    let ambientLight = new THREE.AmbientLight(0202020);
    scene.add(ambientLight);
}

function animate() {
    let dt = clock.getDelta();
    for (let i = 0; i < pucks.length; i++) {
        pucks[i].move(dt);
        //球與牆壁碰撞
        walls.forEach((wall) => {
            //bound會幫忙調整速度方向，並回傳是否有撞到
            Bound.boundWall(pucks[i], wall);
        })
        //球與球碰撞
        for (let j = i; j < pucks.length; j++) {
            if (j == i) continue;
            Bound.boundPuck(pucks[i], pucks[j]);
        }
        //球與箱子碰撞
        for (let j = 0; j < boxes.length; j++) {
            Bound.boundBox(pucks[i], boxes[j]);
        }
    }
    boxes[1].move(dt);
    boxes[3].move(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

function loadCubemap(path) {
    var format = '.png';
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
        clock.start();
        bgm.play();
    }
    else {
        clock.stop();
        bgm.pause();
    }
}
$('#bgmVolume').on("change mousemove", function () {
    bgm.setVolume($('#bgmVolume').val() * 0.01);
});
$('#boundVolume').on("change mousemove", function () {
    pucks.forEach((puck) => {
        puck.sound.setVolume($('#boundVolume').val() * 0.01);
    });
});