/**
 *  @author kiwi
 *  @date 2022.04.16
 *
 *  ☐ extract info for one card and put together typing 'level'
 *
 */
let font
let instructions

let passage
let correctSound // audio cue for typing one char correctly
let incorrectSound // audio cue for typing one char incorrectly



function preload() {
    font = loadFont('data/consola.ttf')
}


function setup() {
    let cnv = createCanvas(640, 360)
    cnv.parent('#canvas')
    colorMode(HSB, 360, 100, 100, 100)

    /* initialize instruction div */
    instructions = select('#ins')
    instructions.html(`<pre>
        [1,2,3,4,5] → no function
        numpad 1 → freeze sketch</pre>`)

    colorMode(HSB, 360, 100, 100, 100)

    correctSound = loadSound('data/correct.wav')
    incorrectSound = loadSound('data/incorrect.wav')

    passage = new Passage("Developers often work in teams, but it is not" +
        " uncommon to find a developer who works independently as a" +
        " consultant.  ")
}


function draw() {
    background(234, 34, 24)
    textFont(font, 30)
    passage.render()

    displayDebugCorner()
}


/** 🧹 shows debugging info using text() 🧹 */
function displayDebugCorner() {
    const LEFT_MARGIN = 10
    const DEBUG_Y_OFFSET = height - 10 /* floor of debug corner */
    const LINE_SPACING = 2
    const LINE_HEIGHT = textAscent() + textDescent() + LINE_SPACING
    fill(0, 0, 100, 100) /* white */
    strokeWeight(0)

    textFont(font, 14)
    text(`frameCount: ${frameCount}`,
        LEFT_MARGIN, DEBUG_Y_OFFSET - LINE_HEIGHT)
    text(`frameRate: ${frameRate().toFixed(1)}`,
        LEFT_MARGIN, DEBUG_Y_OFFSET)
}


function keyPressed() {
    // don't do anything if we detect SHIFT ALT CONTROL keycodes
    if (keyCode === SHIFT ||
        keyCode === ALT ||
        keyCode === CONTROL ||
        keyCode === 20) { // this is capslock
        return
    }

    /*  if the key we just pressed === passage.getCurrentChar, play correct
        sound, rewind it, passage.setCorrect(). otherwise, play and rewind
        the incorrect sound. passage.setIncorrect().
     */
    if (passage.getCurrentChar() === key) {
        passage.setCorrect()
        correctSound.play()
    } else {
        passage.setIncorrect()
        incorrectSound.play()
    }


    /* stop sketch */
    if (keyCode === 97) {
        noLoop()
        instructions.html(`<pre>
            sketch stopped</pre>`)
    }
}




/*
@author Kiwi
@date 2021-11-06

This will be a typingclub clone made in the spirit of our 15.301 project
 from 2004.


planning
    create passage class
    add sound: correct and incorrect.wav via p5.sound play()


commit schedule
    console typing with truncated passage
    don't clobber passage
    display passage with text()
    passage object ➜ highlights for correct vs incorrect
    index underscore in blue
    current gray horizontal marker
    don't take modifier keys as input; allow capital letters

planned features
    multiline passage. wrap: find next word and test its width
    reset button
    bottom line indicating total progress. 100% on right
    start typing animation: rectangle + bounce
    tracking wpm
    last word wpm
    wpm and accuracy counter on bottom
    scrolling text passage? before that we limit to screen size
    scoring animation, maybe with camera. viewport
        viewport https://forum.processing.org/two/discussion/14992/how-to-move-the-view-without-camera
        cameras https://behreajj.medium.com/cameras-in-processing-2d-and-3d-dc45fd03662c

 */
