let osn;

// Total numbers to be collected
let goal = 500;

// Tracking the numbers
let refined = [];
let numbers = [];
let r, baseSize;
let buffer = 100;
let cols, rows;

// Info for refining
let refining = false;
let refineTX, refinteTY, refineBX, refineBY;

let lumon;

let startTime = 0;
let secondsSpentRefining = 0;
let lastRefiningTimeStored = 0;

const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

// Info for "nope" state
let nope = false;
let nopeImg;
let nopeTime = 0;

// Info for "MDE" state
let mdeGIF = [];
let mde = false;
let mdeDone = false;
let mdeTime = 0;

// Info for 100% state
let completed = false;
let completedImg;
let completedTime = 0;

// Info for sharing
let shared = false;
let sharedImg;
let sharedTime = 0;

let shareDiv;

// for CRT Shader
let shaderLayer, crtShader;
let g; //p5 graphics instance
let useShader;

// Background and Foreground colours
const mobilePalette = {
  BG: '#010A13',
  FG: '#ABFFE9',
  SELECT: '#EEFFFF',
  LEVELS: {
    'WO': '#05C3A8',
    'FC': '#1EEFFF',
    'DR': '#DF81D5',
    'MA': '#F9ECBB',
  }
};

const shaderPalette = {
  BG: '#111111',
  FG: '#99f',
  SELECT: '#fff',
  LEVELS: {
    'WO': '#17AC97',
    'FC': '#4ABCC5',
    'DR': '#B962B0',
    'MA': '#D4BB5E',
  }
};

let palette = mobilePalette;

// holds filename, initial bin levels, coordinates
let macrodataFile;

let buttonX, buttonY, buttonW, buttonH;

let snoopyAskImg, snoopyAnswerYesImg;
let showAskScreen = false;
let showAnswerScreen = false;
let typewriterText = "Would you like to be my Woodstock?";
let typewriterIndex = 0;
let typewriterComplete = false;
let yesButtonX, yesButtonY, yesButtonW, yesButtonH;
let noButtonX, noButtonY, noButtonW, noButtonH;

function preload() {
  lumon = loadImage('images/lumon.png');
  nopeImg = loadImage('images/nope.png');
  completedImg = loadImage('images/100.png');
  sharedImg = loadImage('images/clipboard.png');
  snoopyAskImg = loadImage('images/snoopyAsk.png');
  snoopyAnswerYesImg = loadImage('images/snoopyAnswerYes.png');
  crtShader = loadShader('shaders/crt.vert.glsl', 'shaders/crt.frag.glsl');
}

function startOver(resetFile = false) {
  // Reset time tracking
  startTime = millis();
  secondsSpentRefining = 0;
  lastRefiningTimeStored = 0;

  // Reset numbers array
  numbers = [];
  r = (smaller - buffer * 2) / 10;
  baseSize = r * 0.33;
  osn = new OpenSimplexNoise();
  cols = floor(g.width / r);
  rows = floor((g.height - buffer * 2) / r);

  let wBuffer = g.width - cols * r;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let x = i * r + r * 0.5 + wBuffer * 0.5;
      let y = j * r + r * 0.5 + buffer;
      numbers[i + j * cols] = new Data(x, y);
    }
  }

  // Reset macrodata file if requested
  if (resetFile) {
    macrodataFile.resetFile();
    storeItem('secondsSpentRefining', 0);
  }

  // Reset refinement bins
  refined = [];
  for (let i = 0; i < 5; i++) {
    const w = g.width / 5;
    const binLevels = macrodataFile.storedBins
      ? macrodataFile.storedBins[i]
      : undefined;
    refined[i] = new Bin(w, i, goal / 5, binLevels);
  }

  // Reset game states
  mde = false;
  mdeDone = false;
  mdeTime = 0;
  nopeTime = 0;
  nope = false;
  completed = false;
  shared = false;

  // Hide the share button
  shareDiv.hide();
}

let zoff = 0;
let smaller;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);

  // Initialize button dimensions and position
  buttonW = 100; // Button width
  buttonH = 40; // Button height
  buttonX = width - buttonW - 20; // Lower-right corner with padding
  buttonY = height - buttonH - 20;

  // Initialize button dimensions and positions
  yesButtonW = 100;
  yesButtonH = 40;
  yesButtonX = width / 2 - 120;
  yesButtonY = height / 2 + 50;

  noButtonW = 100;
  noButtonH = 40;
  noButtonX = width / 2 + 20;
  noButtonY = height / 2 + 50;

  // Create a downscaled graphics buffer to draw to, we'll upscale after applying CRT shader
  g = createGraphics(windowWidth, windowHeight);

  // We don't want to use shader on mobile
  useShader = !isTouchScreenDevice();

  // The shader boosts color values, so we reset the palette if using shader
  if (useShader) {
    palette = shaderPalette;
  }

  // Force pixel density to 1 to improve performance on retina screens
  pixelDensity(1);

  // p5 graphics element to draw our shader output to
  shaderLayer = createGraphics(g.width, g.height, WEBGL);
  shaderLayer.noStroke();
  crtShader.setUniform('u_resolution', [g.width, g.height]);

  smaller = min(g.width, g.height);

  macrodataFile = new MacrodataFile();
  secondsSpentRefining = getItem('secondsSpentRefining') ?? 0;

  sharedImg.resize(smaller * 0.5, 0);
  nopeImg.resize(smaller * 0.5, 0);
  completedImg.resize(smaller * 0.5, 0);

  // Width for the share 100% button
  const shw = completedImg.width;
  const shh = completedImg.height;
  shareDiv = createDiv('');
  shareDiv.hide();
  //shareDiv.style("background-color", "#AAA");
  shareDiv.position(g.width * 0.5 - shw * 0.5, g.height * 0.5 - shh * 0.5);
  shareDiv.style('width', `${shw}px`);
  shareDiv.style('height', `${shh}px`);
  shareDiv.mousePressed(function () {
    let thenumbers = '';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        thenumbers += random(emojis);
      }
      thenumbers += '\n';
    }
    const timeStr = createTimeString(secondsSpentRefining);
    const msg = `In refining ${macrodataFile.coordinates} (${macrodataFile.fileName}) in ${timeStr} I have brought glory to the company.
Praise Kier.
${thenumbers}#mdrlumon #severance 🧇🐐🔢💯
lumon-industries.com`;

    // if (navigator.share) {
    //   console.log("using navigator share");
    // } else {
    console.log('navigator share not availabe, copy to clipboard!');
    navigator.clipboard.writeText(msg);
    shared = true;
    //}
  });

  startOver();
}

function mousePressed() {
  // Check if "Yes" button is clicked
  if (
    showAskScreen &&
    typewriterComplete &&
    mouseX > yesButtonX &&
    mouseX < yesButtonX + 120 && // Match button width
    mouseY > yesButtonY &&
    mouseY < yesButtonY + 50 // Match button height
  ) {
    showAskScreen = false;
    showAnswerScreen = true;
  }

  // Check if reset button is clicked
  if (
    mouseX > buttonX &&
    mouseX < buttonX + buttonW &&
    mouseY > buttonY &&
    mouseY < buttonY + buttonH
  ) {
    startOver(true); // Reset the game
  }

  // This is the worst if statement in the history of if statements
  if (!refining && !mde && !completed && !shared) {
    refineTX = mouseX;
    refineTY = mouseY;
    refineBX = mouseX;
    refineBY = mouseY;
    refining = true;
    nope = false;
  }
}

function mouseDragged() {
  refineBX = mouseX;
  refineBY = mouseY;
}

function mouseReleased() {
  refining = false;
  let countRed = 0;
  let total = 0;
  let refinery = [];
  for (let num of numbers) {
    if (num.inside(refineTX, refineTY, refineBX, refineBY)) {
      if (num.refined) {
        refinery.push(num);
        countRed++;
      }
      total++;
    }
    num.turn(palette.FG);
    num.refined = false;
  }
  // half of numbers must be refinable
  if (countRed > 0.5 * total) {
    const options = [];
    for (let bin of refined) {
      if (bin.count < bin.goal) {
        options.push(bin);
      }
    }
    const bin = random(options);
    for (let num of refinery) {
      num.refine(bin);
    }
  } else {
    refinery = [];
    // 2nd worst if statement in the history of time
    if (!completed && !shared) {
      nope = true;
    }
    nopeTime = millis();
  }
}

let prevPercent;

function draw() {
  g.colorMode(RGB);

  if (showAskScreen) {
    drawAskScreen();
  } else if (showAnswerScreen) {
    drawAnswerScreen();
  } else {
    // Normal game logic
    let sum = 0;
    for (let bin of refined) {
      sum += bin.count;
    }
    let percent = sum / goal;

    if (percent !== prevPercent) {
      const bins = refined.map((bin) => bin.levels);
      macrodataFile.updateProgress(bins);
      prevPercent = percent;
    }

    // Handle MDE state
    if (percent >= 0.75 && !mde && !mdeDone) {
      mde = true;
      mdeTime = millis();
    }

    if (mde && millis() - mdeTime > 5000) {
      mdeDone = true;
      mde = false;
    }

    // Handle 100% completion
    if (percent >= 1.0 && !completed && !shared) {
      completedTime = millis() - startTime;
      completed = true;
      shareDiv.show();
      console.log('completed!');
      showAskScreen = true;
    }

    if (completed && shared) {
      completed = false;
      sharedTime = millis();
    }

    g.background(palette.BG);
    g.textFont('Courier');

    drawTop(percent);
    drawNumbers();
    drawBottom();

    drawBinned();

    g.imageMode(CORNER);
    if (!useShader) g.tint(mobilePalette.FG);
    g.image(lumon, g.width - lumon.width, 0);

    if (nope) {
      g.imageMode(CENTER);
      if (!useShader) g.image(nopeImg, g.width * 0.5, g.height * 0.5);
      if (millis() - nopeTime > 1000) {
        nope = false;
      }
    }

    if (completed) {
      g.imageMode(CENTER);
      if (!useShader) g.image(completedImg, g.width * 0.5, g.height * 0.5);
    }

    if (shared) {
      g.imageMode(CENTER);
      if (!useShader) g.image(sharedImg, g.width * 0.5, g.height * 0.5);
      if (millis() - sharedTime > 10000) {
        shared = false;
      }
    }

    if (mde) {
      g.colorMode(HSB);
      let dim = 5;
      let yoff = 100;
      let inc = 0;
      let index = 0;
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          const currGifFrame =
            (frameCount + (i + j)) % mdeGIF[0].gifProperties.numFrames;
          mdeGIF[0].setFrame(currGifFrame);
          let w = g.width / dim;
          let h = g.height / dim;
          g.noStroke();
          let hu = map(osn.noise3D(xoff, yoff, zoff * 2), -1, 1, -100, 500);
          g.fill(hu, 255, 255, 0.2);
          g.stroke(hu, 255, 255);
          g.strokeWeight(4);
          g.imageMode(CORNER);
          g.image(mdeGIF[0], i * w, j * h, w, h);
          index++;
          g.rectMode(CORNER);
          g.rect(i * w, j * h, w, h);
          xoff += 5;
        }
        yoff += 5;
      }
    }

    drawCursor(mouseX, mouseY);

    // Draw the reset button
    drawResetButton();

    // Apply CRT shader
    applyCRTShader();
  }
}

function drawResetButton() {
  g.push();
  g.textFont('Courier');
  g.textSize(16);
  g.textAlign(CENTER, CENTER);

  // Button background
  g.fill(palette.BG);
  g.stroke(palette.FG);
  g.strokeWeight(2);
  g.rectMode(CORNER);
  g.rect(buttonX, buttonY, buttonW, buttonH, 5);

  // Button text
  g.fill(palette.FG);
  g.noStroke();
  g.text('RESET', buttonX + buttonW / 2, buttonY + buttonH / 2);

  g.pop();
}

function drawTop(percent) {
  g.rectMode(CORNER);
  g.stroke(palette.FG);
  let w = g.width * 0.9;
  g.strokeWeight(2);
  let wx = (g.width - w) * 0.5;
  g.noFill();
  g.rect(wx, 25, w, 50);
  g.noStroke();
  g.fill(palette.FG);

  let realW = w - lumon.width * 0.4;
  let pw = realW * percent;

  g.rect(wx + realW - pw, 25, pw, 50);

  g.noFill();
  g.fill(palette.BG);
  g.stroke(palette.FG);
  g.strokeWeight(4);
  g.textSize(32);
  g.textFont('Arial');
  g.text(`${floor(nf(percent * 100, 2, 0))}% Complete`, w * 0.8, 50);

  // Always display "Martha" as the name
  g.fill(palette.FG);
  g.stroke(palette.BG);
  g.text("Martha", w * 0.175, 50);

  g.fill(palette.BG);
  g.stroke(palette.FG);
}

function drawNumbers() {
  g.rectMode(CENTER);
  g.noFill();
  g.strokeWeight(1);
  g.line(0, buffer, g.width, buffer);
  g.line(0, g.height - buffer, g.width, g.height - buffer);
  //rect(width * 0.5, height * 0.5, width * 2, 20 + height - buffer * 2);
  //rect(width * 0.5, height * 0.5, width * 2, 30 + height - buffer * 2);

  let yoff = 0;

  const inc = 0.2;
  for (let i = 0; i < cols; i++) {
    let xoff = 0;
    for (let j = 0; j < rows; j++) {
      let num = numbers[i + j * cols];
      if (!num) return;
      
      if (num.binIt) {
        num.goBin();
        num.show();
        continue;
      }

      let n = osn.noise3D(xoff, yoff, zoff) - 0.4;
      if (n < 0) {
        n = 0;
        num.goHome();
      } else {
        num.x += random(-1, 1);
        num.y += random(-1, 1);
      }

      let sz = n * baseSize * 4 + baseSize;
      let d = dist(mouseX, mouseY, num.x, num.y);
      if (d < g.width * 0.1) {
        //sz += map(d, 0, width * 0.1, 24, 0);
        num.x += random(-1, 1);
        num.y += random(-1, 1);
      } else {
        num.goHome();
      }
      num.size(sz);
      num.show();
      xoff += inc;
    }
    yoff += inc;
  }
  zoff += 0.005;
}

function drawBottom() {
  for (let i = 0; i < refined.length; i++) {
    refined[i].show();
  }

  if (refining) {
    g.push();
    g.rectMode(CORNERS);
    g.stroke(palette.FG);
    g.noFill();
    g.rect(refineTX, refineTY, refineBX, refineBY);

    for (let num of numbers) {
      if (
        num.inside(refineTX, refineTY, refineBX, refineBY) &&
        num.sz > baseSize
      ) {
        num.turn(palette.SELECT);
        num.refined = true;
      } else {
        num.turn(palette.FG);
        num.refined = false;
      }
    }
    g.pop();
  }
  g.rectMode(CORNER);
  g.fill(palette.FG);
  g.rect(0, g.height - 20, g.width, 20);
  g.fill(palette.BG);
  g.textFont('Courier');
  g.textAlign(CENTER, CENTER);
  g.textSize(baseSize * 0.8);
  g.text(macrodataFile.coordinates, g.width * 0.5, g.height - 10);
}

function drawBinned() {
  for (let num of numbers) {
    if (num.binIt) num.show();
  }
}

function drawFPS() {
  textSize(24);
  fill(palette.FG);
  noStroke();
  text(frameRate().toFixed(2), 50, 25);
}

function toggleShader() {
  if (useShader) {
    palette = mobilePalette;
  } else {
    palette = shaderPalette;
  }
  useShader = !useShader;
}

function drawCursor(xPos, yPos) {
  // Prevents the cursor from appearing outside the canvas
  xPos = constrain(xPos, 0, g.width);
  yPos = constrain(yPos, 0, g.height);

  g.push();
  g.translate(xPos + 10, yPos + 10);
  g.scale(1.2);
  g.fill(palette.BG);
  g.stroke(palette.FG);
  g.strokeWeight(3);
  g.beginShape();
  g.rotate(-PI / 5);
  g.vertex(0, -10);
  g.vertex(7.5, 10);
  g.vertex(0, 5);
  g.vertex(-7.5, 10);
  g.endShape(CLOSE);
  g.pop();
}

function windowResized(ev) {
  // TODO: lots of duplicated code from startOver, better to create something reusable
  resizeCanvas(windowWidth, windowHeight);
  g.resizeCanvas(windowWidth, windowHeight);
  shaderLayer.resizeCanvas(windowWidth, windowHeight)
  crtShader.setUniform('u_resolution', [g.width, g.height]);

  smaller = min(g.width, g.height);

  sharedImg.resize(smaller * 0.5, 0);
  nopeImg.resize(smaller * 0.5, 0);
  completedImg.resize(smaller * 0.5, 0);
  
  refined.forEach((bin) => bin.resize(g.width / refined.length));
  
  r = (smaller - buffer * 2) / 10;
  baseSize = r * 0.33;
   
  cols = floor(g.width / r);
  rows = floor((g.height - buffer * 2) / r);
  let  wBuffer =  g.width - cols * r;
  
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let x = i * r + r * 0.5 + wBuffer * 0.5;
      let y = j * r + r * 0.5 + buffer;
      const numToUpdate = numbers[i + j * cols];
      if (numToUpdate) numToUpdate.resize(x, y);
    }
  }
}

function drawAskScreen() {
  // Draw encapsulating square
  const squareWidth = g.width * 0.8; // Increased width for better button placement
  const squareHeight = g.height * 0.8; // Increased height for better layout
  const squareX = g.width / 2 - squareWidth / 2;
  const squareY = g.height / 2 - squareHeight / 2;

  g.fill(palette.BG);
  g.stroke(palette.FG);
  g.strokeWeight(4);
  g.rectMode(CORNER);
  g.rect(squareX, squareY, squareWidth, squareHeight, 10);

  // Draw Snoopy image inside the square (scaled down)
  const imageSize = squareWidth * 0.4;
  g.imageMode(CENTER);
  g.image(snoopyAskImg, g.width / 2, squareY + imageSize / 2 + 20, imageSize, imageSize);

  // Draw typewriter text below the image
  g.textFont('Courier');
  g.textSize(20);
  g.fill(palette.FG);
  g.noStroke();
  g.textAlign(CENTER, CENTER);

  const textY = squareY + imageSize + 50;
  if (typewriterIndex < typewriterText.length) {
    typewriterIndex++;
  } else {
    typewriterComplete = true;
  }
  g.text(typewriterText.substring(0, typewriterIndex), g.width / 2, textY);

  // Draw buttons below the text if typewriter effect is complete
  if (typewriterComplete) {
    const buttonY = textY + 70; // Adjusted button position
    yesButtonX = g.width / 2 - 80; // Dynamically calculate button positions
    yesButtonY = buttonY;
    noButtonX = g.width / 2 + 20;
    noButtonY = buttonY;

    drawButton("YES", yesButtonX, yesButtonY, 120, 50); // Increased button size
    drawButton("NO", noButtonX, noButtonY, 120, 50); // Increased button size
  }

  // Draw the reset button
  drawResetButton();

  // Draw the custom cursor
  drawCursor(constrain(mouseX, 0, g.width), constrain(mouseY, 0, g.height));

  applyCRTShader();
}

function drawAnswerScreen() {
  // Draw encapsulating square
  const squareWidth = g.width * 0.8; // Increased width for better layout
  const squareHeight = g.height * 0.8; // Increased height for better layout
  const squareX = g.width / 2 - squareWidth / 2;
  const squareY = g.height / 2 - squareHeight / 2;

  g.fill(palette.BG);
  g.stroke(palette.FG);
  g.strokeWeight(4);
  g.rectMode(CORNER);
  g.rect(squareX, squareY, squareWidth, squareHeight, 10);

  // Draw Snoopy answer image inside the square (scaled down)
  const imageSize = squareWidth * 0.4;
  g.imageMode(CENTER);
  g.image(snoopyAnswerYesImg, g.width / 2, squareY + imageSize / 2 + 20, imageSize, imageSize);

  // Draw "Yupiiiii" text below the image
  g.textFont('Courier');
  g.textSize(32);
  g.fill(palette.FG);
  g.noStroke();
  g.textAlign(CENTER, CENTER);

  const textY = squareY + imageSize + 50;
  g.text("Yupiiiii", g.width / 2, textY);

  // Draw the reset button
  drawResetButton();

  // Draw the custom cursor
  drawCursor(constrain(mouseX, 0, g.width), constrain(mouseY, 0, g.height));

  applyCRTShader();
}

function drawButton(label, x, y, w, h) {
  g.push();
  g.textFont('Courier');
  g.textSize(16);
  g.textAlign(CENTER, CENTER);

  // Button background
  g.fill(palette.BG);
  g.stroke(palette.FG);
  g.strokeWeight(2);
  g.rectMode(CORNER);
  g.rect(x, y, w, h, 5);

  // Button text
  g.fill(palette.FG);
  g.noStroke();
  g.text(label, x + w / 2, y + h / 2);

  g.pop();
}

function applyCRTShader() {
  if (useShader) {
    shaderLayer.rect(0, 0, g.width, g.height);
    shaderLayer.shader(crtShader);
    crtShader.setUniform('u_tex', g);
    background(palette.BG);
    imageMode(CORNER);
    image(shaderLayer, 0, 0, g.width, g.height);
  } else {
    image(g, 0, 0, g.width, g.height);
  }
}