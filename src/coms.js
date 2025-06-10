const IpFormDOM = document.getElementById("IPForm");
const EspIpDOM = document.getElementById("ESP_IP");

let url = `ws://${EspIpDOM.value}/ws`// Once Not local, use : `ws://${window.location.hostname}/ws`;
let sseUrl = `//${EspIpDOM.value}/events`
let websocket;
let events = null;

const ultrasonicDistance = document.getElementById("ultrasonic_reads");
const chopPosL = document.getElementById("chop_position_L");
const chopPosR = document.getElementById("chop_position_R");
const towerOffline = document.getElementById("TowerOffline");
const masterOffline = document.getElementById("MasterOffline");
const shOffline = document.getElementById("SHOffline");
const cpt_PS_RF = document.getElementById("proximity_sensor_rf");
const cpt_PS_RN = document.getElementById("proximity_sensor_rn");
const cpt_PS_LN = document.getElementById("proximity_sensor_ln");
const cpt_PS_LF = document.getElementById("proximity_sensor_lf");
const cpt_Pos_X = document.getElementById("posX");
const cpt_Pos_Y = document.getElementById("posY");
const cpt_Pos_Z = document.getElementById("posZ");
const cpt_Rot_X = document.getElementById("rotX");
const cpt_Rot_Y = document.getElementById("rotY");
const cpt_Rot_Z = document.getElementById("rotZ");

function initWS(){
    websocket = new WebSocket(url);
    websocket.onopen = onOpenWS;
    websocket.onclose = onCloseWS;
    websocket.onmessage = onMessageWS;
}

function initSSE(){
    if(events){
        events.close();
        events = null;
    }

    events = new EventSource(sseUrl);

    events.addEventListener("message", (e) => {
        console.log("Event from " + e.target.url);
        let JSON_from_master = JSON.parse(e.data);
        // About Tower
        if(!JSON_from_master.isTowerOnline){
            // Tower is offline
            // Shows error popup and not processing other variables
            towerOffline.style.visibility = "visible"; 
        } else {
            // Tower sends telemetry
            // Hides error popup, and processes all awaited data
            towerOffline.style.visibility = "hidden"; 
        
            chopPosR.innerText = JSON_from_master.chopPosR; // Given value OR "undefined" idc
            chopPosL.innerText = JSON_from_master.chopPosL;
            ultrasonicDistance.innerText = JSON_from_master.ultrasonic_reads.toFixed(2);
            cpt_PS_RF.innerText = JSON_from_master.proxiRF;
            cpt_PS_RN.innerText = JSON_from_master.proxiRN;
            cpt_PS_LN.innerText = JSON_from_master.proxiLN;
            cpt_PS_LF.innerText = JSON_from_master.proxiLF;
        }

        // About SH
        if(!JSON_from_master.isSHOnline){
            shOffline.style.visibility = "visible";
        } else {
            shOffline.style.visibility = "hidden";

            // The (_*1) makes null become 0
            cpt_Pos_X.innerText = (JSON_from_master.posX*1).toFixed(2);
            cpt_Pos_Y.innerText = (JSON_from_master.posY*1).toFixed(2);
            cpt_Pos_Z.innerText = (JSON_from_master.posZ*1).toFixed(2);
            cpt_Rot_X.innerText = (JSON_from_master.rotX*1).toFixed(2);
            cpt_Rot_Y.innerText = (JSON_from_master.rotY*1).toFixed(2);
            cpt_Rot_Z.innerText = (JSON_from_master.rotZ*1).toFixed(2);
        }
    });

    events.addEventListener("error", (err) => {
        err.preventDefault();
        // Go fuck yourself I guess
    })
}

IpFormDOM.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(IpFormDOM);
    if(typeof(formData.get("EspMasterIP")) !== "undefined"){
        url = `ws://${formData.get("EspMasterIP")}/ws`;
        sseUrl = `//${formData.get("EspMasterIP")}/events`;
    }

    // Restarts connections to the ESP (WS and SSE)
    websocket.close();
    initWS();
    initSSE();
})

function init(){
    initWS();
    initSSE();
}

//window.addEventListener("load", (_) => init());

init();


function onOpenWS(event){
    console.log("WebSocket established.");
    masterOffline.style.visibility = "hidden";
}

function onCloseWS(event){
    console.log("WebSocket lost... Retrying");
    masterOffline.style.visibility = "visible";
}


function onMessageWS(event){
    console.log("received WS : " + event.data);
}


let towerForm = document.getElementById("TowerForm");
let shForm = document.getElementById("SHForm");

towerForm.addEventListener("submit", (event) => {
    // Sends the form to Master, which will dispach to Tower
    // Form is then emptied
    towerFormSend();
    towerForm.reset();
    event.preventDefault();
});
shForm.addEventListener("submit", (event) => {
    shFormSend();
    shForm.reset();
    event.preventDefault();
});

function towerFormSend(){
    const formData = new FormData(towerForm);
    if(parseFloat(formData.get("TCmdChopL")) <= parseFloat(formData.get("TCmdChopR"))){
        let JSON_to_master = {
            destination : "Tower",
            CmdChopL : parseFloat(formData.get("TCmdChopL")), // This is the name of the input in the form
            CmdChopR : parseFloat(formData.get("TCmdChopR"))
        };
        console.log(JSON_to_master);
        websocket.send(JSON.stringify(JSON_to_master));
    } else {
        console.log("Chopsticks positions are not possible. Command not sent.");
    }
}

function shFormSend(){
    const formData = new FormData(towerForm);
    let JSON_to_master = {
        destination : "SH",
        CmdGridFin1 : parseFloat(formData.get("SHCmdGridFin1")), // This is the name of the input in the form
        CmdGridFin2 : parseFloat(formData.get("SHCmdGridFin2")),
        CmdGridFin3 : parseFloat(formData.get("SHCmdGridFin3")),
        CmdGridFin4 : parseFloat(formData.get("SHCmdGridFin4")),
    };
    console.log(JSON_to_master);
    websocket.send(JSON.stringify(JSON_to_master));
}