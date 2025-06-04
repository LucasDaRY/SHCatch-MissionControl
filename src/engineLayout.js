export { buildLayout };

const canvas_elt = document.getElementById("engineLayout");
const canvas = canvas_elt.getContext("2d");
let canvas_side = 300;

canvas.fillStyle = "black";
canvas.lineWidth = 3;

function buildLayout(raptorThrust){
    for(let i = 0 ; i < 33 ; i++){
        canvas.beginPath();
        if(0 <= i && i <= 2){
            canvas.arc(0.5*canvas_side + 27*Math.sin((i)*2*Math.PI/3),                   0.5*canvas_side - 27*Math.cos((i)*2*Math.PI/3),                   18, 0, 2 * Math.PI);
        }
        if(3 <= i && i <= 12){
            canvas.arc(0.5*canvas_side + 73*Math.sin((i-3)*2*Math.PI/10),                0.5*canvas_side - 73*Math.cos((i-3)*2*Math.PI/10),                18, 0, 2 * Math.PI);
        }
        if(13 <= i && i <= 32) {
            canvas.arc(0.5*canvas_side + 120*Math.sin((i-13)*2*Math.PI/20 + Math.PI/20), 0.5*canvas_side - 120*Math.cos((i-13)*2*Math.PI/20 + Math.PI/20), 18, 0, 2 * Math.PI);
        }
        canvas.stroke();
    
        if(raptorThrust[i] > 0){ // If Raptor is lit
            canvas.fill();
        }
    }
}

