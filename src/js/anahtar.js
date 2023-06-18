// the input html text is returned by Anahtar.content.output()

const defaultTextInputAreaDivIdentifier = "anahtar_inputField"; // you've got to specify text area identifier when creating more than one instances of Anahtar
const cursor = "&nbsp;";
const currentCursorPositionVisualisationOpener = "<span class=\"blinker\">";
const selectionVisualisationOpener = "<span class=\"textSelection\">";
const visualisationCloser = "</span>";
const inputFieldLineHeight = 1.1; //em
const inputFieldMinHeightLines = 16;
const inputFieldWidth = 80; //ch
const pageHasLines = 16; // how many lines to jump when pageUp or pageDown is pressed

const newLineTag = "<br />";

const tabToSpaces = 4; // how many spaces to replace a tab with

const htmlEntities = getHtmlEntities();
const htmlEntityMinimalLength = 3;
const htmlEntitiesCodes = getHtmlEntitiesCodes();

class AnahChar {
    constructor(charEntity = "", preTags = [], postTags = []) {
        this.char = charEntity; // might be an html-entity representing string
        this.preTags = preTags;
        this.postTags = postTags;
        this.display = this.display.bind(this);
    }

    display(charAppendString = "", substitute = false, substitution = cursor) {
        let output = "";

        if (this.preTags.length > 0) {
            this.preTags.forEach((value) => {
                output += value
            })
        }

        if (substitute){
            output += substitution;
        } else {
            output += this.char;
        }

        if (charAppendString.length > 0) {
            output += charAppendString;
        }

        if (this.postTags.length > 0) {
            this.postTags.forEach((value) => {
                output += value
            })
        }

        return output;
    }
}


class AnahString { // an array of AnahChar elements (instances)

    constructor() {
        this.ePointer = 0; //cursor position pointer (element pointer)
        this.onBrink = 0; // is the cursor on the brink of a line break? 1 - yes, 0 - no
        this.eString = [];
        this.selectionStart = 0;
        this.selectionEnd = 0;
        this.isShiftDown = false;

        // --- bindings
        
        this.insertChar = this.insertChar.bind(this);
        this.deeteChar = this.deleteChar.bind(this);
        this.output = this.output.bind(this);
        this.moveLeft = this.moveLeft.bind(this);
        this.moveRight = this.moveRight.bind(this);
        this.isLineBreak = this.isLineBreak.bind(this);
        this.moveUp = this.moveUp.bind(this);
        this.moveDown = this.moveDown.bind(this);
        this.moveToCoordinates = this.moveToCoordinates.bind(this)
        this.moveHome = this.moveHome.bind(this);
        this.moveEnd = this.moveEnd.bind(this);
        this.movePageUp = this.movePageUp.bind(this);
        this.movePageDown = this.movePageDown.bind(this);
        this.insertNewLine = this.insertNewLine.bind(this);
        this.deleteCharBeforeCursor = this.deleteCharBeforeCursor.bind(this);
        this.deleteCharOnCursor = this.deleteCharOnCursor.bind(this);
        this.typeChar = this.typeChar.bind(this);
        this.pastText = this.pasteText.bind(this);
    }

    isLineBreak(anahtarEntity) {
        let yesItIs = false;

        if (anahtarEntity.postTags.includes(newLineTag)) { 
            yesItIs = true;
        }

        return yesItIs;
    }


    insertChar(newAnahChar) {
        this.eString.splice(this.ePointer, 0, newAnahChar);
        this.ePointer++;
    }


    deleteChar(a_position = this.ePointer) {

        // Check and move opening tags
        if (this.eString[a_position].preTags.length > 0) {
            if (a_position > 0) {
                this.eString[a_position - 1].preTags = this.eString[a_position - 1].preTags.concat(this.eString[a_position].preTags);
            } else if (this.eString.length > 1) {
                this.eString[a_position + 1].preTags = this.eString[a_position + 1].preTags.concat(this.eString[a_position].preTags);
            }
        }

        // Check and move closing tags
        let tmpPostTags = this.eString[a_position].postTags;
        let newLineTagIndex = tmpPostTags.indexOf(newLineTag);
        if (newLineTagIndex > -1) {
            tmpPostTags.splice(newLineTagIndex,1);
        }
        
        if (tmpPostTags.length > 0) {
            if (a_position > 0) {
                this.eString[a_position - 1].postTags = this.eString[a_position - 1].postTags.concat(tmpPostTags);
            }
        }

        this.eString.splice(a_position, 1);
    }

    deleteCharBeforeCursor() {
        let newLineTagIndex = 0;

        if (this.ePointer > 0) {
            if (this.onBrink == 1) {
                this.deleteChar(this.ePointer);
                this.eString[this.ePointer - 1].postTags.push(newLineTag);
            } else {
                if (this.isLineBreak(this.eString[this.ePointer - 1])) {
                    newLineTagIndex = this.eString[this.ePointer - 1].postTags.indexOf(newLineTag);
                    this.eString[this.ePointer - 1].postTags.splice(newLineTagIndex, 1);
                    this.ePointer++;
                } else {
                    this.deleteChar(this.ePointer - 1);
                }
            }
            this.ePointer--;
        } else {
            if (this.onBrink == 1) {
                this.deleteChar(this.ePointer);
                this.onBrink = 0;
            }
        }
    }

    deleteCharOnCursor() {

        if (this.ePointer < this.eString.length) {
            this.moveRight();
            this.deleteCharBeforeCursor();
        }

    }


    insertNewLine() {
        if ((this.ePointer == this.eString.length) || (this.ePointer == 0)
        || (this.isLineBreak(this.eString[this.ePointer - 1])) || (this.onBrink == 1)) {

            this.ePointer += this.onBrink;
            this.insertChar(new AnahChar("", [], [newLineTag]));
            this.ePointer -= this.onBrink;
            this.onBrink = 0;

        } else {
            this.eString[this.ePointer - 1].postTags.push(newLineTag);
        }
    }


    typeChar(a_char) {
        let newLineTagIndex = 0;
        let typedChar = a_char;

        let charCode = a_char.charCodeAt(0);
        if (charCode in htmlEntitiesCodes) {
            typedChar = htmlEntitiesCodes[charCode];
        }

        if (this.ePointer == this.eString.length) {
            this.insertChar(new AnahChar(typedChar, [], []));
        } else if (this.eString[this.ePointer].char == "") {
            this.eString[this.ePointer].char = typedChar;
            if (this.isLineBreak(this.eString[this.ePointer])) {
                this.onBrink++;
            }
        } else if (this.onBrink > 0) {
            newLineTagIndex = this.eString[this.ePointer].postTags.indexOf(newLineTag);
            this.eString[this.ePointer].postTags.splice(newLineTagIndex, 1);
            this.ePointer++;
            this.insertChar(new AnahChar(typedChar, [], [newLineTag]));
            this.ePointer--; // to compensate ePointer increment in insertChar()
        } else {
            this.insertChar(new AnahChar(typedChar, [], []));
        }
    }


    moveRight() {
        if (this.ePointer < this.eString.length) {
            if ((this.isLineBreak(this.eString[this.ePointer])) && (this.eString[this.ePointer].char != "")) {
                this.onBrink++;
                if (this.onBrink > 1) {
                    this.onBrink = 0;
                }
            }

            if (this.onBrink == 0) {
                this.ePointer++;
            }

        }
    }


    moveLeft() {
        if ((this.ePointer + this.onBrink) > 0) {
            if (this.onBrink == 0) {
                this.ePointer--;
                if ((this.isLineBreak(this.eString[this.ePointer])) && (this.eString[this.ePointer].char != "")) {
                    this.onBrink = 1;
                }
            } else {
                this.onBrink--;
            }
        }        
    }


    moveUp() {
        let i = 0;
        let x = 1;
        let lineBreakPosition = 0;
        let wayUpExists = false;

        for (i = this.ePointer - 1; i >= 0; i--) {
            if (this.isLineBreak(this.eString[i])) {
                wayUpExists = true;
                lineBreakPosition = i;
                break;
            }
            x++;
        }

        if (wayUpExists) {
            for (i = lineBreakPosition - 1; i > 0; i--) {
                if (this.isLineBreak(this.eString[i])) {
                    break;
                }
            }

            if ((i==0) && !(this.isLineBreak(this.eString[0]))) {
                x--;
            }

            if ((i + x) > lineBreakPosition) {
                this.ePointer = lineBreakPosition;
                this.onBrink = 1;
            } else {
                this.ePointer = i + x;
            }

            if (!(this.isLineBreak(this.eString[this.ePointer])) && (this.onBrink == 1)) {
                this.onBrink = 0;
                this.ePointer++;
            }

            if ((this.eString[this.ePointer].char == "") && (this.onBrink != 0)) {
                this.onBrink = 0;
            }

        }
    }


    moveDown() {
        let i = 0;
        let x = 1;
        let lineBreakPosition = 0;
        let wayDownExists = false;

        for (i = this.ePointer; i < this.eString.length; i++) {
            if (this.isLineBreak(this.eString[i])) {
                wayDownExists = true;
                lineBreakPosition = i;
                break;
            }
        }

        if (wayDownExists) {
            for (i = this.ePointer - 1; i > 0; i--) {
                if (this.isLineBreak(this.eString[i])) {
                    break;
                }
                x++;
            }
            
            if ((i == 0) && !(this.isLineBreak(this.eString[0]))) {
                x++;
            }

            for (i = lineBreakPosition + 1; i < this.eString.length; i++) {
                if (this.isLineBreak(this.eString[i])) {
                    break;
                }
            }
            
            if ((lineBreakPosition + x) > i) {
                this.ePointer = i;
                this.onBrink = 1;
            } else {
                this.ePointer = lineBreakPosition + x;
            }

            if (!(this.isLineBreak(this.eString[this.ePointer])) && (this.onBrink == 1)) {
                this.onBrink = 0;
                this.ePointer++;
            }

            if ((this.eString[this.ePointer].char == "") && (this.onBrink != 0)) {
                this.onBrink = 0;
            }
        }
    }


    moveHome() {
        let i = this.ePointer;
        for (i = this.ePointer - 1; i > 0; i--) {
            if (this.isLineBreak(this.eString[i])) {
                break;
            }
        }
        if (i > 0) {
            this.ePointer = i + 1;
        } else {
            this.ePointer = 0;
        }

        if (!(this.isLineBreak(this.eString[this.ePointer])) && (this.onBrink == 1)) {
            this.onBrink = 0;
        }

    }


    moveEnd() {
        let i = this.ePointer;
        for (i = this.ePointer; i < this.eString.length; i++) {
            if (this.isLineBreak(this.eString[i])) {
                break;
            }
        }
        this.ePointer = i;

        if ((i < this.eString.length) && (this.isLineBreak(this.eString[this.ePointer]))) {
            this.onBrink = 1;
        }

    }


    movePageUp() {
        let i = 0;
        for (i = 0; i < pageHasLines; i++) {
            this.moveUp();
        }
    }

    
    movePageDown() {
        let i = 0;
        for (i = 0; i < pageHasLines; i++) {
            this.moveDown();
        }
    }


    moveToCoordinates(x = 1, y = 1) {
        let targetX, targetY;
        let i = 0;
        let counter = 0;
        let targetLinePosition = 0;

        this.onBrink = 0;

        if (x <= 1) {
            targetX = 0;
        } else {
            targetX = x - 1;
        }

        if (y <= 1) {
            targetY = 0;
        } else {
            targetY = y - 1;
        }

        if (targetY > 0) {
            for (i = 0; i < this.eString.length; i++) {
                if (this.isLineBreak(this.eString[i])) {
                    counter++;
                    if (counter == targetY) {
                        targetLinePosition = i;
                        break;
                    }
                }
            }
        }

        if (i < this.eString.length) {
            for (i = targetLinePosition + 1; i < this.eString.length; i++) {
                if (this.isLineBreak(this.eString[i])) {
                    break;
                }
            }
            
            if ((targetLinePosition + targetX) > i) {
                this.ePointer = i;
                this.onBrink = 1;
            } else {
                this.ePointer = targetLinePosition + targetX;
            }
        } else {
            this.ePointer = i;
        }

    }

    pasteText(theText) {
        let width = 0;
        let currentPos = 0;

        if (this.ePointer == this.eString.length) {
            currentPos = this.ePointer - 1;
        } else {
            currentPos = this.ePointer;
        }
        
        for (
            let checkPosition = currentPos; 
            (checkPosition > 0) && (!this.isLineBreak(this.eString[checkPosition]));
            checkPosition--) {
                width++;
        }

        for (let i = 0; i < theText.length; i++) {
            if (width >= inputFieldWidth) {
                width = 0;
                this.insertNewLine();
            }
            this.typeChar(theText[i]);
            width++;
        }
    }


    output(visualiseCursorPosition = false) {
        let width = 0;
        let output = "";
        let charAppendString = "";

        for (let i = 0; i < this.eString.length; i++) {

            if ((i == this.selectionStart) && (visualiseCursorPosition) && (this.selectionStart != this.selectionEnd)) {
                output += selectionVisualisationOpener;
            }

            if ((i == this.ePointer) && (visualiseCursorPosition) && (this.onBrink == 1)) {
                charAppendString = currentCursorPositionVisualisationOpener+cursor+visualisationCloser;
            } else {
                charAppendString = "";
            }

            if ((i == this.ePointer) && (visualiseCursorPosition) && (this.onBrink < 1)) {
                output += currentCursorPositionVisualisationOpener;
            }
            
            if ((visualiseCursorPosition) && ((this.eString[i].char == " ") || (this.eString[i].char == ""))) {
                output += this.eString[i].display(charAppendString, true);
            } else {
                output += this.eString[i].display(charAppendString);
            }
            
            if ((i == this.ePointer) && (visualiseCursorPosition)  && (this.onBrink < 1)) {
                output += visualisationCloser;
            }

            if (this.isLineBreak(this.eString[i])) {
                width = 0;
            } else {
                width++;
            }

            if (width > inputFieldWidth){
                width = 0;
                output += newLineTag;
            }

            if ((i == this.selectionEnd) && (visualiseCursorPosition) && (this.selectionStart != this.selectionEnd)) {
                output += visualisationCloser;
            }


        }

        if ((visualiseCursorPosition) && (this.ePointer == this.eString.length)){
            if (width == inputFieldWidth) {
                output += newLineTag;
            }

            output += currentCursorPositionVisualisationOpener+cursor+visualisationCloser;

        }

        return output;
    }
}


function anahParse(theText){
    // parsing html into array of AnahChar elements (AnahString)
    const tagOpener = '<';
    const tagCloser = '>';
    const closeMarker = '/';
    const htmlEntityOpener = '&';

    let aText = theText;

    let anahString = new AnahString();
    let i = 0;

    let tag = ""
    let isClosingTag = false;
    let inTagDeclaration = false;
    let preTags = [];

    const resetVars = () => {
        tagName = "";
        tag = ""
        isClosingTag = false;
        inTagDeclaration = false;
        preTags = [];
    }

    const htmlEntityChecked = (position) => { 
        let result = htmlEntityOpener;
        let candidate = "";
        const tailString = aText.substring(position);
        const manifoldKey = tailString[1];

        if (manifoldKey in htmlEntities) {
            let manifold = [];
            let manifoldIterator = 0;
            let candidateIterator = 0;

            for (manifoldIterator = 0; manifoldIterator < htmlEntities[manifoldKey].length; manifoldIterator++) {
                manifold.push(htmlEntities[manifoldKey][manifoldIterator])
            }

            while (manifold.length > 0) {
                candidate += tailString[candidateIterator];
                candidateIterator++;
                for (manifoldIterator = 0; manifoldIterator < manifold.length; manifoldIterator++) {
                    if (manifold[manifoldIterator][candidateIterator] != tailString[candidateIterator]) {
                        manifold.splice(manifoldIterator, 1);
                        manifoldIterator--;
                    }
                }
            }
        }

        if (candidate.length >= htmlEntityMinimalLength) {
                if (htmlEntities[candidate[1]].includes(candidate)){
                    result = candidate;
                    aText = aText.substring(0, position) + aText.substring(position + candidate.length);
                    return result;    
                }
        }

        return result;
    }

    resetVars();

    for (i=0; i < aText.length; i++) {
        if (!inTagDeclaration){
            if (aText[i] == tagOpener) {
                inTagDeclaration = true;
                tag += aText[i];
            } else {
                if (aText[i] == htmlEntityOpener) {
                    let checked = htmlEntityChecked(i);
                    if (checked.length > 1) {
                        anahString.insertChar(new AnahChar(checked, preTags, [], true));
                        i--;
                    } else {
                        anahString.insertChar(new AnahChar(checked, preTags, []));
                    }
                } else {
                    anahString.insertChar(new AnahChar(aText[i], preTags, []));
                }
                resetVars();
            }
        } else {
            tag += aText[i];
            switch (aText[i]) {
                case closeMarker: {
                    isClosingTag = true;
                    break;
                }
                case tagCloser: {
                    inTagDeclaration = false;
                    if (isClosingTag) {
                        if (anahString.ePointer > 0) {
                            anahString.eString[anahString.ePointer - 1].postTags.push(tag);
                        } else {
                            anahString.insertChar(new AnahChar("", preTags, [tag])); // the case when there is a  <br /> before the text start
                            resetVars();
                        }
                    } else {
                        preTags.push(tag);
                    }
                    tag = "";
                    break;
                }
            }
        }       
    }

    return anahString;
}


class AnahtarTextModificatorTool {
    constructor (theTarget, id, openTag, closeTag, displayText, effects = "") { // all parameters are required, exept effects; effects is a css-style for the tool button rendering
        this.theTarget = theTarget;
        this.tool = document.createElement("div");
        this.tool.setAttribute("style", effects);
        this.tool.setAttribute("class", "anahtarTool");
        this.tool.setAttribute("id", id);
        this.tool.innerHTML = displayText;
        this.tool.openTag = openTag;
        this.tool.closeTag = closeTag;

        this.applyTool = this.applyTool.bind(this);

        this.tool.addEventListener("click", this.applyTool);
    }

    applyTool() {
        let i, k = 0;
        let openTagIndex = -1;
        let closeTagIndex = -1;
        let tagIndex = -1;
        let applied = false;

        if (this.theTarget.selectionStart != this.theTarget.selectionEnd) {

            for (i = this.theTarget.selectionStart; i < this.theTarget.selectionEnd; i++) {
                if (this.theTarget.eString[i].preTags.includes(this.tool.openTag)) {
                    openTagIndex = i;
                }

                if (this.theTarget.eString[i].postTags.includes(this.tool.closeTag)) {
                    closeTagIndex = i;

                    if (openTagIndex == -1) {
                        for (k = this.theTarget.selectionStart; k > 0; k--) {
                            if (this.theTarget.eString[k].preTags.includes(this.tool.openTag)) {
                                openTagIndex = k;
                                break;
                            }
                        }
                    }
                    
                    tagIndex = this.theTarget.eString[openTagIndex].preTags.indexOf(this.tool.openTag);
                    this.theTarget.eString[openTagIndex].preTags.splice(tagIndex, 1);
                    tagIndex = this.theTarget.eString[i].postTags.indexOf(this.tool.closeTag);
                    this.theTarget.eString[i].postTags.splice(tagIndex, 1);

                    openTagIndex = -1;
                    closeTagIndex = -1;
                    applied = true;
                }
            }

            if (!applied) {
                if (openTagIndex > -1) {
                    tagIndex = this.theTarget.eString[openTagIndex].preTags.indexOf(this.tool.openTag);
                    this.theTarget.eString[openTagIndex].preTags.splice(tagIndex, 1);
                }
                
                this.theTarget.eString[this.theTarget.selectionStart].preTags.push(this.tool.openTag);
                if (openTagIndex == -1) {
                    this.theTarget.eString[this.theTarget.selectionEnd].postTags.push(this.tool.closeTag);
                }


            }

        }
    }

}

class AnahtarToolbox {
    constructor(the_parent, toolIdPrefix) { // parameters are required
        this.toolBox = document.createElement("div");
        this.toolBox.setAttribute("class", "anahtarToolBox");
        this.toolBox.setAttribute("id", toolIdPrefix + "_" + "toolBox");

        this.boldTool = new AnahtarTextModificatorTool(the_parent.content, toolIdPrefix + "_" + "boldTool", "<b>", "</b>", "𝗕", "");
        this.toolBox.appendChild(this.boldTool.tool);

        this.italicTool = new AnahtarTextModificatorTool(the_parent.content, toolIdPrefix + "_" + "italicTool", "<i>", "</i>", "𝘐", "");
        this.toolBox.appendChild(this.italicTool.tool);

        this.underlineTool = new AnahtarTextModificatorTool(the_parent.content, toolIdPrefix + "_" + "underlineTool", "<u>", "</u>", "U", "text-decoration: underline;");
        this.toolBox.appendChild(this.underlineTool.tool);

    }
}


class Anahtar {
    constructor(container, initialText = "", textInputAreaDivIdentifier = defaultTextInputAreaDivIdentifier) {

        this.inputFieldId = textInputAreaDivIdentifier;
        this.inputField = document.createElement("div");
        this.inputField.setAttribute("id", textInputAreaDivIdentifier);

        this.content = anahParse(initialText);

        this.componentsIds = [textInputAreaDivIdentifier];
        this.toolsIds = [];

        this.toolBox = new AnahtarToolbox(this, textInputAreaDivIdentifier);

        for (let key in this.toolBox) {
            if ("tool" in this.toolBox[key]){
                let aToolId = this.toolBox[key].tool.getAttribute("id");
                this.componentsIds.push(aToolId);
                this.toolsIds.push(aToolId);
            }
        }

        this.isFocused = false;

        this.draw = this.draw.bind(this);
        this.update = this.update.bind(this);
        this.pasteFromClipboard = this.pasteFromClipboard.bind(this);

        this.draw(container);
        this.update();
        this.inputField.style.lineHeight = inputFieldLineHeight + "em";
        this.inputField.style.minHeight = inputFieldLineHeight * inputFieldMinHeightLines + "em";
        this.inputField.style.width = inputFieldWidth + "ch";
        this.lineHeightPx = +(getComputedStyle(this.inputField).height.slice(0, -2)) / inputFieldMinHeightLines;
        this.columnWidthPx = +(getComputedStyle(this.inputField).width.slice(0, -2)) / inputFieldWidth;

        // ==================== event listeners ====================

        const dropSelection = () => {
            if (!this.content.isShiftDown) {
                this.content.selectionStart = this.content.ePointer;
                this.content.selectionEnd = this.content.ePointer;
            }
    }

        const updateSelection = (mouseDown = false) => {
            if ((this.content.isShiftDown) || (mouseDown)) {

                if (this.content.ePointer < this.content.selectionEnd) {
                    this.content.selectionStart = this.content.ePointer;
                } else if (this.content.ePointer > this.content.selectionEnd) {
                    this.content.selectionEnd = this.content.ePointer;
                }

            }
        }


        document.addEventListener("click", (evt) => {
            let identifier = evt.target.id;
        
            if (this.componentsIds.includes(identifier)) { 
                this.isFocused = true;
            }
            else {
                this.isFocused = false;
            }
        
            this.update();
        });
        
        
        document.addEventListener("keydown", (evt) => {
            let theKeyDown = evt.key;

            const actions = {
                "ArrowLeft": this.content.moveLeft,
                "ArrowRight": this.content.moveRight,
                "ArrowUp": this.content.moveUp,
                "ArrowDown": this.content.moveDown,
                "Home": this.content.moveHome,
                "End": this.content.moveEnd,
                "PageUp": this.content.movePageUp,
                "PageDown": this.content.movePageDown,
                "Escape": () => {this.isFocused = false; this.update();},
                "Enter": this.content.insertNewLine,
                "Backspace": this.content.deleteCharBeforeCursor,
                "Delete": this.content.deleteCharOnCursor,
                "Insert": () => {},
                "Pause": () => {},
                "Alt": () => {},
                "Control": () => {},
                "Shift": () => {},
                "CapsLock": () => {},
                "Tab": () => {
                    let i = 0;
                    for (i = 0; i < tabToSpaces; i++) {
                        this.content.typeChar("&nbsp;");
                    }
                },
                "Copy": () => { console.log("Copy") },
                "Cut": () => { console.log("Cut") },
                "Paste": this.pasteFromClipboard,
                "SelectAll": () => {
                    this.content.selectionStart = 0;
                    this.content.selectionEnd = this.content.eString.length;
                    this.content.ePointer = this.content.eString.length;
                }
            };

            const nonTextAffectingKeys = [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
                "PageUp",
                "PageDown",
                "Escape",
                "Insert",
                "Pause",
                "Alt",
                "Control",
                "Shift",
                "CapsLock",
                "Copy"
            ];
            
            // console.log(evt.key);
            // console.log(theKeyDown);
            // console.log(evt.ctrlKey);

            if (this.isFocused) {
                evt.preventDefault();

                if (evt.shiftKey) {
                    if (!this.content.isShiftDown) {
                        this.content.selectionStart = this.content.ePointer;
                        this.content.selectionEnd = this.content.ePointer;
                    }
                    this.content.isShiftDown = true;
                } else {
                    this.content.isShiftDown = false;
                }

                if (evt.ctrlKey) {
                    const controlActions = {
                        "A": "SelectAll",
                        "C": "Copy",
                        "X": "Cut",
                        "V": "Paste"
                    };

                    const keyCheck = theKeyDown.toUpperCase();

                    if (keyCheck in controlActions)
                    theKeyDown = controlActions[keyCheck];
                }
    
                if ((this.content.selectionStart != this.content.selectionEnd) && !(nonTextAffectingKeys.includes(theKeyDown))) {
                    this.content.ePointer = this.content.selectionEnd;
                    while (this.content.ePointer > this.content.selectionStart) {
                        this.content.deleteCharBeforeCursor();
                    }
                }

                if (theKeyDown in actions) {
                    
                    actions[theKeyDown]();
                    if (theKeyDown != "SelectAll") updateSelection();

                } else {
                    this.content.typeChar(theKeyDown);
                }

                if (theKeyDown != "SelectAll") dropSelection();
                this.update();

            }
        });

        
        document.addEventListener("mousedown", (evt) => {
            if (this.isFocused) {
                evt.preventDefault();
                const clickedX = Math.round((evt.pageX - this.inputField.offsetLeft) / this.columnWidthPx);
                const clickedY = Math.round((evt.pageY - this.inputField.offsetTop) / this.lineHeightPx);

                if (this.toolsIds.includes(evt.target.id)) {
                    for (let key in this.toolBox) {
                        if (("tool" in this.toolBox[key]) && (this.toolBox[key].tool.getAttribute("id") === evt.target.id)) {
                        }
                    }
                } else {    
                    this.content.moveToCoordinates(clickedX, clickedY);
                    dropSelection();    
                    updateSelection();
                }

                this.update();
            }
        });


        document.addEventListener("mousemove", (evt) => {
            if ((this.isFocused) && (evt.buttons == 1)) {
                const currentX = Math.round((evt.pageX - this.inputField.offsetLeft) / this.columnWidthPx);
                const currentY = Math.round((evt.pageY - this.inputField.offsetTop) / this.lineHeightPx);
                this.content.moveToCoordinates(currentX, currentY);
                updateSelection(true);
                this.update();
            }

        });
        
    }
    
    pasteFromClipboard() {
        const clipboardFail = (msg = "Can't access the clipboard") => {
            alert(msg);
        }

        const readClipboard = new Promise((resolve, reject) => {
            if (!navigator.clipboard.readText) {
                reject("Reading from clipboard is unavailable on this site.");
            } else {
                return navigator.clipboard.readText().then((txt) => {
                    this.content.pasteText(txt);
                    this.update();
                }, clipboardFail);
            }
        });

        readClipboard.catch(clipboardFail);
    }
    
    draw(container) {
        container.appendChild(this.toolBox.toolBox);
        container.appendChild(this.inputField);
    }


    update() {
        if (this.isFocused) {
            this.toolBox.toolBox.setAttribute("class", "anahtarToolBox focused");
            this.inputField.setAttribute("class", "textInput");
            this.inputField.innerHTML = this.content.output(true);
        }
        else {
            this.toolBox.toolBox.setAttribute("class", "anahtarToolBox unfocused");
            this.inputField.setAttribute("class", "textInput unfocused");
            this.inputField.innerHTML = this.content.output(false);
        }
    }
}


let anahtar = new Anahtar(document.getElementById("anahtar"), "1<br />1234567890<br />1234567890<br />123456789012345<br />1234567890<br />1234567890<br />123456789012345");
console.log(anahtar.content);


function getHtmlEntitiesCodes() {
    // source: https://html.spec.whatwg.org/multipage/named-characters.html#named-character-references
    const codes = {
        "198": "&AElig;",
        "38": "&amp;",
        "193": "&Aacute;",
        "258": "&Abreve;",
        "194": "&Acirc;",
        "1040": "&Acy;",
        "120068": "&Afr;",
        "192": "&Agrave;",
        "913": "&Alpha;",
        "256": "&Amacr;",
        "10835": "&And;",
        "260": "&Aogon;",
        "120120": "&Aopf;",
        "8289": "&af;",
        "197": "&angst;",
        "119964": "&Ascr;",
        "8788": "&coloneq;",
        "195": "&Atilde;",
        "196": "&Auml;",
        "8726": "&ssetmn;",
        "10983": "&Barv;",
        "8966": "&doublebarwedge;",
        "1041": "&Bcy;",
        "8757": "&because;",
        "8492": "&bernou;",
        "914": "&Beta;",
        "120069": "&Bfr;",
        "120121": "&Bopf;",
        "728": "&breve;",
        "8782": "&bump;",
        "1063": "&CHcy;",
        "169": "&copy;",
        "262": "&Cacute;",
        "8914": "&Cap;",
        "8517": "&DD;",
        "8493": "&Cfr;",
        "268": "&Ccaron;",
        "199": "&Ccedil;",
        "264": "&Ccirc;",
        "8752": "&Cconint;",
        "266": "&Cdot;",
        "184": "&cedil;",
        "183": "&middot;",
        "935": "&Chi;",
        "8857": "&odot;",
        "8854": "&ominus;",
        "8853": "&oplus;",
        "8855": "&otimes;",
        "8754": "&cwconint;",
        "8221": "&rdquor;",
        "8217": "&rsquor;",
        "8759": "&Proportion;",
        "10868": "&Colone;",
        "8801": "&equiv;",
        "8751": "&DoubleContourIntegral;",
        "8750": "&oint;",
        "8450": "&complexes;",
        "8720": "&coprod;",
        "8755": "&awconint;",
        "10799": "&Cross;",
        "119966": "&Cscr;",
        "8915": "&Cup;",
        "8781": "&asympeq;",
        "10513": "&DDotrahd;",
        "1026": "&DJcy;",
        "1029": "&DScy;",
        "1039": "&DZcy;",
        "8225": "&ddagger;",
        "8609": "&Darr;",
        "10980": "&DoubleLeftTee;",
        "270": "&Dcaron;",
        "1044": "&Dcy;",
        "8711": "&nabla;",
        "916": "&Delta;",
        "120071": "&Dfr;",
        "180": "&acute;",
        "729": "&dot;",
        "733": "&dblac;",
        "96": "&grave;",
        "732": "&tilde;",
        "8900": "&diamond;",
        "8518": "&dd;",
        "120123": "&Dopf;",
        "168": "&uml;",
        "8412": "&DotDot;",
        "8784": "&esdot;",
        "8659": "&dArr;",
        "8656": "&lArr;",
        "8660": "&iff;",
        "10232": "&xlArr;",
        "10234": "&xhArr;",
        "10233": "&xrArr;",
        "8658": "&rArr;",
        "8872": "&vDash;",
        "8657": "&uArr;",
        "8661": "&vArr;",
        "8741": "&spar;",
        "8595": "&downarrow;",
        "10515": "&DownArrowBar;",
        "8693": "&duarr;",
        "785": "&DownBreve;",
        "10576": "&DownLeftRightVector;",
        "10590": "&DownLeftTeeVector;",
        "8637": "&lhard;",
        "10582": "&DownLeftVectorBar;",
        "10591": "&DownRightTeeVector;",
        "8641": "&rightharpoondown;",
        "10583": "&DownRightVectorBar;",
        "8868": "&top;",
        "8615": "&mapstodown;",
        "119967": "&Dscr;",
        "272": "&Dstrok;",
        "330": "&ENG;",
        "208": "&ETH;",
        "201": "&Eacute;",
        "282": "&Ecaron;",
        "202": "&Ecirc;",
        "1069": "&Ecy;",
        "278": "&Edot;",
        "120072": "&Efr;",
        "200": "&Egrave;",
        "8712": "&isinv;",
        "274": "&Emacr;",
        "9723": "&EmptySmallSquare;",
        "9643": "&EmptyVerySmallSquare;",
        "280": "&Eogon;",
        "120124": "&Eopf;",
        "917": "&Epsilon;",
        "10869": "&Equal;",
        "8770": "&esim;",
        "8652": "&rlhar;",
        "8496": "&expectation;",
        "10867": "&Esim;",
        "919": "&Eta;",
        "203": "&Euml;",
        "8707": "&exist;",
        "8519": "&exponentiale;",
        "1060": "&Fcy;",
        "120073": "&Ffr;",
        "9724": "&FilledSmallSquare;",
        "9642": "&squf;",
        "120125": "&Fopf;",
        "8704": "&forall;",
        "8497": "&Fscr;",
        "1027": "&GJcy;",
        "62": "&gt;",
        "915": "&Gamma;",
        "988": "&Gammad;",
        "286": "&Gbreve;",
        "290": "&Gcedil;",
        "284": "&Gcirc;",
        "1043": "&Gcy;",
        "288": "&Gdot;",
        "120074": "&Gfr;",
        "8921": "&ggg;",
        "120126": "&Gopf;",
        "8805": "&geq;",
        "8923": "&gtreqless;",
        "8807": "&geqq;",
        "10914": "&GreaterGreater;",
        "8823": "&gtrless;",
        "10878": "&ges;",
        "8819": "&gtrsim;",
        "119970": "&Gscr;",
        "8811": "&gg;",
        "1066": "&HARDcy;",
        "711": "&caron;",
        "94": "&Hat;",
        "292": "&Hcirc;",
        "8460": "&Poincareplane;",
        "8459": "&hamilt;",
        "8461": "&quaternions;",
        "9472": "&boxh;",
        "294": "&Hstrok;",
        "8783": "&bumpeq;",
        "1045": "&IEcy;",
        "306": "&IJlig;",
        "1025": "&IOcy;",
        "205": "&Iacute;",
        "206": "&Icirc;",
        "1048": "&Icy;",
        "304": "&Idot;",
        "8465": "&imagpart;",
        "204": "&Igrave;",
        "298": "&Imacr;",
        "8520": "&ii;",
        "8748": "&Int;",
        "8747": "&int;",
        "8898": "&xcap;",
        "8291": "&ic;",
        "8290": "&it;",
        "302": "&Iogon;",
        "120128": "&Iopf;",
        "921": "&Iota;",
        "8464": "&imagline;",
        "296": "&Itilde;",
        "1030": "&Iukcy;",
        "207": "&Iuml;",
        "308": "&Jcirc;",
        "1049": "&Jcy;",
        "120077": "&Jfr;",
        "120129": "&Jopf;",
        "119973": "&Jscr;",
        "1032": "&Jsercy;",
        "1028": "&Jukcy;",
        "1061": "&KHcy;",
        "1036": "&KJcy;",
        "922": "&Kappa;",
        "310": "&Kcedil;",
        "1050": "&Kcy;",
        "120078": "&Kfr;",
        "120130": "&Kopf;",
        "119974": "&Kscr;",
        "1033": "&LJcy;",
        "60": "&lt;",
        "313": "&Lacute;",
        "923": "&Lambda;",
        "10218": "&Lang;",
        "8466": "&lagran;",
        "8606": "&twoheadleftarrow;",
        "317": "&Lcaron;",
        "315": "&Lcedil;",
        "1051": "&Lcy;",
        "10216": "&langle;",
        "8592": "&slarr;",
        "8676": "&larrb;",
        "8646": "&lrarr;",
        "8968": "&lceil;",
        "10214": "&lobrk;",
        "10593": "&LeftDownTeeVector;",
        "8643": "&downharpoonleft;",
        "10585": "&LeftDownVectorBar;",
        "8970": "&lfloor;",
        "8596": "&leftrightarrow;",
        "10574": "&LeftRightVector;",
        "8867": "&dashv;",
        "8612": "&mapstoleft;",
        "10586": "&LeftTeeVector;",
        "8882": "&vltri;",
        "10703": "&LeftTriangleBar;",
        "8884": "&trianglelefteq;",
        "10577": "&LeftUpDownVector;",
        "10592": "&LeftUpTeeVector;",
        "8639": "&upharpoonleft;",
        "10584": "&LeftUpVectorBar;",
        "8636": "&lharu;",
        "10578": "&LeftVectorBar;",
        "8922": "&lesseqgtr;",
        "8806": "&leqq;",
        "8822": "&lg;",
        "10913": "&LessLess;",
        "10877": "&les;",
        "8818": "&lsim;",
        "120079": "&Lfr;",
        "8920": "&Ll;",
        "8666": "&lAarr;",
        "319": "&Lmidot;",
        "10229": "&xlarr;",
        "10231": "&xharr;",
        "10230": "&xrarr;",
        "120131": "&Lopf;",
        "8601": "&swarrow;",
        "8600": "&searrow;",
        "8624": "&lsh;",
        "321": "&Lstrok;",
        "8810": "&ll;",
        "10501": "&Map;",
        "1052": "&Mcy;",
        "8287": "&MediumSpace;",
        "8499": "&phmmat;",
        "120080": "&Mfr;",
        "8723": "&mp;",
        "120132": "&Mopf;",
        "924": "&Mu;",
        "1034": "&NJcy;",
        "323": "&Nacute;",
        "327": "&Ncaron;",
        "325": "&Ncedil;",
        "1053": "&Ncy;",
        "8203": "&ZeroWidthSpace;",
        "10": "&NewLine;",
        "120081": "&Nfr;",
        "8288": "&NoBreak;",
        "160": "&nbsp;",
        "8469": "&naturals;",
        "10988": "&Not;",
        "8802": "&nequiv;",
        "8813": "&NotCupCap;",
        "8742": "&nspar;",
        "8713": "&notinva;",
        "8800": "&ne;",
        "8708": "&nexists;",
        "8815": "&ngtr;",
        "8817": "&ngeq;",
        "8825": "&ntgl;",
        "8821": "&ngsim;",
        "8938": "&ntriangleleft;",
        "8940": "&ntrianglelefteq;",
        "8814": "&nlt;",
        "8816": "&nleq;",
        "8824": "&ntlg;",
        "8820": "&nlsim;",
        "8832": "&nprec;",
        "8928": "&nprcue;",
        "8716": "&notniva;",
        "8939": "&ntriangleright;",
        "8941": "&ntrianglerighteq;",
        "8930": "&nsqsube;",
        "8931": "&nsqsupe;",
        "8840": "&nsubseteq;",
        "8833": "&nsucc;",
        "8929": "&nsccue;",
        "8841": "&nsupseteq;",
        "8769": "&nsim;",
        "8772": "&nsimeq;",
        "8775": "&ncong;",
        "8777": "&napprox;",
        "8740": "&nsmid;",
        "119977": "&Nscr;",
        "209": "&Ntilde;",
        "925": "&Nu;",
        "338": "&OElig;",
        "211": "&Oacute;",
        "212": "&Ocirc;",
        "1054": "&Ocy;",
        "336": "&Odblac;",
        "120082": "&Ofr;",
        "210": "&Ograve;",
        "332": "&Omacr;",
        "937": "&ohm;",
        "927": "&Omicron;",
        "120134": "&Oopf;",
        "8220": "&ldquo;",
        "8216": "&lsquo;",
        "10836": "&Or;",
        "119978": "&Oscr;",
        "216": "&Oslash;",
        "213": "&Otilde;",
        "10807": "&Otimes;",
        "214": "&Ouml;",
        "8254": "&oline;",
        "9182": "&OverBrace;",
        "9140": "&tbrk;",
        "9180": "&OverParenthesis;",
        "8706": "&part;",
        "1055": "&Pcy;",
        "120083": "&Pfr;",
        "934": "&Phi;",
        "928": "&Pi;",
        "177": "&pm;",
        "8473": "&primes;",
        "10939": "&Pr;",
        "8826": "&prec;",
        "10927": "&preceq;",
        "8828": "&preccurlyeq;",
        "8830": "&prsim;",
        "8243": "&Prime;",
        "8719": "&prod;",
        "8733": "&vprop;",
        "119979": "&Pscr;",
        "936": "&Psi;",
        "34": "&quot;",
        "120084": "&Qfr;",
        "8474": "&rationals;",
        "119980": "&Qscr;",
        "10512": "&drbkarow;",
        "174": "&reg;",
        "340": "&Racute;",
        "10219": "&Rang;",
        "8608": "&twoheadrightarrow;",
        "10518": "&Rarrtl;",
        "344": "&Rcaron;",
        "342": "&Rcedil;",
        "1056": "&Rcy;",
        "8476": "&realpart;",
        "8715": "&niv;",
        "8651": "&lrhar;",
        "10607": "&duhar;",
        "929": "&Rho;",
        "10217": "&rangle;",
        "8594": "&srarr;",
        "8677": "&rarrb;",
        "8644": "&rlarr;",
        "8969": "&rceil;",
        "10215": "&robrk;",
        "10589": "&RightDownTeeVector;",
        "8642": "&downharpoonright;",
        "10581": "&RightDownVectorBar;",
        "8971": "&rfloor;",
        "8866": "&vdash;",
        "8614": "&mapsto;",
        "10587": "&RightTeeVector;",
        "8883": "&vrtri;",
        "10704": "&RightTriangleBar;",
        "8885": "&trianglerighteq;",
        "10575": "&RightUpDownVector;",
        "10588": "&RightUpTeeVector;",
        "8638": "&upharpoonright;",
        "10580": "&RightUpVectorBar;",
        "8640": "&rightharpoonup;",
        "10579": "&RightVectorBar;",
        "8477": "&reals;",
        "10608": "&RoundImplies;",
        "8667": "&rAarr;",
        "8475": "&realine;",
        "8625": "&rsh;",
        "10740": "&RuleDelayed;",
        "1065": "&SHCHcy;",
        "1064": "&SHcy;",
        "1068": "&SOFTcy;",
        "346": "&Sacute;",
        "10940": "&Sc;",
        "352": "&Scaron;",
        "350": "&Scedil;",
        "348": "&Scirc;",
        "1057": "&Scy;",
        "120086": "&Sfr;",
        "8593": "&uparrow;",
        "931": "&Sigma;",
        "8728": "&compfn;",
        "120138": "&Sopf;",
        "8730": "&radic;",
        "9633": "&square;",
        "8851": "&sqcap;",
        "8847": "&sqsubset;",
        "8849": "&sqsubseteq;",
        "8848": "&sqsupset;",
        "8850": "&sqsupseteq;",
        "8852": "&sqcup;",
        "119982": "&Sscr;",
        "8902": "&sstarf;",
        "8912": "&Subset;",
        "8838": "&subseteq;",
        "8827": "&succ;",
        "10928": "&succeq;",
        "8829": "&succcurlyeq;",
        "8831": "&succsim;",
        "8721": "&sum;",
        "8913": "&Supset;",
        "8835": "&supset;",
        "8839": "&supseteq;",
        "222": "&THORN;",
        "8482": "&trade;",
        "1035": "&TSHcy;",
        "1062": "&TScy;",
        "9": "&Tab;",
        "932": "&Tau;",
        "356": "&Tcaron;",
        "354": "&Tcedil;",
        "1058": "&Tcy;",
        "120087": "&Tfr;",
        "8756": "&therefore;",
        "920": "&Theta;",
        "8201": "&thinsp;",
        "8764": "&thksim;",
        "8771": "&simeq;",
        "8773": "&cong;",
        "8776": "&thkap;",
        "120139": "&Topf;",
        "8411": "&tdot;",
        "119983": "&Tscr;",
        "358": "&Tstrok;",
        "218": "&Uacute;",
        "8607": "&Uarr;",
        "10569": "&Uarrocir;",
        "1038": "&Ubrcy;",
        "364": "&Ubreve;",
        "219": "&Ucirc;",
        "1059": "&Ucy;",
        "368": "&Udblac;",
        "120088": "&Ufr;",
        "217": "&Ugrave;",
        "362": "&Umacr;",
        "95": "&lowbar;",
        "9183": "&UnderBrace;",
        "9141": "&bbrk;",
        "9181": "&UnderParenthesis;",
        "8899": "&xcup;",
        "8846": "&uplus;",
        "370": "&Uogon;",
        "120140": "&Uopf;",
        "10514": "&UpArrowBar;",
        "8645": "&udarr;",
        "8597": "&varr;",
        "10606": "&udhar;",
        "8869": "&perp;",
        "8613": "&mapstoup;",
        "8598": "&nwarrow;",
        "8599": "&nearrow;",
        "978": "&upsih;",
        "933": "&Upsilon;",
        "366": "&Uring;",
        "119984": "&Uscr;",
        "360": "&Utilde;",
        "220": "&Uuml;",
        "8875": "&VDash;",
        "10987": "&Vbar;",
        "1042": "&Vcy;",
        "8873": "&Vdash;",
        "10982": "&Vdashl;",
        "8897": "&xvee;",
        "8214": "&Vert;",
        "8739": "&smid;",
        "124": "&vert;",
        "10072": "&VerticalSeparator;",
        "8768": "&wreath;",
        "8202": "&hairsp;",
        "120089": "&Vfr;",
        "120141": "&Vopf;",
        "119985": "&Vscr;",
        "8874": "&Vvdash;",
        "372": "&Wcirc;",
        "8896": "&xwedge;",
        "120090": "&Wfr;",
        "120142": "&Wopf;",
        "119986": "&Wscr;",
        "120091": "&Xfr;",
        "926": "&Xi;",
        "120143": "&Xopf;",
        "119987": "&Xscr;",
        "1071": "&YAcy;",
        "1031": "&YIcy;",
        "1070": "&YUcy;",
        "221": "&Yacute;",
        "374": "&Ycirc;",
        "1067": "&Ycy;",
        "120092": "&Yfr;",
        "120144": "&Yopf;",
        "119988": "&Yscr;",
        "376": "&Yuml;",
        "1046": "&ZHcy;",
        "377": "&Zacute;",
        "381": "&Zcaron;",
        "1047": "&Zcy;",
        "379": "&Zdot;",
        "918": "&Zeta;",
        "8488": "&zeetrf;",
        "8484": "&integers;",
        "119989": "&Zscr;",
        "225": "&aacute;",
        "259": "&abreve;",
        "8766": "&mstpos;",
        "8767": "&acd;",
        "226": "&acirc;",
        "1072": "&acy;",
        "230": "&aelig;",
        "120094": "&afr;",
        "224": "&agrave;",
        "8501": "&aleph;",
        "945": "&alpha;",
        "257": "&amacr;",
        "10815": "&amalg;",
        "8743": "&wedge;",
        "10837": "&andand;",
        "10844": "&andd;",
        "10840": "&andslope;",
        "10842": "&andv;",
        "8736": "&angle;",
        "10660": "&ange;",
        "8737": "&measuredangle;",
        "10664": "&angmsdaa;",
        "10665": "&angmsdab;",
        "10666": "&angmsdac;",
        "10667": "&angmsdad;",
        "10668": "&angmsdae;",
        "10669": "&angmsdaf;",
        "10670": "&angmsdag;",
        "10671": "&angmsdah;",
        "8735": "&angrt;",
        "8894": "&angrtvb;",
        "10653": "&angrtvbd;",
        "8738": "&angsph;",
        "9084": "&angzarr;",
        "261": "&aogon;",
        "120146": "&aopf;",
        "10864": "&apE;",
        "10863": "&apacir;",
        "8778": "&approxeq;",
        "8779": "&apid;",
        "39": "&apos;",
        "229": "&aring;",
        "119990": "&ascr;",
        "42": "&midast;",
        "227": "&atilde;",
        "228": "&auml;",
        "10769": "&awint;",
        "10989": "&bNot;",
        "8780": "&bcong;",
        "1014": "&bepsi;",
        "8245": "&bprime;",
        "8765": "&bsim;",
        "8909": "&bsime;",
        "8893": "&barvee;",
        "8965": "&barwedge;",
        "9142": "&bbrktbrk;",
        "1073": "&bcy;",
        "8222": "&ldquor;",
        "10672": "&bemptyv;",
        "946": "&beta;",
        "8502": "&beth;",
        "8812": "&twixt;",
        "120095": "&bfr;",
        "9711": "&xcirc;",
        "10752": "&xodot;",
        "10753": "&xoplus;",
        "10754": "&xotime;",
        "10758": "&xsqcup;",
        "9733": "&starf;",
        "9661": "&xdtri;",
        "9651": "&xutri;",
        "10756": "&xuplus;",
        "10509": "&rbarr;",
        "10731": "&lozf;",
        "9652": "&utrif;",
        "9662": "&dtrif;",
        "9666": "&ltrif;",
        "9656": "&rtrif;",
        "9251": "&blank;",
        "9618": "&blk12;",
        "9617": "&blk14;",
        "9619": "&blk34;",
        "9608": "&block;",
        "8976": "&bnot;",
        "120147": "&bopf;",
        "8904": "&bowtie;",
        "9559": "&boxDL;",
        "9556": "&boxDR;",
        "9558": "&boxDl;",
        "9555": "&boxDr;",
        "9552": "&boxH;",
        "9574": "&boxHD;",
        "9577": "&boxHU;",
        "9572": "&boxHd;",
        "9575": "&boxHu;",
        "9565": "&boxUL;",
        "9562": "&boxUR;",
        "9564": "&boxUl;",
        "9561": "&boxUr;",
        "9553": "&boxV;",
        "9580": "&boxVH;",
        "9571": "&boxVL;",
        "9568": "&boxVR;",
        "9579": "&boxVh;",
        "9570": "&boxVl;",
        "9567": "&boxVr;",
        "10697": "&boxbox;",
        "9557": "&boxdL;",
        "9554": "&boxdR;",
        "9488": "&boxdl;",
        "9484": "&boxdr;",
        "9573": "&boxhD;",
        "9576": "&boxhU;",
        "9516": "&boxhd;",
        "9524": "&boxhu;",
        "8863": "&minusb;",
        "8862": "&plusb;",
        "8864": "&timesb;",
        "9563": "&boxuL;",
        "9560": "&boxuR;",
        "9496": "&boxul;",
        "9492": "&boxur;",
        "9474": "&boxv;",
        "9578": "&boxvH;",
        "9569": "&boxvL;",
        "9566": "&boxvR;",
        "9532": "&boxvh;",
        "9508": "&boxvl;",
        "9500": "&boxvr;",
        "166": "&brvbar;",
        "119991": "&bscr;",
        "8271": "&bsemi;",
        "92": "&bsol;",
        "10693": "&bsolb;",
        "10184": "&bsolhsub;",
        "8226": "&bullet;",
        "10926": "&bumpE;",
        "263": "&cacute;",
        "8745": "&cap;",
        "10820": "&capand;",
        "10825": "&capbrcup;",
        "10827": "&capcap;",
        "10823": "&capcup;",
        "10816": "&capdot;",
        "8257": "&caret;",
        "10829": "&ccaps;",
        "269": "&ccaron;",
        "231": "&ccedil;",
        "265": "&ccirc;",
        "10828": "&ccups;",
        "10832": "&ccupssm;",
        "267": "&cdot;",
        "10674": "&cemptyv;",
        "162": "&cent;",
        "120096": "&cfr;",
        "1095": "&chcy;",
        "10003": "&checkmark;",
        "967": "&chi;",
        "9675": "&cir;",
        "10691": "&cirE;",
        "710": "&circ;",
        "8791": "&cire;",
        "8634": "&olarr;",
        "8635": "&orarr;",
        "9416": "&oS;",
        "8859": "&oast;",
        "8858": "&ocir;",
        "8861": "&odash;",
        "10768": "&cirfnint;",
        "10991": "&cirmid;",
        "10690": "&cirscir;",
        "9827": "&clubsuit;",
        "58": "&colon;",
        "44": "&comma;",
        "64": "&commat;",
        "8705": "&complement;",
        "10861": "&congdot;",
        "120148": "&copf;",
        "8471": "&copysr;",
        "8629": "&crarr;",
        "10007": "&cross;",
        "119992": "&cscr;",
        "10959": "&csub;",
        "10961": "&csube;",
        "10960": "&csup;",
        "10962": "&csupe;",
        "8943": "&ctdot;",
        "10552": "&cudarrl;",
        "10549": "&cudarrr;",
        "8926": "&curlyeqprec;",
        "8927": "&curlyeqsucc;",
        "8630": "&curvearrowleft;",
        "10557": "&cularrp;",
        "8746": "&cup;",
        "10824": "&cupbrcap;",
        "10822": "&cupcap;",
        "10826": "&cupcup;",
        "8845": "&cupdot;",
        "10821": "&cupor;",
        "8631": "&curvearrowright;",
        "10556": "&curarrm;",
        "8910": "&cuvee;",
        "8911": "&cuwed;",
        "164": "&curren;",
        "8753": "&cwint;",
        "9005": "&cylcty;",
        "10597": "&dHar;",
        "8224": "&dagger;",
        "8504": "&daleth;",
        "8208": "&hyphen;",
        "10511": "&rBarr;",
        "271": "&dcaron;",
        "1076": "&dcy;",
        "8650": "&downdownarrows;",
        "10871": "&eDDot;",
        "176": "&deg;",
        "948": "&delta;",
        "10673": "&demptyv;",
        "10623": "&dfisht;",
        "120097": "&dfr;",
        "9830": "&diams;",
        "989": "&gammad;",
        "8946": "&disin;",
        "247": "&divide;",
        "8903": "&divonx;",
        "1106": "&djcy;",
        "8990": "&llcorner;",
        "8973": "&dlcrop;",
        "36": "&dollar;",
        "120149": "&dopf;",
        "8785": "&eDot;",
        "8760": "&minusd;",
        "8724": "&plusdo;",
        "8865": "&sdotb;",
        "8991": "&lrcorner;",
        "8972": "&drcrop;",
        "119993": "&dscr;",
        "1109": "&dscy;",
        "10742": "&dsol;",
        "273": "&dstrok;",
        "8945": "&dtdot;",
        "9663": "&triangledown;",
        "10662": "&dwangle;",
        "1119": "&dzcy;",
        "10239": "&dzigrarr;",
        "233": "&eacute;",
        "10862": "&easter;",
        "283": "&ecaron;",
        "8790": "&eqcirc;",
        "234": "&ecirc;",
        "8789": "&eqcolon;",
        "1101": "&ecy;",
        "279": "&edot;",
        "8786": "&fallingdotseq;",
        "120098": "&efr;",
        "10906": "&eg;",
        "232": "&egrave;",
        "10902": "&eqslantgtr;",
        "10904": "&egsdot;",
        "10905": "&el;",
        "9191": "&elinters;",
        "8467": "&ell;",
        "10901": "&eqslantless;",
        "10903": "&elsdot;",
        "275": "&emacr;",
        "8709": "&varnothing;",
        "8196": "&emsp13;",
        "8197": "&emsp14;",
        "8195": "&emsp;",
        "331": "&eng;",
        "8194": "&ensp;",
        "281": "&eogon;",
        "120150": "&eopf;",
        "8917": "&epar;",
        "10723": "&eparsl;",
        "10865": "&eplus;",
        "949": "&epsilon;",
        "1013": "&varepsilon;",
        "61": "&equals;",
        "8799": "&questeq;",
        "10872": "&equivDD;",
        "10725": "&eqvparsl;",
        "8787": "&risingdotseq;",
        "10609": "&erarr;",
        "8495": "&escr;",
        "951": "&eta;",
        "240": "&eth;",
        "235": "&euml;",
        "8364": "&euro;",
        "33": "&excl;",
        "1092": "&fcy;",
        "9792": "&female;",
        "64259": "&ffilig;",
        "64256": "&fflig;",
        "64260": "&ffllig;",
        "120099": "&ffr;",
        "64257": "&filig;",
        "9837": "&flat;",
        "64258": "&fllig;",
        "9649": "&fltns;",
        "402": "&fnof;",
        "120151": "&fopf;",
        "8916": "&pitchfork;",
        "10969": "&forkv;",
        "10765": "&fpartint;",
        "189": "&half;",
        "8531": "&frac13;",
        "188": "&frac14;",
        "8533": "&frac15;",
        "8537": "&frac16;",
        "8539": "&frac18;",
        "8532": "&frac23;",
        "8534": "&frac25;",
        "190": "&frac34;",
        "8535": "&frac35;",
        "8540": "&frac38;",
        "8536": "&frac45;",
        "8538": "&frac56;",
        "8541": "&frac58;",
        "8542": "&frac78;",
        "8260": "&frasl;",
        "8994": "&sfrown;",
        "119995": "&fscr;",
        "10892": "&gtreqqless;",
        "501": "&gacute;",
        "947": "&gamma;",
        "10886": "&gtrapprox;",
        "287": "&gbreve;",
        "285": "&gcirc;",
        "1075": "&gcy;",
        "289": "&gdot;",
        "10921": "&gescc;",
        "10880": "&gesdot;",
        "10882": "&gesdoto;",
        "10884": "&gesdotol;",
        "10900": "&gesles;",
        "120100": "&gfr;",
        "8503": "&gimel;",
        "1107": "&gjcy;",
        "10898": "&glE;",
        "10917": "&gla;",
        "10916": "&glj;",
        "8809": "&gneqq;",
        "10890": "&gnapprox;",
        "10888": "&gneq;",
        "8935": "&gnsim;",
        "120152": "&gopf;",
        "8458": "&gscr;",
        "10894": "&gsime;",
        "10896": "&gsiml;",
        "10919": "&gtcc;",
        "10874": "&gtcir;",
        "8919": "&gtrdot;",
        "10645": "&gtlPar;",
        "10876": "&gtquest;",
        "10616": "&gtrarr;",
        "1098": "&hardcy;",
        "10568": "&harrcir;",
        "8621": "&leftrightsquigarrow;",
        "8463": "&plankv;",
        "293": "&hcirc;",
        "9829": "&heartsuit;",
        "8230": "&mldr;",
        "8889": "&hercon;",
        "120101": "&hfr;",
        "10533": "&searhk;",
        "10534": "&swarhk;",
        "8703": "&hoarr;",
        "8763": "&homtht;",
        "8617": "&larrhk;",
        "8618": "&rarrhk;",
        "120153": "&hopf;",
        "8213": "&horbar;",
        "119997": "&hscr;",
        "295": "&hstrok;",
        "8259": "&hybull;",
        "237": "&iacute;",
        "238": "&icirc;",
        "1080": "&icy;",
        "1077": "&iecy;",
        "161": "&iexcl;",
        "120102": "&ifr;",
        "236": "&igrave;",
        "10764": "&qint;",
        "8749": "&tint;",
        "10716": "&iinfin;",
        "8489": "&iiota;",
        "307": "&ijlig;",
        "299": "&imacr;",
        "305": "&inodot;",
        "8887": "&imof;",
        "437": "&imped;",
        "8453": "&incare;",
        "8734": "&infin;",
        "10717": "&infintie;",
        "8890": "&intercal;",
        "10775": "&intlarhk;",
        "10812": "&iprod;",
        "1105": "&iocy;",
        "303": "&iogon;",
        "120154": "&iopf;",
        "953": "&iota;",
        "191": "&iquest;",
        "119998": "&iscr;",
        "8953": "&isinE;",
        "8949": "&isindot;",
        "8948": "&isins;",
        "8947": "&isinsv;",
        "297": "&itilde;",
        "1110": "&iukcy;",
        "239": "&iuml;",
        "309": "&jcirc;",
        "1081": "&jcy;",
        "120103": "&jfr;",
        "567": "&jmath;",
        "120155": "&jopf;",
        "119999": "&jscr;",
        "1112": "&jsercy;",
        "1108": "&jukcy;",
        "954": "&kappa;",
        "1008": "&varkappa;",
        "311": "&kcedil;",
        "1082": "&kcy;",
        "120104": "&kfr;",
        "312": "&kgreen;",
        "1093": "&khcy;",
        "1116": "&kjcy;",
        "120156": "&kopf;",
        "120000": "&kscr;",
        "10523": "&lAtail;",
        "10510": "&lBarr;",
        "10891": "&lesseqqgtr;",
        "10594": "&lHar;",
        "314": "&lacute;",
        "10676": "&laemptyv;",
        "955": "&lambda;",
        "10641": "&langd;",
        "10885": "&lessapprox;",
        "171": "&laquo;",
        "10527": "&larrbfs;",
        "10525": "&larrfs;",
        "8619": "&looparrowleft;",
        "10553": "&larrpl;",
        "10611": "&larrsim;",
        "8610": "&leftarrowtail;",
        "10923": "&lat;",
        "10521": "&latail;",
        "10925": "&late;",
        "10508": "&lbarr;",
        "10098": "&lbbrk;",
        "123": "&lcub;",
        "91": "&lsqb;",
        "10635": "&lbrke;",
        "10639": "&lbrksld;",
        "10637": "&lbrkslu;",
        "318": "&lcaron;",
        "316": "&lcedil;",
        "1083": "&lcy;",
        "10550": "&ldca;",
        "10599": "&ldrdhar;",
        "10571": "&ldrushar;",
        "8626": "&ldsh;",
        "8804": "&leq;",
        "8647": "&llarr;",
        "8907": "&lthree;",
        "10920": "&lescc;",
        "10879": "&lesdot;",
        "10881": "&lesdoto;",
        "10883": "&lesdotor;",
        "10899": "&lesges;",
        "8918": "&ltdot;",
        "10620": "&lfisht;",
        "120105": "&lfr;",
        "10897": "&lgE;",
        "10602": "&lharul;",
        "9604": "&lhblk;",
        "1113": "&ljcy;",
        "10603": "&llhard;",
        "9722": "&lltri;",
        "320": "&lmidot;",
        "9136": "&lmoustache;",
        "8808": "&lneqq;",
        "10889": "&lnapprox;",
        "10887": "&lneq;",
        "8934": "&lnsim;",
        "10220": "&loang;",
        "8701": "&loarr;",
        "10236": "&xmap;",
        "8620": "&rarrlp;",
        "10629": "&lopar;",
        "120157": "&lopf;",
        "10797": "&loplus;",
        "10804": "&lotimes;",
        "8727": "&lowast;",
        "9674": "&lozenge;",
        "40": "&lpar;",
        "10643": "&lparlt;",
        "10605": "&lrhard;",
        "8206": "&lrm;",
        "8895": "&lrtri;",
        "8249": "&lsaquo;",
        "120001": "&lscr;",
        "10893": "&lsime;",
        "10895": "&lsimg;",
        "8218": "&sbquo;",
        "322": "&lstrok;",
        "10918": "&ltcc;",
        "10873": "&ltcir;",
        "8905": "&ltimes;",
        "10614": "&ltlarr;",
        "10875": "&ltquest;",
        "10646": "&ltrPar;",
        "9667": "&triangleleft;",
        "10570": "&lurdshar;",
        "10598": "&luruhar;",
        "8762": "&mDDot;",
        "175": "&strns;",
        "9794": "&male;",
        "10016": "&maltese;",
        "9646": "&marker;",
        "10793": "&mcomma;",
        "1084": "&mcy;",
        "8212": "&mdash;",
        "120106": "&mfr;",
        "8487": "&mho;",
        "181": "&micro;",
        "10992": "&midcir;",
        "8722": "&minus;",
        "10794": "&minusdu;",
        "10971": "&mlcp;",
        "8871": "&models;",
        "120158": "&mopf;",
        "120002": "&mscr;",
        "956": "&mu;",
        "8888": "&mumap;",
        "8653": "&nlArr;",
        "8654": "&nhArr;",
        "8655": "&nrArr;",
        "8879": "&nVDash;",
        "8878": "&nVdash;",
        "324": "&nacute;",
        "329": "&napos;",
        "9838": "&natural;",
        "10819": "&ncap;",
        "328": "&ncaron;",
        "326": "&ncedil;",
        "10818": "&ncup;",
        "1085": "&ncy;",
        "8211": "&ndash;",
        "8663": "&neArr;",
        "10532": "&nearhk;",
        "10536": "&toea;",
        "120107": "&nfr;",
        "8622": "&nleftrightarrow;",
        "10994": "&nhpar;",
        "8956": "&nis;",
        "8954": "&nisd;",
        "1114": "&njcy;",
        "8602": "&nleftarrow;",
        "8229": "&nldr;",
        "120159": "&nopf;",
        "172": "&not;",
        "8951": "&notinvb;",
        "8950": "&notinvc;",
        "8958": "&notnivb;",
        "8957": "&notnivc;",
        "10772": "&npolint;",
        "8603": "&nrightarrow;",
        "120003": "&nscr;",
        "8836": "&nsub;",
        "8837": "&nsup;",
        "241": "&ntilde;",
        "957": "&nu;",
        "35": "&num;",
        "8470": "&numero;",
        "8199": "&numsp;",
        "8877": "&nvDash;",
        "10500": "&nvHarr;",
        "8876": "&nvdash;",
        "10718": "&nvinfin;",
        "10498": "&nvlArr;",
        "10499": "&nvrArr;",
        "8662": "&nwArr;",
        "10531": "&nwarhk;",
        "10535": "&nwnear;",
        "243": "&oacute;",
        "244": "&ocirc;",
        "1086": "&ocy;",
        "337": "&odblac;",
        "10808": "&odiv;",
        "10684": "&odsold;",
        "339": "&oelig;",
        "10687": "&ofcir;",
        "120108": "&ofr;",
        "731": "&ogon;",
        "242": "&ograve;",
        "10689": "&ogt;",
        "10677": "&ohbar;",
        "10686": "&olcir;",
        "10683": "&olcross;",
        "10688": "&olt;",
        "333": "&omacr;",
        "969": "&omega;",
        "959": "&omicron;",
        "10678": "&omid;",
        "120160": "&oopf;",
        "10679": "&opar;",
        "10681": "&operp;",
        "8744": "&vee;",
        "10845": "&ord;",
        "8500": "&oscr;",
        "170": "&ordf;",
        "186": "&ordm;",
        "8886": "&origof;",
        "10838": "&oror;",
        "10839": "&orslope;",
        "10843": "&orv;",
        "248": "&oslash;",
        "8856": "&osol;",
        "245": "&otilde;",
        "10806": "&otimesas;",
        "246": "&ouml;",
        "9021": "&ovbar;",
        "182": "&para;",
        "10995": "&parsim;",
        "11005": "&parsl;",
        "1087": "&pcy;",
        "37": "&percnt;",
        "46": "&period;",
        "8240": "&permil;",
        "8241": "&pertenk;",
        "120109": "&pfr;",
        "966": "&phi;",
        "981": "&varphi;",
        "9742": "&phone;",
        "960": "&pi;",
        "982": "&varpi;",
        "8462": "&planckh;",
        "43": "&plus;",
        "10787": "&plusacir;",
        "10786": "&pluscir;",
        "10789": "&plusdu;",
        "10866": "&pluse;",
        "10790": "&plussim;",
        "10791": "&plustwo;",
        "10773": "&pointint;",
        "120161": "&popf;",
        "163": "&pound;",
        "10931": "&prE;",
        "10935": "&precapprox;",
        "10937": "&prnap;",
        "10933": "&prnE;",
        "8936": "&prnsim;",
        "8242": "&prime;",
        "9006": "&profalar;",
        "8978": "&profline;",
        "8979": "&profsurf;",
        "8880": "&prurel;",
        "120005": "&pscr;",
        "968": "&psi;",
        "8200": "&puncsp;",
        "120110": "&qfr;",
        "120162": "&qopf;",
        "8279": "&qprime;",
        "120006": "&qscr;",
        "10774": "&quatint;",
        "63": "&quest;",
        "10524": "&rAtail;",
        "10596": "&rHar;",
        "341": "&racute;",
        "10675": "&raemptyv;",
        "10642": "&rangd;",
        "10661": "&range;",
        "187": "&raquo;",
        "10613": "&rarrap;",
        "10528": "&rarrbfs;",
        "10547": "&rarrc;",
        "10526": "&rarrfs;",
        "10565": "&rarrpl;",
        "10612": "&rarrsim;",
        "8611": "&rightarrowtail;",
        "8605": "&rightsquigarrow;",
        "10522": "&ratail;",
        "8758": "&ratio;",
        "10099": "&rbbrk;",
        "125": "&rcub;",
        "93": "&rsqb;",
        "10636": "&rbrke;",
        "10638": "&rbrksld;",
        "10640": "&rbrkslu;",
        "345": "&rcaron;",
        "343": "&rcedil;",
        "1088": "&rcy;",
        "10551": "&rdca;",
        "10601": "&rdldhar;",
        "8627": "&rdsh;",
        "9645": "&rect;",
        "10621": "&rfisht;",
        "120111": "&rfr;",
        "10604": "&rharul;",
        "961": "&rho;",
        "1009": "&varrho;",
        "8649": "&rrarr;",
        "8908": "&rthree;",
        "730": "&ring;",
        "8207": "&rlm;",
        "9137": "&rmoustache;",
        "10990": "&rnmid;",
        "10221": "&roang;",
        "8702": "&roarr;",
        "10630": "&ropar;",
        "120163": "&ropf;",
        "10798": "&roplus;",
        "10805": "&rotimes;",
        "41": "&rpar;",
        "10644": "&rpargt;",
        "10770": "&rppolint;",
        "8250": "&rsaquo;",
        "120007": "&rscr;",
        "8906": "&rtimes;",
        "9657": "&triangleright;",
        "10702": "&rtriltri;",
        "10600": "&ruluhar;",
        "8478": "&rx;",
        "347": "&sacute;",
        "10932": "&scE;",
        "10936": "&succapprox;",
        "353": "&scaron;",
        "351": "&scedil;",
        "349": "&scirc;",
        "10934": "&succneqq;",
        "10938": "&succnapprox;",
        "8937": "&succnsim;",
        "10771": "&scpolint;",
        "1089": "&scy;",
        "8901": "&sdot;",
        "10854": "&sdote;",
        "8664": "&seArr;",
        "167": "&sect;",
        "59": "&semi;",
        "10537": "&tosa;",
        "10038": "&sext;",
        "120112": "&sfr;",
        "9839": "&sharp;",
        "1097": "&shchcy;",
        "1096": "&shcy;",
        "173": "&shy;",
        "963": "&sigma;",
        "962": "&varsigma;",
        "10858": "&simdot;",
        "10910": "&simg;",
        "10912": "&simgE;",
        "10909": "&siml;",
        "10911": "&simlE;",
        "8774": "&simne;",
        "10788": "&simplus;",
        "10610": "&simrarr;",
        "10803": "&smashp;",
        "10724": "&smeparsl;",
        "8995": "&ssmile;",
        "10922": "&smt;",
        "10924": "&smte;",
        "1100": "&softcy;",
        "47": "&sol;",
        "10692": "&solb;",
        "9023": "&solbar;",
        "120164": "&sopf;",
        "9824": "&spadesuit;",
        "120008": "&sscr;",
        "9734": "&star;",
        "8834": "&subset;",
        "10949": "&subseteqq;",
        "10941": "&subdot;",
        "10947": "&subedot;",
        "10945": "&submult;",
        "10955": "&subsetneqq;",
        "8842": "&subsetneq;",
        "10943": "&subplus;",
        "10617": "&subrarr;",
        "10951": "&subsim;",
        "10965": "&subsub;",
        "10963": "&subsup;",
        "9834": "&sung;",
        "185": "&sup1;",
        "178": "&sup2;",
        "179": "&sup3;",
        "10950": "&supseteqq;",
        "10942": "&supdot;",
        "10968": "&supdsub;",
        "10948": "&supedot;",
        "10185": "&suphsol;",
        "10967": "&suphsub;",
        "10619": "&suplarr;",
        "10946": "&supmult;",
        "10956": "&supsetneqq;",
        "8843": "&supsetneq;",
        "10944": "&supplus;",
        "10952": "&supsim;",
        "10964": "&supsub;",
        "10966": "&supsup;",
        "8665": "&swArr;",
        "10538": "&swnwar;",
        "223": "&szlig;",
        "8982": "&target;",
        "964": "&tau;",
        "357": "&tcaron;",
        "355": "&tcedil;",
        "1090": "&tcy;",
        "8981": "&telrec;",
        "120113": "&tfr;",
        "952": "&theta;",
        "977": "&vartheta;",
        "254": "&thorn;",
        "215": "&times;",
        "10801": "&timesbar;",
        "10800": "&timesd;",
        "9014": "&topbot;",
        "10993": "&topcir;",
        "120165": "&topf;",
        "10970": "&topfork;",
        "8244": "&tprime;",
        "9653": "&utri;",
        "8796": "&trie;",
        "9708": "&tridot;",
        "10810": "&triminus;",
        "10809": "&triplus;",
        "10701": "&trisb;",
        "10811": "&tritime;",
        "9186": "&trpezium;",
        "120009": "&tscr;",
        "1094": "&tscy;",
        "1115": "&tshcy;",
        "359": "&tstrok;",
        "10595": "&uHar;",
        "250": "&uacute;",
        "1118": "&ubrcy;",
        "365": "&ubreve;",
        "251": "&ucirc;",
        "1091": "&ucy;",
        "369": "&udblac;",
        "10622": "&ufisht;",
        "120114": "&ufr;",
        "249": "&ugrave;",
        "9600": "&uhblk;",
        "8988": "&ulcorner;",
        "8975": "&ulcrop;",
        "9720": "&ultri;",
        "363": "&umacr;",
        "371": "&uogon;",
        "120166": "&uopf;",
        "965": "&upsilon;",
        "8648": "&uuarr;",
        "8989": "&urcorner;",
        "8974": "&urcrop;",
        "367": "&uring;",
        "9721": "&urtri;",
        "120010": "&uscr;",
        "8944": "&utdot;",
        "361": "&utilde;",
        "252": "&uuml;",
        "10663": "&uwangle;",
        "10984": "&vBar;",
        "10985": "&vBarv;",
        "10652": "&vangrt;",
        "1074": "&vcy;",
        "8891": "&veebar;",
        "8794": "&veeeq;",
        "8942": "&vellip;",
        "120115": "&vfr;",
        "120167": "&vopf;",
        "120011": "&vscr;",
        "10650": "&vzigzag;",
        "373": "&wcirc;",
        "10847": "&wedbar;",
        "8793": "&wedgeq;",
        "8472": "&wp;",
        "120116": "&wfr;",
        "120168": "&wopf;",
        "120012": "&wscr;",
        "120117": "&xfr;",
        "958": "&xi;",
        "8955": "&xnis;",
        "120169": "&xopf;",
        "120013": "&xscr;",
        "253": "&yacute;",
        "1103": "&yacy;",
        "375": "&ycirc;",
        "1099": "&ycy;",
        "165": "&yen;",
        "120118": "&yfr;",
        "1111": "&yicy;",
        "120170": "&yopf;",
        "120014": "&yscr;",
        "1102": "&yucy;",
        "255": "&yuml;",
        "378": "&zacute;",
        "382": "&zcaron;",
        "1079": "&zcy;",
        "380": "&zdot;",
        "950": "&zeta;",
        "120119": "&zfr;",
        "1078": "&zhcy;",
        "8669": "&zigrarr;",
        "120171": "&zopf;",
        "120015": "&zscr;",
        "8205": "&zwj;",
        "8204": "&zwnj;"
    }
    return codes;
}

function getHtmlEntities() { // set getCode to true to get entity by code.
    // source: https://html.spec.whatwg.org/multipage/named-characters.html#named-character-references
    const strings = {
        "A": [
            "&AElig",
            "&AElig;",
            "&AMP",
            "&AMP;",
            "&Aacute",
            "&Aacute;",
            "&Abreve;",
            "&Acirc",
            "&Acirc;",
            "&Acy;",
            "&Afr;",
            "&Agrave",
            "&Agrave;",
            "&Alpha;",
            "&Amacr;",
            "&And;",
            "&Aogon;",
            "&Aopf;",
            "&ApplyFunction;",
            "&Aring",
            "&Aring;",
            "&Ascr;",
            "&Assign;",
            "&Atilde",
            "&Atilde;",
            "&Auml",
            "&Auml;",
        ],
        "B": [
            "&Backslash;",
            "&Barv;",
            "&Barwed;",
            "&Bcy;",
            "&Because;",
            "&Bernoullis;",
            "&Beta;",
            "&Bfr;",
            "&Bopf;",
            "&Breve;",
            "&Bscr;",
            "&Bumpeq;",
        ],
        "C": [
            "&CHcy;",
            "&COPY",
            "&COPY;",
            "&Cacute;",
            "&Cap;",
            "&CapitalDifferentialD;",
            "&Cayleys;",
            "&Ccaron;",
            "&Ccedil",
            "&Ccedil;",
            "&Ccirc;",
            "&Cconint;",
            "&Cdot;",
            "&Cedilla;",
            "&CenterDot;",
            "&Cfr;",
            "&Chi;",
            "&CircleDot;",
            "&CircleMinus;",
            "&CirclePlus;",
            "&CircleTimes;",
            "&ClockwiseContourIntegral;",
            "&CloseCurlyDoubleQuote;",
            "&CloseCurlyQuote;",
            "&Colon;",
            "&Colone;",
            "&Congruent;",
            "&Conint;",
            "&ContourIntegral;",
            "&Copf;",
            "&Coproduct;",
            "&CounterClockwiseContourIntegral;",
            "&Cross;",
            "&Cscr;",
            "&Cup;",
            "&CupCap;",
        ],
        "D": [
            "&DD;",
            "&DDotrahd;",
            "&DJcy;",
            "&DScy;",
            "&DZcy;",
            "&Dagger;",
            "&Darr;",
            "&Dashv;",
            "&Dcaron;",
            "&Dcy;",
            "&Del;",
            "&Delta;",
            "&Dfr;",
            "&DiacriticalAcute;",
            "&DiacriticalDot;",
            "&DiacriticalDoubleAcute;",
            "&DiacriticalGrave;",
            "&DiacriticalTilde;",
            "&Diamond;",
            "&DifferentialD;",
            "&Dopf;",
            "&Dot;",
            "&DotDot;",
            "&DotEqual;",
            "&DoubleContourIntegral;",
            "&DoubleDot;",
            "&DoubleDownArrow;",
            "&DoubleLeftArrow;",
            "&DoubleLeftRightArrow;",
            "&DoubleLeftTee;",
            "&DoubleLongLeftArrow;",
            "&DoubleLongLeftRightArrow;",
            "&DoubleLongRightArrow;",
            "&DoubleRightArrow;",
            "&DoubleRightTee;",
            "&DoubleUpArrow;",
            "&DoubleUpDownArrow;",
            "&DoubleVerticalBar;",
            "&DownArrow;",
            "&DownArrowBar;",
            "&DownArrowUpArrow;",
            "&DownBreve;",
            "&DownLeftRightVector;",
            "&DownLeftTeeVector;",
            "&DownLeftVector;",
            "&DownLeftVectorBar;",
            "&DownRightTeeVector;",
            "&DownRightVector;",
            "&DownRightVectorBar;",
            "&DownTee;",
            "&DownTeeArrow;",
            "&Downarrow;",
            "&Dscr;",
            "&Dstrok;",
        ],
        "E": [
            "&ENG;",
            "&ETH",
            "&ETH;",
            "&Eacute",
            "&Eacute;",
            "&Ecaron;",
            "&Ecirc",
            "&Ecirc;",
            "&Ecy;",
            "&Edot;",
            "&Efr;",
            "&Egrave",
            "&Egrave;",
            "&Element;",
            "&Emacr;",
            "&EmptySmallSquare;",
            "&EmptyVerySmallSquare;",
            "&Eogon;",
            "&Eopf;",
            "&Epsilon;",
            "&Equal;",
            "&EqualTilde;",
            "&Equilibrium;",
            "&Escr;",
            "&Esim;",
            "&Eta;",
            "&Euml",
            "&Euml;",
            "&Exists;",
            "&ExponentialE;",
        ],
        "F": [
            "&Fcy;",
            "&Ffr;",
            "&FilledSmallSquare;",
            "&FilledVerySmallSquare;",
            "&Fopf;",
            "&ForAll;",
            "&Fouriertrf;",
            "&Fscr;",
        ],
        "G": [
            "&GJcy;",
            "&GT",
            "&GT;",
            "&Gamma;",
            "&Gammad;",
            "&Gbreve;",
            "&Gcedil;",
            "&Gcirc;",
            "&Gcy;",
            "&Gdot;",
            "&Gfr;",
            "&Gg;",
            "&Gopf;",
            "&GreaterEqual;",
            "&GreaterEqualLess;",
            "&GreaterFullEqual;",
            "&GreaterGreater;",
            "&GreaterLess;",
            "&GreaterSlantEqual;",
            "&GreaterTilde;",
            "&Gscr;",
            "&Gt;",
        ],
        "H": [
            "&HARDcy;",
            "&Hacek;",
            "&Hat;",
            "&Hcirc;",
            "&Hfr;",
            "&HilbertSpace;",
            "&Hopf;",
            "&HorizontalLine;",
            "&Hscr;",
            "&Hstrok;",
            "&HumpDownHump;",
            "&HumpEqual;",
        ],
        "I": [
            "&IEcy;",
            "&IJlig;",
            "&IOcy;",
            "&Iacute",
            "&Iacute;",
            "&Icirc",
            "&Icirc;",
            "&Icy;",
            "&Idot;",
            "&Ifr;",
            "&Igrave",
            "&Igrave;",
            "&Im;",
            "&Imacr;",
            "&ImaginaryI;",
            "&Implies;",
            "&Int;",
            "&Integral;",
            "&Intersection;",
            "&InvisibleComma;",
            "&InvisibleTimes;",
            "&Iogon;",
            "&Iopf;",
            "&Iota;",
            "&Iscr;",
            "&Itilde;",
            "&Iukcy;",
            "&Iuml",
            "&Iuml;",
        ],
        "J": [
            "&Jcirc;",
            "&Jcy;",
            "&Jfr;",
            "&Jopf;",
            "&Jscr;",
            "&Jsercy;",
            "&Jukcy;",
        ],
        "K": [
            "&KHcy;",
            "&KJcy;",
            "&Kappa;",
            "&Kcedil;",
            "&Kcy;",
            "&Kfr;",
            "&Kopf;",
            "&Kscr;",
        ],
        "L": [
            "&LJcy;",
            "&LT",
            "&LT;",
            "&Lacute;",
            "&Lambda;",
            "&Lang;",
            "&Laplacetrf;",
            "&Larr;",
            "&Lcaron;",
            "&Lcedil;",
            "&Lcy;",
            "&LeftAngleBracket;",
            "&LeftArrow;",
            "&LeftArrowBar;",
            "&LeftArrowRightArrow;",
            "&LeftCeiling;",
            "&LeftDoubleBracket;",
            "&LeftDownTeeVector;",
            "&LeftDownVector;",
            "&LeftDownVectorBar;",
            "&LeftFloor;",
            "&LeftRightArrow;",
            "&LeftRightVector;",
            "&LeftTee;",
            "&LeftTeeArrow;",
            "&LeftTeeVector;",
            "&LeftTriangle;",
            "&LeftTriangleBar;",
            "&LeftTriangleEqual;",
            "&LeftUpDownVector;",
            "&LeftUpTeeVector;",
            "&LeftUpVector;",
            "&LeftUpVectorBar;",
            "&LeftVector;",
            "&LeftVectorBar;",
            "&Leftarrow;",
            "&Leftrightarrow;",
            "&LessEqualGreater;",
            "&LessFullEqual;",
            "&LessGreater;",
            "&LessLess;",
            "&LessSlantEqual;",
            "&LessTilde;",
            "&Lfr;",
            "&Ll;",
            "&Lleftarrow;",
            "&Lmidot;",
            "&LongLeftArrow;",
            "&LongLeftRightArrow;",
            "&LongRightArrow;",
            "&Longleftarrow;",
            "&Longleftrightarrow;",
            "&Longrightarrow;",
            "&Lopf;",
            "&LowerLeftArrow;",
            "&LowerRightArrow;",
            "&Lscr;",
            "&Lsh;",
            "&Lstrok;",
            "&Lt;",
        ],
        "M": [
            "&Map;",
            "&Mcy;",
            "&MediumSpace;",
            "&Mellintrf;",
            "&Mfr;",
            "&MinusPlus;",
            "&Mopf;",
            "&Mscr;",
            "&Mu;",
        ],
        "N": [
            "&NJcy;",
            "&Nacute;",
            "&Ncaron;",
            "&Ncedil;",
            "&Ncy;",
            "&NegativeMediumSpace;",
            "&NegativeThickSpace;",
            "&NegativeThinSpace;",
            "&NegativeVeryThinSpace;",
            "&NestedGreaterGreater;",
            "&NestedLessLess;",
            "&NewLine;",
            "&Nfr;",
            "&NoBreak;",
            "&NonBreakingSpace;",
            "&Nopf;",
            "&Not;",
            "&NotCongruent;",
            "&NotCupCap;",
            "&NotDoubleVerticalBar;",
            "&NotElement;",
            "&NotEqual;",
            "&NotEqualTilde;",
            "&NotExists;",
            "&NotGreater;",
            "&NotGreaterEqual;",
            "&NotGreaterFullEqual;",
            "&NotGreaterGreater;",
            "&NotGreaterLess;",
            "&NotGreaterSlantEqual;",
            "&NotGreaterTilde;",
            "&NotHumpDownHump;",
            "&NotHumpEqual;",
            "&NotLeftTriangle;",
            "&NotLeftTriangleBar;",
            "&NotLeftTriangleEqual;",
            "&NotLess;",
            "&NotLessEqual;",
            "&NotLessGreater;",
            "&NotLessLess;",
            "&NotLessSlantEqual;",
            "&NotLessTilde;",
            "&NotNestedGreaterGreater;",
            "&NotNestedLessLess;",
            "&NotPrecedes;",
            "&NotPrecedesEqual;",
            "&NotPrecedesSlantEqual;",
            "&NotReverseElement;",
            "&NotRightTriangle;",
            "&NotRightTriangleBar;",
            "&NotRightTriangleEqual;",
            "&NotSquareSubset;",
            "&NotSquareSubsetEqual;",
            "&NotSquareSuperset;",
            "&NotSquareSupersetEqual;",
            "&NotSubset;",
            "&NotSubsetEqual;",
            "&NotSucceeds;",
            "&NotSucceedsEqual;",
            "&NotSucceedsSlantEqual;",
            "&NotSucceedsTilde;",
            "&NotSuperset;",
            "&NotSupersetEqual;",
            "&NotTilde;",
            "&NotTildeEqual;",
            "&NotTildeFullEqual;",
            "&NotTildeTilde;",
            "&NotVerticalBar;",
            "&Nscr;",
            "&Ntilde",
            "&Ntilde;",
            "&Nu;",
        ],
        "O": [
            "&OElig;",
            "&Oacute",
            "&Oacute;",
            "&Ocirc",
            "&Ocirc;",
            "&Ocy;",
            "&Odblac;",
            "&Ofr;",
            "&Ograve",
            "&Ograve;",
            "&Omacr;",
            "&Omega;",
            "&Omicron;",
            "&Oopf;",
            "&OpenCurlyDoubleQuote;",
            "&OpenCurlyQuote;",
            "&Or;",
            "&Oscr;",
            "&Oslash",
            "&Oslash;",
            "&Otilde",
            "&Otilde;",
            "&Otimes;",
            "&Ouml",
            "&Ouml;",
            "&OverBar;",
            "&OverBrace;",
            "&OverBracket;",
            "&OverParenthesis;",
        ],
        "P": [
            "&PartialD;",
            "&Pcy;",
            "&Pfr;",
            "&Phi;",
            "&Pi;",
            "&PlusMinus;",
            "&Poincareplane;",
            "&Popf;",
            "&Pr;",
            "&Precedes;",
            "&PrecedesEqual;",
            "&PrecedesSlantEqual;",
            "&PrecedesTilde;",
            "&Prime;",
            "&Product;",
            "&Proportion;",
            "&Proportional;",
            "&Pscr;",
            "&Psi;",
        ],
        "Q": [
            "&QUOT",
            "&QUOT;",
            "&Qfr;",
            "&Qopf;",
            "&Qscr;",
        ],
        "R": [
            "&RBarr;",
            "&REG",
            "&REG;",
            "&Racute;",
            "&Rang;",
            "&Rarr;",
            "&Rarrtl;",
            "&Rcaron;",
            "&Rcedil;",
            "&Rcy;",
            "&Re;",
            "&ReverseElement;",
            "&ReverseEquilibrium;",
            "&ReverseUpEquilibrium;",
            "&Rfr;",
            "&Rho;",
            "&RightAngleBracket;",
            "&RightArrow;",
            "&RightArrowBar;",
            "&RightArrowLeftArrow;",
            "&RightCeiling;",
            "&RightDoubleBracket;",
            "&RightDownTeeVector;",
            "&RightDownVector;",
            "&RightDownVectorBar;",
            "&RightFloor;",
            "&RightTee;",
            "&RightTeeArrow;",
            "&RightTeeVector;",
            "&RightTriangle;",
            "&RightTriangleBar;",
            "&RightTriangleEqual;",
            "&RightUpDownVector;",
            "&RightUpTeeVector;",
            "&RightUpVector;",
            "&RightUpVectorBar;",
            "&RightVector;",
            "&RightVectorBar;",
            "&Rightarrow;",
            "&Ropf;",
            "&RoundImplies;",
            "&Rrightarrow;",
            "&Rscr;",
            "&Rsh;",
            "&RuleDelayed;",
        ],
        "S": [
            "&SHCHcy;",
            "&SHcy;",
            "&SOFTcy;",
            "&Sacute;",
            "&Sc;",
            "&Scaron;",
            "&Scedil;",
            "&Scirc;",
            "&Scy;",
            "&Sfr;",
            "&ShortDownArrow;",
            "&ShortLeftArrow;",
            "&ShortRightArrow;",
            "&ShortUpArrow;",
            "&Sigma;",
            "&SmallCircle;",
            "&Sopf;",
            "&Sqrt;",
            "&Square;",
            "&SquareIntersection;",
            "&SquareSubset;",
            "&SquareSubsetEqual;",
            "&SquareSuperset;",
            "&SquareSupersetEqual;",
            "&SquareUnion;",
            "&Sscr;",
            "&Star;",
            "&Sub;",
            "&Subset;",
            "&SubsetEqual;",
            "&Succeeds;",
            "&SucceedsEqual;",
            "&SucceedsSlantEqual;",
            "&SucceedsTilde;",
            "&SuchThat;",
            "&Sum;",
            "&Sup;",
            "&Superset;",
            "&SupersetEqual;",
            "&Supset;",
        ],
        "T": [
            "&THORN",
            "&THORN;",
            "&TRADE;",
            "&TSHcy;",
            "&TScy;",
            "&Tab;",
            "&Tau;",
            "&Tcaron;",
            "&Tcedil;",
            "&Tcy;",
            "&Tfr;",
            "&Therefore;",
            "&Theta;",
            "&ThickSpace;",
            "&ThinSpace;",
            "&Tilde;",
            "&TildeEqual;",
            "&TildeFullEqual;",
            "&TildeTilde;",
            "&Topf;",
            "&TripleDot;",
            "&Tscr;",
            "&Tstrok;",
        ],
        "U": [
            "&Uacute",
            "&Uacute;",
            "&Uarr;",
            "&Uarrocir;",
            "&Ubrcy;",
            "&Ubreve;",
            "&Ucirc",
            "&Ucirc;",
            "&Ucy;",
            "&Udblac;",
            "&Ufr;",
            "&Ugrave",
            "&Ugrave;",
            "&Umacr;",
            "&UnderBar;",
            "&UnderBrace;",
            "&UnderBracket;",
            "&UnderParenthesis;",
            "&Union;",
            "&UnionPlus;",
            "&Uogon;",
            "&Uopf;",
            "&UpArrow;",
            "&UpArrowBar;",
            "&UpArrowDownArrow;",
            "&UpDownArrow;",
            "&UpEquilibrium;",
            "&UpTee;",
            "&UpTeeArrow;",
            "&Uparrow;",
            "&Updownarrow;",
            "&UpperLeftArrow;",
            "&UpperRightArrow;",
            "&Upsi;",
            "&Upsilon;",
            "&Uring;",
            "&Uscr;",
            "&Utilde;",
            "&Uuml",
            "&Uuml;",
        ],
        "V": [
            "&VDash;",
            "&Vbar;",
            "&Vcy;",
            "&Vdash;",
            "&Vdashl;",
            "&Vee;",
            "&Verbar;",
            "&Vert;",
            "&VerticalBar;",
            "&VerticalLine;",
            "&VerticalSeparator;",
            "&VerticalTilde;",
            "&VeryThinSpace;",
            "&Vfr;",
            "&Vopf;",
            "&Vscr;",
            "&Vvdash;",
        ],
        "W": [
            "&Wcirc;",
            "&Wedge;",
            "&Wfr;",
            "&Wopf;",
            "&Wscr;",
        ],
        "X": [
            "&Xfr;",
            "&Xi;",
            "&Xopf;",
            "&Xscr;",
        ],
        "Y": [
            "&YAcy;",
            "&YIcy;",
            "&YUcy;",
            "&Yacute",
            "&Yacute;",
            "&Ycirc;",
            "&Ycy;",
            "&Yfr;",
            "&Yopf;",
            "&Yscr;",
            "&Yuml;",
        ],
        "Z": [
            "&ZHcy;",
            "&Zacute;",
            "&Zcaron;",
            "&Zcy;",
            "&Zdot;",
            "&ZeroWidthSpace;",
            "&Zeta;",
            "&Zfr;",
            "&Zopf;",
            "&Zscr;",
        ],
        "a": [
            "&aacute",
            "&aacute;",
            "&abreve;",
            "&ac;",
            "&acE;",
            "&acd;",
            "&acirc",
            "&acirc;",
            "&acute",
            "&acute;",
            "&acy;",
            "&aelig",
            "&aelig;",
            "&af;",
            "&afr;",
            "&agrave",
            "&agrave;",
            "&alefsym;",
            "&aleph;",
            "&alpha;",
            "&amacr;",
            "&amalg;",
            "&amp",
            "&amp;",
            "&and;",
            "&andand;",
            "&andd;",
            "&andslope;",
            "&andv;",
            "&ang;",
            "&ange;",
            "&angle;",
            "&angmsd;",
            "&angmsdaa;",
            "&angmsdab;",
            "&angmsdac;",
            "&angmsdad;",
            "&angmsdae;",
            "&angmsdaf;",
            "&angmsdag;",
            "&angmsdah;",
            "&angrt;",
            "&angrtvb;",
            "&angrtvbd;",
            "&angsph;",
            "&angst;",
            "&angzarr;",
            "&aogon;",
            "&aopf;",
            "&ap;",
            "&apE;",
            "&apacir;",
            "&ape;",
            "&apid;",
            "&apos;",
            "&approx;",
            "&approxeq;",
            "&aring",
            "&aring;",
            "&ascr;",
            "&ast;",
            "&asymp;",
            "&asympeq;",
            "&atilde",
            "&atilde;",
            "&auml",
            "&auml;",
            "&awconint;",
            "&awint;",
        ],
        "b": [
            "&bNot;",
            "&backcong;",
            "&backepsilon;",
            "&backprime;",
            "&backsim;",
            "&backsimeq;",
            "&barvee;",
            "&barwed;",
            "&barwedge;",
            "&bbrk;",
            "&bbrktbrk;",
            "&bcong;",
            "&bcy;",
            "&bdquo;",
            "&becaus;",
            "&because;",
            "&bemptyv;",
            "&bepsi;",
            "&bernou;",
            "&beta;",
            "&beth;",
            "&between;",
            "&bfr;",
            "&bigcap;",
            "&bigcirc;",
            "&bigcup;",
            "&bigodot;",
            "&bigoplus;",
            "&bigotimes;",
            "&bigsqcup;",
            "&bigstar;",
            "&bigtriangledown;",
            "&bigtriangleup;",
            "&biguplus;",
            "&bigvee;",
            "&bigwedge;",
            "&bkarow;",
            "&blacklozenge;",
            "&blacksquare;",
            "&blacktriangle;",
            "&blacktriangledown;",
            "&blacktriangleleft;",
            "&blacktriangleright;",
            "&blank;",
            "&blk12;",
            "&blk14;",
            "&blk34;",
            "&block;",
            "&bne;",
            "&bnequiv;",
            "&bnot;",
            "&bopf;",
            "&bot;",
            "&bottom;",
            "&bowtie;",
            "&boxDL;",
            "&boxDR;",
            "&boxDl;",
            "&boxDr;",
            "&boxH;",
            "&boxHD;",
            "&boxHU;",
            "&boxHd;",
            "&boxHu;",
            "&boxUL;",
            "&boxUR;",
            "&boxUl;",
            "&boxUr;",
            "&boxV;",
            "&boxVH;",
            "&boxVL;",
            "&boxVR;",
            "&boxVh;",
            "&boxVl;",
            "&boxVr;",
            "&boxbox;",
            "&boxdL;",
            "&boxdR;",
            "&boxdl;",
            "&boxdr;",
            "&boxh;",
            "&boxhD;",
            "&boxhU;",
            "&boxhd;",
            "&boxhu;",
            "&boxminus;",
            "&boxplus;",
            "&boxtimes;",
            "&boxuL;",
            "&boxuR;",
            "&boxul;",
            "&boxur;",
            "&boxv;",
            "&boxvH;",
            "&boxvL;",
            "&boxvR;",
            "&boxvh;",
            "&boxvl;",
            "&boxvr;",
            "&bprime;",
            "&breve;",
            "&brvbar",
            "&brvbar;",
            "&bscr;",
            "&bsemi;",
            "&bsim;",
            "&bsime;",
            "&bsol;",
            "&bsolb;",
            "&bsolhsub;",
            "&bull;",
            "&bullet;",
            "&bump;",
            "&bumpE;",
            "&bumpe;",
            "&bumpeq;",
        ],
        "c": [
            "&cacute;",
            "&cap;",
            "&capand;",
            "&capbrcup;",
            "&capcap;",
            "&capcup;",
            "&capdot;",
            "&caps;",
            "&caret;",
            "&caron;",
            "&ccaps;",
            "&ccaron;",
            "&ccedil",
            "&ccedil;",
            "&ccirc;",
            "&ccups;",
            "&ccupssm;",
            "&cdot;",
            "&cedil",
            "&cedil;",
            "&cemptyv;",
            "&cent",
            "&cent;",
            "&centerdot;",
            "&cfr;",
            "&chcy;",
            "&check;",
            "&checkmark;",
            "&chi;",
            "&cir;",
            "&cirE;",
            "&circ;",
            "&circeq;",
            "&circlearrowleft;",
            "&circlearrowright;",
            "&circledR;",
            "&circledS;",
            "&circledast;",
            "&circledcirc;",
            "&circleddash;",
            "&cire;",
            "&cirfnint;",
            "&cirmid;",
            "&cirscir;",
            "&clubs;",
            "&clubsuit;",
            "&colon;",
            "&colone;",
            "&coloneq;",
            "&comma;",
            "&commat;",
            "&comp;",
            "&compfn;",
            "&complement;",
            "&complexes;",
            "&cong;",
            "&congdot;",
            "&conint;",
            "&copf;",
            "&coprod;",
            "&copy",
            "&copy;",
            "&copysr;",
            "&crarr;",
            "&cross;",
            "&cscr;",
            "&csub;",
            "&csube;",
            "&csup;",
            "&csupe;",
            "&ctdot;",
            "&cudarrl;",
            "&cudarrr;",
            "&cuepr;",
            "&cuesc;",
            "&cularr;",
            "&cularrp;",
            "&cup;",
            "&cupbrcap;",
            "&cupcap;",
            "&cupcup;",
            "&cupdot;",
            "&cupor;",
            "&cups;",
            "&curarr;",
            "&curarrm;",
            "&curlyeqprec;",
            "&curlyeqsucc;",
            "&curlyvee;",
            "&curlywedge;",
            "&curren",
            "&curren;",
            "&curvearrowleft;",
            "&curvearrowright;",
            "&cuvee;",
            "&cuwed;",
            "&cwconint;",
            "&cwint;",
            "&cylcty;",
        ],
        "d": [
            "&dArr;",
            "&dHar;",
            "&dagger;",
            "&daleth;",
            "&darr;",
            "&dash;",
            "&dashv;",
            "&dbkarow;",
            "&dblac;",
            "&dcaron;",
            "&dcy;",
            "&dd;",
            "&ddagger;",
            "&ddarr;",
            "&ddotseq;",
            "&deg",
            "&deg;",
            "&delta;",
            "&demptyv;",
            "&dfisht;",
            "&dfr;",
            "&dharl;",
            "&dharr;",
            "&diam;",
            "&diamond;",
            "&diamondsuit;",
            "&diams;",
            "&die;",
            "&digamma;",
            "&disin;",
            "&div;",
            "&divide",
            "&divide;",
            "&divideontimes;",
            "&divonx;",
            "&djcy;",
            "&dlcorn;",
            "&dlcrop;",
            "&dollar;",
            "&dopf;",
            "&dot;",
            "&doteq;",
            "&doteqdot;",
            "&dotminus;",
            "&dotplus;",
            "&dotsquare;",
            "&doublebarwedge;",
            "&downarrow;",
            "&downdownarrows;",
            "&downharpoonleft;",
            "&downharpoonright;",
            "&drbkarow;",
            "&drcorn;",
            "&drcrop;",
            "&dscr;",
            "&dscy;",
            "&dsol;",
            "&dstrok;",
            "&dtdot;",
            "&dtri;",
            "&dtrif;",
            "&duarr;",
            "&duhar;",
            "&dwangle;",
            "&dzcy;",
            "&dzigrarr;",
        ],
        "e": [
            "&eDDot;",
            "&eDot;",
            "&eacute",
            "&eacute;",
            "&easter;",
            "&ecaron;",
            "&ecir;",
            "&ecirc",
            "&ecirc;",
            "&ecolon;",
            "&ecy;",
            "&edot;",
            "&ee;",
            "&efDot;",
            "&efr;",
            "&eg;",
            "&egrave",
            "&egrave;",
            "&egs;",
            "&egsdot;",
            "&el;",
            "&elinters;",
            "&ell;",
            "&els;",
            "&elsdot;",
            "&emacr;",
            "&empty;",
            "&emptyset;",
            "&emptyv;",
            "&emsp13;",
            "&emsp14;",
            "&emsp;",
            "&eng;",
            "&ensp;",
            "&eogon;",
            "&eopf;",
            "&epar;",
            "&eparsl;",
            "&eplus;",
            "&epsi;",
            "&epsilon;",
            "&epsiv;",
            "&eqcirc;",
            "&eqcolon;",
            "&eqsim;",
            "&eqslantgtr;",
            "&eqslantless;",
            "&equals;",
            "&equest;",
            "&equiv;",
            "&equivDD;",
            "&eqvparsl;",
            "&erDot;",
            "&erarr;",
            "&escr;",
            "&esdot;",
            "&esim;",
            "&eta;",
            "&eth",
            "&eth;",
            "&euml",
            "&euml;",
            "&euro;",
            "&excl;",
            "&exist;",
            "&expectation;",
            "&exponentiale;",
        ],
        "f": [
            "&fallingdotseq;",
            "&fcy;",
            "&female;",
            "&ffilig;",
            "&fflig;",
            "&ffllig;",
            "&ffr;",
            "&filig;",
            "&fjlig;",
            "&flat;",
            "&fllig;",
            "&fltns;",
            "&fnof;",
            "&fopf;",
            "&forall;",
            "&fork;",
            "&forkv;",
            "&fpartint;",
            "&frac12",
            "&frac12;",
            "&frac13;",
            "&frac14",
            "&frac14;",
            "&frac15;",
            "&frac16;",
            "&frac18;",
            "&frac23;",
            "&frac25;",
            "&frac34",
            "&frac34;",
            "&frac35;",
            "&frac38;",
            "&frac45;",
            "&frac56;",
            "&frac58;",
            "&frac78;",
            "&frasl;",
            "&frown;",
            "&fscr;",
        ],
        "g": [
            "&gE;",
            "&gEl;",
            "&gacute;",
            "&gamma;",
            "&gammad;",
            "&gap;",
            "&gbreve;",
            "&gcirc;",
            "&gcy;",
            "&gdot;",
            "&ge;",
            "&gel;",
            "&geq;",
            "&geqq;",
            "&geqslant;",
            "&ges;",
            "&gescc;",
            "&gesdot;",
            "&gesdoto;",
            "&gesdotol;",
            "&gesl;",
            "&gesles;",
            "&gfr;",
            "&gg;",
            "&ggg;",
            "&gimel;",
            "&gjcy;",
            "&gl;",
            "&glE;",
            "&gla;",
            "&glj;",
            "&gnE;",
            "&gnap;",
            "&gnapprox;",
            "&gne;",
            "&gneq;",
            "&gneqq;",
            "&gnsim;",
            "&gopf;",
            "&grave;",
            "&gscr;",
            "&gsim;",
            "&gsime;",
            "&gsiml;",
            "&gt",
            "&gt;",
            "&gtcc;",
            "&gtcir;",
            "&gtdot;",
            "&gtlPar;",
            "&gtquest;",
            "&gtrapprox;",
            "&gtrarr;",
            "&gtrdot;",
            "&gtreqless;",
            "&gtreqqless;",
            "&gtrless;",
            "&gtrsim;",
            "&gvertneqq;",
            "&gvnE;",
        ],
        "h": [
            "&hArr;",
            "&hairsp;",
            "&half;",
            "&hamilt;",
            "&hardcy;",
            "&harr;",
            "&harrcir;",
            "&harrw;",
            "&hbar;",
            "&hcirc;",
            "&hearts;",
            "&heartsuit;",
            "&hellip;",
            "&hercon;",
            "&hfr;",
            "&hksearow;",
            "&hkswarow;",
            "&hoarr;",
            "&homtht;",
            "&hookleftarrow;",
            "&hookrightarrow;",
            "&hopf;",
            "&horbar;",
            "&hscr;",
            "&hslash;",
            "&hstrok;",
            "&hybull;",
            "&hyphen;",
        ],
        "i": [
            "&iacute",
            "&iacute;",
            "&ic;",
            "&icirc",
            "&icirc;",
            "&icy;",
            "&iecy;",
            "&iexcl",
            "&iexcl;",
            "&iff;",
            "&ifr;",
            "&igrave",
            "&igrave;",
            "&ii;",
            "&iiiint;",
            "&iiint;",
            "&iinfin;",
            "&iiota;",
            "&ijlig;",
            "&imacr;",
            "&image;",
            "&imagline;",
            "&imagpart;",
            "&imath;",
            "&imof;",
            "&imped;",
            "&in;",
            "&incare;",
            "&infin;",
            "&infintie;",
            "&inodot;",
            "&int;",
            "&intcal;",
            "&integers;",
            "&intercal;",
            "&intlarhk;",
            "&intprod;",
            "&iocy;",
            "&iogon;",
            "&iopf;",
            "&iota;",
            "&iprod;",
            "&iquest",
            "&iquest;",
            "&iscr;",
            "&isin;",
            "&isinE;",
            "&isindot;",
            "&isins;",
            "&isinsv;",
            "&isinv;",
            "&it;",
            "&itilde;",
            "&iukcy;",
            "&iuml",
            "&iuml;",
        ],
        "j": [
            "&jcirc;",
            "&jcy;",
            "&jfr;",
            "&jmath;",
            "&jopf;",
            "&jscr;",
            "&jsercy;",
            "&jukcy;",
        ],
        "k": [
            "&kappa;",
            "&kappav;",
            "&kcedil;",
            "&kcy;",
            "&kfr;",
            "&kgreen;",
            "&khcy;",
            "&kjcy;",
            "&kopf;",
            "&kscr;",
        ],
        "l": [
            "&lAarr;",
            "&lArr;",
            "&lAtail;",
            "&lBarr;",
            "&lE;",
            "&lEg;",
            "&lHar;",
            "&lacute;",
            "&laemptyv;",
            "&lagran;",
            "&lambda;",
            "&lang;",
            "&langd;",
            "&langle;",
            "&lap;",
            "&laquo",
            "&laquo;",
            "&larr;",
            "&larrb;",
            "&larrbfs;",
            "&larrfs;",
            "&larrhk;",
            "&larrlp;",
            "&larrpl;",
            "&larrsim;",
            "&larrtl;",
            "&lat;",
            "&latail;",
            "&late;",
            "&lates;",
            "&lbarr;",
            "&lbbrk;",
            "&lbrace;",
            "&lbrack;",
            "&lbrke;",
            "&lbrksld;",
            "&lbrkslu;",
            "&lcaron;",
            "&lcedil;",
            "&lceil;",
            "&lcub;",
            "&lcy;",
            "&ldca;",
            "&ldquo;",
            "&ldquor;",
            "&ldrdhar;",
            "&ldrushar;",
            "&ldsh;",
            "&le;",
            "&leftarrow;",
            "&leftarrowtail;",
            "&leftharpoondown;",
            "&leftharpoonup;",
            "&leftleftarrows;",
            "&leftrightarrow;",
            "&leftrightarrows;",
            "&leftrightharpoons;",
            "&leftrightsquigarrow;",
            "&leftthreetimes;",
            "&leg;",
            "&leq;",
            "&leqq;",
            "&leqslant;",
            "&les;",
            "&lescc;",
            "&lesdot;",
            "&lesdoto;",
            "&lesdotor;",
            "&lesg;",
            "&lesges;",
            "&lessapprox;",
            "&lessdot;",
            "&lesseqgtr;",
            "&lesseqqgtr;",
            "&lessgtr;",
            "&lesssim;",
            "&lfisht;",
            "&lfloor;",
            "&lfr;",
            "&lg;",
            "&lgE;",
            "&lhard;",
            "&lharu;",
            "&lharul;",
            "&lhblk;",
            "&ljcy;",
            "&ll;",
            "&llarr;",
            "&llcorner;",
            "&llhard;",
            "&lltri;",
            "&lmidot;",
            "&lmoust;",
            "&lmoustache;",
            "&lnE;",
            "&lnap;",
            "&lnapprox;",
            "&lne;",
            "&lneq;",
            "&lneqq;",
            "&lnsim;",
            "&loang;",
            "&loarr;",
            "&lobrk;",
            "&longleftarrow;",
            "&longleftrightarrow;",
            "&longmapsto;",
            "&longrightarrow;",
            "&looparrowleft;",
            "&looparrowright;",
            "&lopar;",
            "&lopf;",
            "&loplus;",
            "&lotimes;",
            "&lowast;",
            "&lowbar;",
            "&loz;",
            "&lozenge;",
            "&lozf;",
            "&lpar;",
            "&lparlt;",
            "&lrarr;",
            "&lrcorner;",
            "&lrhar;",
            "&lrhard;",
            "&lrm;",
            "&lrtri;",
            "&lsaquo;",
            "&lscr;",
            "&lsh;",
            "&lsim;",
            "&lsime;",
            "&lsimg;",
            "&lsqb;",
            "&lsquo;",
            "&lsquor;",
            "&lstrok;",
            "&lt",
            "&lt;",
            "&ltcc;",
            "&ltcir;",
            "&ltdot;",
            "&lthree;",
            "&ltimes;",
            "&ltlarr;",
            "&ltquest;",
            "&ltrPar;",
            "&ltri;",
            "&ltrie;",
            "&ltrif;",
            "&lurdshar;",
            "&luruhar;",
            "&lvertneqq;",
            "&lvnE;",
        ],
        "m": [
            "&mDDot;",
            "&macr",
            "&macr;",
            "&male;",
            "&malt;",
            "&maltese;",
            "&map;",
            "&mapsto;",
            "&mapstodown;",
            "&mapstoleft;",
            "&mapstoup;",
            "&marker;",
            "&mcomma;",
            "&mcy;",
            "&mdash;",
            "&measuredangle;",
            "&mfr;",
            "&mho;",
            "&micro",
            "&micro;",
            "&mid;",
            "&midast;",
            "&midcir;",
            "&middot",
            "&middot;",
            "&minus;",
            "&minusb;",
            "&minusd;",
            "&minusdu;",
            "&mlcp;",
            "&mldr;",
            "&mnplus;",
            "&models;",
            "&mopf;",
            "&mp;",
            "&mscr;",
            "&mstpos;",
            "&mu;",
            "&multimap;",
            "&mumap;",
        ],
        "n": [
            "&nGg;",
            "&nGt;",
            "&nGtv;",
            "&nLeftarrow;",
            "&nLeftrightarrow;",
            "&nLl;",
            "&nLt;",
            "&nLtv;",
            "&nRightarrow;",
            "&nVDash;",
            "&nVdash;",
            "&nabla;",
            "&nacute;",
            "&nang;",
            "&nap;",
            "&napE;",
            "&napid;",
            "&napos;",
            "&napprox;",
            "&natur;",
            "&natural;",
            "&naturals;",
            "&nbsp",
            "&nbsp;",
            "&nbump;",
            "&nbumpe;",
            "&ncap;",
            "&ncaron;",
            "&ncedil;",
            "&ncong;",
            "&ncongdot;",
            "&ncup;",
            "&ncy;",
            "&ndash;",
            "&ne;",
            "&neArr;",
            "&nearhk;",
            "&nearr;",
            "&nearrow;",
            "&nedot;",
            "&nequiv;",
            "&nesear;",
            "&nesim;",
            "&nexist;",
            "&nexists;",
            "&nfr;",
            "&ngE;",
            "&nge;",
            "&ngeq;",
            "&ngeqq;",
            "&ngeqslant;",
            "&nges;",
            "&ngsim;",
            "&ngt;",
            "&ngtr;",
            "&nhArr;",
            "&nharr;",
            "&nhpar;",
            "&ni;",
            "&nis;",
            "&nisd;",
            "&niv;",
            "&njcy;",
            "&nlArr;",
            "&nlE;",
            "&nlarr;",
            "&nldr;",
            "&nle;",
            "&nleftarrow;",
            "&nleftrightarrow;",
            "&nleq;",
            "&nleqq;",
            "&nleqslant;",
            "&nles;",
            "&nless;",
            "&nlsim;",
            "&nlt;",
            "&nltri;",
            "&nltrie;",
            "&nmid;",
            "&nopf;",
            "&not",
            "&not;",
            "&notin;",
            "&notinE;",
            "&notindot;",
            "&notinva;",
            "&notinvb;",
            "&notinvc;",
            "&notni;",
            "&notniva;",
            "&notnivb;",
            "&notnivc;",
            "&npar;",
            "&nparallel;",
            "&nparsl;",
            "&npart;",
            "&npolint;",
            "&npr;",
            "&nprcue;",
            "&npre;",
            "&nprec;",
            "&npreceq;",
            "&nrArr;",
            "&nrarr;",
            "&nrarrc;",
            "&nrarrw;",
            "&nrightarrow;",
            "&nrtri;",
            "&nrtrie;",
            "&nsc;",
            "&nsccue;",
            "&nsce;",
            "&nscr;",
            "&nshortmid;",
            "&nshortparallel;",
            "&nsim;",
            "&nsime;",
            "&nsimeq;",
            "&nsmid;",
            "&nspar;",
            "&nsqsube;",
            "&nsqsupe;",
            "&nsub;",
            "&nsubE;",
            "&nsube;",
            "&nsubset;",
            "&nsubseteq;",
            "&nsubseteqq;",
            "&nsucc;",
            "&nsucceq;",
            "&nsup;",
            "&nsupE;",
            "&nsupe;",
            "&nsupset;",
            "&nsupseteq;",
            "&nsupseteqq;",
            "&ntgl;",
            "&ntilde",
            "&ntilde;",
            "&ntlg;",
            "&ntriangleleft;",
            "&ntrianglelefteq;",
            "&ntriangleright;",
            "&ntrianglerighteq;",
            "&nu;",
            "&num;",
            "&numero;",
            "&numsp;",
            "&nvDash;",
            "&nvHarr;",
            "&nvap;",
            "&nvdash;",
            "&nvge;",
            "&nvgt;",
            "&nvinfin;",
            "&nvlArr;",
            "&nvle;",
            "&nvlt;",
            "&nvltrie;",
            "&nvrArr;",
            "&nvrtrie;",
            "&nvsim;",
            "&nwArr;",
            "&nwarhk;",
            "&nwarr;",
            "&nwarrow;",
            "&nwnear;",
        ],
        "o": [
            "&oS;",
            "&oacute",
            "&oacute;",
            "&oast;",
            "&ocir;",
            "&ocirc",
            "&ocirc;",
            "&ocy;",
            "&odash;",
            "&odblac;",
            "&odiv;",
            "&odot;",
            "&odsold;",
            "&oelig;",
            "&ofcir;",
            "&ofr;",
            "&ogon;",
            "&ograve",
            "&ograve;",
            "&ogt;",
            "&ohbar;",
            "&ohm;",
            "&oint;",
            "&olarr;",
            "&olcir;",
            "&olcross;",
            "&oline;",
            "&olt;",
            "&omacr;",
            "&omega;",
            "&omicron;",
            "&omid;",
            "&ominus;",
            "&oopf;",
            "&opar;",
            "&operp;",
            "&oplus;",
            "&or;",
            "&orarr;",
            "&ord;",
            "&order;",
            "&orderof;",
            "&ordf",
            "&ordf;",
            "&ordm",
            "&ordm;",
            "&origof;",
            "&oror;",
            "&orslope;",
            "&orv;",
            "&oscr;",
            "&oslash",
            "&oslash;",
            "&osol;",
            "&otilde",
            "&otilde;",
            "&otimes;",
            "&otimesas;",
            "&ouml",
            "&ouml;",
            "&ovbar;",
        ],
        "p": [
            "&par;",
            "&para",
            "&para;",
            "&parallel;",
            "&parsim;",
            "&parsl;",
            "&part;",
            "&pcy;",
            "&percnt;",
            "&period;",
            "&permil;",
            "&perp;",
            "&pertenk;",
            "&pfr;",
            "&phi;",
            "&phiv;",
            "&phmmat;",
            "&phone;",
            "&pi;",
            "&pitchfork;",
            "&piv;",
            "&planck;",
            "&planckh;",
            "&plankv;",
            "&plus;",
            "&plusacir;",
            "&plusb;",
            "&pluscir;",
            "&plusdo;",
            "&plusdu;",
            "&pluse;",
            "&plusmn",
            "&plusmn;",
            "&plussim;",
            "&plustwo;",
            "&pm;",
            "&pointint;",
            "&popf;",
            "&pound",
            "&pound;",
            "&pr;",
            "&prE;",
            "&prap;",
            "&prcue;",
            "&pre;",
            "&prec;",
            "&precapprox;",
            "&preccurlyeq;",
            "&preceq;",
            "&precnapprox;",
            "&precneqq;",
            "&precnsim;",
            "&precsim;",
            "&prime;",
            "&primes;",
            "&prnE;",
            "&prnap;",
            "&prnsim;",
            "&prod;",
            "&profalar;",
            "&profline;",
            "&profsurf;",
            "&prop;",
            "&propto;",
            "&prsim;",
            "&prurel;",
            "&pscr;",
            "&psi;",
            "&puncsp;",
        ],
        "q": [
            "&qfr;",
            "&qint;",
            "&qopf;",
            "&qprime;",
            "&qscr;",
            "&quaternions;",
            "&quatint;",
            "&quest;",
            "&questeq;",
            "&quot",
            "&quot;",
        ],
        "r": [
            "&rAarr;",
            "&rArr;",
            "&rAtail;",
            "&rBarr;",
            "&rHar;",
            "&race;",
            "&racute;",
            "&radic;",
            "&raemptyv;",
            "&rang;",
            "&rangd;",
            "&range;",
            "&rangle;",
            "&raquo",
            "&raquo;",
            "&rarr;",
            "&rarrap;",
            "&rarrb;",
            "&rarrbfs;",
            "&rarrc;",
            "&rarrfs;",
            "&rarrhk;",
            "&rarrlp;",
            "&rarrpl;",
            "&rarrsim;",
            "&rarrtl;",
            "&rarrw;",
            "&ratail;",
            "&ratio;",
            "&rationals;",
            "&rbarr;",
            "&rbbrk;",
            "&rbrace;",
            "&rbrack;",
            "&rbrke;",
            "&rbrksld;",
            "&rbrkslu;",
            "&rcaron;",
            "&rcedil;",
            "&rceil;",
            "&rcub;",
            "&rcy;",
            "&rdca;",
            "&rdldhar;",
            "&rdquo;",
            "&rdquor;",
            "&rdsh;",
            "&real;",
            "&realine;",
            "&realpart;",
            "&reals;",
            "&rect;",
            "&reg",
            "&reg;",
            "&rfisht;",
            "&rfloor;",
            "&rfr;",
            "&rhard;",
            "&rharu;",
            "&rharul;",
            "&rho;",
            "&rhov;",
            "&rightarrow;",
            "&rightarrowtail;",
            "&rightharpoondown;",
            "&rightharpoonup;",
            "&rightleftarrows;",
            "&rightleftharpoons;",
            "&rightrightarrows;",
            "&rightsquigarrow;",
            "&rightthreetimes;",
            "&ring;",
            "&risingdotseq;",
            "&rlarr;",
            "&rlhar;",
            "&rlm;",
            "&rmoust;",
            "&rmoustache;",
            "&rnmid;",
            "&roang;",
            "&roarr;",
            "&robrk;",
            "&ropar;",
            "&ropf;",
            "&roplus;",
            "&rotimes;",
            "&rpar;",
            "&rpargt;",
            "&rppolint;",
            "&rrarr;",
            "&rsaquo;",
            "&rscr;",
            "&rsh;",
            "&rsqb;",
            "&rsquo;",
            "&rsquor;",
            "&rthree;",
            "&rtimes;",
            "&rtri;",
            "&rtrie;",
            "&rtrif;",
            "&rtriltri;",
            "&ruluhar;",
            "&rx;",
        ],
        "s": [
            "&sacute;",
            "&sbquo;",
            "&sc;",
            "&scE;",
            "&scap;",
            "&scaron;",
            "&sccue;",
            "&sce;",
            "&scedil;",
            "&scirc;",
            "&scnE;",
            "&scnap;",
            "&scnsim;",
            "&scpolint;",
            "&scsim;",
            "&scy;",
            "&sdot;",
            "&sdotb;",
            "&sdote;",
            "&seArr;",
            "&searhk;",
            "&searr;",
            "&searrow;",
            "&sect",
            "&sect;",
            "&semi;",
            "&seswar;",
            "&setminus;",
            "&setmn;",
            "&sext;",
            "&sfr;",
            "&sfrown;",
            "&sharp;",
            "&shchcy;",
            "&shcy;",
            "&shortmid;",
            "&shortparallel;",
            "&shy",
            "&shy;",
            "&sigma;",
            "&sigmaf;",
            "&sigmav;",
            "&sim;",
            "&simdot;",
            "&sime;",
            "&simeq;",
            "&simg;",
            "&simgE;",
            "&siml;",
            "&simlE;",
            "&simne;",
            "&simplus;",
            "&simrarr;",
            "&slarr;",
            "&smallsetminus;",
            "&smashp;",
            "&smeparsl;",
            "&smid;",
            "&smile;",
            "&smt;",
            "&smte;",
            "&smtes;",
            "&softcy;",
            "&sol;",
            "&solb;",
            "&solbar;",
            "&sopf;",
            "&spades;",
            "&spadesuit;",
            "&spar;",
            "&sqcap;",
            "&sqcaps;",
            "&sqcup;",
            "&sqcups;",
            "&sqsub;",
            "&sqsube;",
            "&sqsubset;",
            "&sqsubseteq;",
            "&sqsup;",
            "&sqsupe;",
            "&sqsupset;",
            "&sqsupseteq;",
            "&squ;",
            "&square;",
            "&squarf;",
            "&squf;",
            "&srarr;",
            "&sscr;",
            "&ssetmn;",
            "&ssmile;",
            "&sstarf;",
            "&star;",
            "&starf;",
            "&straightepsilon;",
            "&straightphi;",
            "&strns;",
            "&sub;",
            "&subE;",
            "&subdot;",
            "&sube;",
            "&subedot;",
            "&submult;",
            "&subnE;",
            "&subne;",
            "&subplus;",
            "&subrarr;",
            "&subset;",
            "&subseteq;",
            "&subseteqq;",
            "&subsetneq;",
            "&subsetneqq;",
            "&subsim;",
            "&subsub;",
            "&subsup;",
            "&succ;",
            "&succapprox;",
            "&succcurlyeq;",
            "&succeq;",
            "&succnapprox;",
            "&succneqq;",
            "&succnsim;",
            "&succsim;",
            "&sum;",
            "&sung;",
            "&sup1",
            "&sup1;",
            "&sup2",
            "&sup2;",
            "&sup3",
            "&sup3;",
            "&sup;",
            "&supE;",
            "&supdot;",
            "&supdsub;",
            "&supe;",
            "&supedot;",
            "&suphsol;",
            "&suphsub;",
            "&suplarr;",
            "&supmult;",
            "&supnE;",
            "&supne;",
            "&supplus;",
            "&supset;",
            "&supseteq;",
            "&supseteqq;",
            "&supsetneq;",
            "&supsetneqq;",
            "&supsim;",
            "&supsub;",
            "&supsup;",
            "&swArr;",
            "&swarhk;",
            "&swarr;",
            "&swarrow;",
            "&swnwar;",
            "&szlig",
            "&szlig;",
        ],
        "t": [
            "&target;",
            "&tau;",
            "&tbrk;",
            "&tcaron;",
            "&tcedil;",
            "&tcy;",
            "&tdot;",
            "&telrec;",
            "&tfr;",
            "&there4;",
            "&therefore;",
            "&theta;",
            "&thetasym;",
            "&thetav;",
            "&thickapprox;",
            "&thicksim;",
            "&thinsp;",
            "&thkap;",
            "&thksim;",
            "&thorn",
            "&thorn;",
            "&tilde;",
            "&times",
            "&times;",
            "&timesb;",
            "&timesbar;",
            "&timesd;",
            "&tint;",
            "&toea;",
            "&top;",
            "&topbot;",
            "&topcir;",
            "&topf;",
            "&topfork;",
            "&tosa;",
            "&tprime;",
            "&trade;",
            "&triangle;",
            "&triangledown;",
            "&triangleleft;",
            "&trianglelefteq;",
            "&triangleq;",
            "&triangleright;",
            "&trianglerighteq;",
            "&tridot;",
            "&trie;",
            "&triminus;",
            "&triplus;",
            "&trisb;",
            "&tritime;",
            "&trpezium;",
            "&tscr;",
            "&tscy;",
            "&tshcy;",
            "&tstrok;",
            "&twixt;",
            "&twoheadleftarrow;",
            "&twoheadrightarrow;",
        ],
        "u": [
            "&uArr;",
            "&uHar;",
            "&uacute",
            "&uacute;",
            "&uarr;",
            "&ubrcy;",
            "&ubreve;",
            "&ucirc",
            "&ucirc;",
            "&ucy;",
            "&udarr;",
            "&udblac;",
            "&udhar;",
            "&ufisht;",
            "&ufr;",
            "&ugrave",
            "&ugrave;",
            "&uharl;",
            "&uharr;",
            "&uhblk;",
            "&ulcorn;",
            "&ulcorner;",
            "&ulcrop;",
            "&ultri;",
            "&umacr;",
            "&uml",
            "&uml;",
            "&uogon;",
            "&uopf;",
            "&uparrow;",
            "&updownarrow;",
            "&upharpoonleft;",
            "&upharpoonright;",
            "&uplus;",
            "&upsi;",
            "&upsih;",
            "&upsilon;",
            "&upuparrows;",
            "&urcorn;",
            "&urcorner;",
            "&urcrop;",
            "&uring;",
            "&urtri;",
            "&uscr;",
            "&utdot;",
            "&utilde;",
            "&utri;",
            "&utrif;",
            "&uuarr;",
            "&uuml",
            "&uuml;",
            "&uwangle;",
        ],
        "v": [
            "&vArr;",
            "&vBar;",
            "&vBarv;",
            "&vDash;",
            "&vangrt;",
            "&varepsilon;",
            "&varkappa;",
            "&varnothing;",
            "&varphi;",
            "&varpi;",
            "&varpropto;",
            "&varr;",
            "&varrho;",
            "&varsigma;",
            "&varsubsetneq;",
            "&varsubsetneqq;",
            "&varsupsetneq;",
            "&varsupsetneqq;",
            "&vartheta;",
            "&vartriangleleft;",
            "&vartriangleright;",
            "&vcy;",
            "&vdash;",
            "&vee;",
            "&veebar;",
            "&veeeq;",
            "&vellip;",
            "&verbar;",
            "&vert;",
            "&vfr;",
            "&vltri;",
            "&vnsub;",
            "&vnsup;",
            "&vopf;",
            "&vprop;",
            "&vrtri;",
            "&vscr;",
            "&vsubnE;",
            "&vsubne;",
            "&vsupnE;",
            "&vsupne;",
            "&vzigzag;",
        ],
        "w": [
            "&wcirc;",
            "&wedbar;",
            "&wedge;",
            "&wedgeq;",
            "&weierp;",
            "&wfr;",
            "&wopf;",
            "&wp;",
            "&wr;",
            "&wreath;",
            "&wscr;",
        ],
        "x": [
            "&xcap;",
            "&xcirc;",
            "&xcup;",
            "&xdtri;",
            "&xfr;",
            "&xhArr;",
            "&xharr;",
            "&xi;",
            "&xlArr;",
            "&xlarr;",
            "&xmap;",
            "&xnis;",
            "&xodot;",
            "&xopf;",
            "&xoplus;",
            "&xotime;",
            "&xrArr;",
            "&xrarr;",
            "&xscr;",
            "&xsqcup;",
            "&xuplus;",
            "&xutri;",
            "&xvee;",
            "&xwedge;",
        ],
        "y": [
            "&yacute",
            "&yacute;",
            "&yacy;",
            "&ycirc;",
            "&ycy;",
            "&yen",
            "&yen;",
            "&yfr;",
            "&yicy;",
            "&yopf;",
            "&yscr;",
            "&yucy;",
            "&yuml",
            "&yuml;",
        ],
        "z": [
            "&zacute;",
            "&zcaron;",
            "&zcy;",
            "&zdot;",
            "&zeetrf;",
            "&zeta;",
            "&zfr;",
            "&zhcy;",
            "&zigrarr;",
            "&zopf;",
            "&zscr;",
            "&zwj;",
            "&zwnj;",
        ]
    };
    return strings;
}