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

        cards = getCardData(scryfallData)
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
 * takes card data: an element from the scryfall json, and returns relevant
 * fields for combatTricks
 * @param element either the entire card from scryfall json, or one face
 * from 🔑card_faces
 * @param imgURIs for Adventures, the image is part of the json card object
 * rather than the child card_face object because the art is shared! for MDFCs,
 * battles, werewolves, etc., each card_face has its own art because it's
 * the back of the card
 * @return object json containing all necessary information about a card face
 */
function processCardFace(element, imgURIs) {
    /** formatted text for magicalTyperC */
    let typeText = ''

    /** regex for testing if a card is a creature, i.e. has power, toughness */
    const creature = new RegExp('[Cc]reature|Vehicle')

    /* if mana value is 0, skip displaying the space for our typerC text */
    let manaCost = element['mana_cost']
    if (manaCost !== '')
        manaCost = ' ' + manaCost

    typeText = `${element.name}${manaCost}\n${element['type_line']}\n${element['oracle_text']}\n`
    /* sometimes p/t don't exist. check type */
    if (creature.test(element['type_line']))
        typeText += `${element['power']}/${element['toughness']}\n`
    /* we need whitespace at end for passage end detection to work */

    if (element['flavor_text'])
        typeText += `\n${element['flavor_text']}\n`
    else typeText += '\n'

    /* extra space makes user able to hit 'enter' at end */
    typeText += ' '

    /* remove all reminder text, e.g. (If you control another Role on it,
        put that one into the graveyard. Enchanted creature gets +1/+1 and
        has trample.)

        \(      → matches the opening paren
        ([^)]*  → matches non-close-paren characters zero or more times
                    note we can enclose this in parens to see what we replaced
        \)      → matches closing paren

        The g flag at the end of the regex pattern ensures that the replacement
        occurs globally throughout the string? according to GPT4
     */
    typeText = typeText.replace(/\([^)]*\)/g, '')

    return {
        'name': element['name'],
        'colors': element['colors'],

        /* keywords apply to both faces? see harried artisan */
        'keywords': element['keywords'],
        'rarity': element['rarity'],
        'type_line': element['type_line'],
        'oracle_text': element['oracle_text'],
        'collector_number': int(element['collector_number']),
        'typeText': typeText,
        'art_crop_uri': imgURIs['art_crop'], /* 626x457 ½ MB*/
        'small_uri': imgURIs['small'], /* 146x204 */
        'normal_uri': imgURIs['normal'], /* normal 488x680 64KB */
        'large_uri': imgURIs['large'], /* large 672x936 100KB */
        'border_crop_uri': imgURIs['border_crop'], /* 480x680 104KB */
        'png_uri': imgURIs['png'] /* png 745x1040 1MB */
    }
}


/**
 * replacement for getCardData
 * @param data scryfall JSON data object
 */
function getCardData(data) {
    console.log(`💦 [${data[0]['set_name']}] ${data.length}`)

    /** a list of cardData objects containing img and typeText info */
    let results = []

    /** counts cards that pass the filters, like rarity */
    let cardCount = 0

    /** counts adventures twice */
    let cardFaceCount = 0

    for (let element of data) {
        /** object containing URLs for various image sizes and styles */
        let imgURIs

        /** double-sided cards like lessons, vampires, MDFCs have card image
         data inside an array within card_faces. card_faces[0] always gives
         the front card. e.g. Kazandu Mammoth from ZNR
         also applies to: battles
         */
        let doubleFaceCard = false

        /** adventures use 🔑card_faces, but both 'faces' share the same art */
        let facesShareArt = false

        /* iterate through card faces if they exist */
        if (element['card_faces']) {
            /** cards either share one image across all faces (adventures) or
             have a unique image per face. find out which and flag.
             note if element['image_uris'] exists here after the preceding
             🔑card_faces check, then that image is shared across all
             card faces: it must be an adventure! */
            if (element['image_uris']) {
                facesShareArt = true
            } else {
                /* card faces have unique images: battles, MDFCs, day / night */
                doubleFaceCard = true
            }

            /** iterate through multiple faces and process */
            for (let i in element['card_faces']) {
                let face = element['card_faces'][i]

                if (facesShareArt)
                    imgURIs = element['image_uris']
                else
                    imgURIs = element['card_faces'][i]['image_uris']

                /* amend face with needed information from main card */
                face['collector_number'] = element['collector_number']
                face['keywords'] = element['keywords']
                face['rarity'] = element['rarity']

                results.push(processCardFace(face, imgURIs))
                cardFaceCount += 1
            }
        } else {
            /* process single face */
            imgURIs = element['image_uris']
            results.push(processCardFace(element, imgURIs))
            cardCount += 1
        }
    }

    console.log(`🍆 [+single cards] ${cardCount}`)
    console.log(`🍆 [+card faces] ${cardFaceCount}`)
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
