/*let engines = [];
for(let i = 0 ; i < 33 ; i++){
    engines.push(document.getElementById("E" + (i+1)));
}

console.log(engines)


engines[0].style.top="50%";
engines[0].style.left="50%";*/

const canvas_elt = document.getElementById("engineLayout");
const canvas = canvas_elt.getContext("2d");
let canvas_side = 300;

canvas.fillStyle = "black";
canvas.lineWidth = 3;

for(let i = 1 ; i <= 33 ; i++){
    canvas.beginPath();
    if(1 <= i && i <= 3){
        canvas.arc(0.5*canvas_side + 27*Math.sin((i)*2*Math.PI/3),                   0.5*canvas_side - 27*Math.cos((i)*2*Math.PI/3),                   18, 0, 2 * Math.PI);
    }
    if(4 <= i && i <= 13){
        canvas.arc(0.5*canvas_side + 75*Math.sin((i-3)*2*Math.PI/10),                0.5*canvas_side - 75*Math.cos((i-3)*2*Math.PI/10),                18, 0, 2 * Math.PI);
    }
    if(14 <= i && i <= 33) {
        canvas.arc(0.5*canvas_side + 125*Math.cos((i-13)*2*Math.PI/20 + Math.PI/20), 0.5*canvas_side + 125*Math.sin((i-13)*2*Math.PI/20 + Math.PI/20), 18, 0, 2 * Math.PI);
    }
    canvas.stroke();

    if(false){ // if engine is lit
        canvas.fill();
    }

}


