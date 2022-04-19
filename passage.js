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
        this.HIGHLIGHT_BOX_HEIGHT = textAscent() + textDescent() +
            2*this.HIGHLIGHT_PADDING
    }


    // renders this passage using vectors instead of constant offsets
    render() {
        noStroke()

        let CHAR_POS = [] /* list of positions of every displayed char */


        /* bottom left corner of the current letter we are about to type */
        let cursor = new p5.Vector(this.LEFT_MARGIN, this.TOP_MARGIN)
        let highlightTopLeftCorner = new p5.Vector()

        /* iterate through every char in this passage */
        for (let i=0; i<this.text.length; i++) {
            /* save the position every character for later */
            CHAR_POS.push(cursor.copy())

            /** show the highlight box for correct vs incorrect after we type */
            /* only show highlight boxes for chars we've already typed */
            if (i < this.index) { /*  */
                if (this.correctList[i])
                    fill(94, 100, 90, 15) /* green for correct */
                else
                    fill(0, 100, 100, 20) /* red for incorrect */

                highlightTopLeftCorner.x = cursor.x
                highlightTopLeftCorner.y = cursor.y - textAscent()

                rect( /* the actual highlight box */
                    highlightTopLeftCorner.x,
                    highlightTopLeftCorner.y - this.HIGHLIGHT_PADDING,
                    textWidth(this.text[i]),
                    this.HIGHLIGHT_BOX_HEIGHT,
                    2) // rounded rectangle corners
            }

            /*  draw current letter above the highlight box in terms of z-index
             */
            fill(0, 0, 100, 70)
            text(this.text[i], cursor.x, cursor.y)

            /*  modify cursor position to where the next letter should be
                each highlight box should be 1 pixel bigger on left and right
                1+1=2 total pixels of extra width
             */
            cursor.x += textWidth(this.text[i]) + 2 // 2 = HORIZONTAL_PADDING


            // this is the horizontal coordinate where we must text wrap
            const LINE_WRAP_X_POS = width - this.RIGHT_MARGIN

            /* handle newline characters! TODO needs fixing */
            if (this.text[i] === '\n') {
                cursor.y += this.HIGHLIGHT_BOX_HEIGHT + 5

                // don't forget to wrap the x coordinates! ᴖᴥᴖ
                cursor.x = this.LEFT_MARGIN
            }

            /*  if we're at a whitespace, determine if we need a new line:
                find the next whitespace; the word between us and that
                whitespace is the next word. if the width of that word + our
                cursor + current space > limit, then newline
             */
            if (this.text[i] === ' ') {
                let ndi = this.text.indexOf(" ", i+1) // next delimiter index
                let nextWord = this.text.substring(i+1, ndi)

                if (textWidth(nextWord) +
                    textWidth(this.text[i]) +
                    cursor.x > LINE_WRAP_X_POS) {

                    cursor.y += this.HIGHLIGHT_BOX_HEIGHT + 5

                    // don't forget to wrap the x coordinates! ᴖᴥᴖ
                    cursor.x = this.LEFT_MARGIN
                }
            }
        }


        /*  add current word top highlight horizontal bar */
        // find index of next and previous whitespace chars

        // next delimiter index TODO: match \n as well. works!
        let ndi = min(
            this.text.indexOf(' ', this.index),
            this.text.indexOf('\n', this.index)
            )

        // previous delimiter index
        let pdi = max(
            this.text.lastIndexOf(' ', this.index),
            this.text.lastIndexOf('\n', this.index)
        )

        // +1 because we don't want the line to go over the previous
        // whitespace char
        fill(0, 0, 80, 30) // gray


        rect(
            CHAR_POS[pdi+1].x, // start one char past the last delimiter

            // TODO something wrong with this → no y property at end of passage
            CHAR_POS[ndi].y - textAscent() - this.HIGHLIGHT_PADDING - 2,
            // CHAR_POS[ndi].x - CHAR_POS[pdi].x
            // this.textWidth*(ndi-pdi),
            textWidth(this.text.substring(pdi+1, ndi+1)),
            -2,
            2)  // rounded rect corners

        /*  add cursor below current character
        */
        fill(0, 0, 100)

        // TODO check if we're finished, otherwise we try to read [index+1]
        rect(
            CHAR_POS[this.index].x,
            CHAR_POS[this.index].y + textDescent(),
            textWidth(this.text[this.index]),
            2,
            2)
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