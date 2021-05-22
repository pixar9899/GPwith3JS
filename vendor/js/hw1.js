var scene, camera, renderer;
//第三人稱攝影機
var thirdpartyCamera;
//歐逼康啜
var controls;
//鳥瞰攝影機
var skyCamera;
var isSky = false;
var width = window.innerWidth;
var height = window.innerHeight - document.querySelector("body > nav").offsetHeight;
//車子
var car, angle = 0, raidus = 150, speed = 0.02, nowPos;
//時鐘
var clock, dt;

function init() {
    scene = new THREE.Scene();

    //orbitcontrol用
    camera = new THREE.PerspectiveCamera(60, width / 2 / height, 1, 2000);
    camera.position.set(50, 50, 50);

    //第三人稱鏡頭
    thirdpartyCamera = new THREE.PerspectiveCamera(60, width / 2 / height, 1, 2000);
    thirdpartyCamera.position.set(50, 50, 50);

    //鳥瞰攝影機
    let halfSize = 350;
    skyCamera = new THREE.OrthographicCamera(-halfSize, halfSize, halfSize, -halfSize, -10, 600);
    skyCamera.position.y = 50;
    skyCamera.up.set(0, 0, -1);
    skyCamera.lookAt(new THREE.Vector3());

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0xDDDDDD);
    renderer.autoClear = false;
    //陰影
    renderer.shadowMap.enabled = true;
    //2=PCFSoftShadowMap
    renderer.shadowMap.type = 2;

    //歐逼康啜
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    $('body').append(renderer.domElement);
    initLight();
    let cubeMap = loadCubemap("vendor/textures/cubeMap/");
    scene.background = cubeMap;
    scene.add(buildFloor('vendor/textures/', 'desert.png'));
    //把車子讀取進來
    readModel('Lamborghini_Aventador', 'car', 40, scene);
    focus = new THREE.Object3D();
    temp = new THREE.Vector3(0, 0, 0);

    clock = new THREE.Clock();
}

function buildFloor(path, name) {
    //地板
    //https://www.deviantart.com/hhh316/art/Seamless-mountain-rock-183926178
    let planeMat = new THREE.TextureLoader().load(path + name);
    planeMat.wrapS = THREE.RepeatWrapping;
    planeMat.wrapT = THREE.RepeatWrapping;
    planeMat.repeat.set(15, 15);
    let plane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000, 4, 4),
        new THREE.MeshLambertMaterial({
            side: THREE.DoubleSide, // 雙面材質
            map: planeMat,
            color: 0xF0F0F0,//調整亮度到跟skybox相近
        }));
    plane.rotation.x -= Math.PI / 2;
    //地板可以出現影子
    plane.receiveShadow = true;
    return plane;
}

function initLight() {
    // directional light
    let dLight = new THREE.DirectionalLight(0xffffff, 0.5);
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
    dLight.shadow.bias = -.0025;
    scene.add(dLight);
    let ambientLight = new THREE.AmbientLight(0xaaaaaa);
    scene.add(ambientLight);
}

function render() {
    renderer.clear();

    renderer.setViewport(0, 0, width / 2, height);
    if (isSky)
        renderer.render(scene, skyCamera);
    else
        renderer.render(scene, camera);

    renderer.setViewport(width / 2, 0, width / 2, height);
    renderer.render(scene, thirdpartyCamera);
}

function moving() {
    //原為60FPS 每1/60秒要+speed
    //speed/(1/60s)=速度x/dt
    //速度x=speed * dt * 60
    dt = clock.getDelta();
    let x = speed * dt * 60;
    angle -= x;
    nowPos = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(-raidus);
    car.rotation.y = -Math.PI / 2 - angle;
    car.position.copy(nowPos);
}

function animate() {
    requestAnimationFrame(animate);
    let c = scene.getObjectByName('car');
    if (c !== undefined) {
        car = c;
        car.rotation.y = Math.PI / 2;
        car.add(focus);
        //重寫animate function
        animate = () => {
            render();
            requestAnimationFrame(animate);
            moving();
            followCamera();
        }
    }
}
function followCamera() {
    //算出
    var carBackPos = car.localToWorld(new THREE.Vector3(-40, 25, 0));
    //平滑移動攝影機
    thirdpartyCamera.position.lerp(carBackPos, 0.1);
    thirdpartyCamera.lookAt(car.position);
}

function loadCubemap(path) {
    var format = '.png';
    var files = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];
    var loader = new THREE.CubeTextureLoader();
    var cubeMap = loader.load(files);
    cubeMap.format = THREE.RGBFormat;
    return cubeMap;
}

$('#viewBtn').click(() => {
    isSky = !isSky;
    controls.enabled = !controls.enabled;
    if (isSky)
        $('#viewBtn').text('上帝視角');
    else
        $('#viewBtn').text('鳥瞰圖');
});

//navbar清單顯示隱藏也要重改canvas長寬
$('#navbarCollapse').on('shown.bs.collapse', canvasResize);
$('#navbarCollapse').on('hidden.bs.collapse', canvasResize);
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
    camera.aspect = width / 2 / height;
    camera.updateProjectionMatrix();
    thirdpartyCamera.aspect = width / 2 / height;
    thirdpartyCamera.updateProjectionMatrix();
    //渲染器改長寬
    renderer.setSize(width, height);
}

$('#speedRange').on("change mousemove", function () {
    speed = $('#speedRange').val() * 0.001;
});