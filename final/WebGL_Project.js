var gl;
var points = [];
var normals = [];
var texCoords = [];

var program0, program1, program2; // 0: color, 1:phong, 2: texture mapping
var modelMatrixLoc0, viewMatrixLoc0, modelMatrixLoc1, viewMatrixLoc1, modelMatrixLoc2, viewMatrixLoc2;

var trballMatrix = mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
var vertCubeStart, numVertCubeTri, vertPyraStart, numVertPyraTri, vertGroundStart, numVertGroundTri, vertCurtainStart, numVertCurtainTri, vertPhotoStart, numVertPhotoTri;

var eyePos = vec3(0.0, 10.0, 10.0);
var atPos = vec3(0.0, 0.0, 0.0);
var upVec = vec3(0.0, 1.0, 0.0);
var cameraVec = vec3(0.0, -0.7071, -0.7071); // 1.0/Math.sqrt(2.0)

var ranX = [];
var ranZ = [];
var ranPos=0;
var ranCnt = [1, 2, 4, 6, 9];   // 가로 불 개수
var ranCnt2 = [1, 2, 3, 4, 5, 7]    // 세로 불 개수
var ranCntIndex1;
var ranCntIndex2;
var ranCntIndex3;
var lightSrc = [0.0, 1.0, -1.0, 1.0];
var lightSrcLoc;

var jumping = false;
var jum =true;
var isSapphireCol1 = false;
var isSapphireCol2 = false;
var isSapphireCol3 = false;
var playerX = 0;
var playerY = 0;
var playerZ = 0;
var theta = 0;
var jumpMax = 3.0;
var prevTime = new Date();
var timer = 0;
var timer2 = 60;
var speed;

const resultElement=document.getElementById('colNum');
var colNum = resultElement.innerText;
const sapphireResultElement=document.getElementById('sapphireNum');
var sapphireNum = sapphireResultElement.innerText;
const timerResultElement = document.getElementById("timer");
var timer2 = timerResultElement.innerText;

var prevXPos = 3;
var fireDirection = true;
const groundScaleX = 20;
const groundScaleZ = 10;

const objectPos = [
    vec3(-3, 0, -5),    vec3(3, 0, -5),
    vec3(-3, 0, -3),    vec3(3, 0, -3),
    vec3(-3, 0, -1),    vec3(3, 0, -1)
];

function detectCollision(newPosX, newPosZ) {
    if(newPosX < -17 || newPosX > 17 || newPosZ < -17 || newPosZ > 17)
        return true;
    for(var index=0; index<objectPos.length; index++) {
        if(Math.abs(newPosX-objectPos[index][0]) < 1.0 && Math.abs(newPosZ-objectPos[index][2]) < 1.0)
            return true;
    }
    return false;
};

window.onload = function init()
{
    window.setInterval(Timer, 1000);
    window.setInterval(MakeRandom, 10000);
    modelMatrix = translate(0, 0.5, 0);
    var canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if( !gl ) {
        alert("WebGL isn't available!");
    }

    generateTexCurtain();
    generateTexPhoto();
    generateHexaPyramid();
    generateTexGround(groundScaleX, groundScaleZ);
    generateTexCube();

    // virtual trackball
    var trball = trackball(canvas.width, canvas.height);
    var mouseDown = false;

    canvas.addEventListener("mousedown", function (event) {
        trball.start(event.clientX, event.clientY);

        mouseDown = true;
    });

    canvas.addEventListener("mouseup", function (event) {
        mouseDown = false;
    });

    canvas.addEventListener("mousemove", function (event) {
        if (mouseDown) {
            trball.end(event.clientX, event.clientY);

            trballMatrix = mat4(trball.rotationMatrix);
        }
    });

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable hidden-surface removal
    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0.01, 1);

    // Load shaders and initialize attribute buffers
    program0 = initShaders(gl, "colorVS", "colorFS");
    gl.useProgram(program0);

    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program0, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    //var modelMatrix = mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    modelMatrixLoc0 = gl.getUniformLocation(program0, "modelMatrix");
    //gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));

    //var viewMatrix = lookAt(eyePos, atPos, upVec);
    viewMatrixLoc0 = gl.getUniformLocation(program0, "viewMatrix");
    //gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(viewMatrix));
    
    /*
    // 3D orthographic viewing
    var viewLength = 2.0;
    var projectionMatrix;
    if (canvas.width > canvas.height) {
        var aspect = viewLength * canvas.width / canvas.height;
        projectionMatrix = ortho(-aspect, aspect, -viewLength, viewLength, -viewLength, 1000);
    }
    else {
        var aspect = viewLength * canvas.height / canvas.width;
        projectionMatrix = ortho(-viewLength, viewLength, -aspect, aspect, -viewLength, 1000);
    }
    */

    // 3D perspective viewing
    var aspect = canvas.width / canvas.height;
    var projectionMatrix = perspective(90, aspect, 0.1, 1000); 

    var projectionMatrixLoc = gl.getUniformLocation(program0, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    ////////////////////////////////////////////////////////////
    // program1 : phong Shading

    program1 = initShaders(gl, "phongVS", "phongFS");
    gl.useProgram(program1);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    var vPosition = gl.getAttribLocation(program1, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // Create a buffer object, initialize it, and associate it with 
    // the associated attribute variable in our vertex shader
    var nBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program1, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    modelMatrixLoc1 = gl.getUniformLocation(program1, "modelMatrix");
    viewMatrixLoc1 = gl.getUniformLocation(program1, "viewMatrix");

    var projectionMatrixLoc = gl.getUniformLocation(program1, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    setLighting(program1);
    
    ////////////////////////////////////////////////////////////
    // program2 : Texture Mapping

    program2 = initShaders(gl, "texMapVS", "texMapFS");
    gl.useProgram(program2);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    var vPosition = gl.getAttribLocation(program1, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, nBufferId);
    var vNormal = gl.getAttribLocation(program2, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var tBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program2, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    modelMatrixLoc2 = gl.getUniformLocation(program2, "modelMatrix");
    viewMatrixLoc2 = gl.getUniformLocation(program2, "viewMatrix");

    projectionMatrixLoc = gl.getUniformLocation(program2, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    setLighting(program2);
    setTexture();

    // Event listeners for buttons
    document.getElementById("left").onclick = function () {
        var sinTheta = Math.sin(0.1);
        var cosTheta = Math.cos(0.1);
        var newVecX = cosTheta*cameraVec[0] + sinTheta*cameraVec[2];
        var newVecZ = -sinTheta*cameraVec[0] + cosTheta*cameraVec[2];
        cameraVec[0] = newVecX;
        cameraVec[2] = newVecZ;
    };
    document.getElementById("right").onclick = function () {
        var sinTheta = Math.sin(0.1);
        var cosTheta = Math.cos(0.1);
        var newVecX = cosTheta*cameraVec[0] - sinTheta*cameraVec[2];
        var newVecZ = sinTheta*cameraVec[0] + cosTheta*cameraVec[2];
        cameraVec[0] = newVecX;
        cameraVec[2] = newVecZ;
    };
    document.getElementById("up").onclick = function () {
        var newPosX = eyePos[0] + 0.5 * cameraVec[0];
        var newPosZ = eyePos[2] + 0.5 * cameraVec[2];
        if (newPosX > -10 && newPosX < 10 && newPosZ > -10 && newPosZ < 10 && !detectCollision(newPosX, newPosZ)) {
            eyePos[0] = newPosX;
            eyePos[2] = newPosZ;
        }
    };
    document.getElementById("down").onclick = function () {
        var newPosX = eyePos[0] - 0.5 * cameraVec[0];
        var newPosZ = eyePos[2] - 0.5 * cameraVec[2];
        if (newPosX > -10 && newPosX < 10 && newPosZ > -10 && newPosZ < 10 && !detectCollision(newPosX, newPosZ)) {
            eyePos[0] = newPosX;
            eyePos[2] = newPosZ;
        }
    };

    render();
};

window.onkeydown = function(event) {
    var sinTheta = Math.sin(0.1);
    var cosTheta = Math.cos(0.1);
    switch (event.keyCode) {
        case 37:    // left arrow
            playerX -= 0.5;
            break;
        case 65:    // 'A'
        case 97:    // 'a'
            var newVecX = cosTheta*cameraVec[0] + sinTheta*cameraVec[2];
            var newVecZ = -sinTheta*cameraVec[0] + cosTheta*cameraVec[2];
            cameraVec[0] = newVecX;
            cameraVec[2] = newVecZ;
            break;
        case 39:    // right arrow
            playerX += 0.5;
            break;
        case 68:    // 'D'
        case 100:   // 'd'
            var newVecX = cosTheta*cameraVec[0] - sinTheta*cameraVec[2];
            var newVecZ = sinTheta*cameraVec[0] + cosTheta*cameraVec[2];
            cameraVec[0] = newVecX;
            cameraVec[2] = newVecZ;
            break;
        case 38:    // up arrow
            playerZ -= 0.5;
            break;
        case 87:    // 'W'
        case 119:   // 'w'
            var newPosX = eyePos[0] + 0.5 * cameraVec[0];
            var newPosZ = eyePos[2] + 0.5 * cameraVec[2];
            if (newPosX > -10 && newPosX < 10 && newPosZ > -10 && newPosZ < 10 && !detectCollision(newPosX, newPosZ)) {
                eyePos[0] = newPosX;
                eyePos[2] = newPosZ;
            }
            break;
        case 40:    // down arrow
            playerZ += 0.5;
            break;
        case 83:    // 'S'
        case 115:   // 's'
            var newPosX = eyePos[0] - 0.5 * cameraVec[0];
            var newPosZ = eyePos[2] - 0.5 * cameraVec[2];
            if (newPosX > -10 && newPosX < 10 && newPosZ > -10 && newPosZ < 10 && !detectCollision(newPosX, newPosZ)) {
                eyePos[0] = newPosX;
                eyePos[2] = newPosZ;
            }
            break;
        case 32:
            if(!jumping && playerY <=0.5){
                // playerY +=2.0;
                jumping = true;
            }
            break;

    }
    // render();
};

function Timer() {
    timer++;
    timer2 -= 1;
}

function MakeRandom() {
    ranX = [];
    ranZ = [];
    var randNum = Math.floor(Math.random() * 3)+1;
    
    for(var i=1; i<=randNum; i++)
    {
        ranX.push(((Math.floor(Math.random() * 4)-2)+0.5)*8);
        ranZ.push(((Math.floor(Math.random() * 4)-2)+0.5)*4);
    }
    isSapphireCol1 = false;
    isSapphireCol2 = false;
    isSapphireCol3 = false;
    // ranX.push((Math.floor(Math.random() * 5)-2)*8);
    // ranX.push((Math.floor(Math.random() * 5)-2)*8);
    

    // ranZ.push(((Math.floor(Math.random() * 4)-2)+0.5)*4);
    // ranZ.push(((Math.floor(Math.random() * 4)-2)+0.5)*4);
      
    // window.requestAnimationFrame(MakeRandom);
}

function setLighting(program) {
    // var lightSrc = [0.0, 1.0, 0.0, 0.0];
    var lightAmbient = [0.2, 0.2, 0.2, 1.0];
    var lightDiffuse = [1.0, 1.0, 1.0, 1.0];
    var lightSpecular = [1.0, 1.0, 1.0, 1.0];
    
    var matAmbient = [1.0, 1.0, 1.0, 1.0];
    var matDiffuse = [1.0, 1.0, 1.0, 1.0];
    var matSpecular = [1.0, 1.0, 1.0, 1.0];
    
    var ambientProduct = mult(lightAmbient, matAmbient);
    var diffuseProduct = mult(lightDiffuse, matDiffuse);
    var specularProduct = mult(lightSpecular, matSpecular);


    gl.uniform4fv(gl.getUniformLocation(program, "lightSrc"), lightSrc);
    gl.uniform3f(gl.getUniformLocation(program, "kAtten"), 0.2, 0.2, 0.2);
    gl.uniform3f(gl.getUniformLocation(program, "spotDir"), 1.0, -1.0, 0.0);
    gl.uniform1f(gl.getUniformLocation(program, "spotExp"), 5.0);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), specularProduct);

    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 100.0);
    gl.uniform3fv(gl.getUniformLocation(program, "eyePos"), flatten(eyePos));
};

function setTexture() {
    var image0 = new Image();
    image0.src = "../images/floor.bmp";

    var texture0 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image0);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var image1 = new Image();
    image1.src = "../images/crate.bmp";

    var texture1 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image1);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    var image2 = new Image();
    image2.src = "../images/curtain.bmp";

    var texture2 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image2);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var image3 = new Image();
    image3.src = "../images/fire.bmp";

    var texture3 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, texture3);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image3);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var image4 = new Image();
    image4.src = "../images/yellow.bmp";

    var texture4 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, texture4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image4);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var image5 = new Image();
    image5.src = "../images/photo.bmp";

    var texture5 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, texture5);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image5);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    lightSrc[0] = playerX/10;
    lightSrc[2] = -1.0 + playerZ/10;
    setLighting(program2);
    gl.uniform4fv(lightSrcLoc, lightSrc);

    let currTime = new Date();
    let elapsedTime = currTime.getTime() - prevTime.getTime();
    theta += (elapsedTime / 10);
    prevTime = currTime;

    if(jumping){
        if(playerY<=3.5&&jum){
            playerY += elapsedTime/100;
            if(playerY>3.5){
                jum =false;
            }
        }
        else if(playerY>=0.0 && !jum){
            // playerY -= 1.0;
            playerY -= elapsedTime/100;
            if(playerY<=0.0&& jumping){
                // alert(playerY);
                jumping =false;
                jum = true;
            }
            
        }
    }
    // atPos[0] = eyePos[0] + cameraVec[0];
    // atPos[1] = eyePos[1] + cameraVec[1];
    // atPos[2] = eyePos[2] + cameraVec[2];
    var viewMatrix = lookAt(eyePos, atPos, upVec);
    gl.useProgram(program0);
    gl.uniformMatrix4fv(viewMatrixLoc0, false, flatten(viewMatrix));
    gl.useProgram(program1);
    gl.uniformMatrix4fv(viewMatrixLoc1, false, flatten(viewMatrix));
    gl.useProgram(program2);
    gl.uniformMatrix4fv(viewMatrixLoc2, false, flatten(viewMatrix));

    
    var uColorLoc = gl.getUniformLocation(program0, "uColor");
    // var diffuseProductLoc = gl.getUniformLocation(program1, "diffuseProduct");
    var textureLoc = gl.getUniformLocation(program2, "texture");
    
    // draw the ground
    gl.useProgram(program2);
    gl.uniform1i(textureLoc, 0);
    // gl.uniform4f(uColorLoc, 0.8, 0.8, 0.8, 1.0);    // gray
    // gl.uniform4f(diffuseProductLoc, 0.8, 0.8, 0.8, 1.0);

    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(trballMatrix));
    gl.drawArrays(gl.TRIANGLES, vertGroundStart, numVertGroundTri);

    //draw the photo
    gl.useProgram(program2);
    gl.uniform1i(textureLoc, 5);
    // gl.uniform4f(uColorLoc, 0.8, 0.8, 0.8, 1.0);    // gray
    // gl.uniform4f(diffuseProductLoc, 0.8, 0.8, 0.8, 1.0);

    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(trballMatrix));
    gl.drawArrays(gl.TRIANGLES, vertPhotoStart, numVertPhotoTri);

    // draw a cube
    gl.useProgram(program2);
    gl.uniform1i(textureLoc, 1);

    var rMatrix = mult(rotateY(0), rotateZ(0));
    modelMatrix = mult(translate(playerX, playerY, playerZ), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);

    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    // window.requestAnimationFrame(MakeRandom);  

    //draw the curtain
    gl.useProgram(program2);
    gl.uniform1i(textureLoc, 2);
    // gl.uniform4f(uColorLoc, 0.8, 0.8, 0.8, 1.0);    // gray
    // gl.uniform4f(diffuseProductLoc, 0.8, 0.8, 0.8, 1.0);

    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(trballMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCurtainStart, numVertCurtainTri);
    
    //firePos = [];
    var fireWidLen = false; // 불 생성 방향 (가로/세로)
    var xPos;
    
    if(timer <= 10)
        speed = 150;
    if(fireDirection)
        xPos = prevXPos + elapsedTime / speed;
    else
        xPos = prevXPos - elapsedTime / speed;
    
    if(xPos > (groundScaleX+3))
    {
        ranPos = 0;
        fireDirection = false;
        ranPos += ((Math.random() * 10)-8);
        ranCntIndex1 = Math.floor(Math.random() * 6);
        ranCntIndex2 = Math.floor(Math.random() * 6);
        ranCntIndex3 = Math.floor(Math.random() * 7);
        //ranSpeed = Math.floor((Math.random() * 7)-1);
    }
        
    else if(xPos < -groundScaleX-3)
    {
        ranPos = 0;
        fireDirection = true;
        ranPos -= ((Math.random() * 10)-8);
        ranCntIndex1 = Math.floor(Math.random() * 6);
        ranCntIndex2 = Math.floor(Math.random() * 6);
        ranCntIndex3 = Math.floor(Math.random() * 7);
        //ranSpeed = Math.floor((Math.random() * 7)-1);
    }
        
    prevXPos = xPos;

    for(var i=0; i<ranCnt[ranCntIndex1]; i+=1.6)   // 가로 방향 불 생성
    {
        // draw a hexa-pyramid
        //gl.useProgram(program0);
        gl.useProgram(program2);
        gl.uniform1i(textureLoc, 3);
        // gl.uniform4f(uColorLoc, 0.0, 0.0, 1.0, 1.0);    // translucent blue
        // gl.uniform4f(diffuseProductLoc, 1.0, 0.0, 0.0, 1.0);

        // gl.uniform4f(uColorLoc, 1.0,0.2,0.0,1.0);

        modelMatrix = mult(translate(-xPos, -0.5, i+ranPos), rotateZ(180));
        modelMatrix = mult(trballMatrix, modelMatrix);

        //firePos.push(vec3(-xPos, 0, i));

        gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
        gl.drawArrays(gl.TRIANGLES, vertPyraStart, numVertPyraTri);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);

        if(Math.abs(playerX-modelMatrix[0][3]) < 1.0 && Math.abs(playerZ-modelMatrix[2][3]) < 1.0 && Math.abs(playerY-modelMatrix[1][3]) < 1.0){  // 충돌 체크
            alert("col");
            colNum = parseInt(colNum) + 1;
            resultElement.innerText = colNum;
        }
    }

    if(timer >= 10)
    {
        speed = 130;
        for(var i=0; i<ranCnt[ranCntIndex2]; i+=1.6)   // 세로 방향 불 생성
        {
            // draw a hexa-pyramid
            //gl.useProgram(program0);
            gl.useProgram(program2);
            gl.uniform1i(textureLoc, 3);
            //gl.uniform4f(uColorLoc, 0.0, 0.0, 1.0, 1.0);    // translucent blue
            // gl.uniform4f(diffuseProductLoc, 1.0, 0.0, 0.0, 1.0);

            //gl.uniform4f(uColorLoc, 1.0,0.2,0.0,1.0);

            modelMatrix = mult(translate(i+ranPos, -0.5, -xPos), rotateZ(180));
            modelMatrix = mult(trballMatrix, modelMatrix);

            //firePos.push(vec3(-xPos, 0, i));

            gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
            gl.drawArrays(gl.TRIANGLES, vertPyraStart, numVertPyraTri);
            gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);

            if(Math.abs(playerX-modelMatrix[0][3]) < 1.0 && Math.abs(playerZ-modelMatrix[2][3]) < 1.0 && Math.abs(playerY-modelMatrix[1][3]) < 1.0){  // 충돌 체크
                alert("col");
                colNum = parseInt(colNum) + 1;
                resultElement.innerText = colNum;

                // document.write('<h3>충돌 횟수: ' + colNum + '</h3>');
            }
        }
    }
    
    if(timer >= 15)
    {
        speed = 90;
        for(var i=0; i<ranCnt2[ranCntIndex3]; i+=1.2)   // 대각선 방향 불 생성
        {
            // draw a hexa-pyramid
            //gl.useProgram(program0);
            gl.useProgram(program2);
            gl.uniform1i(textureLoc, 3);
            //gl.uniform4f(uColorLoc, 0.0, 0.0, 1.0, 1.0);    // translucent blue
            // gl.uniform4f(diffuseProductLoc, 1.0, 0.0, 0.0, 1.0);

            //gl.uniform4f(uColorLoc, 1.0,0.2,0.0,1.0);

            modelMatrix = mult(translate(xPos+i+ranPos, -0.5, -xPos+i+ranPos), rotateZ(180));
            modelMatrix = mult(trballMatrix, modelMatrix);

            //firePos.push(vec3(-xPos, 0, i));

            gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
            gl.drawArrays(gl.TRIANGLES, vertPyraStart, numVertPyraTri);
            gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);

            if(Math.abs(playerX-modelMatrix[0][3]) < 1.0 && Math.abs(playerZ-modelMatrix[2][3]) < 1.0 && Math.abs(playerY-modelMatrix[1][3]) < 1.0){  // 충돌 체크
                alert("col");
                colNum = parseInt(colNum) + 1;
                resultElement.innerText = colNum;
                // document.write('<h3>충돌 횟수: ' + colNum + '</h3>');
            }
        }
    }
    // draw a yellow sapphire1
    if (isSapphireCol1 ==false) {
        gl.useProgram(program2);
        // gl.uniform4f(uColorLoc, 1.0,1.0,0.0,0.8);

        gl.uniform1i(textureLoc, 4);
        // gl.uniform4f(uColorLoc, 1.0, 0.0, 0.0, 1.0);    // translucent blue

        var sapphire1Y = 0.5;
        var rMatrix = mult(rotateY(theta), rotateZ(45));
        modelMatrix = mult(translate(ranX[0], sapphire1Y, ranZ[0]), rMatrix);
        modelMatrix = mult(trballMatrix, modelMatrix);
        gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
        gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);

        if (Math.abs(playerX - modelMatrix[0][3]) < 1.0 && Math.abs(playerZ - modelMatrix[2][3]) < 1.0 && Math.abs(playerY-modelMatrix[1][3]) < 1.0)  // 충돌 체크
        {
            isSapphireCol1 = true;
            sapphire1Y -= 1.0;
            sapphireNum = parseInt(sapphireNum) + 1;
            sapphireResultElement.innerText = sapphireNum;
            // alert("col sapphire");
        }
    }

    // draw a yellow sapphire2
    if (isSapphireCol2 ==false) {
        gl.useProgram(program2);
        // gl.uniform4f(uColorLoc, 1.0,1.0,0.0,0.8);
        
        gl.uniform1i(textureLoc, 4);
        // gl.uniform4f(uColorLoc, 1.0, 0.0, 0.0, 1.0);    // translucent blue

        var sapphire2Y = 0.5;
        var rMatrix = mult(rotateY(theta), rotateZ(45));
        modelMatrix = mult(translate(ranX[1], sapphire2Y, ranZ[1]), rMatrix);
        modelMatrix = mult(trballMatrix, modelMatrix);
        gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
        gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);

        if (Math.abs(playerX - modelMatrix[0][3]) < 1.0 && Math.abs(playerZ - modelMatrix[2][3]) < 1.0 & Math.abs(playerY-modelMatrix[1][3]) < 1.0)  // 충돌 체크
        {
            isSapphireCol2 = true;
            sapphire2Y -= 1.0;
            sapphireNum = parseInt(sapphireNum) + 1;
            sapphireResultElement.innerText = sapphireNum;
            // alert("col sapphire");
        }
    }
    // draw a yellow sapphire3
    if (isSapphireCol3==false) {
        gl.useProgram(program2);
        // gl.uniform4f(uColorLoc, 1.0,1.0,0.0,0.8);

        gl.uniform1i(textureLoc, 4);
        // gl.uniform4f(uColorLoc, 1.0, 0.0, 0.0, 1.0);    // translucent blue

        var sapphire3Y = 0.5;
        var rMatrix = mult(rotateY(theta), rotateZ(45));
        modelMatrix = mult(translate(ranX[2], sapphire3Y, ranZ[2]), rMatrix);
        modelMatrix = mult(trballMatrix, modelMatrix);
        gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
        gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);

        if (Math.abs(playerX - modelMatrix[0][3]) < 1.0 && Math.abs(playerZ - modelMatrix[2][3]) < 1.0 && Math.abs(playerY-modelMatrix[1][3]) < 1.0)  // 충돌 체크
        {
            isSapphireCol3 = true;
            sapphire3Y -= 1.0;
            sapphireNum = parseInt(sapphireNum) + 1;
            sapphireResultElement.innerText = sapphireNum;
            // alert("col sapphire");
        }
    }
    
    // timerResultElement.innerText = timer;
    if(timer2 <= 60){
        timerResultElement.innerText = timer2;
        if (timer2 == 0)
            timer2 = 60;
    }
    else{ 
        timerResultElement.innerText = timer2;
    }

    if(colNum == 3){
        
    }
    window.requestAnimationFrame(render);
}

function generateTexCube() {
    vertCubeStart = points.length;
    numVertCubeTri = 0;
    texquad(1, 0, 3, 2);
    texquad(2, 3, 7, 6);
    texquad(3, 0, 4, 7);
    texquad(4, 5, 6, 7);
    texquad(5, 4, 0, 1);
    texquad(6, 5, 1, 2);
}

function texquad(a, b, c, d) {
    vertexPos = [
        vec4(-0.5, -0.5, -0.5, 1.0),
        vec4( 0.5, -0.5, -0.5, 1.0),
        vec4( 0.5,  0.5, -0.5, 1.0),
        vec4(-0.5,  0.5, -0.5, 1.0),
        vec4(-0.5, -0.5,  0.5, 1.0),
        vec4( 0.5, -0.5,  0.5, 1.0),
        vec4( 0.5,  0.5,  0.5, 1.0),
        vec4(-0.5,  0.5,  0.5, 1.0)
    ];

    vertexNormals = [
        vec4(-0.57735, -0.57735, -0.57735, 0.0),
        vec4( 0.57735, -0.57735, -0.57735, 0.0),
        vec4( 0.57735,  0.57735, -0.57735, 0.0),
        vec4(-0.57735,  0.57735, -0.57735, 0.0),
        vec4(-0.57735, -0.57735,  0.57735, 0.0),
        vec4( 0.57735, -0.57735,  0.57735, 0.0),
        vec4( 0.57735,  0.57735,  0.57735, 0.0),
        vec4(-0.57735,  0.57735,  0.57735, 0.0)
    ];

    var texCoord = [
        vec2(0, 0),
        vec2(0, 1),
        vec2(1, 1),
        vec2(1, 0)
    ];

    // two triangles: (a, b, c) and (a, c, d)
    // solid colored faces
    points.push(vertexPos[a]);
    normals.push(vertexNormals[a]);
    texCoords.push(texCoord[0]);
    numVertCubeTri++;

    points.push(vertexPos[b]);
    normals.push(vertexNormals[b]);
    texCoords.push(texCoord[1]);
    numVertCubeTri++;

    points.push(vertexPos[c]);
    normals.push(vertexNormals[c]);
    texCoords.push(texCoord[2]);
    numVertCubeTri++;

    points.push(vertexPos[a]);
    normals.push(vertexNormals[a]);
    texCoords.push(texCoord[0]);
    numVertCubeTri++;
    
    points.push(vertexPos[c]);
    normals.push(vertexNormals[c]);
    texCoords.push(texCoord[2]);
    numVertCubeTri++;

    points.push(vertexPos[d]);
    normals.push(vertexNormals[d]);
    texCoords.push(texCoord[3]);
    numVertCubeTri++;
}

function generateTexGround(width, height) {
    vertGroundStart = points.length;
    numVertGroundTri = 0;
    for(var x=-width; x<width; x++) {
        for(var z=-height; z<height; z++) {
            // two triangles
            points.push(vec4(x, -1.0, z, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertGroundTri++;
            
            points.push(vec4(x, -1.0, z+1, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 1));
            numVertGroundTri++;

            points.push(vec4(x+1, -1.0, z+1, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertGroundTri++;

            points.push(vec4(x, -1.0, z, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertGroundTri++;

            points.push(vec4(x+1, -1.0, z+1, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertGroundTri++;

            points.push(vec4(x+1, -1.0, z, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 0));
            numVertGroundTri++;
        }
    }
}

function generateTexPhoto() {
    vertPhotoStart = points.length;
    numVertPhotoTri = 0;
            // two triangles
            points.push(vec4(-10, -1, -9, 1.0)); //왼쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertPhotoTri++;
            
            points.push(vec4(-10, 15, -20, 1.0));//왼쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 1));
            numVertPhotoTri++;

            points.push(vec4(10, 15, -20, 1.0)); //오른쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertPhotoTri++;

            points.push(vec4(-10, -1, -9, 1.0)); //왼쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertPhotoTri++;

            points.push(vec4(10, 15, -20, 1.0)); //오른쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertPhotoTri++;

            points.push(vec4(10, -1, -9, 1.0)); //오른쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 0));
            numVertPhotoTri++;
        
    
}


function generateTexCurtain(){
    vertCurtainStart = points.length;
    numVertCurtainTri = 0;
            //앞커튼
            // two triangles
            points.push(vec4(-20, -1, -10, 1.0)); //왼쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertCurtainTri++;
            
            points.push(vec4(-20, 29, -30, 1.0));//왼쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 1));
            numVertCurtainTri++;

            points.push(vec4(20, 29, -30, 1.0)); //오른쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertCurtainTri++;

            points.push(vec4(-20, -1, -10, 1.0)); //왼쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertCurtainTri++;

            points.push(vec4(20, 29, -30, 1.0)); //오른쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertCurtainTri++;

            points.push(vec4(20, -1, -10, 1.0)); //오른쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 0));
            numVertCurtainTri++;

            //왼쪽커튼
            // two triangles
            points.push(vec4(-20, -1, 10, 1.0)); //왼쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertCurtainTri++;
            
            points.push(vec4(-20, 29, -5, 1.0));//왼쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 1));
            numVertCurtainTri++;

            points.push(vec4(-20, 29, -30, 1.0)); //오른쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertCurtainTri++;

            points.push(vec4(-20, -1, 10, 1.0)); //왼쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertCurtainTri++;

            points.push(vec4(-20, 29, -30, 1.0)); //오른쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertCurtainTri++;

            points.push(vec4(-20, -11, -10, 1.0)); //오른쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 0));
            numVertCurtainTri++;
            
            //오른쪽커튼
            // two triangles
            points.push(vec4(20, -1, 10, 1.0)); //왼쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertCurtainTri++;
            
            points.push(vec4(20, 29, -5, 1.0));//왼쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 1));
            numVertCurtainTri++;

            points.push(vec4(20, 29, -30, 1.0)); //오른쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertCurtainTri++;

            points.push(vec4(20, -1, 10, 1.0)); //왼쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertCurtainTri++;

            points.push(vec4(20, 29, -30, 1.0)); //오른쪽 위
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertCurtainTri++;

            points.push(vec4(20, -11, -10, 1.0)); //오른쪽 아래
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 0));
            numVertCurtainTri++;
}
function generateHexaPyramid() {
    vertPyraStart = points.length;
    numVertPyraTri = 0;
    const vertexPos = [
        vec4(0.0, 0.5, 0.0, 1.0),
        vec4(1.0, 0.5, 0.0, 1.0),
        vec4(0.5, 0.5, -0.866, 1.0),
        vec4(-0.5, 0.5, -0.866, 1.0),
        vec4(-1.0, 0.5, 0.0, 1.0),
        vec4(-0.5, 0.5, 0.866, 1.0),
        vec4(0.5, 0.5, 0.866, 1.0),
        vec4(0.0, -1.0, 0.0, 1.0)
    ];

    const vertexNormal = [
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(1.0, 0.0, 0.0, 0.0),
        vec4(0.5, 0.0, -0.866, 0.0),
        vec4(-0.5, 0.0, -0.866, 0.0),
        vec4(-1.0, 0.0, 0.0, 0.0),
        vec4(-0.5, 0.0, 0.866, 0.0),
        vec4(0.5, 0.0, 0.866, 0.0),
        vec4(0.0, -1.0, 0.0, 0.0)
    ];

    numVertPyraTri = 0;
    for (var i=1; i<6; i++) {
        points.push(vertexPos[0]);
        normals.push(vertexNormal[0]);
        
        numVertPyraTri++;
        points.push(vertexPos[i]);
        normals.push(vertexNormal[0]);
        numVertPyraTri++;
        points.push(vertexPos[i+1]);
        normals.push(vertexNormal[0]);
        numVertPyraTri++;

        points.push(vertexPos[7]);
        normals.push(vertexNormal[7]);
        numVertPyraTri++;
        points.push(vertexPos[i+1]);
        normals.push(vertexNormal[i+1]);
        numVertPyraTri++;
        points.push(vertexPos[i]);
        normals.push(vertexNormal[i]);
        numVertPyraTri++;
    }
    points.push(vertexPos[0]);
    normals.push(vertexNormal[0]);
    numVertPyraTri++;
    points.push(vertexPos[6]);
    normals.push(vertexNormal[0]);
    numVertPyraTri++;
    points.push(vertexPos[1]);
    normals.push(vertexNormal[0]);
    numVertPyraTri++;

    points.push(vertexPos[7]);
    normals.push(vertexNormal[7]);
    numVertPyraTri++;
    points.push(vertexPos[1]);
    normals.push(vertexNormal[1]);
    numVertPyraTri++;
    points.push(vertexPos[6]);
    normals.push(vertexNormal[6]);
    numVertPyraTri++;
}