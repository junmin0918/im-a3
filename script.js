console.log("SCRIPT IS WORKING");
/* ==================================================
   START PAGE
================================================== */

const startPage = document.getElementById("startPage");
const dropArea = document.getElementById("dropArea");

const dragObjects = document.querySelectorAll(".drag-object");

const receiptScene = document.getElementById("receiptScene");
const receiptExit = document.getElementById("receiptExit");

const basementScene = document.getElementById("basementScene");
const basementExit = document.querySelector("#basementScene .exit-button");


/* ==================================================
   DRAG OBJECTS
================================================== */

dragObjects.forEach(function(object) {

    object.addEventListener("dragstart", function(event) {

        const scene = object.getAttribute("data-scene");

        console.log("Dragging:", scene);

        event.dataTransfer.effectAllowed = "move";

        event.dataTransfer.setData(
            "text/plain",
            scene
        );

        object.style.opacity = "0.5";

    });


    object.addEventListener("dragend", function() {

        object.style.opacity = "1";

    });

});


/* ==================================================
   DROP AREA - DRAG OVER
================================================== */

dropArea.addEventListener("dragover", function(event) {

    event.preventDefault();

    event.dataTransfer.dropEffect = "move";

    dropArea.classList.add("drag-over");

});


/* ==================================================
   DROP AREA - DRAG LEAVE
================================================== */

dropArea.addEventListener("dragleave", function() {

    dropArea.classList.remove("drag-over");

});


/* ==================================================
   DROP
================================================== */

dropArea.addEventListener("drop", function(event) {

    event.preventDefault();

    dropArea.classList.remove("drag-over");


    const scene =
        event.dataTransfer.getData("text/plain");


    console.log("Dropped:", scene);


    /* ----------------------------------------------
       RECEIPT
    ---------------------------------------------- */

    if (scene === "receipt") {

        startPage.style.display = "none";

        receiptScene.style.display = "block";

        console.log("Receipt scene opened");

    }


    /* ----------------------------------------------
       BASEMENT
    ---------------------------------------------- */

    else if (scene === "basement") {

        startPage.style.display = "none";

        basementScene.style.display = "block";

        console.log("Basement scene opened");

    }


    /* ----------------------------------------------
       SKULL
    ---------------------------------------------- */

    else if (scene === "skull") {

        console.log("Skull selected");

        alert("Skull scene");

    }


    /* ----------------------------------------------
       MASK
    ---------------------------------------------- */

    else if (scene === "mask") {

        console.log("Mask selected");

        alert("Mask scene");

    }

});


/* ==================================================
   RECEIPT EXIT
================================================== */

if (receiptExit) {

    receiptExit.addEventListener("click", function() {

        receiptScene.style.display = "none";

        startPage.style.display = "flex";

    });

}


/* ==================================================
   BASEMENT EXIT
================================================== */

if (basementExit) {

    basementExit.addEventListener("click", function() {

        basementScene.style.display = "none";

        startPage.style.display = "flex";

    });

}


/* ==================================================
   FLASHLIGHT
================================================== */

const flashlight =
    document.querySelector(".flashlight");


let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

let currentX = mouseX;
let currentY = mouseY;


/* Mouse position */

document.addEventListener("mousemove", function(event) {

    mouseX = event.clientX;
    mouseY = event.clientY;

});


/* Smooth movement */

function moveFlashlight() {

    currentX +=
        (mouseX - currentX) * 0.12;

    currentY +=
        (mouseY - currentY) * 0.12;


    if (flashlight) {

        flashlight.style.left =
            currentX + "px";

        flashlight.style.top =
            currentY + "px";

    }


    requestAnimationFrame(moveFlashlight);

}


moveFlashlight();


/* ==================================================
   RECEIPT EXTREME WATER HOVER
================================================== */

const receiptContainer =
    document.getElementById("receiptContainer");

const receiptImage =
    document.getElementById("receiptImage");


if (receiptContainer && receiptImage) {

    let mouseInside = false;

    let targetX = 0;
    let targetY = 0;

    let currentX = 0;
    let currentY = 0;

    let time = 0;


    /* Mouse enters */

    receiptContainer.addEventListener(
        "mouseenter",
        function() {

            mouseInside = true;

        }
    );


    /* Mouse movement */

    receiptContainer.addEventListener(
        "mousemove",
        function(event) {

            const rect =
                receiptContainer.getBoundingClientRect();


            const x =
                event.clientX - rect.left;

            const y =
                event.clientY - rect.top;


            const centerX =
                rect.width / 2;

            const centerY =
                rect.height / 2;


            targetX =
                (x - centerX) / centerX;

            targetY =
                (y - centerY) / centerY;

        }
    );


    /* Mouse leaves */

    receiptContainer.addEventListener(
        "mouseleave",
        function() {

            mouseInside = false;

            targetX = 0;
            targetY = 0;

        }
    );


    /* ==================================================
       EXTREME WATER ANIMATION
    ================================================== */

    function waterEffect() {

        time += 0.045;


        currentX +=
            (targetX - currentX) * 0.12;

        currentY +=
            (targetY - currentY) * 0.12;


        if (mouseInside) {


            /* BIG WATER WAVES */

            const wave1 =
                Math.sin(time * 3) * 10;

            const wave2 =
                Math.sin(time * 4.5) * 7;

            const wave3 =
                Math.cos(time * 2.5) * 8;


            /* SIDE MOVEMENT */

            const liquidX =
                currentX * 35 +
                wave1;


            /* UP / DOWN */

            const liquidY =
                currentY * 20 +
                wave2;


            /* STRONG ROTATION */

            const rotateZ =
                currentX * 18 +
                Math.sin(time * 2) * 4;


            const rotateX =
                currentY * -18 +
                Math.sin(time * 3) * 5;


            const rotateY =
                currentX * 20 +
                Math.cos(time * 2.5) * 5;


            /* STRETCH */

            const scaleX =
                1 +
                Math.sin(time * 3) * 0.035 +
                Math.abs(currentX) * 0.08;


            const scaleY =
                1 +
                Math.cos(time * 2.5) * 0.035 +
                Math.abs(currentY) * 0.08;


            receiptImage.style.transform =

                "perspective(700px) " +

                "rotateX(" +
                rotateX +
                "deg) " +

                "rotateY(" +
                rotateY +
                "deg) " +

                "rotateZ(" +
                rotateZ +
                "deg) " +

                "translate(" +
                liquidX +
                "px, " +
                liquidY +
                "px) " +

                "scale(" +
                scaleX +
                ", " +
                scaleY +
                ")";


        } else {


            /* RETURN TO NORMAL */

            receiptImage.style.transform =

                "perspective(700px) " +

                "rotateX(0deg) " +

                "rotateY(0deg) " +

                "rotateZ(0deg) " +

                "translate(0px, 0px) " +

                "scale(1)";

        }


        requestAnimationFrame(waterEffect);

    }


    waterEffect();

}