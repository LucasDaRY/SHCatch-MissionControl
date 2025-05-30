import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

const clock = new THREE.Clock(true);
const clockDOM = document.getElementById("clock");

const SH3DCanvasDOM = document.getElementById("3DLeft");
const Tower3DCanvasDOM = document.getElementById("3DRight");

const cpt_Rot_X = document.getElementById("rotX");
const cpt_Rot_Y = document.getElementById("rotY");
const cpt_Rot_Z = document.getElementById("rotZ");

let gridFinPos = Array(4); // angles in rad
for(let i = 0 ; i < 4 ; i++){
    gridFinPos[i] = 0;
}
let raptorPos = Array(13); // {rotX, rotY} in rad
for(let engNum = 0 ; engNum < 13 ; engNum++){
    raptorPos[engNum] = {rotX: 0, rotY: 0};
}
let raptorThrust = Array(13); // Thrust in %


function setGridPos(gridNum, angle){
    // Takes angles in rad and sets gridfin pos to angle
    // Returns the command to give to "grid.rotateX(here)"
    let cmd = angle - gridFinPos[gridNum];
    gridFinPos[gridNum] = angle;
    SHGrids[gridNum].rotateX(cmd);
}
function setRaptorPos(engNum, angleX, angleY){
    // Takes angles in rad, and rotates the engine number engNum to this given configuration
    /* From under
            BQD
            *  *    
         *   -Y   *  
        *  X-   X+ *
        *          *
         *   +Y   *  
            *  *    
    */
    let cmdX = angleX - raptorPos[engNum].rotX;
    raptorPos[engNum].rotX = angleX;
    let cmdY = angleY - raptorPos[engNum].rotY;
    raptorPos[engNum].rotY = angleY;

    SHRaptors[engNum].rotateX(cmdX);
    SHRaptors[engNum].rotateY(cmdY);
}

let eltLoaded = 0;

const DOMView = document.getElementById("LeftView"); 
const DOMView2 = document.getElementById("RightView"); 
const DOMSimErr = document.getElementById("SimErr"); 
DOMSimErr.style.visibility = "hidden";

const scene = new THREE.Scene();
const SHcamera = new THREE.PerspectiveCamera( 75, DOMView.offsetWidth / DOMView.offsetHeight, 0.1, 100000 );
const camera = new THREE.PerspectiveCamera( 75, DOMView.offsetWidth / DOMView.offsetHeight, 0.1, 100000 );
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: SH3DCanvasDOM,
  alpha: true
});
renderer.setSize(DOMView.offsetWidth, DOMView.offsetHeight );
renderer.setAnimationLoop( animate );
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

const renderer2 = new THREE.WebGLRenderer({
  antialias: true,
  canvas: Tower3DCanvasDOM,
  alpha: true
});
renderer2.setSize(DOMView2.offsetWidth, DOMView2.offsetHeight );
renderer2.setAnimationLoop( animate2 );
renderer2.setPixelRatio(window.devicePixelRatio);
renderer2.shadowMap.enabled = true;

const controls = new OrbitControls(camera, renderer2.domElement);
controls.enablePan = true;
controls.enableZoom = true;
//controls.listenToKeyEvents(window);
const axesHelper = new THREE.AxesHelper(1000);
scene.add(axesHelper);

const SHRef = new THREE.Object3D();
SHRef.position.set(0,9000, 0);
camera.position.set(2000, 8000, 15000);
controls.target.add(SHRef.position);
controls.update();
const SHWrapper = new THREE.Object3D();
SHRef.add(SHWrapper);
SHRef.add(SHcamera);
scene.add(SHRef);
let SHGrids = [];
/* Grid Order
         BQD
        *  *    
   3 *        * 0
    *          *
    *          *
   2 *        * 1
        *  *    
*/
let SHRaptors = [];
/* for Raptor Order, please refer to the reference image in your documents */

let SHLastPos = new THREE.Vector3(0,0,0);
SHLastPos.copy(SHRef.position);
/*let SHTrajectoryPath = new THREE.CurvePath();
const SHTrajectoryMat = new THREE.LineBasicMaterial( { color: 0xff0000 } );
const points = SHTrajectoryPath.getPoints( 50 );
const geometry = new THREE.BufferGeometry().setFromPoints( points );
let SHTrajectory = new THREE.Line(geometry, SHTrajectoryMat);
scene.add(SHTrajectory);*/




function animate(time, frame) {

  camera.updateProjectionMatrix();
  if(eltLoaded == 18){

    clockDOM.innerText = Math.floor(clock.getElapsedTime() / 60) + ":" + (clock.getElapsedTime() % 60).toFixed(0);

    const start = SHLastPos;
    const end = SHRef.position;
    const points = new THREE.LineCurve3(start, end).getPoints(2);
    const curveGeom = new THREE.BufferGeometry().setFromPoints(points);
    const curveMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
    })
    const curve = new THREE.Line(curveGeom, curveMat);
    scene.add(curve);
    SHLastPos.copy(SHRef.position);









    for(let gridNum = 0 ; gridNum < 4 ; gridNum++){
        // Sets the gridfin position
        setGridPos(gridNum, 1 * Math.cos(time * 0.005));
    }
    
    SHRaptors.forEach((engine, engNum) => {
        // Makes the engines red if 100% thrust, less red if less thrust...
        engine.children[0].material.color.set(129/255, (128/255)-(raptorThrust[engNum]/100)*(128/255), (120/255)-(raptorThrust[engNum]/100)*(128/255));
        
        // Rotates engines as per telemetry (will do, ez fix)
        setRaptorPos(engNum, 0.5 * Math.cos(time * 0.01), -0.5 * Math.sin(time * 0.01));
    });


    // Rotates SH as per telemetry
    //SHWrapper.rotation.x = cpt_Rot_X.innerText - 90*(Math.PI/180);
    //SHWrapper.rotation.y = cpt_Rot_Y.innerText;
    //SHWrapper.rotation.z = cpt_Rot_Z.innerText;


    for(let i = 0 ; i < 13 ; i++){
        raptorThrust[i] = 70 + 30 * Math.cos(time * 0.01);
    }
    SHRef.position.y += 5; // Use this to move SuperHeavy
    
    // Use this to rotate SuperHeavy
    SHWrapper.rotation.x += 0.0005; // Yaw
    SHWrapper.rotation.y += 0.0005; // roll
    SHWrapper.rotation.z += 0.001; // Pitch
    
    //controls.target.set(SHRef.position);
    //controls.update();
    SHWrapper.visible = true;
    renderer.render( scene, SHcamera );
  }

}

function animate2(time, frame){
    SHWrapper.visible = false;
    renderer2.render(scene, camera);
}

const loader = new GLTFLoader();
// The loader might only need the URL (but not with npm and vite)
const boosterModelURL = new URL('./dependencies/models/booster_raw.glb', import.meta.url);
const gridfinModelURL = new URL('./dependencies/models/gridfin_raw.glb', import.meta.url);
const raptorModelURL = new URL('./dependencies/models/raptor_raw.glb', import.meta.url);

// Loading SuperHeavy booster
loader.load(boosterModelURL.href, (root) => {
    root.scene.name = "SH";
    root.scene.rotation.x = -Math.PI/2;
    root.scene.rotation.y = 0;
    root.scene.rotation.z = Math.PI;
    //root.scene.position.set(0,-3500,0);
    const box = new THREE.Box3().setFromObject(root.scene);
    const boxCenter = new THREE.Vector3();
    box.getCenter(boxCenter);
    root.scene.position.sub(boxCenter);

    console.log(root.scene);
    root.scene.children[0].children.forEach((child) => {
        child.material = new THREE.MeshPhysicalMaterial({
            color: 0x818078,
            roughness: 0.5,
            metalness: 1,
            reflectivity: 0.5
        })
    })
    
    SHWrapper.add(root.scene);
    DOMSimErr.style.visibility = "hidden";
    eltLoaded++;
  },
  (xhr) => {
    DOMSimErr.style.visibility = "visible";
    DOMSimErr.innerText = ( xhr.loaded / xhr.total * 100 ).toFixed(1) + '% loaded';
  },
  (err) => {
    DOMSimErr.style.visibility = "visible";
    DOMSimErr.innerText = err
  }
);
// Loading grid fins
for(let i = 0 ; i < 4 ; i++){
    loader.load(gridfinModelURL.href, (root) => {
        SHGrids[i] = root.scene;
        root.scene.name = "Grid" + i;
        let angi = i < 2 ? i+1 : i+2; // Makes the circular pattern while skipping the unexisting places
        root.scene.position.set(420 * Math.cos(Math.PI/3 * angi),3450, 420 * Math.sin(Math.PI/3 * angi));
        root.scene.rotation.set(-Math.PI/2, 0, -Math.PI/3*angi);

        root.scene.children[0].material = new THREE.MeshPhysicalMaterial({
            color: 0x000000,
            roughness: 1,
            metalness: 0.2,
            reflectivity: 0.1
        });

        SHWrapper.add(root.scene);
        DOMSimErr.style.visibility = "hidden";
        eltLoaded++;
      },
      (xhr) => {
        DOMSimErr.style.visibility = "visible";
        DOMSimErr.innerText = ( xhr.loaded / xhr.total * 100 ).toFixed(1) + '% loaded';
      },
      (err) => {
        DOMSimErr.style.visibility = "visible";
        DOMSimErr.innerText = err
      }
    );
}
// Loading inner Raptor engines
for(let i = 0 ; i < 3 ; i++){
    loader.load(raptorModelURL.href, (root) => {
        SHRaptors[i] = root.scene;
        root.scene.name = "E" + (i+1);
        root.scene.position.set(85 * Math.cos(-2*Math.PI/3 * i),-3365, 85 * Math.sin(-2*Math.PI/3 * i));
        root.scene.rotation.set(-Math.PI/2,0,0);

        console.log(root.scene);

        // Editing Raptors material makes the whole booster dark....
        root.scene.children[0].material = new THREE.MeshPhysicalMaterial({
            color: 0x818078,
            roughness: 0.5,
            metalness: 1,
            reflectivity: 0.2
        });

        SHWrapper.add(root.scene);
        DOMSimErr.style.visibility = "hidden";
        eltLoaded++;
      },
      (xhr) => {
        DOMSimErr.style.visibility = "visible";
        DOMSimErr.innerText = ( xhr.loaded / xhr.total * 100 ).toFixed(1) + '% loaded';
      },
      (err) => {
        DOMSimErr.style.visibility = "visible";
        DOMSimErr.innerText = err
      }
    );
}
// Loading middle Raptor engines
for(let i = 0 ; i < 10 ; i++){
    loader.load(raptorModelURL.href, (root) => {
        SHRaptors[i+3] = root.scene;
        root.scene.name = "E" + (i+4);
        root.scene.position.set(250 * Math.cos(-2*Math.PI/10 * i),-3365, 250 * Math.sin(-2*Math.PI/10 * i));
        root.scene.rotation.set(-Math.PI/2,0,0);
        
        root.scene.children[0].material = new THREE.MeshPhysicalMaterial({
            color: 0x818078,
            roughness: 0.5,
            metalness: 1,
            reflectivity: 0.2
        });

        SHWrapper.add(root.scene);
        DOMSimErr.style.visibility = "hidden";
        eltLoaded++;
      },
      (xhr) => {
        DOMSimErr.style.visibility = "visible";
        DOMSimErr.innerText = ( xhr.loaded / xhr.total * 100 ).toFixed(1) + '% loaded';
      },
      (err) => {
        DOMSimErr.style.visibility = "visible";
        DOMSimErr.innerText = err
      }
    );
}

// Loading Tower (a big cube for now)
const cubeGeom = new THREE.BoxGeometry(1500, 15000, 1500);
const cubeMat = new THREE.MeshPhysicalMaterial({
    color: 0xb9bcbd
})
const cube = new THREE.Mesh(cubeGeom, cubeMat);
cube.position.set(3000, 15000/2, 0); // 10000 is half of the cube size (temp fix)
cube.rotateY(Math.PI/4);
cube.name = "Tower";
scene.add(cube);

// Adding wireframe floor (make it a little synthwave hmmm)
const floorGeom = new THREE.PlaneGeometry(1000000,1000000, 500, 500);
const floorMat = new THREE.MeshBasicMaterial({
    color: 0x111111,
    wireframe: true
})
const floor = new THREE.Mesh(floorGeom, floorMat);
floor.name = "Floor";
floor.rotateX(Math.PI/2);
scene.add(floor);

SHcamera.position.set(0,0,6000);
//camera.rotation.set(0,0,0);
//
//controls.update();

const light = new THREE.SpotLight(0xFFFFFF, 10, 15000);
light.decay = 0;
light.position.set(6100, 6600, 1500);
SHRef.add(light);

const light2 = new THREE.AmbientLight(0xFFFFFF, 0.6);//0.1);
scene.add(light2);

const light3 = new THREE.SpotLight(0xFFFFFF, 20, 10000);
light3.decay = 0;
light3.position.set(0, -6000, 0);
SHRef.add(light3);


window.addEventListener("resize", (e) => {
    camera.aspect = DOMView.offsetWidth / DOMView.offsetHeight;
    camera.updateProjectionMatrix();
    SHcamera.aspect = DOMView.offsetWidth / DOMView.offsetHeight;
    SHcamera.updateProjectionMatrix();
    renderer.setSize(DOMView.offsetWidth, DOMView.offsetHeight);
    renderer2.setSize(DOMView.offsetWidth, DOMView.offsetHeight);
});