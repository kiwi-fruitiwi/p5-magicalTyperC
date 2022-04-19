/**
    displays a passage for typing, keeping track of correct and incorrect
    letters by highlighting them

    TODO
        block on incorrect characters until correct one is entered
 */
class Passage {
    constructor(text) {
        this.text = text
        this.index = 0 // where in the passage we're currently typing
        this.correctList = [] // booleans recording character correctness

        /*  keep track of where we last got a character incorrect; use this
         to prevent marking a previously incorrect char correct once we succeed.
         TODO this currently does not work because we skip incorrect chars :p
         */
        this.lastIncorrectIndex = -1

        this.TOP_MARGIN = 50
        this.LEFT_MARGIN = 25
        this.RIGHT_MARGIN = 320
        this.HIGHLIGHT_PADDING = 5
        this.HIGHLIGHT_BOX_HEIGHT = 0 /* to be set dynamically later */

        /* this is the horizontal coordinate where we must text wrap */
        this.LINE_WRAP_X_POS = width - this.RIGHT_MARGIN
    }


    // renders this passage using vectors instead of constant offsets
    render() {
        noStroke()

        /* needs to be redeclared because constructor is invoked before
         textAscent / descent are valid */
        this.HIGHLIGHT_BOX_HEIGHT = textAscent() + textDescent() +
            2*this.HIGHLIGHT_PADDING

        /* position list for every displayed char, used for current word bar */
        let CHAR_POS = []

        /* bottom left corner of the current letter we are about to type */
        let cursor = new p5.Vector(this.LEFT_MARGIN, this.TOP_MARGIN)

        /* iterate through every char in this passage */
        for (let i=0; i<this.text.length; i++) {
            /* save the position every character for later */
            CHAR_POS.push(cursor.copy())
            this.#showHighlightBox(i, cursor)

            /* draw current letter; greater z-index than highlightBox */
            fill(0, 0, 100, 70)
            text(this.text[i], cursor.x, cursor.y)

            /* modify cursor position to where the next letter should be;
               each highlight box should be 1 pixel bigger on left and right
               1+1=2 total pixels of extra width
             */
            cursor.x += textWidth(this.text[i]) + 2 // 2 = HORIZONTAL_PADDING

            /* wrap to handle newlines → needs additional code in keyPressed */
            if (this.text[i] === '\n')
                this.#wrapCursor(cursor)

            /** if we're at a whitespace, determine if we need a new line:
                find the next whitespace; the word between us and that
                whitespace is the next word. if the width of that word + our
                cursor + current space > limit, then newline
             */
            if (this.text[i] === ' ') {
                let ndi = this.text.indexOf(" ", i+1) // next delimiter index
                let nextWord = this.text.substring(i+1, ndi)

                if (textWidth(nextWord) +
                    textWidth(this.text[i]) +
                    cursor.x > this.LINE_WRAP_X_POS) {
                    this.#wrapCursor(cursor)
                }
            }
        }

        this.#showCurrentWordBar(CHAR_POS)
        this.#showCursor(CHAR_POS)
    }


    /**
     * shows the cursor at the current word we're typing
     * @param positions list of positions for every character we are
     * displaying in this passage
     */
    #showCursor(positions) {
        fill(0, 0, 100)
        /* TODO check if we're finished, otherwise we try to read [index+1] */
        rect(
            positions[this.index].x,
            positions[this.index].y + textDescent(),
            textWidth(this.text[this.index]),
            2,
            2)
    }


    /**
     * shows a bar  above the current word by determining where the current
     * word starts and stops using whitespace delimiters ' ' and '\n'
     * @param positions list of positions for every character we are
     * displaying in this passage
     */
    #showCurrentWordBar (positions) {
        fill(0, 0, 80, 30) // gray

        let ndi = min( /* ndi = 'next delimiter index */
            this.text.indexOf(' ', this.index),
            this.text.indexOf('\n', this.index)
        )

        let pdi = max( /* pdi = 'previous delimiter index */
            this.text.lastIndexOf(' ', this.index),
            this.text.lastIndexOf('\n', this.index)
        )

        /* +1: we don't want the line to go over the previous delimiter char */
        rect(
            positions[pdi+1].x, /* start one char past the last delimiter */
            positions[ndi].y - textAscent() - this.HIGHLIGHT_PADDING - 2,
            textWidth(this.text.substring(pdi+1, ndi+1)),
            -2,
            2)  // rounded rect corners
    }


    /** show the highlight box for correct vs incorrect after we type */
    #showHighlightBox(index, cursor) {
        /* only show highlight boxes for chars we've already typed */
        if (index < this.index) { /*  */
            if (this.correctList[index])
                fill(94, 100, 90, 15) /* green for correct */
            else
                fill(0, 100, 100, 20) /* red for incorrect */

            let highlightTopLeftCorner = new p5.Vector(
                cursor.x,
                cursor.y - textAscent()
            )

            rect( /* the actual highlight box */
                highlightTopLeftCorner.x,
                highlightTopLeftCorner.y - this.HIGHLIGHT_PADDING,
                textWidth(this.text[index]),
                this.HIGHLIGHT_BOX_HEIGHT,
                2) // rounded rectangle corners
        }
    }


    #wrapCursor(cursor) { /* mutate cursor coordinates to wrap */
        cursor.y += this.HIGHLIGHT_BOX_HEIGHT + 5
        cursor.x = this.LEFT_MARGIN /* don't forget to wrap the x ᴖᴥᴖ */
    }


    getCurrentChar() {
        return this.text[this.index]
    }


    // set the current char to correct
    // TODO block on errors not supported
    setCorrect() {
        // if we've already gotten this char incorrect, don't add a correct
        // value to correctList
        if (this.lastIncorrectIndex === this.index) {
            // do nothing
        } else {
            this.correctList.push(true)
            this.incrementIndex()
        }

        console.assert(this.correctList.length === this.index)
    }


    // set the current char to be incorrect
    // TODO block on errors not supported
    setIncorrect() {
        // only set incorrect for an index once!
        if (this.lastIncorrectIndex !== this.index) {
            this.correctList.push(false)
            this.lastIncorrectIndex = this.index

            /*
                typingclub.com has two options:
                    an incorrect advances the cursor, skipping the char
                    an incorrect does not advance, requiring a correction

                current code doesn't block on errors
             */

            this.incrementIndex()
        }
    }


    incrementIndex() {
        this.index += 1
    }


    /*
        string representation of correct and incorrect chars
     */
    toString() {
        let correctRep = []
        for (let c of this.correctList) {
            if (c)
                correctRep.push('.')
            else
                correctRep.push('*')
        }

        // TODO what is the equivalent of join in js?
        return this.text + "\n" + correctRep.join('') + '\n'
    }
}