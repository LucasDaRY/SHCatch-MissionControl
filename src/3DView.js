import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { randFloat } from 'three/src/math/MathUtils';
import { buildLayout } from './engineLayout';

const clock = new THREE.Clock(true);
const clockDOM = document.getElementById("clock");

const SH3DCanvasDOM = document.getElementById("3DLeft");
const Tower3DCanvasDOM = document.getElementById("3DRight");

const cpt_Rot_X = document.getElementById("rotX");
const cpt_Rot_Y = document.getElementById("rotY");
const cpt_Rot_Z = document.getElementById("rotZ");

let gridFinPos = Array(4); // angles in rad
for (let i = 0; i < 4; i++) {
	gridFinPos[i] = 0;
}
let raptorPos = Array(13); // {rotX, rotY} in rad
for (let engNum = 0; engNum < 13; engNum++) {
	raptorPos[engNum] = { rotX: 0, rotY: 0 };
}
let raptorThrust = Array(33); // Thrust in %
let chopsticksPos = [0, 0]; // 0 is left, 1 is right
let chopsticksPosWanted = [0, 0]; // Used to check if position is posible

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
let SHRaptors = Array(33);
/* for Raptor Order, please refer to the reference image in your documents */
let Chopsticks = [];
/* 0 is the right one; 1 is the left one */

function setGridPos(gridNum, angle) {
	// Takes angles in rad and sets gridfin pos to angle
	// Returns the command to give to "grid.rotateX(here)"
	let cmd = angle - gridFinPos[gridNum];
	gridFinPos[gridNum] = angle;
	SHGrids[gridNum].rotateX(cmd);
}
function setChopstickPos(chopstickNum, angle) {
	// Takes angles in rad and sets gridfin pos to angle
	// Returns the command to give to "grid.rotateX(here)"
	let cmd = angle - chopsticksPos[chopstickNum];
	chopsticksPosWanted[chopstickNum] = angle;
	if (chopsticksPosWanted[1] - chopsticksPosWanted[0] >= 0) {
		if (chopstickNum === 0) {
			catchZone.rotateZ(-cmd);
			updateCatchZone();
		}
		chopsticksPos[chopstickNum] = angle;
		if (chopstickNum == 1) { // Model for Chopstick 0 is missing for now
			Chopsticks[chopstickNum].rotateZ(-cmd);
		}
	}
}
function setRaptorPos(engNum, angleX, angleY) {
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
function setRaptorThrust(engNum, thrust_percent) {
	// engNum is the EX notation
	if (1 <= engNum && engNum <= 33) {
		raptorThrust[engNum - 1] = (0 <= thrust_percent && thrust_percent <= 100) ? thrust_percent : 0;
		if (typeof (SHRaptors[engNum - 1]) !== "undefined") {
			SHRaptors[engNum - 1].children[0].material.color.set(129 / 255, (128 / 255) - (raptorThrust[engNum - 1] / 100) * (128 / 255), (120 / 255) - (raptorThrust[engNum - 1] / 100) * (128 / 255));
		}
	}
}

let possibleLeftView = ["Booster", "Orbit"];
let possibleRightView = ["Catch zone", "Trajectory"];
let leftView = "Booster";
let rightView = "Catch zone";

// Puts in an ARRAY all left view buttons. And adds click events to change view
const leftViewButtons = Array.prototype.slice.call(document.getElementsByClassName("left_view_button"));
leftViewButtons.forEach((button) => {
	button.addEventListener("click", (_) => {
		let name = button.name;
		if (possibleLeftView.includes(name)) {
			// Changes view
			leftView = name;
			// Disables the current button
			button.disabled = true;
			// Enables all other buttons
			leftViewButtons.forEach((but) => {
				if (but.name != name) {
					but.disabled = false;
				}
			})
		}
	})
});
// Puts in an ARRAY all right view buttons. And adds click events to change view
const rightViewButtons = Array.prototype.slice.call(document.getElementsByClassName("right_view_button"));
rightViewButtons.forEach((button) => {
	button.addEventListener("click", (_) => {
		let name = button.name;
		if (possibleRightView.includes(name)) {
			rightView = name;
			// Disables the current button
			button.disabled = true;
			// Enables all other buttons
			rightViewButtons.forEach((but) => {
				if (but.name != name) {
					but.disabled = false;
				}
			})
		}
	})
});

// Checks the form to control chopsticks
let towerForm = document.getElementById("TowerForm");
towerForm.addEventListener("submit", (event) => {
	const formData = new FormData(towerForm);
	setChopstickPos(0, (formData.get("TCmdChopL") !== "") ? Math.PI / 180 * parseFloat(formData.get("TCmdChopL")) : chopsticksPos[0]);
	setChopstickPos(1, (formData.get("TCmdChopR") !== "") ? Math.PI / 180 * parseFloat(formData.get("TCmdChopR")) : chopsticksPos[1]);
	event.preventDefault();
});

let eltLoaded = 0;

const DOMView = document.getElementById("LeftView");
const DOMView2 = document.getElementById("RightView");
const DOMSimErr = document.getElementById("SimErr");
DOMSimErr.style.visibility = "hidden";

const loadingUnderway = document.getElementById("loadingUnderway");
const loadingDOM = document.getElementById("loading");
const timeDOM = document.getElementById("missionTime");
function loadFinished() {
	timeDOM.style.display = "block";
	loadingDOM.style.display = "none";
}

const scene = new THREE.Scene();

const leftRenderer = new THREE.WebGLRenderer({
	antialias: true,
	canvas: SH3DCanvasDOM,
	alpha: true
});
leftRenderer.setSize(DOMView.offsetWidth, DOMView.offsetHeight);
leftRenderer.setAnimationLoop(animate);
leftRenderer.setPixelRatio(window.devicePixelRatio);
leftRenderer.autoClear = false;
leftRenderer.shadowMap.enabled = true;

const rightRenderer = new THREE.WebGLRenderer({
	antialias: true,
	canvas: Tower3DCanvasDOM,
	alpha: true
});
rightRenderer.setSize(DOMView2.offsetWidth, DOMView2.offsetHeight);
rightRenderer.setPixelRatio(window.devicePixelRatio);
rightRenderer.shadowMap.enabled = true;

const SHcamera = new THREE.PerspectiveCamera(75, DOMView.offsetWidth / DOMView.offsetHeight, 0.1, 1_000_000);
SHcamera.position.set(0, 0, 6000);
const farTrajectoryCamera = new THREE.PerspectiveCamera(90, DOMView.offsetWidth / DOMView.offsetHeight, 0.1, 10_000_000);
farTrajectoryCamera.position.set(30000, 50, 100_000);
farTrajectoryCamera.rotateY(Math.PI / 4);
farTrajectoryCamera.rotateX(Math.PI / 4);
const camera = new THREE.OrthographicCamera(-DOMView.offsetWidth / 2, DOMView.offsetWidth / 2, DOMView.offsetHeight / 2, -DOMView.offsetHeight / 2, 35_000, 39_000);
scene.add(camera);
const orbitCamera = new THREE.PerspectiveCamera(75, DOMView.offsetWidth / DOMView.offsetHeight, 0.1, 1_000_000);
orbitCamera.position.set(-4000, 14000, 5000);
scene.add(orbitCamera);
const orbitHelper = new ViewHelper(orbitCamera, leftRenderer.domElement);
const controls = new OrbitControls(orbitCamera, leftRenderer.domElement);
controls.target.set(0, 10000, 0);
controls.enablePan = true;
controls.enableZoom = true;
//controls.listenToKeyEvents(window);
controls.update();


const axesHelper = new THREE.AxesHelper(1000);
scene.add(axesHelper);

const SHRef = new THREE.Object3D();
SHRef.position.set(-2000, 9000, 0);
camera.position.set(-500, 50000, 500);
camera.zoom = 0.15;
camera.updateProjectionMatrix();
camera.rotateY(3 * Math.PI / 4);
camera.rotateX(-Math.PI / 2);
// controls.target.add(SHRef.position);
// controls.update();
const SHWrapper = new THREE.Object3D();
SHRef.add(SHWrapper);
SHRef.add(SHcamera);
scene.add(SHRef);

let SHLastPos = new THREE.Vector3(0, 0, 0);
SHLastPos.copy(SHRef.position);

let SHPos = Array(20);
for (let i = 0; i < 20; i++) {
	SHPos[i] = SHRef.position.clone()
}

// Point init with random point, to see the initial line
const pathMat = new THREE.LineBasicMaterial({
	color: 0xffffff,
	opacity: 1,
});

let SHTrajectorySpline = new THREE.Group();
scene.add(SHTrajectorySpline);

function drawSHTrajectory() {

	let pathGeom = new THREE.BufferGeometry().setFromPoints([SHLastPos, SHRef.position.clone()]);
	SHLastPos.copy(SHRef.position);
	let splineObj = new THREE.Line(pathGeom, pathMat);
	SHTrajectorySpline.add(splineObj);

	setTimeout(() => {
		drawSHTrajectory()
	}, 2000); // Every 2s, this function executes
}

const chopsticksLocation = new THREE.Vector3(-100, 12500, 100);
const radialDiv = 30;
const catchZone = new THREE.Mesh(
	new THREE.PlaneGeometry(1000, 1000, radialDiv - 1, 1),
	new THREE.MeshBasicMaterial({
		color: 0x00ff00,
		wireframe: false,
		transparent: true,
		opacity: 0.3,
		side: THREE.DoubleSide
	})
)
catchZone.position.add(chopsticksLocation);
catchZone.rotateX(-Math.PI / 2);
catchZone.rotateZ(3 * Math.PI / 4);
scene.add(catchZone);
let catchZonePoints = catchZone.geometry.attributes.position.array;
async function updateCatchZone() {
	// Uses chopsticksPos to update plane's geometry nodes, to fit to the chopsticks
	for (let i = 0; i < radialDiv; i++) {
		let r = 2500; // Big radius
		let theta = (i % radialDiv) / (radialDiv - 1) * (chopsticksPos[1] - chopsticksPos[0] + 0.005); // The whole objects rotate so that theta = 0 is on the left chopstick. Plus small offset to see, all the time, the zone
		catchZonePoints[3 * i + 1] = r * Math.cos(theta);
		catchZonePoints[3 * i + 0] = r * Math.sin(theta);
	}
	for (let i = radialDiv; i < 2 * radialDiv; i++) {
		let r = 1050; // Small radius
		let theta = (i % radialDiv) / (radialDiv - 1) * (chopsticksPos[1] - chopsticksPos[0]);
		catchZonePoints[3 * i + 1] = r * Math.cos(theta);
		catchZonePoints[3 * i + 0] = r * Math.sin(theta);
	}

	catchZone.geometry.attributes.position.needsUpdate = true;
}


function animate(time, frame) {

	//camera.updateProjectionMatrix();
	if (eltLoaded == 20) { // 1 booster + 4 fins + 13 raptors + 1 tower + 1 chopstick

		loadFinished();

		let minutes = clock.getElapsedTime() / 60;
		let seconds = clock.getElapsedTime() % 60;
		clockDOM.innerText = ((minutes < 10) ? "0" : "") + Math.floor(minutes) + ":" + ((seconds < 10) ? "0" : "") + seconds.toFixed(1);


		// for(let gridNum = 0 ; gridNum < 4 ; gridNum++){
		// 	// Sets the gridfin position
		// 	setGridPos(gridNum, 1 * Math.cos(time * 0.005));
		// }


		// Rotates SH as per telemetry
		//SHWrapper.rotation.x = cpt_Rot_X.innerText - 90*(Math.PI/180);
		//SHWrapper.rotation.y = cpt_Rot_Y.innerText;
		//SHWrapper.rotation.z = cpt_Rot_Z.innerText;


		for (let i = 1; i <= 13; i++) {
			setRaptorThrust(i, 100);
			//setRaptorPos(i-1, 0.5 * Math.cos(time * 0.01), -0.5 * Math.sin(time * 0.01));
		}
		// This is a part where I'm messing around, just for it not to look the same at all time while developing this shit
		SHRef.position.z += 5;
		let z_up = new THREE.Vector3();
		SHWrapper.getWorldDirection(z_up);
		let booster_quat = new THREE.Quaternion();
		SHWrapper.getWorldQuaternion(booster_quat);
		z_up.applyQuaternion(booster_quat.multiply(new THREE.Quaternion(1, 0, 0, -Math.PI / 4)));
		SHRef.position.add(z_up.multiplyScalar(5)); // Use this to move SuperHeavy

		// Use this to rotate SuperHeavy
		//SHWrapper.rotation.x += 0.0005; // Yaw
		//SHWrapper.rotation.y += 0.0005; // roll
		SHWrapper.rotation.z += randFloat(-0.001, 0.0015); // Pitch

		//Chopsticks[0].rotation.z -= 0.001;
		updateCatchZone();
		buildLayout(raptorThrust);

		setChopstickPos(0, -Math.PI / 6 + Math.PI / 6 * Math.cos(0.0004 * time));
		setChopstickPos(1, Math.PI / 6 + Math.PI / 6 * Math.cos(0.001 * time));

		switch (leftView) {
			case "Booster":
				SHWrapper.visible = true;
				SHTrajectorySpline.visible = true;
				catchZone.visible = false;
				leftRenderer.render(scene, SHcamera);
				break;
			case "Orbit":
				SHWrapper.visible = true;
				SHTrajectorySpline.visible = true;
				catchZone.visible = false;
				leftRenderer.render(scene, orbitCamera);
				orbitHelper.render(leftRenderer);
				break;

			default:
				break;
		}

		switch (rightView) {
			case "Catch zone":
				SHWrapper.visible = false;
				SHTrajectorySpline.visible = false;
				catchZone.visible = true;
				rightRenderer.render(scene, camera);
				break;
			case "Trajectory":
				SHWrapper.visible = true;
				SHTrajectorySpline.visible = true;
				catchZone.visible = false;
				rightRenderer.render(scene, farTrajectoryCamera);
				break;

			default:
				break;
		}
	}

}

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://unpkg.com/three@0.177.0/examples/jsm/libs/draco/');
dracoLoader.setDecoderConfig({ type: 'js' });
dracoLoader.preload();
loader.setDRACOLoader(dracoLoader);
// The loader might only need the URL (but not with npm and vite)
const boosterModelURL = new URL('/models/booster_compressed.glb', import.meta.url);
const towerModelURL = new URL('/models/tower_compressed.glb', import.meta.url);
const chopstickRModelURL = new URL('/models/chopstick_raw.glb', import.meta.url);
const gridfinModelURL = new URL('/models/gridfin_compressed.glb', import.meta.url);
const raptorModelURL = new URL('/models/raptor_compressed.glb', import.meta.url);

// Loading SuperHeavy booster
loader.load(boosterModelURL.href, (root) => {
	root.scene.name = "SH";
	root.scene.rotation.x = -Math.PI / 2;
	root.scene.rotation.y = 0;
	root.scene.rotation.z = Math.PI;
	root.scene.position.set(-2000, -3500, 0);
	const box = new THREE.Box3().setFromObject(root.scene);
	const boxCenter = new THREE.Vector3();
	box.getCenter(boxCenter);
	root.scene.position.sub(boxCenter);

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
	loadingUnderway.innerText = eltLoaded;
},
	(xhr) => {
		// DOMSimErr.style.visibility = "visible";
		// DOMSimErr.innerText = ( xhr.loaded / xhr.total * 100 ).toFixed(1) + '% loaded';
	},
	(err) => {
		DOMSimErr.style.visibility = "visible";
		DOMSimErr.innerText = err
	}
);
// Loading grid fins
for (let i = 0; i < 4; i++) {
	loader.load(gridfinModelURL.href, (root) => {
		SHGrids[i] = root.scene;
		root.scene.name = "Grid" + i;
		let angi = i < 2 ? i + 1 : i + 2; // Makes the circular pattern while skipping the unexisting places
		root.scene.position.set(420 * Math.cos(Math.PI / 3 * angi), 3450, 420 * Math.sin(Math.PI / 3 * angi));
		root.scene.rotation.set(-Math.PI / 2, 0, -Math.PI / 3 * angi);

		root.scene.children[0].material = new THREE.MeshPhysicalMaterial({
			color: 0x000000,
			roughness: 1,
			metalness: 0.2,
			reflectivity: 0.1
		});

		SHWrapper.add(root.scene);
		DOMSimErr.style.visibility = "hidden";
		eltLoaded++;
		loadingUnderway.innerText = eltLoaded;
	},
		(xhr) => {
			// DOMSimErr.style.visibility = "visible";
			// DOMSimErr.innerText = ( xhr.loaded / xhr.total * 100 ).toFixed(1) + '% loaded';
		},
		(err) => {
			DOMSimErr.style.visibility = "visible";
			DOMSimErr.innerText = err
		}
	);
}
// Loading inner Raptor engines
for (let i = 0; i < 3; i++) {
	loader.load(raptorModelURL.href, (root) => {
		SHRaptors[i] = root.scene;
		root.scene.name = "E" + (i + 1);
		root.scene.position.set(85 * Math.cos(-2 * Math.PI / 3 * i), -3365, 85 * Math.sin(-2 * Math.PI / 3 * i));
		root.scene.rotation.set(-Math.PI / 2, 0, 0);

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
		loadingUnderway.innerText = eltLoaded;
	},
		(xhr) => {
			// DOMSimErr.style.visibility = "visible";
			// DOMSimErr.innerText = ( xhr.loaded / xhr.total * 100 ).toFixed(1) + '% loaded';
		},
		(err) => {
			DOMSimErr.style.visibility = "visible";
			DOMSimErr.innerText = err
		}
	);
}
// Loading middle Raptor engines
for (let i = 0; i < 10; i++) {
	loader.load(raptorModelURL.href, (root) => {
		SHRaptors[i + 3] = root.scene;
		root.scene.name = "E" + (i + 4);
		root.scene.position.set(250 * Math.cos(-2 * Math.PI / 10 * i), -3365, 250 * Math.sin(-2 * Math.PI / 10 * i));
		root.scene.rotation.set(-Math.PI / 2, 0, 0);

		root.scene.children[0].material = new THREE.MeshPhysicalMaterial({
			color: 0x818078,
			roughness: 0.5,
			metalness: 1,
			reflectivity: 0.2
		});

		SHWrapper.add(root.scene);
		DOMSimErr.style.visibility = "hidden";
		eltLoaded++;
		loadingUnderway.innerText = eltLoaded;
	},
		(xhr) => {
			// DOMSimErr.style.visibility = "visible";
			// DOMSimErr.innerText = ( xhr.loaded / xhr.total * 100 ).toFixed(1) + '% loaded';
		},
		(err) => {
			DOMSimErr.style.visibility = "visible";
			DOMSimErr.innerText = err
		}
	);
}

// Loading Tower
loader.load(towerModelURL.href, (root) => {
	root.scene.name = "Tower";
	root.scene.rotation.x = -Math.PI / 2;
	root.scene.rotation.y = 0;
	root.scene.rotation.z = Math.PI;
	root.scene.position.set(0, 0, 0);

	root.scene.children[0].children.forEach((child) => {
		child.material = new THREE.MeshPhysicalMaterial({
			color: 0xbababa,
			roughness: 0.9,
			metalness: 0,
			reflectivity: 0
		})
	})


	// Adding lights
	const towerLight = new THREE.SpotLight(0xffffff, 10, 30000);
	towerLight.decay = 0;
	towerLight.position.set(-1500, 25000, 4000);
	scene.add(towerLight);
	scene.add(towerLight.target);

	scene.add(root.scene);
	DOMSimErr.style.visibility = "hidden";
	eltLoaded++;
	loadingUnderway.innerText = eltLoaded;

},
	(xhr) => {
		// DOMSimErr.style.visibility = "visible";
		// DOMSimErr.innerText = (xhr.loaded / xhr.total * 100).toFixed(1) + '% loaded';
	},
	(err) => {
		console.log(err);
		DOMSimErr.style.visibility = "visible";
		DOMSimErr.innerText = err
	}
);

// Loading Right Chopstick
loader.load(chopstickRModelURL.href, (root) => {
	Chopsticks[1] = root.scene;
	root.scene.name = "ChopstickR";
	root.scene.rotation.x = -Math.PI / 2;
	// root.scene.rotation.y = 0;
	root.scene.rotation.z = 3 * Math.PI / 4;
	root.scene.position.add(chopsticksLocation);

	scene.add(root.scene);
	DOMSimErr.style.visibility = "hidden";
	eltLoaded++;
	loadingUnderway.innerText = eltLoaded;
}, (xhr) => {
	// DOMSimErr.style.visibility = "visible";
	// DOMSimErr.innerText = (xhr.loaded / xhr.total * 100).toFixed(1) + '% loaded';
}, (err) => {
	DOMSimErr.style.visibility = "visible";
	DOMSimErr.innerText = err
});



// Adding wireframe floor (make it a little synthwave hmmm)
const floor = new THREE.Mesh(
	new THREE.PlaneGeometry(1000000, 1000000, 500, 500),
	new THREE.MeshBasicMaterial({
		color: 0x111111,
		wireframe: true
	})
);
floor.name = "Floor";
floor.rotateX(Math.PI / 2);
scene.add(floor);


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
	camera.left = -DOMView.offsetWidth / 2;
	camera.right = DOMView.offsetWidth / 2;
	camera.top = DOMView.offsetHeight / 2
	camera.bottom = -DOMView.offsetHeight / 2;
	camera.updateProjectionMatrix();
	SHcamera.aspect = DOMView.offsetWidth / DOMView.offsetHeight;
	SHcamera.updateProjectionMatrix();
	farTrajectoryCamera.aspect = DOMView.offsetWidth / DOMView.offsetHeight;
	farTrajectoryCamera.updateProjectionMatrix();
	leftRenderer.setSize(DOMView.offsetWidth, DOMView.offsetHeight);
	rightRenderer.setSize(DOMView.offsetWidth, DOMView.offsetHeight);
});

drawSHTrajectory();