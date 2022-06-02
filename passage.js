/**
    displays a passage for typing, keeping track of correct and incorrect
    letters by highlighting them

    TODO
        block on incorrect characters until correct one is entered
 */
class Passage {
    constructor(text) {
        this.text = text
        this.index = 0 /* where in the passage we're currently typing */
        this.correctList = [] /* booleans recording character correctness */

        this.linesToShow = 7 /* lines displayed; scroll to see more */
        this.yScroll = new Vehicle(0, 0) /* helps scroll passage down */
        this.lines = 0 /* total lines. likely unnecessary */
        this.linesScrolled = 0 /* how many lines have we scrolled? */
        this.lineWrapIndices = [] /* indices where passage wrapped the line */

        this.TEXT_ALPHA = 100

        this.TOP_MARGIN = 100
        this.LEFT_MARGIN = 64
        this.RIGHT_MARGIN = 440
        this.HIGHLIGHT_PADDING = 5
        this.LINE_SPACING = 8 /* spacing between lines */
        this.HIGHLIGHT_BOX_HEIGHT = 0 /* to be set dynamically later */
        this.lastLineVPadding = 5 /* extra vertical padding on final line */

        /* this is the horizontal coordinate where we must text wrap */
        this.LINE_WRAP_X_POS = width - this.RIGHT_MARGIN

        /* save original x,y position of cursor */
        this.originalCursorPos = new p5.Vector(this.LEFT_MARGIN,this.TOP_MARGIN)

        /* colors */
        this.cBackground = color(234, 34, 24)
        this.cBoundingBox = color(0, 0, 100, 2)
    }


    /** displays a small dot at the cursor location of each row */
    displayRowMarkers(n) {
        strokeWeight(2)
        stroke(90, 100, 100, 75)

        const yStart = this.TOP_MARGIN + textDescent() + this.HIGHLIGHT_PADDING
        const lineHeight = this.HIGHLIGHT_BOX_HEIGHT + this.LINE_SPACING

        for (let i=0; i<n; i++)
            point(this.LEFT_MARGIN, yStart + lineHeight*i)
    }


    /** renders this passage using vectors instead of constant offsets */
    render() {
        textFont(font, FONT_SIZE)

        noStroke()
        this.lines = 0 /* count lines per render */
        this.lineWrapIndices = [] /* per render, record where we wrap lines */

        /* needs to be redeclared because constructor is invoked before
         textAscent / descent are valid */
        this.HIGHLIGHT_BOX_HEIGHT = textAscent() + textDescent() +
            2*this.HIGHLIGHT_PADDING

        /* position list for every displayed char, used for current word bar */
        let charPositions = []

        /* bottom left corner of the current letter we are about to type */
        /* this is the 'current character position' when iterating through
         chars in passage.text */
        let ccp = new p5.Vector(this.LEFT_MARGIN,
            this.TOP_MARGIN + this.yScroll.pos.y)

        /* iterate through every char in this passage and display it */
        for (let i=0; i<this.text.length; i++) {
            /* save the position every character for later */
            charPositions.push(ccp.copy())
            this.#showHighlightBox(i, ccp)

            /* draw current letter; greater z-index than highlightBox */
            fill(0, 0, 100, this.TEXT_ALPHA)
            strokeWeight(0)
            text(this.text[i], ccp.x, ccp.y)
            if (this.text[i] === '\n') {
                push()
                translate(0, 1/4*textAscent()) /* translate down to char base */
                this.#drawReturnGlyph(ccp, textWidth('m') * .85)
                pop()
            }
            strokeWeight(0)

            /* modify cursor position to where the next letter should be;
               each highlight box should be 1 pixel bigger on left and right
               1+1=2 total pixels of extra width
             */
            ccp.x += textWidth(this.text[i]) + 2 // 2 = HORIZONTAL_PADDING
            this.#handleNewLines(i, ccp)
        }

        this.#showCurrentWordBar(charPositions)
        this.#showTextCursor(charPositions)
        // this.#showBoundingBox(CHAR_POS)
        this.#drawViewPort()
        this.#showProgressBar(charPositions)
        this.#scrollDown(charPositions, this.linesToShow)

        this.yScroll.update()
        this.yScroll.returnHome(this.HIGHLIGHT_BOX_HEIGHT)
    }


    /**
     * scroll the passage down by a line every time we type to n lines
     * @param positions positions of characters todo ← maybe just cursor.y
     * @param n number lines lines to show before scrolling
     */
    #scrollDown(positions, n) {
        /* how many lines have been wrapped up until our current typing spot?
         * → set linesWrappedUpToCursor = 0
         * → iterate through this.lineWrapIndices at end of render loop
         *      if this.index > lineWrapIndices[i]: lwutc++
         *      else break
         */
        let linesWrappedUpToCursor = 0

        /* note lineWrapIndices contains indices where passage has wrapped */
        for (let index of this.lineWrapIndices) {
            if (this.index > index)
                linesWrappedUpToCursor++
            else break
        }

        const lineHeight = this.HIGHLIGHT_BOX_HEIGHT + this.LINE_SPACING

        if (linesWrappedUpToCursor - this.linesScrolled > this.linesToShow-2) {
            this.linesScrolled++
            this.yScroll.target.y = -lineHeight * this.linesScrolled
        }
    }


    /**
     * returns the y-coordinate of the furthest extent of the typing bounding
     * box. this is a function of how many lines of text we're displaying.
     */
    #getLowestBoxPoint() {
        /* lastY no longer needed now that we can scroll */
        // const lastY = charPos[charPos.length - 1].y + textDescent() + padding

        const yStart = this.TOP_MARGIN + textDescent() + this.HIGHLIGHT_PADDING
        const lineHeight = this.HIGHLIGHT_BOX_HEIGHT + this.LINE_SPACING
        return yStart + (this.linesToShow-1)*lineHeight + this.lastLineVPadding
    }


    /**
     * draws a progress bar at the bottom of the typing area
     * @param positions
     * TODO: overshooting arrival behavior for bouncy physics
     */
    #showProgressBar(positions) {
        const transparentGray = color(0, 0, 100, 50)
        stroke(transparentGray)

        const barHeight = 4
        strokeWeight(barHeight-2) /* height of support line */
        const vPadding = 15
        const lowestBoxPoint = this.#getLowestBoxPoint(positions) + vPadding
        const pbSupport = lowestBoxPoint - 5 /* progress bar sits on top of me*/

        /* bottom boundary of typing area */
        const rightBoundary = width - this.RIGHT_MARGIN
        line(this.LEFT_MARGIN, pbSupport, rightBoundary, pbSupport)

        /* actual progress bar's main transparent line */
        strokeWeight(barHeight) /* height of support line */
        const transparentBlue = color(210, 100, 100, 60)
        stroke(transparentBlue)
        const endWidth = 5 /* leading opaque rectangle's width in progressBar */
        const progress = map(
            this.index, 0, this.text.length-1,
            this.LEFT_MARGIN, rightBoundary)

        line(this.LEFT_MARGIN, pbSupport-barHeight,
            progress, pbSupport-barHeight)

        /* progress bar's opaque end */
        const opaqueBlue = color(210, 100, 100, 100)
        stroke(opaqueBlue)

        let progressHeaderStartX = progress - 5
        progressHeaderStartX = constrain(progressHeaderStartX,
            this.LEFT_MARGIN, rightBoundary)
        line(progressHeaderStartX, pbSupport-barHeight,
            progress, pbSupport-barHeight)
    }


    /** draws the carriage return symbol  */
    #drawReturnGlyph(cursor, w) {
        /* draw return character with a combination of beginShape and triangle */
        let transparentWhite = color(0, 0, 100, 70)
        let gray = color(0, 0, 75)
        stroke(gray)
        strokeWeight(2)
        strokeJoin(ROUND)

        const x = cursor.x
        const y = cursor.y
        const h = w*2 /* draw in a 1x2 block, so 2w=h */
        const r = w/6 /* 'height' from arrowhead base to its point */

        const stemTop = new p5.Vector(x+3/4*w, y-7/8*h)
        const stemBottom = new p5.Vector(x+3/4*w, y-1/4*h)
        const arrowheadTip = new p5.Vector(x+w/4, y-h/4)

        // fill(transparentWhite)
        triangle( /* arrowhead */
            arrowheadTip.x, arrowheadTip.y, /* point tip */
            arrowheadTip.x+r, arrowheadTip.y + r/sqrt(3),
            arrowheadTip.x+r, arrowheadTip.y - r/sqrt(3)
        )

        noFill()
        beginShape()
        vertex(stemTop.x, stemTop.y)
        vertex(stemBottom.x, stemBottom.y)
        vertex(arrowheadTip.x+r, arrowheadTip.y)
        endShape()
    }


    /** shows light background behind typing box */
    #showViewPortBackgroundColor() {
        fill(this.cBoundingBox)
        rect(0, 0, width, height)
    }

    /** use beginContour to create negative typing viewport */
    #drawViewPort() {
        this.#showViewPortBackgroundColor()

        const hPadding = this.LEFT_MARGIN / 4
        const vPadding = this.HIGHLIGHT_PADDING + this.LINE_SPACING
        const lowestBoxPoint = this.#getLowestBoxPoint()
        const highestBoxPoint = this.TOP_MARGIN - textAscent() - vPadding

        /** (LEFT_MARGIN, TOP_MARGIN) describes where the cursor's start
         *  position is. But the cursor is the bottom left of the letter, not
         *  including textDescent. To get the true top margin we'd have to
         *  add textAscent and a little extra.
         *
         *
         */

        fill(this.cBackground)
        beginShape() /* exterior part of shape, clockwise winding */
        vertex(0, 0) /* top left */
        vertex(width, 0) /* top right */
        vertex(width, height) /* bottom right */
        vertex(0, height) /* bottom left */

        /* interior part of shape, counter-clockwise winding */
        beginContour()
        vertex(width-this.RIGHT_MARGIN+hPadding, highestBoxPoint) /* top right */
        vertex(this.LEFT_MARGIN-hPadding, highestBoxPoint) /* top left */
        vertex(this.LEFT_MARGIN-hPadding, lowestBoxPoint) /* bottom left */
        vertex(width-this.RIGHT_MARGIN+hPadding, lowestBoxPoint) /* bottom
         right */
        endContour()
        endShape(CLOSE)
    }

    /** show the bounding box
     *  @param positions a list of all displayed character positions (BLC)
     *  BLC = bottom left corner coordinates
     */
    #showBoundingBox(positions) {
        fill(this.cBoundingBox)
        const padding = this.LEFT_MARGIN / 2

        /* 'box' refers to the bounding box we want to draw */
        const lowestBoxPoint = this.#getLowestBoxPoint(positions)
        const highestBoxPoint = this.TOP_MARGIN - textAscent() - padding

        /** (LEFT_MARGIN, TOP_MARGIN) describes where the cursor's start
         *  position is. But the cursor is the bottom left of the letter not
         *  including textDescent. To get the true top margin we'd have to
         *  add textAscent and a little extra.
         */

        rect( /* transparent UI element our passage sits on */
            /* extend rectangle around our boundaries */
            this.LEFT_MARGIN - padding,
            highestBoxPoint,
            width - this.LEFT_MARGIN - this.RIGHT_MARGIN + 2 * padding,
            lowestBoxPoint - highestBoxPoint, /* just extend through the bottom */
            10)
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
            this.#wrapCursor(cursor, i)

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
                this.#wrapCursor(cursor, i)
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
        fill(0, 0, 80, 100) // gray

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
        // debugCorner.setText(`pdf+1→${pdi+1}, ndi→${ndi}`, 2)

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
                // fill(94, 100, 90, 30) /* green for correct */
                fill(0, 0, 100, 20)
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


    #wrapCursor(cursor, index) { /* mutate cursor coordinates to wrap */
        cursor.y += this.HIGHLIGHT_BOX_HEIGHT + this.LINE_SPACING
        cursor.x = this.LEFT_MARGIN /* don't forget to wrap the x ᴖᴥᴖ */
        this.lineWrapIndices.push(index)
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
        else debugCorner.setText(
            `tried to advance but passage was already done`, 0)
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