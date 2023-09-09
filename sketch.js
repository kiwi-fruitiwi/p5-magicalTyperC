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
let currentCollectorNumber /* collector number of current card */

/** @type {object} */
let cardFaces /* packed up JSON data. some cards have multiple faces */

const ART_CROP_WIDTH = 626
const ART_CROP_HEIGHT = 457

const CARD_WIDTH = 380
const CARD_LEFT_MARGIN = 32
const FONT_SIZE = 32

let dc
let milk /* used for magicCard glow */
let lastRequestTime = 0

let debugCorner /* output debug text in the bottom left corner of the canvas */
let setName = 'woe'
let flavorTextToggle = true

function preload() {
    font = loadFont('data/consola.ttf')

    const req = `https://api.scryfall.com/cards/search?q=set:${setName}`
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
        🍁ᵂᴼᴱ: Wilds of Eldraine
        
        numpad [ 1 → freeze, 5 → random, 7 → flavorTextToggle ]
        numpad [ 6 → next, 4 → previous, 2 → jump10-, 8 → jump10+ ]
        </pre>`)

    /* change collector's number with numpad keys! */
    /* 🥝 [4:-1, 6:+1, 5: random, 8:+10, 2:-10, 3: 0] 🌊 */

    correctSound = loadSound('data/correct.wav')
    incorrectSound = loadSound('data/incorrect.wav')

    scryfallData = []
    scryfallData = scryfallData.concat(initialScryfallQueryJSON['data'])
    if (initialScryfallQueryJSON['has_more']) {
        let pageTwoJSONURL = initialScryfallQueryJSON['next_page']
        loadJSON(pageTwoJSONURL, gotData)
    }

    populateWallpapers()
}


function populateWallpapers() {
    const wallpapers = {
        'ltr': [
            'birthdayescape.jpg',
            'theshire.jpg',
            'andurilflameofthewest.jpg',
            'gandalfthegrey.jpg',
            'samwisegamgee.jpg',
            'doorsofdurin.jpg',
            'lastmarchoftheents.jpg',
            'stingtheglintingdagger.jpg',
            'thegreyhavens.jpg'
        ],
        'woe': [
            'evolvingwilds.jpg',
            'island.jpg',
            'restlessvinestalk.jpg',
            'threebowls.jpg',
            'solitarysanctuary.jpg'
        ]
    }

    const setImgArr = wallpapers[setName]

    /* use the array length as a scaling factor for random's [0,1) generator */
    const randomIndex = Math.floor(Math.random() * setImgArr.length)
    const wallpaperFileName = setImgArr[randomIndex];

    const bgURL = `url("backgrounds/${setName}/${wallpaperFileName}")`
    select('body').style('background-image', 'linear-gradient(rgba(0,0,0,0.5),' +
        ` rgba(0,0,0,0.5)), ${bgURL}`)
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

        cardFaces = getCardData(scryfallData)
        cardFaces.sort(sortCardsByID)
        console.log(`cards loaded! → ${cardFaces.length}`)

        currentCardIndex = int(random(0, cardFaces.length))
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
        clear()
        background(passage.cBackground)
        passage.render()

        cardImg.resize(CARD_WIDTH, 0)
        tint(0, 0, 100)

        dc.shadowBlur = 24
        dc.shadowColor = milk

        let jitter = 0 /* sin(frameCount / 30) * 15 */

        /* 626x457 */
        image(cardImg, CARD_LEFT_MARGIN, 35)
        resetDcShadow()

        /* debugCorner needs to be last so its z-index is highest */
        // debugCorner.setText(`frameCount: ${frameCount}`, 4)
        debugCorner.setText(`    card face ID: ${currentCardIndex} of ${cardFaces.length - 1}`, 2)
        debugCorner.setText(`${setName} collector ID: ${currentCollectorNumber}`, 1)
        debugCorner.setText(`     flavor text: ${flavorTextToggle? 'ON' : 'OFF'}`, 0)
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

    if (flavorTextToggle && element['flavor_text'])
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

        /* filter for rarity */
        const rarity = new RegExp('(common|uncommon|rare|mythic)')
        if (!rarity.test(element['rarity']))
            continue

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

            /* create reverse copy of element['card_faces'] to iterate
             *  this just does adventure before the backside in WOE
             */
            const cardFacesCopy = element['card_faces'].reverse()

            /** iterate through multiple faces and process */
            for (let i in cardFacesCopy) {
                let face = cardFacesCopy[i]

                if (facesShareArt)
                    imgURIs = element['image_uris']
                else
                    imgURIs = cardFacesCopy[i]['image_uris']

                /* amend face with needed information from main card */
                face['collector_number'] = element['collector_number']
                face['keywords'] = element['keywords']
                face['rarity'] = element['rarity']

                if (isTrick(element['keywords'], face['type_line'])) {
                    results.push(processCardFace(face, imgURIs))
                    cardFaceCount += 1
                }
            }
        } else {
            /* process single face */
            imgURIs = element['image_uris']

            if (isTrick(element['keywords'], element['type_line'])) {
                results.push(processCardFace(element, imgURIs))
                cardCount += 1
            }
        }
    }

    console.log(`🍆 [+single cards] ${cardCount}`)
    console.log(`🍆 [+card faces] ${cardFaceCount}`)

    /* remove jumpstart cards. 🍁woe collector ≤ 276 TODO universalize ∀ set*/
    return results.filter(item => item['collector_number'] <= 276)
}


/**
 * returns true if card is a trick: instant or has flash
 * @param keywords keywords for multi-faced cards are done on the main face only
 * @param typeline the type line is on the face for multi-faced cards, and with
 * the card data for single-faced cards
 * @returns {boolean}
 */
function isTrick(keywords, typeline) {
    return ((keywords.includes('Flash')) || (typeline.includes('Instant')))
}


function keyPressed() {
    /* catch keys that are greater than one character, including F12 and
        modifiers, but not including ENTER
     */
    console.log(`🐳${key}`)

    if (key.length > 1 && keyCode !== ENTER &&
        keyCode !== LEFT_ARROW && keyCode !== RIGHT_ARROW &&
        keyCode !== UP_ARROW && keyCode !== DOWN_ARROW) {
        return
    }

    /* stop sketch on numpad1 */
    if (keyCode === 97) { /* numpad 1 */
        noLoop()
        instructions.html(`<pre>
            sketch stopped</pre>`)
    } else if (keyCode === 100 || keyCode === LEFT_ARROW) { /* numpad 4 */
        currentCardIndex--
        updateCard()
    } else if (keyCode === 102 || keyCode === RIGHT_ARROW) { /* numpad 6 */
        currentCardIndex++
        updateCard()
    } else if (keyCode === 104 || keyCode === UP_ARROW) { /* numpad 8 */
        currentCardIndex += 10
        updateCard()
    } else if (keyCode === 98 || keyCode === DOWN_ARROW) {  /* numpad 2 */
        currentCardIndex -= 10
        updateCard()
    } else if (keyCode === 101) { /* numpad 5 */
        currentCardIndex = int(random(0, cardFaces.length))
        console.log(currentCardIndex)
        updateCard()
    } else if (keyCode === 103) { /* numpad 7 */
        flavorTextToggle = !flavorTextToggle
    } else if (keyCode === 99) { /* numpad 3 */
        currentCardIndex = 0
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
    currentCardIndex = constrain(currentCardIndex, 0, cardFaces.length-1)
    currentCollectorNumber = cardFaces[currentCardIndex]['collector_number']

    passage = new Passage(cardFaces[currentCardIndex].typeText)
    cardImg = loadImage(cardFaces[currentCardIndex].png_uri)
    console.log(cardFaces[currentCardIndex].typeText)

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
        if (currentCardIndex !== cardFaces.length-1) {
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
