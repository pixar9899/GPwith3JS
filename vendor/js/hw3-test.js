/**
 * 於測試hw3頑皮豹動作用的GUI function
 */
function datGUIInit() {
    gcontrol = {
        'leftArm': 0,
        'rightArm': 0,
        'leftLeg': 0,
        'leftCalf': 0,
        'rightLeg': 0,
        'rightCalf': 0,
    };

    var prevJson = loadJSON();
    var gui = new dat.GUI({ load: prevJson });
    gui.domElement.id = 'gui';

    gui.remember(gcontrol);

    gui.add(gcontrol, 'leftArm', -0.8, 0.5);
    gui.add(gcontrol, 'rightArm', -0.8, 0.5);
    gui.add(gcontrol, 'leftLeg', -0.8, 0.5);
    gui.add(gcontrol, 'leftCalf', 0, 2);
    gui.add(gcontrol, 'rightLeg', -0.8, 0.8);
    gui.add(gcontrol, 'rightCalf', 0, 2);
}