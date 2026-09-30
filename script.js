const flashlight = document.querySelector(".flashlight");

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

let currentX = mouseX;
let currentY = mouseY;


/* -------------------------
   Mouse position
------------------------- */

document.addEventListener("mousemove", function(event) {

    mouseX = event.clientX;
    mouseY = event.clientY;

});


/* -------------------------
   Smooth flashlight movement
------------------------- */

function moveFlashlight() {

    currentX += (mouseX - currentX) * 0.12;
    currentY += (mouseY - currentY) * 0.12;

    flashlight.style.left = currentX + "px";
    flashlight.style.top = currentY + "px";

    requestAnimationFrame(moveFlashlight);
}


moveFlashlight();