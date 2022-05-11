/**
 *  @author kiwi
 *  @date 2022.04.16
 *
 *  ☒ extract info for one card and put together typing 'level'
 *
 */
let font
let instructions
let DEBUG_TEXT

let passage
let correctSound /* audio cue for typing one char correctly */
let incorrectSound /* audio cue for typing one char incorrectly */

let scryfall /* json file from scryfall: set=snc */
let cardImg
let currentCardIndex
let cards /* packed up JSON data */

const ART_CROP_WIDTH = 626
const ART_CROP_HEIGHT = 457
const FONT_SIZE = 20

let dc
let milk /* used for magicCard glow */
let sleepLeftMilliseconds = 0;
const game = cardURIGenerator();

function preload() {
    font = loadFont('data/consola.ttf')
    // font = loadFont('data/lucida-console.ttf')
    scryfall = loadJSON('json/scryfall-snc.json')
}


function setup() {
    let cnv = createCanvas(1280, 640)
    cnv.parent('#canvas')
    colorMode(HSB, 360, 100, 100, 100)

    milk = color(207, 7, 99)
    dc = drawingContext

    /* initialize instruction div */
    instructions = select('#ins')
    instructions.html(`<pre>
        numpad 1 → freeze sketch</pre>`)

    /* change collector's number with numpad keys! */
    /* 🥝 [4:-1, 6:+1, 8:+10, 2:-10] 🌊 */

    correctSound = loadSound('data/correct.wav')
    incorrectSound = loadSound('data/incorrect.wav')

    // passage = new Passage('When Backup Agent enters the battlefield, put a' +
    //     ' +1/+1 counter on target creature.\n1/1\n')

    cards = getCardData()
    cards.sort(sortCardsByID)
    currentCardIndex = int(random(0, cards.length))
    updateCard()
}


function resetDcShadow() {
    dc.shadowBlur = 0
    dc.shadowOffsetY = 0
    dc.shadowOffsetX = 0
}


function draw() {
    background(passage.cBackground)
    textFont(font, FONT_SIZE)

    passage.render()
    passage.displayRowMarkers(5)

    displayDebugCorner()
    // invokeCardGenerator()

    const IMG_WIDTH = 340
    cardImg.resize(IMG_WIDTH, 0)
    tint(0, 0, 100)

    dc.shadowBlur = 24
    dc.shadowColor = milk

    const hPadding = passage.LEFT_MARGIN/2
    const vPadding = passage.TOP_MARGIN
    let jitter = 0 /*sin(frameCount / 30) * 15*/

    /* 626x457 */
    image(cardImg, width-IMG_WIDTH-hPadding+jitter, vPadding/2 + 20)
    resetDcShadow()
}


/** call this in the draw loop to invoke cardURIGenerator to save cards */
function invokeCardGenerator() {
    sleepLeftMilliseconds -= deltaTime;
    if (sleepLeftMilliseconds <= 0) {
        sleepLeftMilliseconds = game.next().value;
    }
}


/** saves scryfall magic card images to the browser default download location */
function* cardURIGenerator() {
    console.log('[ INFO ] starting generator!');
    let cardPngImg

    for (let i=0; i<cards.length; i++) {
        cardPngImg = loadImage(cards[i].normal_uri)
        yield 1500;
        // image(cardPngImg, width/2, height/2)
        cardPngImg.save(`${cards[i].collector_number} ${cards[i].name}.jpg`)
        console.log(cards[i].name)
    }
}


function sortCardsByID(a, b) {
    if (a.collector_number === b.collector_number) {
        return 0;
    } else {
        return (a.collector_number < b.collector_number) ? -1 : 1;
    }
}


/**
 *  (name, id, art_crop uri, png uri, typeText with \n)
 */
function getCardData() {
    let results = []
    let data = scryfall['data']

    /* regex for detecting creatures and common/uncommon rarity */
    let creature = new RegExp('[Cc]reature|Vehicle')
    let rarity = new RegExp('(common|uncommon)')
    let count = 0
    let typeText = ''

    for (let key of data) {
        /* if mana value is 0, skip displaying the space */
        let manaCost = key['mana_cost']
        if (manaCost !== '')
            manaCost = ' ' + manaCost

        typeText = `${key.name}${manaCost}\n${key['type_line']}\n${key['oracle_text']}\n`

        /* sometimes p/t don't exist. check type */
        if (creature.test(key['type_line']))
            typeText += `${key['power']}/${key['toughness']}\n`
            /* we need whitespace at end for passage end detection to work */

        if (key['flavor_text'])
            typeText += `\n${key['flavor_text']}\n`
        else typeText += '\n'

        /* only display commons and uncommons in our color filter */
        if (rarity.test(key['rarity'])) {
            results.push({
                'typeText': typeText,
                'name': key.name,
                'collector_number': int(key['collector_number']),
                'art_crop_uri': key['image_uris']['art_crop'], /*626x457 ½ MB*/
                'normal_uri': key['image_uris']['normal'],
                'large_uri': key['image_uris']['large'],
                'png_uri': key['image_uris']['png'] /* 745x1040 */

                /* normal 488x680 64KB, large 672x936 100KB png 745x1040 1MB*/
            })
            count++

            // if (key.colors.some(e => e === 'W')) {
            //     results.push(typeText)
            //     count++
            // }
        }
    }

     // let unused = `${key['image_uris']['art_crop']}`
    return results
}


/** 🧹 shows debugging info using text() 🧹 */
function displayDebugCorner() {
    textFont(font, 14)

    const LEFT_MARGIN = 10
    const DEBUG_Y_OFFSET = height - 10 /* floor of debug corner */
    const LINE_SPACING = 2
    const LINE_HEIGHT = textAscent() + textDescent() + LINE_SPACING
    fill(0, 0, 100, 100) /* white */
    strokeWeight(0)

    text(`frameCount: ${frameCount}`,
        LEFT_MARGIN, DEBUG_Y_OFFSET - 2*LINE_HEIGHT)
    text(`set id: ${currentCardIndex}`,
        LEFT_MARGIN, DEBUG_Y_OFFSET - LINE_HEIGHT)
    text(`→ ${DEBUG_TEXT}`, LEFT_MARGIN, DEBUG_Y_OFFSET)
    // text(`frameRate: ${frameRate().toFixed(1)}`,
    //     LEFT_MARGIN, DEBUG_Y_OFFSET)
}


function keyPressed() {
    // don't do anything if we detect SHIFT ALT CONTROL keycodes
    if (keyCode === SHIFT ||
        keyCode === ALT ||
        keyCode === CONTROL ||
        keyCode === 20) { // this is capslock
        return
    }

    /* stop sketch on numpad1 */
    if (keyCode === 97) { /* numpad 1 */
        noLoop()
        instructions.html(`<pre>
            sketch stopped</pre>`)
    } else if (keyCode === 100) { /* numpad 4 */
        currentCardIndex--
        updateCard()
    } else if (keyCode === 102) { /* numpad 6 */
        currentCardIndex++
        updateCard()
    } else if (keyCode === 104) { /* numpad 8 */
        currentCardIndex += 10
        updateCard()
    } else if (keyCode === 98) { /* numpad 2 */
        currentCardIndex -= 10
        updateCard()
    } else if (keyCode === 101) { /* numpad 5 */
        currentCardIndex = int(random(0, cards.length))
        console.log(currentCardIndex)
        updateCard()
    } else {
        /* temporary hack for handling enter key */
        if (keyCode === ENTER) {
            processTypedKey('\n')
            return
        }

        /* handle emdash by allowing dash to replace it */
        if (key === '-') {
            processTypedKey('—')
            return
        }

        if (key === '*') {
            processTypedKey('•')
            return
        }

        processTypedKey(key)
    }
}


/** selects a new card based on the currentCardIndex; displays its image and
 associated typing passage */
function updateCard() {
    currentCardIndex = constrain(currentCardIndex, 0, cards.length-1)
    passage = new Passage(cards[currentCardIndex].typeText)
    cardImg = loadImage(cards[currentCardIndex].png_uri)
    console.log(cards[currentCardIndex].typeText)
}


/**
 * process a keypress!
 *
 * if the key user just pressed === passage.getCurrentChar:
 *  → play correct sound, rewind it, passage.setCorrect()
 *  → otherwise, play and rewind the incorrect sound → passage.setIncorrect()
 * @param k
 */
function processTypedKey(k) {
    if (passage.finished())
        noLoop()
    else if (passage.getCurrentChar() === k) {
        passage.setCorrect()
        correctSound.play()
    } else {
        passage.setIncorrect()
        incorrectSound.play()
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
