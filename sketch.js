/**
 * @author kiwi
 * @date 2022.04.16
 *
 * 2023.09.04
 * 🏭 make a toggle to cache the Scryfall request. just add 🍁WOE and 💍LTR
 * 🏭 separate Adventures into two faces.
 *      see combatTricks for how to separate, combine
 * 🏭 add words per minute - wpm
 * 🏭 keep local storage of words per minute
 *      ls → stats for most missed characters
 *
 * ⚙️ future features ⚙️
 * make ability 'cards' for FFXIV's AST job
 * updateCard uses only 'png_uri' and 'typeText'
 * typeText:actionName, type, cast, recast, cost, range, radius, effect
 */
let font
let instructions
let loaded  /* set to true when we finish loading json and passage */

let passage
let correctSound /* audio cue for typing one char correctly */
let incorrectSound /* audio cue for typing one char incorrectly */

let initialScryfallQueryJSON /* json file from scryfall: set=snc */
let scryfallData /* the 'data' field of a JSON query from api.scryfall */
let cardImg
let currentCardIndex
let cards /* packed up JSON data */

const ART_CROP_WIDTH = 626
const ART_CROP_HEIGHT = 457
const FONT_SIZE = 32

let dc
let milk /* used for magicCard glow */
let sleepLeftMilliseconds = 0;
let lastRequestTime = 0

let debugCorner /* output debug text in the bottom left corner of the canvas */

function preload() {
    font = loadFont('data/consola.ttf')

    const req = 'https://api.scryfall.com/cards/search?q=set:woe'
    initialScryfallQueryJSON = loadJSON(req)
}


function setup() {
    let cnv = createCanvas(1280, 640)
    cnv.parent('#canvas')
    colorMode(HSB, 360, 100, 100, 100)

    debugCorner = new CanvasDebugCorner(5)
    milk = color(207, 7, 99)
    dc = drawingContext

    /* initialize instruction div */
    instructions = select('#ins')
    instructions.html(`<pre>
        numpad 1 → freeze sketch</pre>`)

    /* change collector's number with numpad keys! */
    /* 🥝 [4:-1, 6:+1, 5: random, 8:+10, 2:-10] 🌊 */

    correctSound = loadSound('data/correct.wav')
    incorrectSound = loadSound('data/incorrect.wav')

    scryfallData = []
    scryfallData = scryfallData.concat(initialScryfallQueryJSON['data'])
    if (initialScryfallQueryJSON['has_more']) {
        let pageTwoJSONURL = initialScryfallQueryJSON['next_page']
        loadJSON(pageTwoJSONURL, gotData)
    }
}


function gotData(data) {
    console.log(`data retrieved! ${data['data'].length}`)
    console.log(`request time → ${millis() - lastRequestTime}`)
    lastRequestTime = millis()

    /* add all elements of returned JSON data to our current array */
    scryfallData = scryfallData.concat(data['data'])

    if (data['has_more']) {
        loadJSON(data['next_page'], gotData)
    } else { /* we are done loading! */
        console.log(`total request time → ${millis()}`)
        console.log(`total data length: ${scryfallData.length}`)

        cards = getCardData()
        cards.sort(sortCardsByID)
        console.log(`cards loaded! → ${cards.length}`)

        currentCardIndex = int(random(0, cards.length))
        updateCard()
    }
}


function resetDcShadow() {
    dc.shadowBlur = 0
    dc.shadowOffsetY = 0
    dc.shadowOffsetX = 0
}


function draw() {
    if (loaded) {
        background(passage.cBackground)
        passage.render()

        const IMG_WIDTH = 340
        cardImg.resize(IMG_WIDTH, 0)
        tint(0, 0, 100)

        dc.shadowBlur = 24
        dc.shadowColor = milk

        const hPadding = passage.LEFT_MARGIN / 2
        const vPadding = passage.TOP_MARGIN
        let jitter = 0 /*sin(frameCount / 30) * 15*/

        /* 626x457 */
        image(cardImg, width - IMG_WIDTH - hPadding + jitter, vPadding / 2 + 20)
        resetDcShadow()

        /* debugCorner needs to be last so its z-index is highest */
        debugCorner.setText(`frameCount: ${frameCount}`, 4)
        debugCorner.setText(`set id: ${currentCardIndex} of ${cards.length - 1}`, 3)
        debugCorner.show()
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

    /* regex for detecting creatures and common/uncommon rarity */
    const creature = new RegExp('[Cc]reature|Vehicle')
    // const rarity = new RegExp('(common|uncommon|rare|mythic)')
    const rarity = new RegExp('(common|uncommon)')
    // const rarity = new RegExp('(rare|mythic)')
    let count = 0
    let typeText = ''

    for (let key of scryfallData) {
        let imgURIs /* this handles double faced cards */
        if (key['image_uris']) {
            imgURIs = key['image_uris']
        } else {
            imgURIs = key['card_faces'][0]
        }

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

        typeText += ' ' /* extra space makes user able to hit 'enter' at end*/

        /* only display commons and uncommons in our color filter */
        if (rarity.test(key['rarity'])) {
            results.push({
                'typeText': typeText,
                'name': key.name,
                'collector_number': int(key['collector_number']),
                'art_crop_uri': imgURIs['art_crop'], /*626x457 ½ MB*/
                'normal_uri': imgURIs['normal'],
                'large_uri': imgURIs['large'],
                'png_uri': imgURIs['png'] /* 745x1040 */

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

        if (keyCode === UP_ARROW) {
            processTypedKey('/')
            return
        }

        /* handle em-dash by allowing dash to replace it */
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

    loaded = true
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
    if (passage.finished()) {
        // currentCardIndex = int(random(0, cards.length))

        /* go to the next card unless we're at the end of the list */
        if (currentCardIndex !== cards.length-1) {
            currentCardIndex += 1
        } else { /* wrap */
            currentCardIndex = 0
        }
        console.log(currentCardIndex)
        updateCard()
    }
    else if (passage.getCurrentChar() === k) {
        passage.setCorrect()
        correctSound.play()
    } else {
        passage.setIncorrect()
        incorrectSound.play()
    }
}


/** 🧹 shows debugging info using text() 🧹 */
class CanvasDebugCorner {
    constructor(lines) {
        this.size = lines
        this.debugMsgList = [] /* initialize all elements to empty string */
        for (let i in lines)
            this.debugMsgList[i] = ''
    }

    setText(text, index) {
        if (index >= this.size) {
            this.debugMsgList[0] = `${index} ← index>${this.size} not supported`
        } else this.debugMsgList[index] = text
    }

    show() {
        textFont(font, 14)
        strokeWeight(1)

        const LEFT_MARGIN = 10
        const DEBUG_Y_OFFSET = height - 10 /* floor of debug corner */
        const LINE_SPACING = 2
        const LINE_HEIGHT = textAscent() + textDescent() + LINE_SPACING
        fill(0, 0, 100, 100) /* white */
        strokeWeight(0)

        for (let index in this.debugMsgList) {
            const msg = this.debugMsgList[index]
            text(msg, LEFT_MARGIN, DEBUG_Y_OFFSET - LINE_HEIGHT * index)
        }
    }
}
