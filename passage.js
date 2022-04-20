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
        this.TEXT_ALPHA = 100

        this.TOP_MARGIN = 50
        this.LEFT_MARGIN = 30
        this.RIGHT_MARGIN = 300
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
            fill(0, 0, 100, this.TEXT_ALPHA)
            text(this.text[i], cursor.x, cursor.y)

            /* modify cursor position to where the next letter should be;
               each highlight box should be 1 pixel bigger on left and right
               1+1=2 total pixels of extra width
             */
            cursor.x += textWidth(this.text[i]) + 2 // 2 = HORIZONTAL_PADDING
            this.#handleNewLines(i, cursor)
        }

        this.#showCurrentWordBar(CHAR_POS)
        this.#showTextCursor(CHAR_POS)
    }


    /**
     * wraps text in this passage by sending the cursor position back to the
     * left margin if we are about to exceed the right margin
     * @param i index of the current character in the passage
     * @param cursor the current position of the text cursor
     */
    #handleNewLines(i, cursor) {
        /* wrap to handle newlines → needs additional code in keyPressed */
        if (this.text[i] === '\n')
            this.#wrapCursor(cursor)

        /** if we're at a whitespace, determine if we need a new line:
         find the next whitespace; the word between us and that
         whitespace is the next word. if the width of that word + our
         cursor + current space > limit, then newline
         */
        /* TODO passage MUST contain an ending \n or the -1 return value
            from indexOf finding nothing breaks the wrapping
            → the fix sets indexOfNextNewline to the end of the passage */
        let indexOfNextNewline = this.text.indexOf('\n', i+1)
        let indexOfNextSpace = this.text.indexOf(' ', i+1)

        if (indexOfNextNewline === -1)
            indexOfNextNewline = this.text.length - 1
        if (indexOfNextSpace === -1)
            indexOfNextSpace = this.text.length - 1

        if (this.text[i] === ' ') {
            /* ndi is the next delimiter index */
            let ndi = min(indexOfNextSpace, indexOfNextNewline)
            let nextWord = this.text.substring(i+1, ndi)

            if (textWidth(nextWord) + textWidth(this.text[i]) + cursor.x >
                this.LINE_WRAP_X_POS) {
                this.#wrapCursor(cursor)
            }
        }
    }


    /**
     * shows the cursor at the current word we're typing
     * @param positions list of positions for every character we are
     * displaying in this passage
     */
    #showTextCursor(positions) {
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

        /* indexOf returns -1 if not found, so we need a special case */
        let indexOfNextSpace = this.text.indexOf(' ', this.index)
        let indexOfNextNewline = this.text.indexOf('\n', this.index)
        let indexOfLastSpace = this.text.lastIndexOf(' ', this.index)
        let indexOfLastNewline = this.text.lastIndexOf('\n', this.index)

        /* FIX: ndi is -1 if passage is missing \n */
        if (indexOfNextNewline === -1)
            indexOfNextNewline = this.text.length-1

        if (indexOfNextSpace === -1)
            indexOfNextSpace = this.text.length-1

        /* 'next delimiter index', 'previous delimiter index' */
        const ndi = min(indexOfNextSpace, indexOfNextNewline)
        const pdi = max(indexOfLastSpace, indexOfLastNewline)
        // DEBUG_TEXT = `pdf+1→${pdi+1}, ndi→${ndi}`

        /*  handles last word corner case: if we don't find a subsequent
            whitespace (ndi's indexOf returns -1), set our bar to cover up to
            the last character in the passage
         */
        let barY, barWidth

        if (ndi === -1) {
            barY = positions[this.text.length-1].y
            barWidth = textWidth(this.text.substring(pdi+1))
        } else {
            barY = positions[ndi].y
            barWidth = textWidth(this.text.substring(pdi+1, ndi+1))
        }
        barY -= textAscent() + this.HIGHLIGHT_PADDING + 2

        /* display bar; handle last char corner case because pdi returns -1 */
        if (!passage.finished()) {
            rect( /* rect(x, y, w, h) */
                positions[pdi+1].x, /* start one char past the last delimiter */
                barY,
                barWidth,
                -2,
                2)  /* rounded rect corners */
        }
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


    /** have we reached the end of the passage text? */
    finished() {
        return this.index === this.text.length-1
    }


    /* set the current char to correct */
    setCorrect() {
        this.correctList.push(true)
        this.advance()
    }


    /* set the current char to be incorrect */
    setIncorrect() {
        this.correctList.push(false)
        this.lastIncorrectIndex = this.index
        this.advance()
    }


    advance() {
        if (!this.finished())
            this.index += 1
        else DEBUG_TEXT = `tried to advance but passage was already done`
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